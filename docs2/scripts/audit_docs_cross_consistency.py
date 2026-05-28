#!/usr/bin/env python3
"""Compare shared planning facts between two docs roots.

Default use:
  python docs2/scripts/audit_docs_cross_consistency.py

The checker compares docs2 with docs4 as a whole. When docs4 has both V1 and
V2 definitions for the same screen/dialog ID, V2 is preferred. Route values are
also read from *_ID*_v2_v3.md mapping files because docs4 screen bodies may omit
explicit URL rows.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import docs_fact_check as dfc  # noqa: E402


ID_RE = re.compile(
    r"(?<![A-Z0-9-])"
    r"(?:SCR|DLG|PAY|SAL|MBR|CLS|PRD|FAC|MKT|SET|HQ|NFR|AUTH|IoT|STF|PAY-STF)"
    r"-[A-Z0-9가-힣_-]+(?:-[A-Z0-9가-힣_]+)*\b"
)
FOCUS_CODES = ("PAY-01-13", "PAY-01-14", "PAY-01-15", "PAY-03-09", "SAL-EXT-04-11", "POL-06")


def id_map_file(root: Path) -> Path | None:
    files = sorted(root.rglob("01_ID*_v2_v3.md"))
    return files[0] if files else None


def parse_mapping(path: Path | None, version: str | None = None) -> tuple[dict[str, str], dict[str, str]]:
    route_by_id: dict[str, str] = {}
    title_by_id: dict[str, str] = {}
    if not path or not path.exists():
        return route_by_id, title_by_id

    for line in path.read_text(encoding="utf-8-sig").splitlines():
        cells = dfc.table_cells(line)
        if not cells or len(cells) < 5 or cells[0] in {"버전", "ID", "화면 ID"}:
            continue
        if cells[0] in {"V1", "V2"} and len(cells) >= 6:
            if version and cells[0] != version:
                continue
            item_id, title, route = cells[1], cells[2], cells[4]
        else:
            item_id, title, route = cells[0], cells[1], cells[3] if len(cells) >= 4 else None
        if item_id.startswith(("SCR-", "DLG-")):
            title_by_id.setdefault(item_id, title)
            if route and route != "-":
                route_by_id.setdefault(item_id, route)
    return route_by_id, title_by_id


def first_by_id(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in items:
        result.setdefault(item["id"], item)
    return result


def prefer_v2(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in items:
        previous = result.get(item["id"])
        if previous is None or (not previous.get("file", "").startswith("V2/") and item.get("file", "").startswith("V2/")):
            result[item["id"]] = item
    return result


def collect_ids(root: Path) -> dict[str, list[str]]:
    ids: dict[str, list[str]] = defaultdict(list)
    excluded = {"registry", "reports", "scripts", "_scope"}
    for path in root.rglob("*.md"):
        rel = path.relative_to(root)
        if any(part in excluded for part in rel.parts):
            continue
        for line_number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
            for match in ID_RE.finditer(line):
                ids[match.group(0)].append(f"{rel.as_posix()}:{line_number}")
    return ids


def add_finding(findings: list[tuple[str, str, str, str, str, str]], level: str, category: str, code: str, source: str, expected: Any, actual: Any) -> None:
    findings.append((level, category, code, source, str(expected), str(actual)))


def build_report(left: Path, right: Path, report: Path) -> tuple[int, int]:
    left_facts = dfc.extract_current_facts(left)
    right_facts = dfc.extract_current_facts(right)

    left_map = id_map_file(left)
    right_map = id_map_file(right)
    left_routes, left_titles = parse_mapping(left_map)
    right_routes_v1, right_titles_v1 = parse_mapping(right_map, "V1")
    right_routes_v2, right_titles_v2 = parse_mapping(right_map, "V2")
    right_routes = {**right_routes_v1, **right_routes_v2}
    right_titles = {**right_titles_v1, **right_titles_v2}

    left_screens = first_by_id(left_facts["screens"])
    right_screens = prefer_v2(right_facts["screens"])
    left_dialogs = first_by_id(left_facts["dialogs"])
    right_dialogs = prefer_v2(right_facts["dialogs"])

    findings: list[tuple[str, str, str, str, str, str]] = []

    for screen_id, item in sorted(left_screens.items()):
        other = right_screens.get(screen_id)
        if not other:
            add_finding(findings, "WARN", "screen_missing_in_right", screen_id, item["source"], "-", item.get("title"))
            continue
        left_title = left_titles.get(screen_id) or item.get("title")
        right_title = right_titles.get(screen_id) or other.get("title")
        if dfc.norm(left_title) != dfc.norm(right_title):
            add_finding(findings, "ERROR", "screen_title_drift", screen_id, item["source"], right_title, left_title)

        left_route = item.get("route") or left_routes.get(screen_id)
        right_route = other.get("route") or right_routes.get(screen_id)
        if left_route and right_route and dfc.norm(left_route) != dfc.norm(right_route):
            add_finding(findings, "ERROR", "screen_route_drift", screen_id, item["source"], right_route, left_route)
        elif left_route and not right_route:
            add_finding(findings, "WARN", "screen_route_missing_in_right", screen_id, item["source"], "-", left_route)

    for screen_id, item in sorted(right_screens.items()):
        if screen_id not in left_screens:
            add_finding(findings, "WARN", "screen_missing_in_left", screen_id, item["source"], item.get("title"), "-")

    for dialog_id, item in sorted(left_dialogs.items()):
        other = right_dialogs.get(dialog_id)
        if not other:
            add_finding(findings, "WARN", "dialog_missing_in_right", dialog_id, item["source"], "-", item.get("title"))
            continue
        if dfc.norm(item.get("title")) != dfc.norm(other.get("title")):
            add_finding(findings, "ERROR", "dialog_title_drift", dialog_id, item["source"], other.get("title"), item.get("title"))

    for dialog_id, item in sorted(right_dialogs.items()):
        if dialog_id not in left_dialogs:
            add_finding(findings, "WARN", "dialog_missing_in_left", dialog_id, item["source"], item.get("title"), "-")

    left_ids = collect_ids(left)
    right_ids = collect_ids(right)
    for code in FOCUS_CODES:
        if code in left_ids and code not in right_ids:
            add_finding(findings, "ERROR", "focused_id_missing_in_right", code, left_ids[code][0], "-", "present in left")
        if code in right_ids and code not in left_ids:
            add_finding(findings, "ERROR", "focused_id_missing_in_left", code, right_ids[code][0], "present in right", "-")

    errors = [finding for finding in findings if finding[0] == "ERROR"]
    warnings = [finding for finding in findings if finding[0] == "WARN"]

    lines = [
        "# docs cross consistency report",
        "",
        f"- left: `{left.as_posix()}`",
        f"- right: `{right.as_posix()}`",
        f"- left source files: {left_facts['source_file_count']}",
        f"- right source files: {right_facts['source_file_count']}",
        f"- left id map: `{left_map.as_posix() if left_map else 'missing'}`",
        f"- right id map: `{right_map.as_posix() if right_map else 'missing'}`",
        f"- ERROR: {len(errors)}",
        f"- WARN: {len(warnings)}",
        "",
    ]
    for level, group in [("ERROR", errors), ("WARN", warnings)]:
        lines += [f"## {level}", ""]
        if not group:
            lines += ["none", ""]
            continue
        for index, (_level, category, code, source, expected, actual) in enumerate(group, 1):
            lines += [
                f"### {index}. {code} {category}",
                "",
                f"- source: `{source}`",
                f"- expected: {expected}",
                f"- actual: {actual}",
                "",
            ]

    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text("\n".join(lines), encoding="utf-8")
    return len(errors), len(warnings)


def parse_args() -> argparse.Namespace:
    repo = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Compare shared planning facts between docs roots.")
    parser.add_argument("--left", default=repo / "docs2", type=Path)
    parser.add_argument("--right", default=repo / "docs4", type=Path)
    parser.add_argument("--report", default=repo / "docs4" / "reports" / "docs2_docs4_cross_consistency_report.md", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    errors, warnings = build_report(args.left.resolve(), args.right.resolve(), args.report.resolve())
    print(f"cross check complete: ERROR={errors}, WARN={warnings}, report={args.report.resolve()}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
