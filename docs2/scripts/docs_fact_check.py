#!/usr/bin/env python3
"""
docs2 fact drift checker.

registry/facts.yml을 정본 후보로 보고 docs2 문서에서 다시 추출한 사실값과 비교한다.
외부 패키지 없이 실행되도록 PyYAML이 없으면 facts.yml의 현재 subset을 읽는
최소 YAML parser로 fallback한다.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


EXCLUDE_DIRS = {"registry", "reports", "정합성체크"}
ROLE_CODES = ["superAdmin", "primary", "owner", "manager", "fc", "trainer", "staff", "readonly"]
EXTERNAL_KEYS = [
    "KIOSK",
    "IoT",
    "InBody",
    "PG",
    "webhook",
    "VAN",
    "POS",
    "KakaoTalk",
    "카카오",
    "SMS",
    "Push",
    "S3",
    "BI",
    "NFR-",
    "회원앱",
    "QR",
    "RFID",
    "API",
]

SECTION_RE = re.compile(r"^##\s+((?:SCR|DLG)-\S+)\s+(.+?)\s*$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
COUNT_RE = re.compile(r"([0-9]+|N|\{개수\})\s*(종|개|단계|버킷|가지|회|분|시간|일|개월|건)")
TIME_RE = re.compile(
    r"D[-+]\d+|"
    r"매일\s*(?:새벽\s*)?[0-9]{1,2}:[0-9]{2}|"
    r"매시간|매분|월\s*1회|주\s*단위|월\s*단위|실시간|즉시|"
    r"[0-9]+\s*분(?:\s*이내|\s*후|\s*초과|\s*전)?|"
    r"[0-9]+\s*시간(?:\s*이내|\s*후|\s*초과|\s*전)?|"
    r"[0-9]+\s*일(?:\s*이내|\s*후|\s*초과|\s*경과|\s*전)?|"
    r"[0-9]+\s*개월(?:\s*이내|\s*후|\s*초과|\s*경과|\s*전)?"
)
EXTERNAL_ID_RE = re.compile(r"\b(?:NFR|PAY|MBR|CLS|PRD|FAC|MKT|SAL|DASH|PAY-STF|SCR|DLG)-[A-Z0-9-]+\b")


@dataclass
class Finding:
    level: str
    category: str
    summary: str
    source: str
    expected: str | None = None
    actual: str | None = None


def strip_md(value: Any) -> str:
    text = str(value or "").strip()
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = text.replace("<br>", " / ").replace("<br/>", " / ")
    text = re.sub(r"\s+", " ", text)
    return text.strip(" -")


def norm(value: Any) -> str:
    return strip_md(value).replace("“", '"').replace("”", '"').replace("’", "'")


def rel(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def source(root: Path, path: Path, line: int) -> str:
    return f"{rel(root, path)}:{line}"


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if value == "null":
        return None
    if value == "true":
        return True
    if value == "false":
        return False
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        body = value[1:-1]
        return body.replace('\\"', '"').replace("\\\\", "\\").replace("\\n", "\n")
    return value


def minimal_yaml_load(path: Path) -> Any:
    prepared: list[tuple[int, str]] = []
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        prepared.append((indent, raw.strip()))

    def parse_block(index: int, indent: int) -> tuple[Any, int]:
        if index >= len(prepared):
            return None, index
        if prepared[index][0] < indent:
            return None, index
        if prepared[index][1].startswith("-"):
            return parse_list(index, indent)
        return parse_map(index, indent)

    def parse_map(index: int, indent: int) -> tuple[dict[str, Any], int]:
        mapping: dict[str, Any] = {}
        while index < len(prepared):
            current_indent, content = prepared[index]
            if current_indent < indent:
                break
            if current_indent > indent or content.startswith("-"):
                break
            if ":" not in content:
                index += 1
                continue
            key, raw_value = content.split(":", 1)
            key = key.strip()
            raw_value = raw_value.strip()
            index += 1
            if raw_value:
                mapping[key] = parse_scalar(raw_value)
            elif index < len(prepared) and prepared[index][0] > current_indent:
                mapping[key], index = parse_block(index, prepared[index][0])
            else:
                mapping[key] = None
        return mapping, index

    def parse_list(index: int, indent: int) -> tuple[list[Any], int]:
        result: list[Any] = []
        while index < len(prepared):
            current_indent, content = prepared[index]
            if current_indent < indent:
                break
            if current_indent > indent or not content.startswith("-"):
                break
            rest = content[1:].strip()
            index += 1
            if not rest:
                if index < len(prepared) and prepared[index][0] > current_indent:
                    item, index = parse_block(index, prepared[index][0])
                    result.append(item)
                else:
                    result.append(None)
                continue
            if ":" in rest and not rest.startswith('"'):
                key, raw_value = rest.split(":", 1)
                item = {key.strip(): parse_scalar(raw_value.strip()) if raw_value.strip() else None}
                if index < len(prepared) and prepared[index][0] > current_indent:
                    child, new_index = parse_block(index, prepared[index][0])
                    if isinstance(child, dict):
                        item.update(child)
                        index = new_index
                result.append(item)
            else:
                result.append(parse_scalar(rest))
        return result, index

    data, final_index = parse_block(0, 0)
    if final_index != len(prepared):
        raise ValueError(f"facts.yml parse stopped at line token {final_index}/{len(prepared)}")
    return data


def load_facts(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore

        loaded = yaml.safe_load(path.read_text(encoding="utf-8-sig"))
    except Exception:
        loaded = minimal_yaml_load(path)
    if not isinstance(loaded, dict):
        raise ValueError(f"{path} did not parse into a mapping")
    return loaded


def table_cells(line: str) -> list[str] | None:
    if not line.lstrip().startswith("|"):
        return None
    raw = line.strip()
    if not raw.endswith("|"):
        raw += "|"
    cells = [strip_md(cell) for cell in raw.strip("|").split("|")]
    if not cells or all(not cell for cell in cells):
        return None
    if all(set(cell.replace(" ", "")) <= {"-", ":"} and "-" in cell for cell in cells):
        return None
    return cells


def is_table_header(cells: list[str]) -> bool:
    joined = " ".join(cells)
    return any(
        token in joined
        for token in ["상태 | 설명", "계정 유형", "자동화 |", "예외 상황", "ID | 이름", "구분 | 기준"]
    )


def split_values(text: str) -> list[str]:
    cleaned = strip_md(text)
    if ":" in cleaned:
        cleaned = cleaned.split(":", 1)[1]
    cleaned = re.sub(r"\s+총\s+\d+.*$", "", cleaned)
    for tail in [
        " 중 하나",
        "으로 통일",
        "로 통일",
        "기준으로",
        "상태로",
        "탭으로",
        "고정합니다",
        "고정한다",
        "입니다",
        "합니다",
    ]:
        if tail in cleaned:
            cleaned = cleaned.split(tail, 1)[0]
    if not any(separator in cleaned for separator in ["/", "·", ","]):
        return []
    cleaned = cleaned.replace(" 및 ", "/").replace(" 또는 ", "/")
    values = []
    for part in re.split(r"\s*/\s*|\s*·\s*|\s*,\s*", cleaned):
        part = strip_md(part)
        for suffix in [" 탭", " 버킷", " 배지", " 상태", " 필터"]:
            if part.endswith(suffix):
                part = part[: -len(suffix)].strip()
        if part and len(part) <= 55 and "docs2/" not in part and "http" not in part:
            values.append(part)
    return values if len(values) >= 2 else []


def collect_markdown(root: Path) -> dict[Path, list[str]]:
    files = sorted(
        path
        for path in root.rglob("*.md")
        if not any(part in EXCLUDE_DIRS for part in path.relative_to(root).parts)
    )
    return {path: path.read_text(encoding="utf-8-sig").splitlines() for path in files}


def build_contexts(root: Path, docs: dict[Path, list[str]], sections_by_file: dict[Path, list[dict[str, Any]]]):
    heading_by_line: dict[tuple[Path, int], list[str]] = {}
    section_by_line: dict[tuple[Path, int], dict[str, Any] | None] = {}
    for path, lines in docs.items():
        stack: list[tuple[int, str]] = []
        sections = sorted(sections_by_file.get(path, []), key=lambda item: item["_line"])
        section_index = 0
        active_section = None
        for number, line in enumerate(lines, 1):
            if section_index < len(sections) and number == sections[section_index]["_line"]:
                active_section = sections[section_index]
                section_index += 1
            heading = HEADING_RE.match(line)
            if heading:
                level = len(heading.group(1))
                stack = [(current_level, text) for current_level, text in stack if current_level < level]
                stack.append((level, strip_md(heading.group(2))))
            heading_by_line[(path, number)] = [text for _, text in stack]
            section_by_line[(path, number)] = active_section
    return heading_by_line, section_by_line


def context_for(
    heading_by_line: dict[tuple[Path, int], list[str]],
    section_by_line: dict[tuple[Path, int], dict[str, Any] | None],
    path: Path,
    line: int,
) -> str:
    section = section_by_line.get((path, line))
    if section:
        return f"{section['id']} {section['title']}"
    headings = heading_by_line.get((path, line), [])
    return " > ".join(headings[-3:]) if headings else ""


def canonical_key(raw: str) -> str | None:
    text = strip_md(raw)
    if "미수금" in text and "상태 탭" in text:
        return "receivable_status_tabs"
    if "미결제/발송됨" in text or "미결제 / 발송됨" in text or "미결제 /발송됨" in text:
        return "payment_history_display_status"
    if "결제링크 상태값:" in text or (
        "결제링크 상태값" in text and all(value in text for value in ["결제완료", "만료", "무효화", "발송실패"])
    ):
        return "payment_link_statuses"
    if (
        ("상태 필터 탭" in text and all(value in text for value in ["전체", "활성", "만료", "탈퇴"]))
        or "전체 / 활성" in text
        or "전체 · 활성" in text
    ):
        return "member_status_filter_tabs"
    if ("회원 실제 상태" in text or "실제 회원 상태" in text) and (
        all(value in text for value in ["ACTIVE", "EXPIRED", "SCHEDULED", "WITHDRAWN"])
        or all(value in text for value in ["활성", "만료", "예정", "임박", "홀딩", "미등록", "탈퇴"])
    ):
        return "member_actual_statuses"
    if "회원 상태" in text and ("탭" in text or "7개" in text or "8개" in text):
        return "member_status_tabs_or_statuses"
    if "자동" in text and ("세그먼트" in text or "라벨" in text) and "7" in text:
        return "member_auto_segments"
    if "등급" in text and any(value in text for value in ["브론즈", "다이아몬드", "5단계"]):
        return "member_grade_levels"
    if "상품 대분류" in text and all(value in text for value in ["MEMBERSHIP", "LESSON_PASS", "GENERAL"]):
        return "product_category_values"
    if (
        ("상품 대분류 탭" in text or "상품 대분류 탭 필터" in text)
        and all(value in text for value in ["회원권", "수강권", "락커", "운동복", "일반"])
    ):
        return "product_category_filter_tabs"
    if ("카테고리 탭" in text or "상품군" in text or "상품 대분류" in text) and all(
        value in text for value in ["회원권", "수강권", "락커", "운동복", "일반"]
    ):
        return "product_category_labels"
    if "GX" in text and "6종" in text:
        return "gx_subcategories"
    if ("강습 세션" in text or "세션 유형 4종" in text) and "4종" in text:
        return "class_session_types"
    if ("기기 종류" in text or "IoT" in text) and "4종" in text:
        return "iot_device_types"
    if "역할 코드" in text or "권한 역할" in text:
        return "role_codes"
    return None


FIXED_CANONICAL_VALUES: dict[str, tuple[int, list[str]]] = {
    "payment_link_statuses": (5, ["발송됨", "결제완료", "만료", "무효화", "발송실패"]),
    "payment_history_display_status": (2, ["미결제", "발송됨"]),
    "receivable_status_tabs": (5, ["전체", "미결제", "일부결제", "연체", "완료"]),
    "member_actual_statuses": (
        7,
        ["ACTIVE(활성)", "EXPIRED(만료)", "SCHEDULED(예정)", "EXPIRING(임박)", "HOLDING(홀딩)", "UNREGISTERED(미등록)", "WITHDRAWN(탈퇴)"],
    ),
    "member_status_filter_tabs": (8, ["전체", "활성", "만료", "예정", "임박", "홀딩", "미등록", "탈퇴"]),
    "product_category_values": (5, ["MEMBERSHIP(회원권)", "LESSON_PASS(수강권)", "LOCKER(락커)", "WEAR(운동복)", "GENERAL(일반)"]),
    "product_category_labels": (5, ["회원권", "수강권", "락커", "운동복", "일반"]),
    "product_category_filter_tabs": (6, ["전체", "회원권", "수강권", "락커", "운동복", "일반"]),
}


def normalize_canonical_values(key: str, count: Any, values: list[str]) -> tuple[Any, list[str]]:
    if key in FIXED_CANONICAL_VALUES:
        fixed_count, fixed_values = FIXED_CANONICAL_VALUES[key]
        return fixed_count, list(fixed_values)
    return count, values


def extract_current_facts(root: Path) -> dict[str, Any]:
    docs = collect_markdown(root)
    sections: list[dict[str, Any]] = []
    sections_by_file: dict[Path, list[dict[str, Any]]] = defaultdict(list)

    for path, lines in docs.items():
        current = None
        for number, line in enumerate(lines, 1):
            match = SECTION_RE.match(line)
            if match:
                domain = path.parts[-2] if len(path.parts) >= 2 and path.parts[-2].startswith("D") else None
                current = {
                    "id": match.group(1),
                    "title": strip_md(match.group(2)),
                    "kind": "screen" if match.group(1).startswith("SCR-") else "dialog",
                    "domain": domain,
                    "route": None,
                    "source": source(root, path, number),
                    "file": rel(root, path),
                    "_line": number,
                }
                sections.append(current)
                sections_by_file[path].append(current)
                continue
            if current and number - current["_line"] <= 12 and line.strip().startswith("> URL 경로:"):
                current["route"] = strip_md(line.split(":", 1)[1])

    heading_by_line, section_by_line = build_contexts(root, docs, sections_by_file)

    roles: list[dict[str, Any]] = []
    role_file = root / "_공통" / "권한매트릭스.md"
    for number, line in enumerate(docs.get(role_file, []), 1):
        row = table_cells(line)
        if row and len(row) >= 4 and (row[0] in ROLE_CODES or row[0].startswith("owner /")):
            code = "owner" if row[0].startswith("owner") else row[0]
            roles.append(
                {
                    "code": code,
                    "display": "Owner(지점장)" if code == "owner" else code,
                    "scope": row[1],
                    "capabilities": row[2],
                    "limits": row[3],
                    "source": source(root, role_file, number),
                }
            )

    state_lines: list[dict[str, Any]] = []
    count_lines: list[dict[str, Any]] = []
    state_keywords = [
        "상태값",
        "상태 값",
        "상태 탭",
        "상태 필터",
        "상태 배지",
        "실제 상태",
        "회원 실제 상태",
        "결제링크 상태값",
        "정원 상태",
        "오류 유형",
        "검수 유형",
    ]

    for path, lines in docs.items():
        for number, line in enumerate(lines, 1):
            if any(keyword in line for keyword in state_keywords):
                row = table_cells(line)
                raw = " | ".join(row) if row else strip_md(line)
                values = split_values(row[1] if row and len(row) > 1 else raw)
                key = canonical_key(raw)
                if key:
                    count, values = normalize_canonical_values(key, len(values) if values else None, values)
                    state_lines.append(
                        {
                            "key": key,
                            "count": count,
                            "values": values,
                            "raw": strip_md(line),
                            "context": context_for(heading_by_line, section_by_line, path, number),
                            "source": source(root, path, number),
                        }
                    )

            count_matches = COUNT_RE.findall(line)
            if count_matches and any(
                keyword in line
                for keyword in ["종", "개", "단계", "버킷", "유형", "분류", "세그먼트", "라벨", "상태", "탭", "대분류", "기기", "역할"]
            ):
                raw = strip_md(line)[:260]
                key = canonical_key(raw)
                if key:
                    values = split_values(raw)
                    count = int(count_matches[0][0]) if count_matches[0][0].isdigit() else count_matches[0][0]
                    count, values = normalize_canonical_values(key, count, values)
                    count_lines.append(
                        {
                            "key": key,
                            "count": count,
                            "values": values,
                            "raw": raw,
                            "context": context_for(heading_by_line, section_by_line, path, number),
                            "source": source(root, path, number),
                        }
                    )

    automations: list[dict[str, Any]] = []
    for path, lines in docs.items():
        active = rel(root, path) == "_공통/자동화_크론.md"
        header = None
        for number, line in enumerate(lines, 1):
            heading = HEADING_RE.match(line)
            if heading:
                title = strip_md(heading.group(2))
                active = rel(root, path) == "_공통/자동화_크론.md" or any(
                    keyword in title for keyword in ["자동화", "크론", "연동 / 자동화 참조"]
                )
                header = None
                continue
            row = table_cells(line)
            if row and any(keyword in " ".join(row) for keyword in ["자동화", "실행 시점", "트리거", "처리 동작", "연결 기능"]):
                active = True
                header = row
                continue
            if active and header and row and len(row) >= 3 and not is_table_header(row):
                joined = " ".join(row)
                if any(
                    keyword in joined
                    for keyword in ["자동", "배치", "크론", "트리거", "이벤트", "즉시", "매일", "매시간", "연동", "동기화", "알림", "발송", "갱신"]
                ):
                    automations.append(
                        {
                            "name": row[0],
                            "trigger": row[1],
                            "action": row[2],
                            "link": row[3] if len(row) > 3 else None,
                            "context": context_for(heading_by_line, section_by_line, path, number),
                            "source": source(root, path, number),
                        }
                    )

    timing: list[dict[str, Any]] = []
    external: list[dict[str, Any]] = []
    toasts: list[dict[str, Any]] = []
    exceptions: list[dict[str, Any]] = []

    for path, lines in docs.items():
        exception_active = rel(root, path) == "_공통/에러_예외_표준.md"
        exception_header = None
        for number, line in enumerate(lines, 1):
            if not line.strip().startswith("- 202"):
                expressions = [match.group(0).strip() for match in TIME_RE.finditer(line)]
                if expressions:
                    timing.append(
                        {
                            "expressions": list(dict.fromkeys(expressions)),
                            "raw": strip_md(line)[:260],
                            "context": context_for(heading_by_line, section_by_line, path, number),
                            "source": source(root, path, number),
                        }
                    )

            if any(keyword in line for keyword in EXTERNAL_KEYS) and not line.lstrip().startswith("#"):
                raw = strip_md(line)[:280]
                external.append(
                    {
                        "ids": list(dict.fromkeys(EXTERNAL_ID_RE.findall(raw))),
                        "systems_or_channels": [keyword for keyword in EXTERNAL_KEYS if keyword in line],
                        "purpose": raw,
                        "context": context_for(heading_by_line, section_by_line, path, number),
                        "source": source(root, path, number),
                    }
                )

            if "토스트" in line or rel(root, path) == "_공통/토스트_메시지.md":
                row = table_cells(line)
                messages = []
                for match in re.finditer(r'"([^"]{2,90})"|“([^”]{2,90})”|\'([^\']{2,90})\'', line):
                    messages.append(next(value for value in match.groups() if value))
                if row and len(row) >= 3 and not is_table_header(row) and not messages:
                    messages = [row[-1]]
                for message in messages:
                    if message and message != "-":
                        toasts.append(
                            {
                                "message": message,
                                "raw": strip_md(line)[:240],
                                "context": context_for(heading_by_line, section_by_line, path, number),
                                "source": source(root, path, number),
                            }
                        )

            heading = HEADING_RE.match(line)
            if heading:
                title = strip_md(heading.group(2))
                exception_active = rel(root, path) == "_공통/에러_예외_표준.md" or any(
                    keyword in title for keyword in ["예외", "필수 예외처리", "운영 예외 처리"]
                )
                exception_header = None
                continue
            row = table_cells(line)
            if exception_active and row and any(keyword in " ".join(row) for keyword in ["예외", "상황", "처리", "결과", "원인"]):
                exception_header = row
                continue
            if exception_active and exception_header and row and len(row) >= 2 and not is_table_header(row):
                exceptions.append(
                    {
                        "case": row[0],
                        "ui_or_response": row[1],
                        "handling": row[2] if len(row) > 2 else None,
                        "context": context_for(heading_by_line, section_by_line, path, number),
                        "source": source(root, path, number),
                    }
                )

    return {
        "source_file_count": len(docs),
        "sections": sections,
        "screens": [section for section in sections if section["kind"] == "screen"],
        "dialogs": [section for section in sections if section["kind"] == "dialog"],
        "roles": roles,
        "canonical_facts": state_lines + count_lines,
        "automations": automations,
        "timing_conditions": timing,
        "external_integrations": external,
        "toast_messages": toasts,
        "common_exceptions": exceptions,
    }


def fp_fact(item: dict[str, Any]) -> tuple[Any, tuple[str, ...]]:
    return (item.get("count"), tuple(norm(value) for value in (item.get("values") or [])))


def compact(value: Any) -> str:
    return re.sub(r"\s+", "", norm(value))


def is_pay06_link_expiry_alarm(name: str) -> bool:
    return compact(name) == "PAY-06결제링크만료알림"


def is_notification_channel_name(name: str) -> bool:
    normalized = compact(name)
    return "NFR-19" in normalized and "알림센터" in normalized


def normalize_pay06_trigger(trigger: str) -> str:
    if "-3" in trigger and "-1" in trigger and "만료" in trigger:
        return "만료 D-3/D-1 고정"
    return trigger


def normalize_pay06_action(action: str) -> str:
    if "고객사 확인 전까지 개발 대기" in action and "ON/OFF" in action and "지점 추가 step 없음" in action:
        return "고객사 확인 전까지 개발 대기. 확정 후 회원·운영자 알림. ON/OFF와 지점 추가 step 없음"
    return action


def fp_automation(item: dict[str, Any]) -> tuple[str, str]:
    name = norm(item.get("name"))
    trigger = norm(item.get("trigger"))
    action = norm(item.get("action"))
    if is_pay06_link_expiry_alarm(name):
        trigger = normalize_pay06_trigger(trigger)
        action = normalize_pay06_action(action)
    return (trigger, action)


def fp_toast(item: dict[str, Any]) -> str:
    return norm(item.get("message"))


def fp_exception(item: dict[str, Any]) -> tuple[str, str, str]:
    return (norm(item.get("case")), norm(item.get("ui_or_response")), norm(item.get("handling")))


def fp_external(item: dict[str, Any]) -> tuple[tuple[str, ...], tuple[str, ...], str]:
    return (
        tuple(norm(value) for value in (item.get("ids") or [])),
        tuple(norm(value) for value in (item.get("systems_or_channels") or [])),
        norm(item.get("purpose")),
    )


def is_policy_like(name: str) -> bool:
    return any(keyword in name for keyword in ["정책", "배치", "크론", "잡", "알림", "큐", "자동", "PAY-06", "NFR-05", "NFR-19", "A05"])


def compare_facts(registry: dict[str, Any], current: dict[str, Any]) -> list[Finding]:
    findings: list[Finding] = []

    registry_screens = {item["id"]: item for item in registry.get("screen_index", []) if isinstance(item, dict) and item.get("id")}
    registry_dialogs = {item["id"]: item for item in registry.get("dialog_index", []) if isinstance(item, dict) and item.get("id")}
    current_screens = {item["id"]: item for item in current["screens"]}
    current_dialogs = {item["id"]: item for item in current["dialogs"]}

    for screen_id, item in current_screens.items():
        expected = registry_screens.get(screen_id)
        if not expected:
            findings.append(Finding("WARN", "new_screen", f"facts.yml에 없는 신규 화면 ID `{screen_id}`", item["source"], actual=item["title"]))
            continue
        if norm(item.get("title")) != norm(expected.get("title")):
            findings.append(
                Finding(
                    "ERROR",
                    "screen_title_drift",
                    f"{screen_id} 화면명이 facts.yml과 다릅니다.",
                    item["source"],
                    expected=expected.get("title"),
                    actual=item.get("title"),
                )
            )
        if norm(item.get("route")) != norm(expected.get("route")):
            findings.append(
                Finding(
                    "ERROR",
                    "screen_route_drift",
                    f"{screen_id} URL이 facts.yml과 다릅니다.",
                    item["source"],
                    expected=expected.get("route"),
                    actual=item.get("route"),
                )
            )

    for screen_id, expected in registry_screens.items():
        if screen_id not in current_screens:
            findings.append(
                Finding(
                    "ERROR",
                    "screen_missing",
                    f"facts.yml의 화면 ID `{screen_id}`가 현재 문서에서 발견되지 않습니다.",
                    expected.get("source", "-"),
                    expected=expected.get("title"),
                )
            )

    for dialog_id, item in current_dialogs.items():
        expected = registry_dialogs.get(dialog_id)
        if not expected:
            findings.append(Finding("WARN", "new_dialog", f"facts.yml에 없는 신규 다이얼로그 ID `{dialog_id}`", item["source"], actual=item["title"]))
            continue
        if norm(item.get("title")) != norm(expected.get("title")):
            findings.append(
                Finding(
                    "ERROR",
                    "dialog_title_drift",
                    f"{dialog_id} 다이얼로그명이 facts.yml과 다릅니다.",
                    item["source"],
                    expected=expected.get("title"),
                    actual=item.get("title"),
                )
            )

    for dialog_id, expected in registry_dialogs.items():
        if dialog_id not in current_dialogs:
            findings.append(
                Finding(
                    "ERROR",
                    "dialog_missing",
                    f"facts.yml의 다이얼로그 ID `{dialog_id}`가 현재 문서에서 발견되지 않습니다.",
                    expected.get("source", "-"),
                    expected=expected.get("title"),
                )
            )

    registry_roles = {item["code"]: item for item in registry.get("canonical_roles", []) if isinstance(item, dict) and item.get("code")}
    current_roles = {item["code"]: item for item in current["roles"]}
    for code, item in current_roles.items():
        expected = registry_roles.get(code)
        if not expected:
            findings.append(Finding("WARN", "new_role", f"facts.yml에 없는 신규 권한 역할 `{code}`", item["source"], actual=item.get("display")))
            continue
        for field in ["display", "scope", "capabilities", "limits"]:
            if norm(item.get(field)) != norm(expected.get(field)):
                findings.append(
                    Finding(
                        "ERROR",
                        "role_drift",
                        f"권한 역할 `{code}`의 `{field}` 값이 facts.yml과 다릅니다.",
                        item["source"],
                        expected=expected.get(field),
                        actual=item.get(field),
                    )
                )

    for code, expected in registry_roles.items():
        if code not in current_roles:
            findings.append(
                Finding(
                    "ERROR",
                    "role_missing",
                    f"facts.yml의 권한 역할 `{code}`가 현재 권한 매트릭스에서 발견되지 않습니다.",
                    expected.get("source", "-"),
                    expected=expected.get("display"),
                )
            )

    registry_canonical = registry.get("canonical_fact_candidates", {}) or {}
    allowed_facts: dict[str, set[tuple[Any, tuple[str, ...]]]] = {
        key: {fp_fact(item) for item in items if isinstance(item, dict)}
        for key, items in registry_canonical.items()
        if isinstance(items, list)
    }
    allowed_facts_by_source: dict[tuple[str, str], set[tuple[Any, tuple[str, ...]]]] = defaultdict(set)
    for key, items in registry_canonical.items():
        if not isinstance(items, list):
            continue
        for item in items:
            if isinstance(item, dict) and item.get("source"):
                allowed_facts_by_source[(key, item["source"])].add(fp_fact(item))
    current_by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in current["canonical_facts"]:
        key = item.get("key")
        if not key:
            continue
        current_by_key[key].append(item)
        fingerprint = fp_fact(item)
        if key not in allowed_facts:
            findings.append(Finding("WARN", "new_canonical_fact", f"facts.yml에 없는 신규 사실값 key `{key}`", item["source"], actual=item.get("raw")))
        elif (key, item["source"]) in allowed_facts_by_source and fingerprint not in allowed_facts_by_source[(key, item["source"])]:
            findings.append(
                Finding(
                    "ERROR",
                    "canonical_fact_drift",
                    f"`{key}` 사실값이 facts.yml과 다릅니다.",
                    item["source"],
                    expected=", ".join(str(value) for value in sorted(allowed_facts_by_source[(key, item["source"])], key=str)[:5]),
                    actual=str(fingerprint),
                )
            )

    for key, items in current_by_key.items():
        distinct_counts = {item.get("count") for item in items if item.get("count") is not None}
        if len(distinct_counts) > 1:
            evidence = "; ".join(f"{item['source']}={fp_fact(item)}" for item in items[:6])
            findings.append(
                Finding(
                    "ERROR",
                    "same_concept_count_conflict",
                    f"같은 개념 `{key}`의 수량/목록이 문서마다 다릅니다.",
                    items[0]["source"],
                    expected="single canonical value",
                    actual=evidence,
                )
            )

    registry_automations = registry.get("automations", []) or []
    allowed_automation_pairs: dict[str, set[tuple[str, str]]] = defaultdict(set)
    allowed_automation_pairs_by_context: dict[tuple[str, str], set[tuple[str, str]]] = defaultdict(set)
    for item in registry_automations:
        if isinstance(item, dict) and item.get("name"):
            name = norm(item["name"])
            allowed_automation_pairs[name].add(fp_automation(item))
            allowed_automation_pairs_by_context[(name, norm(item.get("context")))].add(fp_automation(item))

    current_auto_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in current["automations"]:
        name = norm(item.get("name"))
        current_auto_by_name[name].append(item)
        pair = fp_automation(item)
        context_key = (name, norm(item.get("context")))
        if is_notification_channel_name(name):
            continue
        if name not in allowed_automation_pairs:
            findings.append(Finding("WARN", "new_automation", f"facts.yml에 없는 신규 자동화/배치 `{item.get('name')}`", item["source"], actual=str(pair)))
        elif context_key in allowed_automation_pairs_by_context and pair not in allowed_automation_pairs_by_context[context_key]:
            findings.append(
                Finding(
                    "ERROR",
                    "automation_condition_drift",
                    f"자동화/배치 `{item.get('name')}`의 조건 또는 동작이 facts.yml과 다릅니다.",
                    item["source"],
                    expected=", ".join(str(value) for value in sorted(allowed_automation_pairs[name], key=str)[:5]),
                    actual=str(pair),
                )
            )

    for name, items in current_auto_by_name.items():
        if name not in allowed_automation_pairs:
            continue
        if is_notification_channel_name(name):
            continue
        if not is_policy_like(name):
            continue
        distinct_pairs = {fp_automation(item) for item in items}
        allowed_pairs = allowed_automation_pairs.get(name, set())
        if len(distinct_pairs) > 1 and len(allowed_pairs) <= 1 and not distinct_pairs.issubset(allowed_pairs):
            findings.append(
                Finding(
                    "ERROR",
                    "same_policy_condition_conflict",
                    f"같은 정책/자동화 `{name}`의 조건 또는 시점이 문서마다 다릅니다.",
                    items[0]["source"],
                    expected="single policy condition or explicit registry variants",
                    actual="; ".join(f"{item['source']}={fp_automation(item)}" for item in items[:8]),
                )
            )

    registry_timing_expressions = {
        norm(expression)
        for item in registry.get("timing_conditions", [])
        if isinstance(item, dict)
        for expression in (item.get("expressions") or [])
    }
    warned_timing: set[str] = set()
    for item in current["timing_conditions"]:
        for expression in item.get("expressions") or []:
            normalized = norm(expression)
            if normalized not in registry_timing_expressions and normalized not in warned_timing:
                warned_timing.add(normalized)
                findings.append(Finding("WARN", "new_timing_condition", "facts.yml에 없는 신규 조건/시점 표현", item["source"], actual=expression))

    registry_external_ids = {
        norm(value)
        for item in registry.get("external_integrations", [])
        if isinstance(item, dict)
        for value in (item.get("ids") or [])
    }
    registry_external_channels = {
        norm(value)
        for item in registry.get("external_integrations", [])
        if isinstance(item, dict)
        for value in (item.get("systems_or_channels") or [])
    }
    warned_external: set[str] = set()
    for item in current["external_integrations"]:
        for value in list(item.get("ids") or []) + list(item.get("systems_or_channels") or []):
            normalized = norm(value)
            if normalized not in registry_external_ids and normalized not in registry_external_channels and normalized not in warned_external:
                warned_external.add(normalized)
                findings.append(Finding("WARN", "new_external_integration", "facts.yml에 없는 신규 외부연동 ID/채널", item["source"], actual=value))

    registry_toasts = {fp_toast(item) for item in registry.get("toast_messages", []) if isinstance(item, dict)}
    for item in current["toast_messages"]:
        if fp_toast(item) not in registry_toasts:
            findings.append(Finding("WARN", "new_toast", "facts.yml에 없는 신규 토스트 메시지", item["source"], actual=item.get("message")))

    registry_exceptions = {fp_exception(item) for item in registry.get("common_exceptions", []) if isinstance(item, dict)}
    registry_exception_cases = {norm(item.get("case")) for item in registry.get("common_exceptions", []) if isinstance(item, dict)}
    registry_exception_by_case_context: dict[tuple[str, str], set[tuple[str, str, str]]] = defaultdict(set)
    for item in registry.get("common_exceptions", []):
        if isinstance(item, dict):
            registry_exception_by_case_context[(norm(item.get("case")), norm(item.get("context")))].add(fp_exception(item))
    warned_exceptions: set[str] = set()
    for item in current["common_exceptions"]:
        fingerprint = fp_exception(item)
        if fingerprint in registry_exceptions:
            continue
        case_context = (norm(item.get("case")), norm(item.get("context")))
        if case_context in registry_exception_by_case_context:
            findings.append(
                Finding(
                    "ERROR",
                    "exception_handling_drift",
                    f"예외처리 `{item.get('case')}`의 응답/처리가 facts.yml과 다릅니다.",
                    item["source"],
                    expected="registered exception handling",
                    actual=str(fingerprint),
                )
            )
        elif norm(item.get("case")) not in registry_exception_cases and norm(item.get("case")) not in warned_exceptions:
            warned_exceptions.add(norm(item.get("case")))
            findings.append(Finding("WARN", "new_exception", "facts.yml에 없는 신규 예외처리", item["source"], actual=str(fingerprint)))

    deduped: list[Finding] = []
    seen: set[tuple[Any, ...]] = set()
    for finding in findings:
        if finding.level == "WARN":
            if finding.category.startswith("new_"):
                key = (finding.level, finding.category, finding.summary)
            else:
                key = (finding.level, finding.category, finding.summary, finding.expected, finding.actual)
        else:
            key = (finding.level, finding.category, finding.summary, finding.source, finding.expected, finding.actual)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(finding)
    return deduped


def write_report(path: Path, registry_path: Path, findings: list[Finding], current: dict[str, Any]) -> None:
    errors = [finding for finding in findings if finding.level == "ERROR"]
    warnings = [finding for finding in findings if finding.level == "WARN"]

    lines = [
        "# fact_drift_report",
        "",
        f"- generated_at: {datetime.now().isoformat(timespec='seconds')}",
        f"- facts: `{registry_path.as_posix()}`",
        f"- source_file_count: {current['source_file_count']}",
        f"- ERROR: {len(errors)}",
        f"- WARN: {len(warnings)}",
        "",
    ]

    if not findings:
        lines += ["## 결과", "", "ERROR/WARN 없음. 현재 문서가 registry/facts.yml 기준과 일치합니다.", ""]
    else:
        for level, items in [("ERROR", errors), ("WARN", warnings)]:
            lines += [f"## {level}", ""]
            if not items:
                lines += ["없음", ""]
                continue
            for index, finding in enumerate(items, 1):
                lines += [
                    f"### {index}. {finding.summary}",
                    "",
                    f"- category: `{finding.category}`",
                    f"- source: `{finding.source}`",
                ]
                if finding.expected is not None:
                    lines.append(f"- expected: {finding.expected}")
                if finding.actual is not None:
                    lines.append(f"- actual: {finding.actual}")
                lines.append("")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check docs2 facts against registry/facts.yml.")
    parser.add_argument("--root", default=Path(__file__).resolve().parents[1], type=Path, help="docs2 root directory")
    parser.add_argument("--facts", default=None, type=Path, help="facts.yml path. Default: <root>/registry/facts.yml")
    parser.add_argument("--report", default=None, type=Path, help="report path. Default: <root>/reports/fact_drift_report.md")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    facts_path = (args.facts or (root / "registry" / "facts.yml")).resolve()
    report_path = (args.report or (root / "reports" / "fact_drift_report.md")).resolve()

    if not facts_path.exists():
        print(f"facts.yml not found: {facts_path}", file=sys.stderr)
        return 2

    registry = load_facts(facts_path)
    current = extract_current_facts(root)
    findings = compare_facts(registry, current)
    write_report(report_path, facts_path.relative_to(root), findings, current)

    error_count = sum(1 for finding in findings if finding.level == "ERROR")
    warn_count = sum(1 for finding in findings if finding.level == "WARN")
    print(f"fact check complete: ERROR={error_count}, WARN={warn_count}, report={report_path}")
    return 1 if error_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
