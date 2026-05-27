# -*- coding: utf-8 -*-
"""Audit docs2 internal definition-set consistency.

This script intentionally does not compare docs2 with docs/admin. It only
checks whether repeated definition sets inside docs2 disagree with each other.

Examples:
- "GX 세부종목" appears as five values in one document and six values elsewhere.
- "PAY-06 결제링크 상태값" is defined with different enum values.
- A screen's tabs/columns/badges are repeated with a different value set.
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
DOCS2 = ROOT / "docs2"
OUT_DIR = DOCS2 / "정합성체크"
EXCLUDED_TOP_DIRS = {"registry", "reports", "scripts", "정합성체크"}

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
SCREEN_RE = re.compile(r"\b(?:SCR|DLG)-[A-Z0-9]+(?:-[A-Z0-9가-힣_]+)*\b", re.IGNORECASE)
FEATURE_RE = re.compile(r"\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){1,6}\b", re.IGNORECASE)
COUNT_RE = re.compile(r"(?<![A-Z0-9-])(\d+)\s*(종|개|가지|단계|버킷|컬럼|탭|상태)")
INLINE_LOCATION_RE = re.compile(r"\s*/\s*`[^`]+\.md:\d+`")

VALUE_SEPARATORS_RE = re.compile(r"\s*(?:/|·|,|，|\||ㆍ|\+)\s*")
NOISE_VALUE_RE = re.compile(
    r"^(?:전체|해당|각|중|기준|필수|선택|표시|노출|조회|관리|설정|"
    r"같은|다른|별도|기본값|기본|사용|제공|가능|불가|없음|있음)$"
)

KNOWN_VALUES: dict[str, tuple[str, ...]] = {
    "member_status_tabs": ("전체", "활성", "만료", "예정", "임박", "홀딩", "미등록", "탈퇴", "정지"),
    "member_actual_statuses": ("활성", "만료", "예정", "임박", "홀딩", "미등록", "탈퇴", "정지"),
    "member_auto_segments": ("신규", "이탈위험", "만료임박", "활발", "관심필요", "만료후미등록", "충성"),
    "product_categories": ("회원권", "수강권", "락커", "운동복", "운동복 대여비", "일반", "전체"),
    "class_session_types": ("PT", "GX", "골프", "기타"),
    "class_types": ("PT", "GX", "골프", "기타"),
    "gx_subcategories": ("요가", "필라테스", "필라", "스피닝", "줌바", "에어로빅", "GX 기타", "GX기타"),
    "iot_device_types": ("출입 게이트", "키오스크", "락커 컨트롤러", "InBody 측정기", "Inbody 측정기", "인바디 측정기"),
    "payment_link_statuses": ("발송됨", "결제완료", "만료", "무효화", "발송실패", "열람됨", "미결제"),
    "payment_link_member_display_status": ("미결제", "발송됨", "결제완료"),
    "receivable_status_tabs": ("전체", "미결제", "일부결제", "연체", "완료"),
    "notification_channels": ("Push", "PUSH", "회원앱 Push", "카카오톡", "KakaoTalk", "SMS", "sms"),
    "signup_paths": ("간판", "블로그", "인스타", "당근", "지역카페", "현수막", "전단지", "회원소개", "기타"),
    "inquiry_types": ("방문(WI)", "전화문의(TI)", "방문", "전화문의", "체험", "일일입장"),
    "role_codes": ("superAdmin", "primary", "owner", "manager", "fc", "trainer", "staff", "readonly"),
}


@dataclass(frozen=True)
class Candidate:
    key: str
    label: str
    values: tuple[str, ...]
    count: int | None
    file: str
    line: int
    heading: str
    raw: str
    kind: str


def strip_md(value: str) -> str:
    text = value.strip()
    text = INLINE_LOCATION_RE.sub("", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = text.replace("<br>", " / ").replace("<br/>", " / ")
    text = text.replace("→", " -> ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def docs_files() -> list[Path]:
    files: list[Path] = []
    for path in sorted(DOCS2.rglob("*.md")):
        rel = path.relative_to(DOCS2)
        if rel.parts[0] in EXCLUDED_TOP_DIRS:
            continue
        files.append(path)
    return files


def unique(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = normalize_value(value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return tuple(result)


def normalize_value(value: str) -> str:
    text = strip_md(value)
    text = text.strip(" -:：;；.。()[]{}")
    text = re.sub(r"^\d+\.\s*", "", text)
    text = re.sub(r"^[A-Z0-9]+-[A-Z0-9-]+\s+", "", text)
    text = re.sub(r"\s*(?:총\s*)?\d+\s*(?:종|개|가지|단계|버킷|컬럼|탭|상태)\b.*$", "", text)
    text = re.sub(r"\s*(?:으로|로)\s*(?:고정|통일|표시|관리|분리|집계|사용|선택).*$", "", text)
    text = re.sub(r"\s*(?:중\s*선택|선택\s*가능|복수\s*선택\s*가능).*$", "", text)
    text = re.sub(r"\s*(?:입니다|입니다\.|이다|한다|합니다|이며|이고|이고,|이며,).*$", "", text)
    text = re.sub(r"\s*(?:탭|배지|필터|컬럼|카드)(?:\s*.*)?$", "", text)
    text = text.strip(" -:：;；.。()[]{}")

    # Canonical spelling for known values. Do not collapse "필라" to
    # "필라테스"; that should stay visible as a conflict if it appears.
    canonical = {
        "push": "Push",
        "PUSH": "Push",
        "sms": "SMS",
        "Sms": "SMS",
        "알림톡": "카카오톡",
        "KakaoTalk": "카카오톡",
        "kakaotalk": "카카오톡",
        "회원앱 Push": "Push",
        "GX기타": "GX 기타",
        "gx 기타": "GX 기타",
        "운동복 대여비": "운동복",
        "Inbody 측정기": "InBody 측정기",
        "인바디 측정기": "InBody 측정기",
        "Owner": "owner",
        "Owner(지점장)": "owner",
        "지점장": "owner",
        "센터장": "owner",
        "매니저": "manager",
        "슈퍼관리자": "superAdmin",
    }
    return canonical.get(text, text)


def normalize_set(values: Iterable[str]) -> tuple[str, ...]:
    return tuple(sorted(unique(values), key=lambda item: item.lower()))


def split_values(fragment: str) -> tuple[str, ...]:
    text = strip_md(fragment)
    text = text.replace(" 및 ", " / ").replace(" 또는 ", " / ")
    text = text.replace("와 ", " / ").replace("과 ", " / ")
    text = text.replace("·", "/").replace("ㆍ", "/")
    text = text.replace("：", ":")
    text = re.sub(r"\s+/\s+", " / ", text)

    # Prefer the part after a label delimiter when present.
    if ":" in text:
        text = text.split(":", 1)[1].strip()

    # Cut explanatory tails after a complete sentence if the list was first.
    first_sentence = re.split(r"(?:\.|\n)", text, maxsplit=1)[0].strip()
    if "/" in first_sentence or "," in first_sentence or "|" in first_sentence:
        text = first_sentence

    raw_parts = VALUE_SEPARATORS_RE.split(text)
    values: list[str] = []
    for part in raw_parts:
        part = part.strip()
        if not part:
            continue
        if "->" in part:
            continue
        if len(part) > 42:
            # Long narrative chunks are usually not enum values.
            continue
        normalized = normalize_value(part)
        if not normalized or len(normalized) > 32:
            continue
        if NOISE_VALUE_RE.fullmatch(normalized):
            continue
        if SCREEN_RE.fullmatch(normalized) or FEATURE_RE.fullmatch(normalized):
            continue
        values.append(normalized)
    return unique(values)


def split_table_cells(line: str) -> list[str]:
    stripped = line.strip()
    if not stripped.startswith("|") or "|" not in stripped[1:]:
        return []
    cells = [strip_md(cell) for cell in stripped.strip("|").split("|")]
    return [cell for cell in cells if cell and not re.fullmatch(r"-+", cell)]


def known_values_for_key(key: str, text: str) -> tuple[str, ...]:
    known = KNOWN_VALUES.get(key)
    if not known:
        return ()
    compact = strip_md(text).replace("·", "/").replace("ㆍ", "/")
    if key == "member_status_tabs":
        compact = re.split(r"총\s*\d+\s*개\s*탭|클릭 시|정지는", compact, maxsplit=1)[0]
    if key == "member_actual_statuses":
        compact = re.split(r"정지는|정지 플래그|HQ-09|자동 라벨", compact, maxsplit=1)[0]
    if key == "payment_link_statuses":
        compact = re.split(r"열람됨 상태|미결제는|회원상세", compact, maxsplit=1)[0]
    found: list[str] = []
    occupied = [False] * len(compact)
    for value in sorted(known, key=len, reverse=True):
        start = 0
        while True:
            index = compact.find(value, start)
            if index == -1:
                break
            end = index + len(value)
            if not any(occupied[index:end]):
                found.append(value)
                for pos in range(index, end):
                    occupied[pos] = True
            start = end
    return unique(found)


def count_in_line(text: str) -> int | None:
    matches = [int(match.group(1)) for match in COUNT_RE.finditer(text)]
    if not matches:
        return None
    return matches[0]


def classify_key(line: str, heading: str) -> tuple[str, str, str] | None:
    text = strip_md(line)
    context = text

    rules: list[tuple[str, str, str, tuple[str, ...], tuple[str, ...]]] = [
        ("member_status_tabs", "회원 상태 필터 탭", "canonical", ("회원", "상태 필터", "탭"), ()),
        ("member_actual_statuses", "회원 실제 상태값", "canonical", ("실제 회원 상태",), ("상태 필터",)),
        ("member_auto_segments", "자동 회원 세그먼트 7종", "canonical", ("자동 7종",), ()),
        ("product_categories", "상품 대분류", "canonical", ("상품 대분류",), ()),
        ("class_session_types", "강습 세션 유형", "canonical", ("강습 세션 유형",), ()),
        ("class_types", "수업 유형", "canonical", ("수업 유형",), ("강습 세션", "담당 수업 유형")),
        ("gx_subcategories", "GX 세부종목", "canonical", ("GX 세부",), ()),
        ("gx_subcategories", "GX 세부종목", "canonical", ("GX종목",), ()),
        ("iot_device_types", "IoT 기기 종류", "canonical", ("기기 종류",), ()),
        ("payment_link_statuses", "결제링크 상태값", "canonical", ("결제링크", "상태값"), ("회원상세", "표시상태")),
        ("payment_link_member_display_status", "결제링크 회원상세 표시상태", "canonical", ("회원상세", "표시상태"), ()),
        ("receivable_status_tabs", "미수금 상태 탭", "canonical", ("미수", "상태 탭"), ()),
        ("notification_channels", "알림 채널", "canonical", ("알림 채널",), ()),
        ("notification_channels", "알림 채널", "canonical", ("발송 채널",), ()),
        ("signup_paths", "가입경로", "canonical", ("가입경로",), ()),
        ("inquiry_types", "문의 유형", "canonical", ("문의 유형",), ()),
        ("role_codes", "권한 역할 코드", "canonical", ("역할 코드",), ()),
        ("role_codes", "권한 역할 코드", "canonical", ("표준 역할",), ()),
    ]

    for key, label, kind, required, forbidden in rules:
        if not (all(token in context for token in required) and not any(token in context for token in forbidden)):
            continue
        known_values = known_values_for_key(key, context)
        if key in KNOWN_VALUES and len(known_values) < 2:
            continue
        if key in {"class_session_types", "class_types"} and not {"PT", "GX", "골프"}.issubset(set(known_values)):
            continue
        if key == "gx_subcategories" and not {"요가", "스피닝", "줌바"}.issubset(set(known_values)):
            continue
        if key == "iot_device_types" and ("아니라" in context or not {"출입 게이트", "키오스크", "락커 컨트롤러", "InBody 측정기"}.issubset(set(known_values))):
            continue
        if key == "product_categories" and not {"회원권", "수강권"}.issubset(set(known_values)):
            continue
        if key == "role_codes" and not {"superAdmin", "primary", "owner"}.issubset(set(known_values)):
            continue
        if key == "payment_link_statuses" and not {"발송됨", "결제완료", "만료"}.issubset(set(known_values)):
            continue
        if key == "notification_channels" and not {"Push", "SMS"}.issubset(set(known_values)):
            continue
        if key == "member_actual_statuses" and len(set(known_values)) < 6:
            continue
        return key, label, kind

    # Generic repeated set labels. These catch screen-local drift such as
    # "상태 배지", "탭", "컬럼" being described differently across files.
    generic_keywords = ("상태 배지", "상태 필터", "필터 탭", "탭", "컬럼", "카드", "배지", "유형")
    if any(keyword in text for keyword in generic_keywords):
        if text.startswith("|"):
            return None
        if ":" not in text and "：" not in text:
            return None
        label_source = text
        if ":" in label_source:
            label_source = label_source.split(":", 1)[0]
        label_source = re.sub(r"^[\-*]\s*", "", label_source)
        label_source = re.sub(r"\*\*([^*]+)\*\*", r"\1", label_source)
        label_source = strip_md(label_source)
        label_source = re.sub(r"\s+", " ", label_source).strip(" -")
        if 2 <= len(label_source) <= 42:
            current_screen = current_screen_from_heading(heading)
            key = f"generic::{current_screen or 'global'}::{label_source}"
            return key, label_source, "generic"

    return None


def current_screen_from_heading(heading: str) -> str | None:
    match = SCREEN_RE.search(heading or "")
    return match.group(0).upper() if match else None


def extract_candidates() -> list[Candidate]:
    candidates: list[Candidate] = []
    for path in docs_files():
        rel = path.relative_to(DOCS2).as_posix()
        heading_stack: list[tuple[int, str]] = []
        for line_no, raw in enumerate(path.read_text(encoding="utf-8-sig", errors="ignore").splitlines(), start=1):
            heading_match = HEADING_RE.match(raw)
            if heading_match:
                level = len(heading_match.group(1))
                title = strip_md(heading_match.group(2))
                heading_stack = [item for item in heading_stack if item[0] < level]
                heading_stack.append((level, title))
                continue

            line = strip_md(raw)
            if not line or "/" not in line and "·" not in line and "," not in line and "|" not in line:
                continue

            heading = " > ".join(title for _, title in heading_stack[-3:])
            work_items: list[str] = []
            cells = split_table_cells(line)
            if cells:
                for index, cell in enumerate(cells):
                    classified_cell = classify_key(cell, heading)
                    if classified_cell and classified_cell[2] == "canonical":
                        work_items.append(cell)
                    elif index + 1 < len(cells):
                        pair = f"{cell}: {cells[index + 1]}"
                        classified_pair = classify_key(pair, heading)
                        if classified_pair and classified_pair[2] == "canonical":
                            work_items.append(pair)
            else:
                work_items.append(line)

            for work in work_items:
                classified = classify_key(work, heading)
                if not classified:
                    continue
                key, label, kind = classified
                values = known_values_for_key(key, work) if kind == "canonical" else split_values(work)
                if key == "product_categories":
                    values = tuple(value for value in values if value != "전체")
                if key == "member_actual_statuses":
                    values = tuple(value for value in values if value not in {"전체", "정지"})
                if key == "payment_link_statuses":
                    values = tuple(value for value in values if value != "미결제")
                values = unique(values)
                if len(values) < 2:
                    continue

                candidates.append(
                    Candidate(
                        key=key,
                        label=label,
                        values=values,
                        count=count_in_line(work),
                        file=rel,
                        line=line_no,
                        heading=heading,
                        raw=line,
                        kind=kind,
                    )
                )
    return candidates


def conflict_groups(candidates: list[Candidate]) -> list[tuple[str, list[Candidate], dict[tuple[str, ...], list[Candidate]]]]:
    by_key: dict[str, list[Candidate]] = {}
    for candidate in candidates:
        by_key.setdefault(candidate.key, []).append(candidate)

    conflicts: list[tuple[str, list[Candidate], dict[tuple[str, ...], list[Candidate]]]] = []
    for key, items in sorted(by_key.items()):
        if len(items) < 2:
            continue
        variants: dict[tuple[str, ...], list[Candidate]] = {}
        for item in items:
            variants.setdefault(normalize_set(item.values), []).append(item)
        if len(variants) > 1:
            conflicts.append((key, items, variants))
    return conflicts


def count_mismatches(candidates: list[Candidate]) -> list[Candidate]:
    result: list[Candidate] = []
    for candidate in candidates:
        if candidate.count is not None and candidate.count != len(candidate.values):
            result.append(candidate)
    return result


def csv_escape_values(values: Iterable[str]) -> str:
    return " / ".join(values)


def write_candidates_csv(path: Path, candidates: list[Candidate]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=["key", "label", "kind", "values", "count", "file", "line", "heading", "raw"],
        )
        writer.writeheader()
        for item in candidates:
            writer.writerow(
                {
                    "key": item.key,
                    "label": item.label,
                    "kind": item.kind,
                    "values": csv_escape_values(item.values),
                    "count": "" if item.count is None else item.count,
                    "file": item.file,
                    "line": item.line,
                    "heading": item.heading,
                    "raw": item.raw,
                }
            )


def write_report(path: Path, candidates: list[Candidate]) -> None:
    conflicts = conflict_groups(candidates)
    mismatches = count_mismatches(candidates)

    lines: list[str] = [
        "# docs2 내부 정의 집합 정합성 리포트",
        "",
        "## 기준",
        "",
        "- 비교 대상은 `docs2` 내부 문서뿐입니다.",
        "- `docs/admin` 원본 화면설계서/기능명세서는 비교하지 않습니다.",
        "- 반복되는 탭·컬럼·배지·상태값·유형·채널·역할·정책 집합을 추출해 같은 개념의 값 집합이 서로 다른지 확인합니다.",
        "- 모든 위치는 개발자가 바로 이동할 수 있도록 `docs2` 기준 상대 경로와 라인으로 표기합니다.",
        "- 판정 범위는 화면/기능/UX/운영정책이며 API, DB 스키마, 테이블, 엔드포인트 같은 백엔드 상세는 제외합니다.",
        "",
        "## 요약",
        "",
        f"- 추출한 정의 후보: {len(candidates)}건",
        f"- 값 집합 충돌 그룹: {len(conflicts)}건",
        f"- 명시 수량과 추출 값 개수 리뷰 후보: {len(mismatches)}건",
        "",
    ]

    lines += ["## 1. 값 집합 충돌", ""]
    if not conflicts:
        lines += ["- 발견 없음", ""]
    else:
        for index, (key, _items, variants) in enumerate(conflicts, start=1):
            sample = next(iter(next(iter(variants.values()))))
            severity = "ERROR" if sample.kind == "canonical" else "WARN"
            lines += [
                f"### {index}. [{severity}] `{key}`",
                "",
                f"- 라벨: {sample.label}",
                f"- variant 수: {len(variants)}",
                "",
            ]
            for variant_index, (values, items) in enumerate(variants.items(), start=1):
                lines += [
                    f"#### variant {variant_index}: {' / '.join(values)}",
                    "",
                ]
                for item in items[:8]:
                    lines.append(f"- `{item.file}:{item.line}` {item.raw}")
                if len(items) > 8:
                    lines.append(f"- ... 추가 {len(items) - 8}건")
                lines.append("")

    lines += [
        "## 2. 수량 표현 리뷰 후보",
        "",
        "> 아래 항목은 `4개`, `5종`, `1개 이상`, 시간값 `22:00`처럼 숫자가 포함된 문장을 자동 추출한 후보입니다. 값 집합 충돌로 확정하지 않고 사람이 원문을 확인해야 합니다.",
        "",
    ]
    if not mismatches:
        lines += ["- 발견 없음", ""]
    else:
        lines += ["| 위치 | 라벨 | 명시 수량 | 추출 값 | 원문 |", "|---|---|---:|---|---|"]
        for item in mismatches[:120]:
            raw = item.raw.replace("|", "/")
            lines.append(
                f"| `{item.file}:{item.line}` | {item.label} | {item.count} | "
                f"{csv_escape_values(item.values)} | {raw} |"
            )
        if len(mismatches) > 120:
            lines.append(f"| - | - | - | - | 추가 {len(mismatches) - 120}건은 CSV 참조 |")
        lines.append("")

    lines += [
        "## 산출물",
        "",
        "- `docs2/정합성체크/docs2_internal_set_candidates.csv`",
        "- `docs2/정합성체크/docs2_internal_consistency_report.md`",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    candidates = extract_candidates()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_candidates_csv(OUT_DIR / "docs2_internal_set_candidates.csv", candidates)
    write_report(OUT_DIR / "docs2_internal_consistency_report.md", candidates)

    print(f"candidates={len(candidates)}")
    print(f"conflict_groups={len(conflict_groups(candidates))}")
    print(f"count_mismatches={len(count_mismatches(candidates))}")
    print(f"report={OUT_DIR / 'docs2_internal_consistency_report.md'}")


if __name__ == "__main__":
    main()
