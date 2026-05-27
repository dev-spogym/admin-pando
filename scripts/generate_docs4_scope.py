# -*- coding: utf-8 -*-
"""Generate docs4 by splitting docs2 into V1/V2 planning scopes.

V1 source:
    lastspr/v1checklist.xlsx
    sheet "3.CRM (admin)_제로스트_0518논의"
    rows 4..751

V2 source:
    rows 753..end plus docs2 sections that are not mapped to V1.

This script is intentionally conservative. It does not rewrite planning content;
it moves markdown sections into V1 or V2 and, when a section contains both
scopes, splits tables/lists/paragraph blocks so V2-only items do not remain in
V1 deliverables.
"""

from __future__ import annotations

import argparse
import csv
import re
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
DOCS2 = ROOT / "docs2"
DOCS4 = ROOT / "docs4"
ADMIN_SCREENS = ROOT / "docs" / "admin" / "화면설계서"
EXCEL = ROOT / "lastspr" / "v1checklist.xlsx"
SHEET_NAME = "3.CRM (admin)_제로스트_0518논의"

V1_START_ROW = 4
V1_END_ROW = 751
V2_START_ROW = 753

EXCLUDED_DOCS2_TOP_DIRS = {
    "_공통",
    "registry",
    "reports",
    "scripts",
    "정합성체크",
}

# Examples matched:
# CLS-01-07, SAL-EXT-05-06, PAY-STF-02-09, SCR-M001, DLG-S016, IoT-05-04.
CODE_RE = re.compile(r"\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){1,6}\b", re.IGNORECASE)
COMMON_ID_TOKEN = (
    r"(?:"
    r"(?:SCR|DLG)-[A-Z0-9]+(?:-[A-Z0-9가-힣_]+){0,6}"
    r"|[A-Z][A-Z0-9]+(?:-[A-Z0-9]+){1,6}"
    r"|[AX]\d{2}"
    r")"
)
COMMON_ID_RE = re.compile(
    rf"(?<![A-Z0-9가-힣_-]){COMMON_ID_TOKEN}(?![A-Z0-9가-힣_-])",
    re.IGNORECASE,
)
BACKTICKED_COMMON_ID_RE = re.compile(
    rf"`({COMMON_ID_TOKEN})`",
    re.IGNORECASE,
)
SECTION_RE = re.compile(r"(?m)^##\s+(.+?)\s*$")
SCREEN_REF_RE = re.compile(r"(?<![A-Z0-9-])(?:SCR|DLG)-[A-Z0-9]+(?:-[A-Z0-9]+)*(?!-[A-Z0-9])\b", re.IGNORECASE)
LINKED_FEATURE_LINE_RE = re.compile(r"(?m)^>\s*연결 기능\s*:.*$")
SCREEN_HEADING_RE = re.compile(r"^##\s+((?:SCR|DLG)-[^\s]+)\s*(.*?)\s*$", re.IGNORECASE)
DOCS2_DOMAIN_LOC_RE = re.compile(r"docs2/(D\d{2}-[^/]+/[^`\s|)]+\.md):(\d+)")
REL_DOMAIN_LOC_RE = re.compile(
    r"(?<!docs2/)(?<!docs4/V1/)(?<!docs4/V2/)(D\d{2}-[^/`\s|)]+/[^`\s|)]+\.md):(\d+)"
)
CODE_REL_LOC_RE = re.compile(
    r"(?P<code>[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){1,6})\s*/\s*`(?P<rel>D\d{2}-[^/`\s|)]+/[^`\s|)]+\.md):\d+`",
    re.IGNORECASE,
)
DOCS2_DOMAIN_FILE_RE = re.compile(r"docs2/(D\d{2}-[^/`\s|)]+/[^`\s|)]+\.md)(?!:)")
COMMON_ID_PREFIXES = {
    "AUTH",
    "CLS",
    "CTR",
    "DLG",
    "EXT",
    "HQ",
    "IOT",
    "KIOSK",
    "MA",
    "MBR",
    "MFN",
    "MKT",
    "NFR",
    "PAY",
    "PRD",
    "SAL",
    "SCR",
    "SET",
    "STF",
}

FORCE_BOTH_SCREEN_IDS = {
    # V1 화면들이 직접 참조하는 공통/본사 화면. 정의 섹션은 V1/V2 양쪽에 존재해야 한다.
    "DLG-000",
    "SCR-094",
    "SCR-H1001",
    "DLG-H1001-001",
}

MEMBER_DIALOGS_FULL = (
    "DLG-M001 상태 변경 확인",
    "DLG-M002 회원 삭제 확인",
    "DLG-M003 홀딩 등록",
    "DLG-M004 홀딩 해제",
    "DLG-M005 탈퇴 처리",
    "DLG-M006 전화번호 중복 안내",
    "DLG-M007 작업 취소 확인",
    "DLG-M008 입력 폼 초기화 확인",
    "DLG-M009 메모 추가",
    "DLG-M010 메모 삭제 확인",
    "DLG-M011 상담 등록/수정",
    "DLG-M012 상담 기록 삭제 확인",
    "DLG-M013 환불 처리",
    "DLG-M014 결제 상세 조회",
    "DLG-M015 체성분 등록",
    "DLG-M016 체성분 덮어쓰기",
    "DLG-M017 목표 설정",
    "DLG-M018 연장 등록",
    "DLG-M019 양도 처리",
    "DLG-M020 쿠폰 적용",
    "DLG-M021 마일리지 조정",
    "DLG-M022 수동 출석",
    "DLG-M023 이관 확인",
    "DLG-M024 종합 평가 등록",
    "DLG-M025 운동 프로그램 배정",
    "DLG-M026 운동 이력 등록",
    "DLG-M027 주소 검색",
    "DLG-M028 회원 병합 확인",
    "DLG-M029 가족 연결",
    "DLG-M030 등급 변경",
)


@dataclass(frozen=True)
class ChecklistRecord:
    row: int
    contract_status: str
    level: str
    category: str
    contract_code: str
    contract_name: str
    planning_code: str
    planning_name: str
    dev_rr: str
    zerost_rr: str
    opinion: str
    client_feedback: str
    extra_opinion: str
    codes: tuple[str, ...]


@dataclass(frozen=True)
class Section:
    source_path: Path
    rel_path: Path
    title: str
    start_line: int
    content: str
    heading_codes: tuple[str, ...]
    body_codes: tuple[str, ...]
    ordered_codes: tuple[str, ...]


@dataclass
class SectionDecision:
    section: Section
    output_scope: str
    classification: str
    matched_v1_codes: tuple[str, ...]
    matched_v2_codes: tuple[str, ...]
    basis: str
    warning: str
    output_path: Path
    content: str


@dataclass(frozen=True)
class MarkdownBlock:
    kind: str
    lines: tuple[str, ...]


def normalize_code(value: str) -> str:
    return value.strip().upper()


def extract_codes(value: object) -> tuple[str, ...]:
    if value is None:
        return ()
    text = str(value)
    found: list[str] = []
    seen: set[str] = set()
    for match in CODE_RE.findall(text):
        code = normalize_code(match)
        if code not in seen:
            seen.add(code)
            found.append(code)
    return tuple(found)


def is_common_planning_id(code: str) -> bool:
    normalized = normalize_code(code)
    if re.fullmatch(r"[AX]\d{2}", normalized):
        return True
    prefix = normalized.split("-", 1)[0]
    return prefix in COMMON_ID_PREFIXES


def extract_common_ids(value: object) -> tuple[str, ...]:
    if value is None:
        return ()
    text = str(value)
    found: list[str] = []
    seen: set[str] = set()
    for match in COMMON_ID_RE.findall(text):
        code = normalize_code(match)
        if not is_common_planning_id(code):
            continue
        if code not in seen:
            seen.add(code)
            found.append(code)
    return tuple(found)


def unique_ordered(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        normalized = normalize_code(value)
        if normalized and normalized not in seen:
            seen.add(normalized)
            ordered.append(normalized)
    return tuple(ordered)


def is_screen_ref(value: str) -> bool:
    return bool(SCREEN_REF_RE.fullmatch(normalize_code(value)))


def extract_screen_refs(value: str) -> tuple[str, ...]:
    return unique_ordered(SCREEN_REF_RE.findall(value or ""))


def code_related(a: str, b: str) -> bool:
    """Return True when codes are exact or parent/child related."""
    a = normalize_code(a)
    b = normalize_code(b)
    return a == b or a.startswith(f"{b}-") or b.startswith(f"{a}-")


def related_matches(code: str, scope_codes: set[str]) -> tuple[str, ...]:
    return tuple(sorted(candidate for candidate in scope_codes if code_related(code, candidate)))


def matches_any(code: str, scope_codes: set[str]) -> bool:
    return any(code_related(code, candidate) for candidate in scope_codes)


def safe_cell(value: object) -> str:
    if value is None:
        return ""
    return str(value).replace("\r\n", "\n").replace("\r", "\n").strip()


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    raw = text[3:end].strip()
    result: dict[str, str] = {}
    current_key: str | None = None
    current_lines: list[str] = []
    for line in raw.splitlines():
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*\s*:", line):
            if current_key:
                result[current_key] = "\n".join(current_lines).strip()
            key, value = line.split(":", 1)
            current_key = key.strip()
            current_lines = [value.strip()]
        elif current_key:
            current_lines.append(line.strip())
    if current_key:
        result[current_key] = "\n".join(current_lines).strip()
    return result


def parse_yamlish_list(value: str) -> tuple[str, ...]:
    if not value:
        return ()
    found: list[str] = []
    if value.startswith("[") and "]" in value:
        inner = value.strip()[1 : value.rfind("]")]
        found.extend(part.strip().strip("\"'") for part in inner.split(","))
    else:
        for line in value.splitlines():
            line = line.strip()
            if line.startswith("-"):
                found.append(line[1:].strip().strip("\"'"))
            elif line:
                found.extend(part.strip().strip("\"'") for part in line.split(","))
    return unique_ordered(code for code in found if code)


def load_admin_screen_feature_codes() -> dict[str, tuple[str, ...]]:
    result: dict[str, tuple[str, ...]] = {}
    for path in sorted(ADMIN_SCREENS.rglob("*.md")):
        if not path.name.startswith("00-"):
            continue
        text = path.read_text(encoding="utf-8-sig", errors="ignore")
        frontmatter = parse_frontmatter(text)
        screen_id = normalize_code(frontmatter.get("id", ""))
        if not screen_id or not is_screen_ref(screen_id):
            continue
        result[screen_id] = parse_yamlish_list(frontmatter.get("feature_codes", ""))
    return result


def load_records() -> tuple[list[ChecklistRecord], list[ChecklistRecord]]:
    # Random cell access is extremely slow in openpyxl read_only mode because
    # each ws.cell lookup can rescan the stream. This workbook is small enough
    # to load normally, and normal mode keeps the generation deterministic.
    wb = load_workbook(EXCEL, data_only=True, read_only=False)
    ws = wb[SHEET_NAME]

    def make_record(row: int) -> ChecklistRecord:
        values = [safe_cell(ws.cell(row, col).value) for col in range(1, 13)]
        codes = unique_ordered((*extract_codes(values[3]), *extract_codes(values[5])))
        return ChecklistRecord(
            row=row,
            contract_status=values[0],
            level=values[1],
            category=values[2],
            contract_code=values[3],
            contract_name=values[4],
            planning_code=values[5],
            planning_name=values[6],
            dev_rr=values[7],
            zerost_rr=values[8],
            opinion=values[9],
            client_feedback=values[10],
            extra_opinion=values[11],
            codes=codes,
        )

    v1_records = [make_record(row) for row in range(V1_START_ROW, V1_END_ROW + 1)]
    v2_records = [make_record(row) for row in range(V2_START_ROW, ws.max_row + 1)]
    return v1_records, v2_records


def records_to_code_map(records: Iterable[ChecklistRecord]) -> dict[str, list[ChecklistRecord]]:
    code_map: dict[str, list[ChecklistRecord]] = defaultdict(list)
    for record in records:
        for code in record.codes:
            code_map[code].append(record)
    return dict(code_map)


def docs2_source_files() -> list[Path]:
    files: list[Path] = []
    for path in sorted(DOCS2.rglob("*.md")):
        rel = path.relative_to(DOCS2)
        first = rel.parts[0]
        if first in EXCLUDED_DOCS2_TOP_DIRS:
            continue
        if first.startswith("D") and len(rel.parts) >= 2:
            files.append(path)
    return files


def line_number_at(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def split_sections(path: Path) -> list[Section]:
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(DOCS2)
    matches = list(SECTION_RE.finditer(text))
    sections: list[Section] = []

    def build_section(title: str, start: int, end: int) -> Section:
        content = text[start:end].strip()
        heading_codes = extract_codes(title)
        body_codes = extract_codes(content)
        ordered_codes = unique_ordered((*extract_codes(title), *extract_codes(content)))
        return Section(
            source_path=path,
            rel_path=rel,
            title=title,
            start_line=line_number_at(text, start),
            content=content,
            heading_codes=heading_codes,
            body_codes=body_codes,
            ordered_codes=ordered_codes,
        )

    if not matches:
        sections.append(build_section("문서 전체", 0, len(text)))
        return sections

    preamble = text[: matches[0].start()].strip()
    if preamble:
        sections.append(build_section("문서 서문", 0, matches[0].start()))

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        sections.append(build_section(match.group(1), start, end))
    return sections


def is_support_section(section: Section) -> bool:
    title = section.title
    support_keywords = (
        "문서 서문",
        "도메인 개요",
        "핵심 원칙",
        "공통",
        "권한",
        "상태",
        "운영 정책",
        "운영정책",
        "자동화",
        "알림",
        "정책",
        "KPI",
        "외부 연동",
        "예외",
        "토스트",
        "용어",
        "기준",
    )
    return any(keyword in title for keyword in support_keywords)


def first_scope_from_ordered_codes(
    ordered_codes: Iterable[str], v1_codes: set[str], v2_codes: set[str]
) -> str:
    for code in ordered_codes:
        if matches_any(code, v1_codes):
            return "V1"
        if matches_any(code, v2_codes):
            return "V2"
    return "V2"


LIST_START_RE = re.compile(r"^\s*(?:[-*+]\s+|\d+\.\s+)")
SUBHEADING_RE = re.compile(r"^\s{0,3}#{3,6}\s+")
MAIN_HEADING_RE = re.compile(r"^\s{0,3}##\s+")
TABLE_SEPARATOR_RE = re.compile(r"^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*$")

TERM_RE = re.compile(r"[가-힣A-Za-z0-9]+")
COMMON_SCOPE_TERMS = {
    "가능",
    "관리",
    "권한",
    "기능",
    "기록",
    "기준",
    "내용",
    "데이터",
    "목록",
    "메모",
    "미리보기",
    "문구",
    "버튼",
    "사용",
    "상세",
    "선택",
    "설정",
    "세부",
    "수정",
    "수업",
    "연동",
    "이력",
    "운영",
    "입력",
    "액션",
    "자동",
    "정보",
    "정책",
    "조회",
    "출처",
    "처리",
    "추가",
    "코드",
    "테이블",
    "필터",
    "표시",
    "항목",
    "화면",
    "확인",
    "회원",
    "키오스크",
}
TERM_WHITELIST = {
    "결제링크",
    "대기열",
    "무효화",
    "재발송",
}


def is_table_line(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and stripped.endswith("|")


def parse_markdown_blocks(lines: list[str]) -> list[MarkdownBlock]:
    blocks: list[MarkdownBlock] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue

        if SUBHEADING_RE.match(line):
            blocks.append(MarkdownBlock("heading", (line.rstrip(),)))
            index += 1
            continue

        if is_table_line(line):
            start = index
            while index < len(lines) and is_table_line(lines[index]):
                index += 1
            blocks.append(MarkdownBlock("table", tuple(line.rstrip() for line in lines[start:index])))
            continue

        if LIST_START_RE.match(line):
            start = index
            index += 1
            while index < len(lines):
                next_line = lines[index]
                if not next_line.strip():
                    break
                if SUBHEADING_RE.match(next_line) or is_table_line(next_line) or LIST_START_RE.match(next_line):
                    break
                index += 1
            blocks.append(MarkdownBlock("list", tuple(line.rstrip() for line in lines[start:index])))
            continue

        start = index
        index += 1
        while index < len(lines):
            next_line = lines[index]
            if not next_line.strip():
                break
            if SUBHEADING_RE.match(next_line) or is_table_line(next_line) or LIST_START_RE.match(next_line):
                break
            index += 1
        blocks.append(MarkdownBlock("paragraph", tuple(line.rstrip() for line in lines[start:index])))

    return blocks


def matched_codes_for_text(
    text: str, v1_codes: set[str], effective_v2_codes: set[str]
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    codes = extract_codes(text)
    matched_v1 = unique_ordered(match for code in codes for match in related_matches(code, v1_codes))
    matched_v2 = unique_ordered(match for code in codes for match in related_matches(code, effective_v2_codes))
    return matched_v1, matched_v2


def scope_terms_from_text(text: str) -> set[str]:
    terms: set[str] = set()
    for raw in TERM_RE.findall(text):
        term = raw.strip()
        upper = term.upper()
        if CODE_RE.fullmatch(term):
            continue
        if re.fullmatch(r"[A-Z0-9]+", upper):
            continue
        if term in COMMON_SCOPE_TERMS:
            continue
        if term in TERM_WHITELIST or len(term) >= 4:
            terms.add(term)
    return terms


def scope_terms_for_codes(
    codes: Iterable[str], code_map: dict[str, list[ChecklistRecord]]
) -> set[str]:
    terms: set[str] = set()
    for code in codes:
        for candidate, records in code_map.items():
            if not code_related(code, candidate):
                continue
            for record in records:
                terms.update(scope_terms_from_text(record.contract_name))
                terms.update(scope_terms_from_text(record.planning_name))
    return terms


def classify_text_scope(
    text: str,
    primary: str,
    v1_codes: set[str],
    effective_v2_codes: set[str],
    v2_terms: set[str],
    force_v2: bool = False,
) -> tuple[str, tuple[str, ...], tuple[str, ...], str]:
    matched_v1, matched_v2 = matched_codes_for_text(text, v1_codes, effective_v2_codes)
    has_v2_term = bool(v2_terms and any(term in text for term in v2_terms))
    if matched_v2:
        warning = ""
        if matched_v1:
            warning = "V1/V2 코드가 같은 블록에 함께 있어 해당 블록 전체를 V2로 이동했습니다."
        return "V2", matched_v1, matched_v2, warning
    if has_v2_term:
        warning = "V2 전용 용어가 포함된 블록을 V2로 이동했습니다."
        if matched_v1:
            warning = "V1 코드와 V2 전용 용어가 같은 블록에 함께 있어 해당 블록 전체를 V2로 이동했습니다."
        return "V2", matched_v1, (), warning
    if force_v2:
        warning = "V2 주제 제목 아래의 블록을 V2로 이동했습니다."
        if matched_v1:
            warning = "V1 코드가 있지만 V2 주제 제목 아래에 있어 해당 블록 전체를 V2로 이동했습니다."
        return "V2", matched_v1, (), warning
    if matched_v1:
        return "V1", matched_v1, (), ""
    return primary, (), (), ""


def table_header_and_rows(lines: tuple[str, ...]) -> tuple[list[str], list[str]]:
    if len(lines) >= 2 and TABLE_SEPARATOR_RE.match(lines[1]):
        return list(lines[:2]), list(lines[2:])
    return list(lines[:1]), list(lines[1:])


def add_rendered_block(target: list[str], lines: Iterable[str]) -> None:
    clean_lines = [line.rstrip() for line in lines if line is not None]
    if not clean_lines:
        return
    if target and target[-1] != "":
        target.append("")
    target.extend(clean_lines)


def split_table_block(
    block: MarkdownBlock,
    primary: str,
    v1_codes: set[str],
    effective_v2_codes: set[str],
    v2_terms: set[str],
    force_v2: bool = False,
) -> tuple[dict[str, list[str]], dict[str, tuple[str, ...]], dict[str, tuple[str, ...]], list[str]]:
    header, rows = table_header_and_rows(block.lines)
    scoped_rows: dict[str, list[str]] = {"V1": [], "V2": []}
    scoped_v1_codes: dict[str, list[str]] = {"V1": [], "V2": []}
    scoped_v2_codes: dict[str, list[str]] = {"V1": [], "V2": []}
    warnings: list[str] = []

    for row in rows:
        scope, matched_v1, matched_v2, warning = classify_text_scope(
            row, primary, v1_codes, effective_v2_codes, v2_terms, force_v2=force_v2
        )
        scoped_rows[scope].append(row)
        scoped_v1_codes[scope].extend(matched_v1)
        scoped_v2_codes[scope].extend(matched_v2)
        if warning:
            warnings.append(warning)

    rendered: dict[str, list[str]] = {}
    for scope, rows_for_scope in scoped_rows.items():
        if rows_for_scope:
            rendered[scope] = [*header, *rows_for_scope]

    return (
        rendered,
        {scope: unique_ordered(codes) for scope, codes in scoped_v1_codes.items()},
        {scope: unique_ordered(codes) for scope, codes in scoped_v2_codes.items()},
        warnings,
    )


def split_section_content(
    section: Section,
    primary: str,
    matched_v2_codes: tuple[str, ...],
    v1_codes: set[str],
    effective_v2_codes: set[str],
    v2_code_map: dict[str, list[ChecklistRecord]],
    global_v2_terms: set[str],
) -> tuple[dict[str, str], dict[str, tuple[str, ...]], dict[str, tuple[str, ...]], tuple[str, ...]]:
    lines = section.content.strip().splitlines()
    if lines and MAIN_HEADING_RE.match(lines[0]):
        main_heading = [lines[0].rstrip()]
        body_lines = lines[1:]
    else:
        main_heading = []
        body_lines = lines

    blocks = parse_markdown_blocks(body_lines)
    v2_terms = set(global_v2_terms)
    v2_terms.update(scope_terms_for_codes(matched_v2_codes, v2_code_map))
    for block in blocks:
        text = "\n".join(block.lines)
        _, block_v2 = matched_codes_for_text(text, v1_codes, effective_v2_codes)
        if block_v2:
            v2_terms.update(scope_terms_from_text(text))
    section_force_v2 = bool(v2_terms and any(term in section.title for term in v2_terms))

    outputs: dict[str, list[str]] = {"V1": list(main_heading), "V2": list(main_heading)}
    has_content: dict[str, bool] = {"V1": False, "V2": False}
    scoped_v1_codes: dict[str, list[str]] = {"V1": [], "V2": []}
    scoped_v2_codes: dict[str, list[str]] = {"V1": [], "V2": []}
    warnings: list[str] = []
    active_heading: tuple[str, ...] = ()
    active_heading_force_v2 = False
    flushed_heading: dict[str, tuple[str, ...]] = {"V1": (), "V2": ()}

    def flush_heading(scope: str) -> None:
        if active_heading and flushed_heading[scope] != active_heading:
            add_rendered_block(outputs[scope], active_heading)
            flushed_heading[scope] = active_heading

    for block in blocks:
        if block.kind == "heading":
            active_heading = block.lines
            heading_text = "\n".join(block.lines)
            active_heading_force_v2 = bool(v2_terms and any(term in heading_text for term in v2_terms))
            continue

        if block.kind == "table":
            rendered, table_v1, table_v2, table_warnings = split_table_block(
                block,
                primary,
                v1_codes,
                effective_v2_codes,
                v2_terms,
                force_v2=section_force_v2 or active_heading_force_v2,
            )
            warnings.extend(table_warnings)
            for scope, table_lines in rendered.items():
                flush_heading(scope)
                add_rendered_block(outputs[scope], table_lines)
                has_content[scope] = True
                scoped_v1_codes[scope].extend(table_v1[scope])
                scoped_v2_codes[scope].extend(table_v2[scope])
            continue

        text = "\n".join(block.lines)
        if section_screen_id(section) == "SCR-M004" and "15개 탭" in text:
            for scope in ("V1", "V2"):
                flush_heading(scope)
                add_rendered_block(outputs[scope], block.lines)
                has_content[scope] = True
            continue
        scope, block_v1, block_v2, warning = classify_text_scope(
            text,
            primary,
            v1_codes,
            effective_v2_codes,
            v2_terms,
            force_v2=section_force_v2 or active_heading_force_v2,
        )
        flush_heading(scope)
        add_rendered_block(outputs[scope], block.lines)
        has_content[scope] = True
        scoped_v1_codes[scope].extend(block_v1)
        scoped_v2_codes[scope].extend(block_v2)
        if warning:
            warnings.append(warning)

    contents: dict[str, str] = {}
    for scope in ("V1", "V2"):
        if has_content[scope]:
            contents[scope] = "\n".join(outputs[scope]).strip()

    return (
        contents,
        {scope: unique_ordered(codes) for scope, codes in scoped_v1_codes.items()},
        {scope: unique_ordered(codes) for scope, codes in scoped_v2_codes.items()},
        tuple(unique_ordered(warnings)),
    )


def format_record(record: ChecklistRecord) -> str:
    name = record.planning_name or record.contract_name
    code = record.planning_code or record.contract_code
    if name:
        return f"{record.row}행 `{code}` {name}"
    return f"{record.row}행 `{code}`"


def format_basis(
    matched_codes: Iterable[str],
    code_map: dict[str, list[ChecklistRecord]],
    fallback: str,
) -> str:
    codes = tuple(matched_codes)
    if not codes:
        return fallback

    parts: list[str] = []
    for code in codes[:6]:
        related_records: list[ChecklistRecord] = []
        for candidate, records in code_map.items():
            if code_related(code, candidate):
                related_records.extend(records)
        if related_records:
            parts.append(f"`{code}`: {format_record(related_records[0])}")
        else:
            parts.append(f"`{code}`")
    if len(codes) > 6:
        parts.append(f"외 {len(codes) - 6}개")
    return "; ".join(parts)


def decide_sections(
    all_sections: list[Section],
    v1_codes: set[str],
    effective_v2_codes: set[str],
    v1_code_map: dict[str, list[ChecklistRecord]],
    v2_code_map: dict[str, list[ChecklistRecord]],
) -> list[SectionDecision]:
    grouped: dict[Path, list[Section]] = defaultdict(list)
    for section in all_sections:
        grouped[section.rel_path].append(section)

    global_v2_terms = scope_terms_for_codes(effective_v2_codes, v2_code_map)
    decisions: list[SectionDecision] = []
    for rel_path, sections in grouped.items():
        raw: list[tuple[Section, tuple[str, ...], tuple[str, ...], str, bool]] = []
        file_has_v1 = False
        file_has_v2 = False

        for section in sections:
            matched_v1 = unique_ordered(
                match for code in section.ordered_codes for match in related_matches(code, v1_codes)
            )
            matched_v2 = unique_ordered(
                match for code in section.ordered_codes for match in related_matches(code, effective_v2_codes)
            )
            if matched_v1:
                file_has_v1 = True
            if matched_v2:
                file_has_v2 = True
            primary = first_scope_from_ordered_codes(section.ordered_codes, v1_codes, effective_v2_codes)
            has_v2_terms = bool(global_v2_terms and any(term in section.content for term in global_v2_terms))
            if has_v2_terms:
                file_has_v2 = True
            raw.append((section, matched_v1, matched_v2, primary, has_v2_terms))

        for section, matched_v1, matched_v2, primary, has_v2_terms in raw:
            output_scopes: list[tuple[str, str, tuple[str, ...], tuple[str, ...], str, str]] = []
            warning = ""

            if matched_v1 and (matched_v2 or has_v2_terms):
                contents, scoped_v1, scoped_v2, split_warnings = split_section_content(
                    section=section,
                    primary="V1",
                    matched_v2_codes=matched_v2,
                    v1_codes=v1_codes,
                    effective_v2_codes=effective_v2_codes,
                    v2_code_map=v2_code_map,
                    global_v2_terms=global_v2_terms,
                )
                base_warning = "원본 섹션에 V1/V2 항목이 함께 있어 표/목록/문단 단위로 자동 분리했습니다."
                if has_v2_terms and not matched_v2:
                    base_warning = "원본 섹션에 V2 전용 용어가 포함되어 표/목록/문단 단위로 자동 분리했습니다."
                if split_warnings:
                    base_warning += " " + " / ".join(split_warnings[:4])
                    if len(split_warnings) > 4:
                        base_warning += f" / 외 {len(split_warnings) - 4}건"

                for scope in ("V1", "V2"):
                    content = contents.get(scope, "")
                    if not content:
                        continue
                    actual_v1, actual_v2 = matched_codes_for_text(content, v1_codes, effective_v2_codes)
                    out_v1 = actual_v1 or scoped_v1.get(scope, ())
                    out_v2 = actual_v2 or scoped_v2.get(scope, ())
                    if scope == "V1" and not out_v1:
                        out_v1 = matched_v1
                    if scope == "V2" and not out_v2:
                        out_v2 = matched_v2
                    output_scopes.append((scope, f"{scope}_SPLIT", out_v1, out_v2, base_warning, content))
            elif matched_v1:
                output_scopes.append(("V1", "V1", matched_v1, (), "", section.content.strip()))
            elif matched_v2:
                output_scopes.append(("V2", "V2", (), matched_v2, "", section.content.strip()))
            elif is_support_section(section) and file_has_v1:
                if has_v2_terms:
                    contents, scoped_v1, scoped_v2, split_warnings = split_section_content(
                        section=section,
                        primary="V1",
                        matched_v2_codes=(),
                        v1_codes=v1_codes,
                        effective_v2_codes=effective_v2_codes,
                        v2_code_map=v2_code_map,
                        global_v2_terms=global_v2_terms,
                    )
                    support_warning = "직접 매칭 코드는 없지만 V2 전용 용어가 포함된 보조 섹션이라 항목 단위로 자동 분리했습니다."
                    if split_warnings:
                        support_warning += " " + " / ".join(split_warnings[:4])
                    if contents.get("V1"):
                        output_scopes.append(
                            ("V1", "V1_SUPPORT_SPLIT", scoped_v1.get("V1", ()), scoped_v2.get("V1", ()), support_warning, contents["V1"])
                        )
                    if contents.get("V2"):
                        output_scopes.append(
                            ("V2", "V2_SUPPORT_SPLIT", scoped_v1.get("V2", ()), scoped_v2.get("V2", ()), support_warning, contents["V2"])
                        )
                else:
                    support_warning = "직접 매칭 코드는 없지만 같은 원본 파일의 V1 구현 이해에 필요한 공통/운영 보조 섹션입니다."
                    output_scopes.append(("V1", "V1_SUPPORT", (), (), support_warning, section.content.strip()))
                    if file_has_v2:
                        output_scopes.append(("V2", "V2_SUPPORT", (), (), "V2 구현에도 공통으로 필요한 보조 섹션입니다.", section.content.strip()))
            else:
                output_scopes.append(("V2", "V2_UNMAPPED", (), (), "체크리스트 V1 코드와 직접 매칭되지 않아 V2/보류 영역으로 배치했습니다.", section.content.strip()))

            for scope, classification, out_v1, out_v2, out_warning, content in output_scopes:
                fallback = (
                    "직접 매칭 코드 없음. 같은 원본 파일의 구현 기준을 이해하기 위한 보조 섹션입니다."
                    if "SUPPORT" in classification
                    else "직접 매칭 코드 없음. V1 행 범위에 포함되지 않은 기타/보류 섹션입니다."
                )
                if scope == "V1":
                    basis = format_basis(out_v1, v1_code_map, fallback)
                else:
                    basis = format_basis(out_v2, v2_code_map, fallback)
                output_path = DOCS4 / scope / rel_path
                decisions.append(
                    SectionDecision(
                        section=section,
                        output_scope=scope,
                        classification=classification,
                        matched_v1_codes=out_v1,
                        matched_v2_codes=out_v2,
                        basis=basis,
                        warning=out_warning,
                        output_path=output_path,
                        content=content,
                    )
                )

    return decisions


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def records_csv_rows(records: list[ChecklistRecord]) -> list[dict[str, object]]:
    return [
        {
            "row": record.row,
            "contract_status": record.contract_status,
            "level": record.level,
            "category": record.category,
            "contract_code": record.contract_code,
            "contract_name": record.contract_name,
            "planning_code": record.planning_code,
            "planning_name": record.planning_name,
            "dev_rr": record.dev_rr,
            "zerost_rr": record.zerost_rr,
            "opinion": record.opinion,
            "client_feedback": record.client_feedback,
            "extra_opinion": record.extra_opinion,
            "extracted_codes": ", ".join(record.codes),
        }
        for record in records
    ]


def expand_member_dialog_ranges(content: str) -> str:
    if "DLG-M001~M030" not in content and "DLG-M001～M030" not in content:
        return content
    replacement = ", ".join(MEMBER_DIALOGS_FULL)
    content = content.replace("DLG-M001~M030 (회원관리 전체 다이얼로그)", replacement)
    content = content.replace("DLG-M001～M030 (회원관리 전체 다이얼로그)", replacement)
    content = content.replace("DLG-M001~M030", replacement)
    content = content.replace("DLG-M001～M030", replacement)
    return content


def section_screen_id(section: Section) -> str:
    if section.heading_codes and is_screen_ref(section.heading_codes[0]):
        return normalize_code(section.heading_codes[0])
    refs = extract_screen_refs(section.title)
    return refs[0] if refs else ""


def scope_feature_codes(
    features: tuple[str, ...],
    decision: SectionDecision,
    v1_codes: set[str],
    effective_v2_codes: set[str],
) -> tuple[str, ...]:
    if not features:
        return ()
    if decision.output_scope == "V2":
        scoped = [feature for feature in features if matches_any(feature, effective_v2_codes)]
        return tuple(scoped) or features
    if decision.classification in {"V1_REFERENCED_COPY", "V1_SHARED_REF"}:
        return features
    scoped = [feature for feature in features if matches_any(feature, v1_codes)]
    return tuple(scoped)


def set_linked_feature_line(content: str, features: tuple[str, ...], screen_id: str, admin_known: bool) -> str:
    if features:
        line = "> 연결 기능: " + ", ".join(features)
    elif admin_known:
        line = "> 연결 기능: 없음 (V1 범위 직접 연결 기능 없음; 공통/보조 화면 또는 V2 기능은 V2 문서에서 관리)"
    else:
        line = f"> 연결 기능: 없음 ({screen_id}는 docs4 내부에서 독립 보조 화면/다이얼로그로 관리)"

    if LINKED_FEATURE_LINE_RE.search(content):
        return LINKED_FEATURE_LINE_RE.sub(line, content, count=1)

    lines = content.splitlines()
    if not lines:
        return line
    insert_at = 1 if lines[0].startswith("## ") else 0
    while insert_at < len(lines) and (not lines[insert_at].strip() or lines[insert_at].lstrip().startswith(">")):
        insert_at += 1
    lines.insert(insert_at, line)
    return "\n".join(lines)


def enrich_linked_features(
    decisions: list[SectionDecision],
    admin_feature_codes: dict[str, tuple[str, ...]],
    v1_codes: set[str],
    effective_v2_codes: set[str],
) -> list[SectionDecision]:
    enriched: list[SectionDecision] = []
    for decision in decisions:
        screen_id = section_screen_id(decision.section)
        if not screen_id:
            enriched.append(decision)
            continue
        admin_known = screen_id in admin_feature_codes
        features = scope_feature_codes(admin_feature_codes.get(screen_id, ()), decision, v1_codes, effective_v2_codes)
        content = set_linked_feature_line(decision.content, features, screen_id, admin_known)
        if content == decision.content:
            enriched.append(decision)
            continue
        warning = decision.warning
        suffix = "연결 기능 기준으로 범위 내 기능 코드를 명시했습니다."
        if not features:
            suffix = "범위 내 직접 연결 기능 없음으로 명시했습니다."
        warning = (warning + " " if warning else "") + suffix
        enriched.append(
            SectionDecision(
                section=decision.section,
                output_scope=decision.output_scope,
                classification=decision.classification,
                matched_v1_codes=decision.matched_v1_codes,
                matched_v2_codes=decision.matched_v2_codes,
                basis=decision.basis,
                warning=warning,
                output_path=decision.output_path,
                content=content,
            )
        )
    return enriched


def apply_docs4_postprocessing(
    decisions: list[SectionDecision],
    admin_feature_codes: dict[str, tuple[str, ...]],
    v1_codes: set[str],
    effective_v2_codes: set[str],
) -> list[SectionDecision]:
    """Apply delivery rules that depend on cross-section references.

    - V1 must contain the definition for any SCR/DLG it references.
    - SCR-H1001 automation policy library and its dialog are delivered in both
      V1 and V2 because automation policies are shared planning infrastructure.
    - Broad member dialog ranges are expanded to concrete dialog IDs.
    """
    processed: list[SectionDecision] = []
    for decision in decisions:
        content = expand_member_dialog_ranges(decision.content)
        if content != decision.content:
            decision = SectionDecision(
                section=decision.section,
                output_scope=decision.output_scope,
                classification=decision.classification,
                matched_v1_codes=decision.matched_v1_codes,
                matched_v2_codes=decision.matched_v2_codes,
                basis=decision.basis,
                warning=(
                    (decision.warning + " " if decision.warning else "")
                    + "회원관리 전체 다이얼로그 범위 참조를 실제 DLG-M001~DLG-M030 목록으로 명시했습니다."
                ),
                output_path=decision.output_path,
                content=content,
            )
        processed.append(decision)

    decisions = processed
    by_screen_scope: dict[tuple[str, str], SectionDecision] = {}
    screen_ids_by_section: dict[int, str] = {}
    for decision in decisions:
        screen_id = section_screen_id(decision.section)
        if not screen_id:
            continue
        screen_ids_by_section[id(decision.section)] = screen_id
        by_screen_scope.setdefault((screen_id, decision.output_scope), decision)

    def clone_to_scope(source: SectionDecision, scope: str, classification: str, reason: str) -> SectionDecision:
        target_path = DOCS4 / scope / source.section.rel_path
        return SectionDecision(
            section=source.section,
            output_scope=scope,
            classification=classification,
            matched_v1_codes=source.matched_v1_codes,
            matched_v2_codes=source.matched_v2_codes,
            basis=reason,
            warning="V1 참조 무결성을 위해 동일 정의를 양쪽 범위에 복사했습니다.",
            output_path=target_path,
            content=source.content,
        )

    # Explicit shared screens first.
    for screen_id in sorted(FORCE_BOTH_SCREEN_IDS):
        for source_scope, target_scope in (("V2", "V1"), ("V1", "V2")):
            if (screen_id, source_scope) not in by_screen_scope or (screen_id, target_scope) in by_screen_scope:
                continue
            source = by_screen_scope[(screen_id, source_scope)]
            cloned = clone_to_scope(
                source,
                target_scope,
                f"{target_scope}_SHARED_REF",
                f"`{screen_id}`는 V1/V2 공통 참조 화면으로 확정되어 {target_scope}에도 포함했습니다.",
            )
            decisions.append(cloned)
            by_screen_scope[(screen_id, target_scope)] = cloned

    # Iteratively include every V2-only definition referenced by V1 content.
    changed = True
    while changed:
        changed = False
        v1_refs: set[str] = set(FORCE_BOTH_SCREEN_IDS)
        for decision in decisions:
            if decision.output_scope != "V1":
                continue
            self_id = screen_ids_by_section.get(id(decision.section), "")
            for ref in extract_screen_refs(decision.content):
                if ref != self_id:
                    v1_refs.add(ref)

        for ref in sorted(v1_refs):
            if (ref, "V1") in by_screen_scope or (ref, "V2") not in by_screen_scope:
                continue
            source = by_screen_scope[(ref, "V2")]
            cloned = clone_to_scope(
                source,
                "V1",
                "V1_REFERENCED_COPY",
                f"V1 문서가 `{ref}`를 참조하므로 원본 정의 섹션을 V1에 복사했습니다.",
            )
            decisions.append(cloned)
            by_screen_scope[(ref, "V1")] = cloned
            changed = True

    return enrich_linked_features(decisions, admin_feature_codes, v1_codes, effective_v2_codes)


def section_note(decision: SectionDecision) -> str:
    lines = [
        "> **docs4 Scope**: " + decision.output_scope,
        "> **분류**: `" + decision.classification + "`",
        "> **분류 근거**: " + decision.basis,
    ]
    if decision.warning:
        lines.append("> **주의**: " + decision.warning)
    return "\n".join(lines) + "\n\n"


def write_scope_docs(decisions: list[SectionDecision]) -> None:
    by_output: dict[Path, list[SectionDecision]] = defaultdict(list)
    for decision in decisions:
        by_output[decision.output_path].append(decision)

    for output_path, output_decisions in sorted(by_output.items()):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        source_rel = output_decisions[0].section.rel_path.as_posix()
        scope = output_decisions[0].output_scope
        title = output_path.stem
        header = [
            f"# {title}",
            "",
            "> **docs4 Scope 문서**",
            f"> - 원본: `docs2/{source_rel}`",
            f"> - 범위: `{scope}`",
            f"> - 생성 기준: `{EXCEL.relative_to(ROOT).as_posix()}` `{SHEET_NAME}` 시트, V1=`{V1_START_ROW}~{V1_END_ROW}`행",
            "> - 원칙: 원본 기획 내용을 임의 축소하지 않고, 섹션 내부 표/목록/문단 항목까지 V1/V2에 재배치했습니다.",
            "",
        ]
        body_parts: list[str] = []
        for decision in output_decisions:
            body_parts.append(section_note(decision))
            body_parts.append(decision.content.strip())
            body_parts.append("\n")
        output_path.write_text("\n".join(header + body_parts).rstrip() + "\n", encoding="utf-8")


def write_indexes(decisions: list[SectionDecision]) -> None:
    for scope in ("V1", "V2"):
        rows = [decision for decision in decisions if decision.output_scope == scope]
        by_file: dict[Path, list[SectionDecision]] = defaultdict(list)
        for decision in rows:
            by_file[decision.output_path].append(decision)

        lines = [
            f"# docs4 {scope} INDEX",
            "",
            f"- 생성 기준: `{EXCEL.relative_to(ROOT).as_posix()}` `{SHEET_NAME}`",
            f"- V1 기준 행: `{V1_START_ROW}~{V1_END_ROW}`",
            f"- {scope} 출력 파일 수: {len(by_file)}",
            f"- {scope} 출력 섹션 수: {len(rows)}",
            "",
            "| 파일 | 섹션 수 | 분류 요약 |",
            "|---|---:|---|",
        ]
        for path, items in sorted(by_file.items()):
            rel = path.relative_to(DOCS4).as_posix()
            counts = Counter(item.classification for item in items)
            summary = ", ".join(f"{key} {value}" for key, value in sorted(counts.items()))
            lines.append(f"| `{rel}` | {len(items)} | {summary} |")
        (DOCS4 / f"{scope}_INDEX.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_readme(
    v1_records: list[ChecklistRecord],
    raw_v2_records: list[ChecklistRecord],
    decisions: list[SectionDecision],
    v1_codes: set[str],
    effective_v2_codes: set[str],
    v2_overrides: list[dict[str, object]],
) -> None:
    counts = Counter(decision.classification for decision in decisions)
    lines = [
        "# docs4",
        "",
        "docs4는 `docs2` 기획서를 개발 범위 기준으로 재배치한 납품용 문서입니다.",
        "",
        "## 생성 기준",
        "",
        f"- 체크리스트: `{EXCEL.relative_to(ROOT).as_posix()}`",
        f"- 시트: `{SHEET_NAME}`",
        f"- V1: {V1_START_ROW}행부터 {V1_END_ROW}행까지",
        f"- V2: {V2_START_ROW}행 이후 및 V1 코드와 직접 매칭되지 않는 보류/기타 섹션",
        "- V1/V2가 같은 섹션에 섞인 경우 표 row, bullet, numbered step, 문단 단위로 분리해 V2 항목을 V1에서 제외했습니다.",
        "- `_공통`은 V1/V2 양쪽에서 참조하는 공통 정책/정의입니다.",
        "",
        "## 산출물",
        "",
        "- `V1/`: 1차 개발 범위 문서",
        "- `V2/`: 2차 이후 범위 또는 V1 직접 매칭이 없는 문서",
        "- `_공통/`: 공통 권한, 알림, KPI, NFR 등 공유 정의",
        "- `_scope/`: 체크리스트 원본 추출, 섹션 매핑, 검증 리포트",
        "",
        "## 요약",
        "",
        f"- V1 체크리스트 행 수: {len(v1_records)}",
        f"- V1 고유 코드 수: {len(v1_codes)}",
        f"- V2 원본 체크리스트 행 수: {len(raw_v2_records)}",
        f"- V2 유효 고유 코드 수: {len(effective_v2_codes)}",
        f"- 동일/상하위 코드 중복으로 V2에서 제외한 코드 수: {len(v2_overrides)}",
        f"- 섹션 분류 요약: {', '.join(f'{key} {value}' for key, value in sorted(counts.items()))}",
        "",
        "## 사용 방법",
        "",
        "1. V1 개발자는 `docs4/V1`과 `docs4/_공통`을 우선 봅니다.",
        "2. 섹션 상단의 `docs4 Scope` 메타 블록에서 엑셀 행과 매칭 근거를 확인합니다.",
        "3. 매칭 근거가 `V1_SUPPORT`, `V2_UNMAPPED`, `V1_SPLIT`, `V2_SPLIT`인 항목은 `_scope/scope_verification_report.md`에서 추가 확인합니다.",
        "",
    ]
    (DOCS4 / "README.md").write_text("\n".join(lines), encoding="utf-8")


def copy_common_docs() -> None:
    source_common = DOCS2 / "_공통"
    target_common = DOCS4 / "_공통"
    if source_common.exists():
        shutil.copytree(source_common, target_common)

    unresolved = DOCS2 / "_정책미확정_확인필요.md"
    if unresolved.exists():
        shutil.copy2(unresolved, DOCS4 / "_정책미확정_확인필요.md")


def read_docs2_id_map_metadata() -> dict[str, dict[str, str]]:
    path = DOCS2 / "_공통" / "01_ID매핑_v2_v3.md"
    if not path.exists():
        return {}

    metadata: dict[str, dict[str, str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or line.startswith("|---") or line.startswith("| ID "):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 5:
            continue
        screen_id = normalize_code(cells[0])
        metadata[screen_id] = {
            "name": cells[1],
            "domain": cells[2],
            "route": cells[3],
        }
    return metadata


def build_docs4_heading_locations() -> dict[str, list[dict[str, object]]]:
    locations: dict[str, list[dict[str, object]]] = defaultdict(list)
    for scope in ("V1", "V2"):
        for path in sorted((DOCS4 / scope).rglob("*.md")):
            rel = path.relative_to(DOCS4).as_posix()
            for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                match = SCREEN_HEADING_RE.match(line)
                if not match:
                    continue
                screen_id = normalize_code(match.group(1))
                title = match.group(2).strip()
                locations[screen_id].append(
                    {
                        "scope": scope,
                        "path": rel,
                        "line": line_no,
                        "title": title,
                    }
                )
    for items in locations.values():
        items.sort(key=lambda item: (0 if item["scope"] == "V1" else 1, str(item["path"]), int(item["line"])))
    return locations


def build_docs4_linked_code_locations() -> dict[str, list[dict[str, object]]]:
    locations: dict[str, list[dict[str, object]]] = defaultdict(list)
    for scope in ("V1", "V2"):
        for path in sorted((DOCS4 / scope).rglob("*.md")):
            rel = path.relative_to(DOCS4).as_posix()
            current_heading: dict[str, object] | None = None
            for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                heading = SCREEN_HEADING_RE.match(line)
                if heading:
                    current_heading = {
                        "scope": scope,
                        "path": rel,
                        "line": line_no,
                        "title": heading.group(2).strip(),
                    }
                    locations[normalize_code(heading.group(1))].append(current_heading)
                    continue
                if current_heading and line.startswith("> 연결 기능:"):
                    for code in extract_codes(line):
                        locations[code].append(dict(current_heading))
    for items in locations.values():
        items.sort(key=lambda item: (0 if item["scope"] == "V1" else 1, str(item["path"]), int(item["line"])))
    return locations


def build_docs4_common_code_locations() -> dict[str, list[dict[str, object]]]:
    """Index canonical common-code headings inside docs4/_공통."""
    locations: dict[str, list[dict[str, object]]] = defaultdict(list)
    common_root = DOCS4 / "_공통"
    if not common_root.exists():
        return locations
    for path in sorted(common_root.rglob("*.md")):
        rel = path.relative_to(DOCS4).as_posix()
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.lstrip().startswith("#"):
                continue
            title = line.lstrip("#").strip()
            for code in extract_common_ids(line):
                locations[code].append(
                    {
                        "scope": "_공통",
                        "path": rel,
                        "line": line_no,
                        "title": title,
                    }
                )
    def priority(code: str, item: dict[str, object]) -> tuple[int, str, int]:
        path = str(item["path"])
        normalized = normalize_code(code)
        if normalized.startswith("NFR-") and "비기능요구사항_NFR.md" in path:
            return (0, path, int(item["line"]))
        if re.fullmatch(r"[AX]\d{2}", normalized) and "자동화_크론.md" in path:
            return (0, path, int(item["line"]))
        if "공통참조_코드인덱스.md" in path:
            return (2, path, int(item["line"]))
        return (1, path, int(item["line"]))

    for code, items in locations.items():
        items.sort(key=lambda item: priority(code, item))
    return locations


def build_docs2_heading_index() -> dict[str, list[tuple[int, str]]]:
    index: dict[str, list[tuple[int, str]]] = {}
    for path in docs2_source_files():
        rel = path.relative_to(DOCS2).as_posix()
        headings: list[tuple[int, str]] = []
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            match = SCREEN_HEADING_RE.match(line)
            if match:
                headings.append((line_no, normalize_code(match.group(1))))
        if headings:
            index[rel] = headings
    return index


def lookup_docs2_screen_id(index: dict[str, list[tuple[int, str]]], rel_path: str, line_no: int) -> str | None:
    headings = index.get(rel_path)
    if not headings:
        return None
    current: str | None = None
    for heading_line, screen_id in headings:
        if heading_line > line_no:
            if current is None and heading_line - line_no <= 3:
                return screen_id
            break
        current = screen_id
    return current


def choose_docs4_location(
    screen_id: str,
    locations: dict[str, list[dict[str, object]]],
    preferred_scope: str | None,
) -> dict[str, object] | None:
    candidates = locations.get(normalize_code(screen_id), [])
    if not candidates:
        return None
    if preferred_scope:
        for item in candidates:
            if item["scope"] == preferred_scope:
                return item
    for scope in ("V1", "V2"):
        for item in candidates:
            if item["scope"] == scope:
                return item
    return candidates[0]


def find_docs4_code_line(rel_path: str, code: str, preferred_scope: str | None) -> dict[str, object] | None:
    scopes = [preferred_scope] if preferred_scope in {"V1", "V2"} else []
    scopes.extend(scope for scope in ("V1", "V2") if scope not in scopes)
    normalized = normalize_code(code)
    for scope in scopes:
        path = DOCS4 / scope / rel_path
        if not path.exists():
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        for line_no, line in enumerate(lines, 1):
            if "분류 근거" in line or "docs4 Scope" in line:
                continue
            if normalized in extract_codes(line):
                return {"scope": scope, "path": f"{scope}/{rel_path}", "line": line_no}
        for line_no, line in enumerate(lines, 1):
            if normalized in extract_codes(line):
                return {"scope": scope, "path": f"{scope}/{rel_path}", "line": line_no}
    return None


def rewrite_docs4_id_map(locations: dict[str, list[dict[str, object]]]) -> None:
    target = DOCS4 / "_공통" / "01_ID매핑_v2_v3.md"
    if not target.exists():
        return

    metadata = read_docs2_id_map_metadata()
    lines = [
        "# ID 매핑",
        "",
        "이 문서는 docs4 내부의 화면·다이얼로그 섹션 위치만 매핑합니다.",
        "V1/V2가 모두 존재하는 ID는 범위별로 한 줄씩 표기하여 개발자가 현재 범위 문서에서 바로 이동할 수 있게 합니다.",
        "",
        "> `/` route는 역할 기반으로 분기합니다. `superAdmin`/`primary`는 `SCR-101 대시보드 통합`, 그 외 역할은 `SCR-090 지점 대시보드`를 표시합니다.",
        "",
        "| Scope | ID | 이름 | 도메인 | route | 문서 위치 |",
        "|---|---|---|---|---|---|",
    ]
    for screen_id in sorted(locations):
        for item in locations[screen_id]:
            meta = metadata.get(screen_id, {})
            title = str(item["title"]).strip()
            name = meta.get("name") or title or screen_id
            domain = meta.get("domain") or str(item["path"]).split("/", 2)[1]
            route = meta.get("route") or "-"
            location = f"docs4/{item['path']}:{item['line']}"
            lines.append(f"| {item['scope']} | {screen_id} | {name} | {domain} | {route} | {location} |")
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")


def format_docs4_code_location(code: str, target: dict[str, object]) -> str:
    return f"{code} / `docs4/{target['path']}:{target['line']}`"


def has_immediate_docs4_location(line: str, end_index: int) -> bool:
    return re.match(r"\s*/\s*`docs4/[^`]+:\d+`", line[end_index:]) is not None


def is_inside_inline_code(line: str, index: int) -> bool:
    return line[:index].count("`") % 2 == 1


def choose_common_ref_location(
    code: str,
    screen_locations: dict[str, list[dict[str, object]]],
    code_locations: dict[str, list[dict[str, object]]],
    common_locations: dict[str, list[dict[str, object]]],
) -> dict[str, object] | None:
    normalized = normalize_code(code)

    def pick_v1_first(items: list[dict[str, object]]) -> dict[str, object] | None:
        if not items:
            return None
        return sorted(
            items,
            key=lambda item: (
                0 if item.get("scope") == "V1" else 1 if item.get("scope") == "V2" else 2,
                str(item.get("path", "")),
                int(item.get("line", 0)),
            ),
        )[0]

    def choose_prefix_location(locations: dict[str, list[dict[str, object]]], value: str) -> dict[str, object] | None:
        candidates: list[dict[str, object]] = []
        prefix = f"{value}-"
        for key, items in locations.items():
            if key.startswith(prefix):
                candidates.extend(items)
        return pick_v1_first(candidates)

    def choose_parent_location(locations: dict[str, list[dict[str, object]]], value: str) -> dict[str, object] | None:
        parts = value.split("-")
        while len(parts) > 2:
            parts = parts[:-1]
            parent = "-".join(parts)
            target = choose_docs4_location(parent, locations, None)
            if target:
                return target
            target = choose_prefix_location(locations, parent)
            if target:
                return target
        return None

    # preferred_scope=None intentionally means V1 first, then V2.
    target = choose_docs4_location(normalized, screen_locations, None)
    if target:
        return target
    target = choose_prefix_location(screen_locations, normalized)
    if target:
        return target
    target = choose_docs4_location(normalized, code_locations, None)
    if target:
        return target
    target = choose_parent_location(screen_locations, normalized)
    if target:
        return target
    target = choose_parent_location(code_locations, normalized)
    if target:
        return target
    common_candidates = common_locations.get(normalized, [])
    return common_candidates[0] if common_candidates else None


def write_common_unmapped_report(unmapped: list[dict[str, object]], linked_count: int) -> None:
    scope_dir = DOCS4 / "_scope"
    scope_dir.mkdir(parents=True, exist_ok=True)
    csv_path = scope_dir / "common_unmapped_id_report.csv"
    md_path = scope_dir / "common_unmapped_id_report.md"

    rows = sorted(
        unmapped,
        key=lambda row: (str(row["file"]), int(row["line"]), str(row["code"])),
    )
    with csv_path.open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=["file", "line", "code", "reason", "line_text"])
        writer.writeheader()
        writer.writerows(rows)

    lines = [
        "# docs4 _공통 자동 매핑 불가 ID 리포트",
        "",
        f"- 자동 링크 처리: {linked_count}건",
        f"- 자동 매핑 불가: {len(rows)}건",
        "",
    ]
    if rows:
        lines.extend(["| 파일 | 줄 | ID | 사유 | 원문 |", "|---|---:|---|---|---|"])
        for row in rows[:500]:
            line_text = str(row["line_text"]).replace("|", "\\|")
            lines.append(
                f"| {row['file']} | {row['line']} | {row['code']} | {row['reason']} | {line_text} |"
            )
        if len(rows) > 500:
            lines.append(f"| ... | ... | ... | ... | 나머지 {len(rows) - 500}건은 CSV를 확인 |")
    else:
        lines.append("자동 매핑 불가 ID가 없습니다.")
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def auto_link_common_ids(
    screen_locations: dict[str, list[dict[str, object]]],
    code_locations: dict[str, list[dict[str, object]]],
) -> None:
    """Attach docs4 locations to bare IDs in docs4/_공통.

    When an ID exists in both V1 and V2, choose_docs4_location(..., None)
    resolves it to V1 first. IDs with no resolvable docs4 location are
    preserved and reported separately.
    """
    common_root = DOCS4 / "_공통"
    if not common_root.exists():
        write_common_unmapped_report([], 0)
        return

    common_locations = build_docs4_common_code_locations()
    unmapped: list[dict[str, object]] = []
    unmapped_seen: set[tuple[str, int, str, str]] = set()
    linked_count = 0

    def record_unmapped(path: Path, line_no: int, code: str, line_text: str) -> None:
        rel = path.relative_to(DOCS4).as_posix()
        key = (rel, line_no, normalize_code(code), line_text.strip())
        if key in unmapped_seen:
            return
        unmapped_seen.add(key)
        unmapped.append(
            {
                "file": rel,
                "line": line_no,
                "code": normalize_code(code),
                "reason": "docs4 V1/V2/_공통 기준 위치를 자동 산정하지 못함",
                "line_text": line_text.strip(),
            }
        )

    def replace_line(path: Path, line_no: int, line: str) -> str:
        nonlocal linked_count
        stripped = line.strip()
        if not stripped or re.fullmatch(r"\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?", stripped):
            return line
        if stripped.startswith("|") and "docs4/" in line:
            return line

        def replace_backticked(match: re.Match[str]) -> str:
            nonlocal linked_count
            if has_immediate_docs4_location(line, match.end()):
                return match.group(0)
            code = normalize_code(match.group(1))
            if not is_common_planning_id(code):
                return match.group(0)
            target = choose_common_ref_location(code, screen_locations, code_locations, common_locations)
            if not target:
                record_unmapped(path, line_no, code, line)
                return match.group(0)
            linked_count += 1
            return format_docs4_code_location(code, target)

        line_after_backticks = BACKTICKED_COMMON_ID_RE.sub(replace_backticked, line)

        def replace_plain(match: re.Match[str]) -> str:
            nonlocal linked_count
            if has_immediate_docs4_location(line_after_backticks, match.end()):
                return match.group(0)
            if is_inside_inline_code(line_after_backticks, match.start()):
                return match.group(0)
            code = normalize_code(match.group(0))
            if not is_common_planning_id(code):
                return match.group(0)
            target = choose_common_ref_location(code, screen_locations, code_locations, common_locations)
            if not target:
                record_unmapped(path, line_no, code, line_after_backticks)
                return match.group(0)
            linked_count += 1
            return format_docs4_code_location(code, target)

        return COMMON_ID_RE.sub(replace_plain, line_after_backticks)

    for path in sorted(common_root.rglob("*.md")):
        lines = path.read_text(encoding="utf-8").splitlines()
        rewritten = [replace_line(path, line_no, line) for line_no, line in enumerate(lines, 1)]
        path.write_text("\n".join(rewritten) + "\n", encoding="utf-8")

    write_common_unmapped_report(unmapped, linked_count)


def rewrite_docs4_inline_locations() -> None:
    """Convert docs2-relative section references to docs4 V1/V2 locations."""
    locations = build_docs4_heading_locations()
    code_locations = build_docs4_linked_code_locations()
    docs2_index = build_docs2_heading_index()

    def replace_docs2_ref(match: re.Match[str], preferred_scope: str | None) -> str:
        rel_path = match.group(1)
        line_no = int(match.group(2))
        screen_id = lookup_docs2_screen_id(docs2_index, rel_path, line_no)
        if not screen_id:
            return match.group(0).replace("docs2/_정책미확정_확인필요.md", "docs4/_정책미확정_확인필요.md")
        target = choose_docs4_location(screen_id, locations, preferred_scope)
        if not target:
            return match.group(0)
        return f"docs4/{target['path']}:{target['line']}"

    def replace_relative_ref(match: re.Match[str], preferred_scope: str | None) -> str:
        rel_path = match.group(1)
        line_no = int(match.group(2))
        screen_id = lookup_docs2_screen_id(docs2_index, rel_path, line_no)
        if not screen_id:
            return match.group(0)
        target = choose_docs4_location(screen_id, locations, preferred_scope)
        if not target:
            return match.group(0)
        return f"docs4/{target['path']}:{target['line']}"

    def replace_code_relative_ref(match: re.Match[str], preferred_scope: str | None) -> str:
        code = normalize_code(match.group("code"))
        rel_path = match.group("rel")
        target = find_docs4_code_line(rel_path, code, preferred_scope)
        if not target:
            return match.group(0)
        return f"{match.group('code')} / `docs4/{target['path']}:{target['line']}`"

    def replace_docs2_file_without_line(line: str, preferred_scope: str | None) -> str:
        if "docs2/" not in line:
            return line
        codes = sorted(extract_codes(line), key=len, reverse=True)
        target: dict[str, object] | None = None
        for code in codes:
            target = choose_docs4_location(code, locations, preferred_scope)
            if not target:
                target = choose_docs4_location(code, code_locations, preferred_scope)
            if target:
                break
        if not target:
            return line
        return DOCS2_DOMAIN_FILE_RE.sub(f"docs4/{target['path']}:{target['line']}", line)

    target_files = [
        path
        for root in (DOCS4 / "V1", DOCS4 / "V2", DOCS4 / "_공통")
        for path in sorted(root.rglob("*.md"))
    ]
    if (DOCS4 / "_정책미확정_확인필요.md").exists():
        target_files.append(DOCS4 / "_정책미확정_확인필요.md")

    for path in target_files:
        rel_parts = path.relative_to(DOCS4).parts
        preferred_scope = rel_parts[0] if rel_parts and rel_parts[0] in {"V1", "V2"} else None
        text = path.read_text(encoding="utf-8")
        text = text.replace("docs2/_정책미확정_확인필요.md", "docs4/_정책미확정_확인필요.md")
        text = text.replace("`docs2` 기준", "`docs4` 기준")
        text = text.replace("`docs2` 전체", "`docs4` 전체")
        text = text.replace("`docs2`에서", "`docs4`에서")
        text = text.replace("`docs2` 내부", "`docs4` 내부")
        text = DOCS2_DOMAIN_LOC_RE.sub(lambda match: replace_docs2_ref(match, preferred_scope), text)
        text = REL_DOMAIN_LOC_RE.sub(lambda match: replace_relative_ref(match, preferred_scope), text)
        text = CODE_REL_LOC_RE.sub(lambda match: replace_code_relative_ref(match, preferred_scope), text)
        text = "\n".join(replace_docs2_file_without_line(line, preferred_scope) for line in text.splitlines()) + "\n"
        path.write_text(text, encoding="utf-8")

    # ID map must be written after inline replacement so it always reflects
    # the generated docs4 line numbers, not the source docs2 line numbers.
    rewrite_docs4_id_map(locations)
    auto_link_common_ids(locations, code_locations)


def clear_docs4_directory() -> None:
    """Clear docs4 contents while tolerating a locked docs4 root directory on Windows."""
    DOCS4.mkdir(parents=True, exist_ok=True)
    for child in DOCS4.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def write_scope_artifacts(
    v1_records: list[ChecklistRecord],
    raw_v2_records: list[ChecklistRecord],
    v1_codes: set[str],
    raw_v2_codes: set[str],
    effective_v2_codes: set[str],
    decisions: list[SectionDecision],
    all_sections: list[Section],
) -> None:
    scope_dir = DOCS4 / "_scope"
    scope_dir.mkdir(parents=True, exist_ok=True)

    record_fields = [
        "row",
        "contract_status",
        "level",
        "category",
        "contract_code",
        "contract_name",
        "planning_code",
        "planning_name",
        "dev_rr",
        "zerost_rr",
        "opinion",
        "client_feedback",
        "extra_opinion",
        "extracted_codes",
    ]
    write_csv(scope_dir / "v1_checklist_rows_4_751.csv", records_csv_rows(v1_records), record_fields)
    write_csv(scope_dir / "v2_explicit_rows_753_end.csv", records_csv_rows(raw_v2_records), record_fields)

    v2_overrides: list[dict[str, object]] = []
    for code in sorted(raw_v2_codes - effective_v2_codes):
        related_v1 = sorted(candidate for candidate in v1_codes if code_related(code, candidate))
        v2_overrides.append(
            {
                "v2_code": code,
                "related_v1_codes": ", ".join(related_v1),
                "reason": "V1 행 범위에 동일/상위/하위 코드가 있어 V1 코드로 확정하고 V2 매칭에서 제외",
            }
        )
    write_csv(
        scope_dir / "v2_rows_overridden_by_v1_priority.csv",
        v2_overrides,
        ["v2_code", "related_v1_codes", "reason"],
    )

    manifest_rows: list[dict[str, object]] = []
    for decision in decisions:
        section = decision.section
        manifest_rows.append(
            {
                "source_path": f"docs2/{section.rel_path.as_posix()}",
                "output_scope": decision.output_scope,
                "classification": decision.classification,
                "title": section.title,
                "start_line": section.start_line,
                "heading_codes": ", ".join(section.heading_codes),
                "body_codes": ", ".join(section.body_codes),
                "matched_v1_codes": ", ".join(decision.matched_v1_codes),
                "matched_v2_codes": ", ".join(decision.matched_v2_codes),
                "output_path": decision.output_path.relative_to(DOCS4).as_posix(),
                "basis": decision.basis,
                "warning": decision.warning,
            }
        )
    write_csv(
        scope_dir / "section_scope_manifest.csv",
        manifest_rows,
        [
            "source_path",
            "output_scope",
            "classification",
            "title",
            "start_line",
            "heading_codes",
            "body_codes",
            "matched_v1_codes",
            "matched_v2_codes",
            "output_path",
            "basis",
            "warning",
        ],
    )

    section_codes = set(code for section in all_sections for code in section.ordered_codes)
    unmatched_v1 = [
        code for code in sorted(v1_codes) if not any(code_related(code, section_code) for section_code in section_codes)
    ]
    unmatched_v2 = [
        code
        for code in sorted(effective_v2_codes)
        if not any(code_related(code, section_code) for section_code in section_codes)
    ]
    split_decisions = [decision for decision in decisions if decision.classification in {"V1_SPLIT", "V2_SPLIT"}]
    mixed = [decision for decision in decisions if "MIXED" in decision.classification]
    mixed_block_warnings = [
        decision
        for decision in decisions
        if "같은 블록" in decision.warning or "무코드 블록" in decision.warning
    ]
    unmapped = [decision for decision in decisions if decision.classification == "V2_UNMAPPED"]
    support = [decision for decision in decisions if "SUPPORT" in decision.classification]

    counts = Counter(decision.classification for decision in decisions)
    lines = [
        "# docs4 Scope Verification Report",
        "",
        "## 기준",
        "",
        f"- V1 체크리스트: `{EXCEL.relative_to(ROOT).as_posix()}` `{SHEET_NAME}` {V1_START_ROW}~{V1_END_ROW}행",
        f"- V2 명시 항목: 같은 시트 {V2_START_ROW}행 이후",
        "- 동일/상하위 코드가 V1과 V2 양쪽에 있으면 V1 코드로 확정하고 V2 매칭에서는 제외",
        "- V1/V2가 같은 섹션에 섞이면 표 row, bullet, numbered step, 문단 단위로 V1/V2를 분리",
        "- 직접 매칭이 없는 일반 섹션은 V2_UNMAPPED로 보류하되, V1 구현 이해에 필요한 공통/운영 섹션은 V1_SUPPORT로 복사",
        "",
        "## 집계",
        "",
        f"- V1 고유 코드: {len(v1_codes)}",
        f"- V2 원본 고유 코드: {len(raw_v2_codes)}",
        f"- V2 유효 고유 코드: {len(effective_v2_codes)}",
        f"- 동일/상하위 코드 중복으로 V2 제외 코드: {len(v2_overrides)}",
        f"- 소스 섹션 수: {len(all_sections)}",
        f"- 출력 섹션 수: {len(decisions)}",
        f"- 분류 요약: {', '.join(f'{key} {value}' for key, value in sorted(counts.items()))}",
        f"- 항목 단위 자동 분리 섹션: {len(split_decisions)}",
        f"- 미분리 MIXED 섹션: {len(mixed)}",
        f"- 블록 단위 자동 이동 경고: {len(mixed_block_warnings)}",
        f"- V2_UNMAPPED 섹션: {len(unmapped)}",
        f"- SUPPORT 복사 섹션: {len(support)}",
        "",
        "## 반드시 확인해야 하는 항목",
        "",
        "### 1. V1 체크리스트에는 있으나 docs2 섹션 코드로 직접 발견되지 않은 코드",
        "",
    ]
    if unmatched_v1:
        for code in unmatched_v1:
            lines.append(f"- `{code}`")
    else:
        lines.append("- 없음")

    lines.extend(["", "### 2. V1/V2가 같은 섹션에서 항목 단위로 자동 분리된 항목", ""])
    if split_decisions:
        for decision in split_decisions[:200]:
            section = decision.section
            lines.append(
                f"- `{decision.classification}` `{section.rel_path.as_posix()}` L{section.start_line} `{section.title}` "
                f"/ V1=`{', '.join(decision.matched_v1_codes)}` V2=`{', '.join(decision.matched_v2_codes)}`"
            )
        if len(split_decisions) > 200:
            lines.append(f"- 외 {len(split_decisions) - 200}개")
    else:
        lines.append("- 없음")

    lines.extend(["", "### 2-1. 블록 단위 자동 이동 경고", ""])
    if mixed_block_warnings:
        for decision in mixed_block_warnings[:200]:
            section = decision.section
            lines.append(
                f"- `{decision.classification}` `{section.rel_path.as_posix()}` L{section.start_line} `{section.title}` / {decision.warning}"
            )
        if len(mixed_block_warnings) > 200:
            lines.append(f"- 외 {len(mixed_block_warnings) - 200}개")
    else:
        lines.append("- 없음")

    lines.extend(["", "### 3. V2_UNMAPPED 섹션", ""])
    if unmapped:
        for decision in unmapped[:200]:
            section = decision.section
            lines.append(f"- `{section.rel_path.as_posix()}` L{section.start_line} `{section.title}`")
        if len(unmapped) > 200:
            lines.append(f"- 외 {len(unmapped) - 200}개")
    else:
        lines.append("- 없음")

    lines.extend(["", "### 4. V2 유효 코드이나 docs2 섹션 코드로 직접 발견되지 않은 코드", ""])
    if unmatched_v2:
        for code in unmatched_v2:
            lines.append(f"- `{code}`")
    else:
        lines.append("- 없음")

    (scope_dir / "scope_verification_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def validate_output(effective_v2_codes: set[str]) -> None:
    required = [
        DOCS4 / "README.md",
        DOCS4 / "V1_INDEX.md",
        DOCS4 / "V2_INDEX.md",
        DOCS4 / "_공통",
        DOCS4 / "_scope" / "section_scope_manifest.csv",
        DOCS4 / "_scope" / "scope_verification_report.md",
    ]
    missing = [path for path in required if not path.exists()]
    if missing:
        raise RuntimeError("필수 산출물 누락: " + ", ".join(str(path.relative_to(ROOT)) for path in missing))

    source_common_files = [path for path in (DOCS2 / "_공통").rglob("*") if path.is_file()]
    target_common_files = [path for path in (DOCS4 / "_공통").rglob("*") if path.is_file()]
    if len(source_common_files) != len(target_common_files):
        raise RuntimeError(f"_공통 파일 수 불일치: docs2={len(source_common_files)}, docs4={len(target_common_files)}")

    manifest_path = DOCS4 / "_scope" / "section_scope_manifest.csv"
    with manifest_path.open("r", encoding="utf-8-sig", newline="") as fp:
        rows = list(csv.DictReader(fp))
    if not rows:
        raise RuntimeError("section_scope_manifest.csv가 비어 있습니다.")

    missing_outputs = []
    for row in rows:
        output = DOCS4 / row["output_path"]
        if not output.exists():
            missing_outputs.append(row["output_path"])
    if missing_outputs:
        raise RuntimeError("manifest 출력 파일 누락: " + ", ".join(missing_outputs[:20]))

    sample_v1 = next((DOCS4 / row["output_path"] for row in rows if row["output_scope"] == "V1"), None)
    sample_v2 = next((DOCS4 / row["output_path"] for row in rows if row["output_scope"] == "V2"), None)
    for sample in (sample_v1, sample_v2):
        if sample and "docs4 Scope 문서" not in sample.read_text(encoding="utf-8"):
            raise RuntimeError(f"Scope 메타 블록 누락: {sample.relative_to(ROOT)}")

    v2_codes_in_v1: list[str] = []
    allowed_v2_in_v1_paths = {
        row["output_path"]
        for row in rows
        if row["output_scope"] == "V1" and row["classification"] in {"V1_REFERENCED_COPY", "V1_SHARED_REF"}
    }
    for path in sorted((DOCS4 / "V1").rglob("*.md")):
        rel_output = path.relative_to(DOCS4).as_posix()
        if rel_output in allowed_v2_in_v1_paths:
            continue
        text = path.read_text(encoding="utf-8")
        for code in extract_codes(text):
            if matches_any(code, effective_v2_codes):
                v2_codes_in_v1.append(f"{path.relative_to(ROOT).as_posix()}::{normalize_code(code)}")
                break
    if v2_codes_in_v1:
        raise RuntimeError(
            "V1 문서에 V2 코드가 남아 있습니다: " + ", ".join(v2_codes_in_v1[:20])
        )


def generate(force: bool) -> None:
    if not DOCS2.exists():
        raise FileNotFoundError(DOCS2)
    if not EXCEL.exists():
        raise FileNotFoundError(EXCEL)

    if DOCS4.exists():
        if not force:
            raise RuntimeError("docs4가 이미 있습니다. 재생성하려면 --force를 사용하세요.")
        resolved_docs4 = DOCS4.resolve()
        resolved_root = ROOT.resolve()
        if resolved_docs4 == resolved_root or resolved_root not in resolved_docs4.parents:
            raise RuntimeError(f"안전하지 않은 삭제 대상: {resolved_docs4}")
        try:
            shutil.rmtree(DOCS4)
        except PermissionError:
            clear_docs4_directory()

    DOCS4.mkdir(parents=True, exist_ok=True)

    v1_records, raw_v2_records = load_records()
    v1_code_map = records_to_code_map(v1_records)
    raw_v2_code_map = records_to_code_map(raw_v2_records)
    v1_codes = set(v1_code_map)
    raw_v2_codes = set(raw_v2_code_map)
    effective_v2_codes = {
        code for code in raw_v2_codes if not any(code_related(code, v1_code) for v1_code in v1_codes)
    }
    effective_v2_code_map = {code: raw_v2_code_map[code] for code in effective_v2_codes}
    admin_feature_codes = load_admin_screen_feature_codes()

    files = docs2_source_files()
    all_sections: list[Section] = []
    for file in files:
        all_sections.extend(split_sections(file))

    decisions = decide_sections(
        all_sections=all_sections,
        v1_codes=v1_codes,
        effective_v2_codes=effective_v2_codes,
        v1_code_map=v1_code_map,
        v2_code_map=effective_v2_code_map,
    )
    decisions = apply_docs4_postprocessing(decisions, admin_feature_codes, v1_codes, effective_v2_codes)

    copy_common_docs()
    write_scope_docs(decisions)
    rewrite_docs4_inline_locations()

    v2_overrides = [
        {
            "v2_code": code,
            "related_v1_codes": ", ".join(sorted(candidate for candidate in v1_codes if code_related(code, candidate))),
            "reason": "V1 행 범위에 동일/상위/하위 코드가 있어 V1 코드로 확정하고 V2 매칭에서 제외",
        }
        for code in sorted(raw_v2_codes - effective_v2_codes)
    ]
    write_readme(v1_records, raw_v2_records, decisions, v1_codes, effective_v2_codes, v2_overrides)
    write_indexes(decisions)
    write_scope_artifacts(
        v1_records=v1_records,
        raw_v2_records=raw_v2_records,
        v1_codes=v1_codes,
        raw_v2_codes=raw_v2_codes,
        effective_v2_codes=effective_v2_codes,
        decisions=decisions,
        all_sections=all_sections,
    )
    validate_output(effective_v2_codes)

    counts = Counter(decision.classification for decision in decisions)
    print("docs4 generated")
    print(f"source files: {len(files)}")
    print(f"source sections: {len(all_sections)}")
    print(f"output sections: {len(decisions)}")
    print(f"v1 codes: {len(v1_codes)}")
    print(f"effective v2 codes: {len(effective_v2_codes)}")
    print("classifications: " + ", ".join(f"{key}={value}" for key, value in sorted(counts.items())))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Delete and recreate docs4 safely.")
    args = parser.parse_args()
    generate(force=args.force)


if __name__ == "__main__":
    main()
