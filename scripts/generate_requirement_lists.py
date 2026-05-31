import csv
import re
import sys
import zipfile
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import xml.etree.ElementTree as ET

import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path.cwd()
BASE = ROOT / "lastspr" / "요구리스트관련자료"
OUT_DIR = BASE / "1. 산출물"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TODAY = "2026-05-31"

all_files = [p for p in BASE.rglob("*") if p.is_file() and not p.name.startswith("~$")]


def find_file(suffix: str, contains: str | None = None) -> Path | None:
    matches = [
        p
        for p in all_files
        if p.suffix.lower() == suffix and (contains is None or contains in p.name)
    ]
    matches.sort(key=lambda p: len(str(p)))
    return matches[0] if matches else None


PATHS = {
    "docx": find_file(".docx"),
    "matrix": find_file(".xlsx", "v5"),
    "broj_onfit": find_file(".md", "BroJ_vs_OnFit"),
    "spogym_fg": find_file(".xlsx", "1228"),
    "dashboard": find_file(".xlsx", "DashBoard"),
    "pdf": find_file(".pdf"),
}
MEETING_FILES = sorted((BASE / "회의록").glob("*.md")) if (BASE / "회의록").exists() else []


def clean(value) -> str:
    if value is None:
        return ""
    text = str(value).replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def one_line(value, limit=240) -> str:
    text = clean(value).replace("\n", " / ").replace("|", "\\|")
    return text[: limit - 1] + "…" if len(text) > limit else text


def norm(value) -> str:
    text = clean(value).lower()
    replacements = {
        "미납금": "미수금",
        "미납": "미수",
        "대기열": "waitlist",
        "웨이트리스트": "waitlist",
        "카카오 알림톡": "알림톡",
        "카톡": "알림톡",
        "crm 내부 승인번호": "내부승인번호",
        "원결제 id": "내부승인번호",
        "전자 계약": "전자계약",
        "전자 서명": "전자서명",
        "체성분": "인바디",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def normalize_domain(domain: str) -> str:
    mapping = {
        "시스템설정·권한": "설정·권한",
        "본사관리(FG)": "본사·대시보드",
        "리포트(FG)": "본사·대시보드",
        "회원앱(FG)": "회원앱·키오스크",
        "키오스크(FG)": "회원앱·키오스크",
        "인프라·운영(FG)": "인프라·운영",
        "산출물(FG)": "인프라·운영",
        "인사·급여": "직원관리",
    }
    return mapping.get(clean(domain), clean(domain))


def infer_domain(text: str) -> str:
    value = clean(text)
    lower = value.lower()
    rules = [
        ("예약·일정관리", ["예약", "일정", "대기열", "waitlist", "노쇼", "캘린더", "시간표", "스케줄"]),
        ("수업관리", ["수업", "pt", "gx", "세션", "강습", "출석부", "차감"]),
        ("매출·결제", ["결제", "매출", "환불", "미수", "할부", "영수증", "승인번호", "계좌이체", "현금영수증", "van", "pg", "수수료", "위약금", "정산", "인보이스", "마일리지"]),
        ("상품관리", ["상품", "이용권", "수강권", "회원권", "해피아워", "가격", "할인", "업그레이드"]),
        ("시설관리", ["락커", "사물함", "타석", "골프", "운동룸", "시설", "키오스크", "밴드카드", "출입", "홈&오피스", "홈앤오피스"]),
        ("직원관리", ["직원", "급여", "근태", "출퇴근", "트레이너", "fc", "강사", "계약서", "지출"]),
        ("마케팅·소통", ["마케팅", "쿠폰", "알림", "메시지", "문자", "sms", "푸시", "이벤트", "공지", "프리온보딩"]),
        ("설정·권한", ["권한", "역할", "설정", "메뉴 권한", "시스템설정"]),
        ("본사·대시보드", ["본사", "대시보드", "kpi", "today", "랭킹", "신호등", "손익", "지점장", "대표", "회장"]),
        ("회원앱·키오스크", ["회원앱", "모바일앱", "키오스크", "qr"]),
        ("인프라·운영", ["api", "db", "스키마", "qa", "검수", "인프라", "연동"]),
        ("회원관리", ["회원", "상담", "체성분", "인바디", "등급", "세그먼트", "가족", "이관", "병합", "온보딩", "리드", "재등록"]),
    ]
    best_domain = "공통·기타"
    best_score = 0
    for domain, keywords in rules:
        score = 0
        for keyword in keywords:
            score += lower.count(keyword.lower())
        if score > best_score:
            best_score = score
            best_domain = domain
    return best_domain


def source_ref(path: Path, extra: str = "") -> str:
    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        rel = path
    result = str(rel).replace("\\", "/")
    return f"{result}::{extra}" if extra else result


records: list[dict] = []


def add_record(
    title,
    description="",
    domain="",
    source_type="",
    source_name="",
    source_path: Path | None = None,
    source_detail="",
    priority="",
    app_marks=None,
    fitgenie_code="",
    scope_hint="",
    raw_key="",
):
    title = clean(title)
    if not title:
        return
    records.append(
        {
            "title": title,
            "description": clean(description),
            "domain": normalize_domain(domain or infer_domain(f"{title} {description}")),
            "source_type": source_type,
            "source_name": source_name,
            "source_path": source_ref(source_path, source_detail) if source_path else source_detail,
            "priority": clean(priority),
            "apps": app_marks or {},
            "fitgenie_code": clean(fitgenie_code),
            "scope_hint": clean(scope_hint),
            "raw_key": raw_key or norm(title),
            "merged_sources": [],
            "source_count": 1,
        }
    )


def cell(vals: list[str], index: int | None) -> str:
    if index is None or index < 0 or index >= len(vals):
        return ""
    return vals[index]


# 1. 3사 기능 매트릭스
if PATHS["matrix"]:
    wb = openpyxl.load_workbook(PATHS["matrix"], read_only=True, data_only=True)
    ws = wb["기능매트릭스"] if "기능매트릭스" in wb.sheetnames else wb.worksheets[0]
    current_lv1 = ""
    current_lv2 = ""
    for row_no, row in enumerate(ws.iter_rows(min_row=4, values_only=True), start=4):
        vals = [clean(v) for v in row]
        if len(vals) < 10:
            continue
        lv1, _code, lv2, lv3, broj, onfit, lesson, fitgenie, fg_code, note = vals[:10]
        current_lv1 = lv1 or current_lv1
        current_lv2 = lv2 or current_lv2
        if not lv3:
            continue
        add_record(
            title=lv3,
            description=f"{current_lv1} / {current_lv2}. 3사 비교: BroJ={broj or '-'}, OnFit={onfit or '-'}, LessonBook={lesson or '-'}, FitGenie={fitgenie or '-'}. {note}",
            domain=current_lv1 or infer_domain(lv3),
            source_type="3사앱 기능매트릭스",
            source_name="기능매트릭스 비교_v5.xlsx",
            source_path=PATHS["matrix"],
            source_detail=f"기능매트릭스!R{row_no}",
            app_marks={"BroJ": broj, "OnFit": onfit, "LessonBook": lesson, "FitGenie": fitgenie},
            fitgenie_code=fg_code,
            scope_hint="원천 기능행",
        )
    wb.close()


# 2. DOCX 표
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def cell_text(tc) -> str:
    return "".join((t.text or "") for t in tc.findall(".//w:t", NS)).strip()


def extract_docx_tables(path: Path) -> list[list[list[str]]]:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    tree = ET.fromstring(xml)
    tables = []
    for tbl in tree.findall(".//w:tbl", NS):
        rows = []
        for tr in tbl.findall("./w:tr", NS):
            row = [clean(cell_text(tc)) for tc in tr.findall("./w:tc", NS)]
            if any(row):
                rows.append(row)
        tables.append(rows)
    return tables


if PATHS["docx"]:
    tables = extract_docx_tables(PATHS["docx"])
    if len(tables) > 3:
        current_menu = ""
        for row_no, row in enumerate(tables[3][1:], start=2):
            row = row + [""] * (5 - len(row))
            menu, feature, src, content, priority = row[:5]
            current_menu = menu or current_menu
            if feature:
                add_record(
                    title=feature,
                    description=f"{current_menu}. {content}. 출처={src}",
                    domain=infer_domain(f"{current_menu} {feature} {content}"),
                    source_type="3사앱 통합기획 DOCX",
                    source_name="통합_헬스장_관리시스템_기획문서.docx",
                    source_path=PATHS["docx"],
                    source_detail=f"기능항목표 R{row_no}",
                    priority=priority,
                    scope_hint="3사 앱 기능요약",
                )
    if len(tables) > 2:
        for row_no, row in enumerate(tables[2][1:], start=2):
            row = row + [""] * (4 - len(row))
            area, onfit, broj, lesson = row[:4]
            if area:
                desc = f"온핏 기반={onfit}; 브로제이 보완={broj}; 레슨북 고도화={lesson}"
                add_record(
                    title=f"{area} 통합 기준",
                    description=desc,
                    domain=infer_domain(f"{area} {desc}"),
                    source_type="3사앱 역할비교 DOCX",
                    source_name="통합_헬스장_관리시스템_기획문서.docx",
                    source_path=PATHS["docx"],
                    source_detail=f"기능영역표 R{row_no}",
                    scope_hint="역할비교/중복보강",
                )


# 3. BroJ vs OnFit MD
if PATHS["broj_onfit"]:
    text = PATHS["broj_onfit"].read_text(encoding="utf-8", errors="replace")
    current_heading = ""
    for line_no, line in enumerate(text.splitlines(), start=1):
        line = line.rstrip()
        if line.startswith("## ") or line.startswith("### "):
            current_heading = re.sub(r"^#+\s*", "", line).strip()
        if line.startswith("|") and "|" in line and not re.match(r"^\|[-\s|:]+\|$", line):
            cells = [clean(c) for c in line.strip("|").split("|")]
            if cells and cells[0] in ["기능", "영역", "구분"]:
                continue
            if len(cells) >= 4 and cells[0]:
                add_record(
                    title=cells[0],
                    description=f"{current_heading}. BroJ={cells[1]}; OnFit={cells[2]}; FitPlat 결정={cells[3]}",
                    domain=infer_domain(f"{current_heading} {cells[0]}"),
                    source_type="BroJ vs OnFit 비교분석",
                    source_name="비교분석_BroJ_vs_OnFit.md",
                    source_path=PATHS["broj_onfit"],
                    source_detail=f"L{line_no}",
                    scope_hint="경쟁사 비교/채택전략",
                )
        bullet = re.match(r"^-\s+(.+)$", line)
        if bullet and current_heading.startswith("PRD_"):
            item = clean(bullet.group(1))
            add_record(
                title=item,
                description=current_heading,
                domain=infer_domain(f"{current_heading} {item}"),
                source_type="BroJ vs OnFit PRD 보완",
                source_name="비교분석_BroJ_vs_OnFit.md",
                source_path=PATHS["broj_onfit"],
                source_detail=f"L{line_no}",
                scope_hint="보완필요",
            )


# 4. 스포짐 요구사항 엑셀
if PATHS["spogym_fg"]:
    wb = openpyxl.load_workbook(PATHS["spogym_fg"], read_only=True, data_only=True)
    sheet_names = [name for name in wb.sheetnames if "수정" in name] or wb.sheetnames
    for sheet_name in sheet_names[:1]:
        ws = wb[sheet_name]
        header_row = None
        headers = []
        for row_no, row in enumerate(ws.iter_rows(min_row=1, max_row=10, values_only=True), start=1):
            vals = [clean(v) for v in row]
            if "Feature" in vals and "Description" in vals:
                header_row = row_no
                headers = vals
                break
        if not header_row:
            continue
        indexes = {h: i for i, h in enumerate(headers) if h}
        carry = {"System": "", "Menu": "", "Screen": ""}
        for row_no, row in enumerate(ws.iter_rows(min_row=header_row + 1, values_only=True), start=header_row + 1):
            vals = [clean(v) for v in row]
            for key in carry:
                value = cell(vals, indexes.get(key))
                if value:
                    carry[key] = value
            feature = cell(vals, indexes.get("Feature"))
            desc = cell(vals, indexes.get("Description"))
            data_in = cell(vals, indexes.get("Data Input"))
            data_out = cell(vals, indexes.get("Data Output"))
            alternative = cell(vals, indexes.get("기능 대안"))
            if not feature and not desc:
                continue
            title = feature or desc[:80]
            add_record(
                title=title,
                description=f"{carry['System']} > {carry['Menu']} > {carry['Screen']}. {desc}. Input={data_in}. Output={data_out}. 대안={alternative}",
                domain=infer_domain(f"{' '.join(carry.values())} {feature} {desc}"),
                source_type="스포짐 요구사항",
                source_name="스포짐FG_수정_공유 2025_1228.xlsx",
                source_path=PATHS["spogym_fg"],
                source_detail=f"{sheet_name}!R{row_no}",
                scope_hint="스포짐 원천요구",
            )
    wb.close()


# 5. 대시보드/KPI 엑셀
if PATHS["dashboard"]:
    wb = openpyxl.load_workbook(PATHS["dashboard"], read_only=True, data_only=True)
    target_sheets = [
        "DX_AX핵심",
        "1. 회사 성장 & Team Health_26_0121",
        "2. 매출관리 & CRM Health",
        "3. 시스템 & 운영_비용관리",
    ]
    for sheet_name in target_sheets:
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        best = (0, 0, [])
        for row_no, row in enumerate(ws.iter_rows(min_row=1, max_row=min(20, ws.max_row), values_only=True), start=1):
            vals = [clean(v).replace("\n", " ") for v in row]
            nonempty = sum(1 for v in vals if v)
            if nonempty > best[1]:
                best = (row_no, nonempty, vals)
        header_row = best[0]
        for row_no, row in enumerate(ws.iter_rows(min_row=header_row + 1, values_only=True), start=header_row + 1):
            vals = [clean(v) for v in row]
            if sum(1 for v in vals if v) < 3:
                continue
            title = ""
            desc_parts = []
            if sheet_name == "DX_AX핵심":
                title = cell(vals, 3) or cell(vals, 2)
                desc_parts = [f"주요기능={cell(vals, 2)}", f"사용자={cell(vals, 4)}", f"연동={cell(vals, 5)}", f"효과={cell(vals, 6)}", f"계획={cell(vals, 7)}"]
            elif "회사 성장" in sheet_name:
                title = cell(vals, 3)
                desc_parts = [f"대상={cell(vals, 1)}/{cell(vals, 2)}", f"설명={cell(vals, 4)}", f"계산식={cell(vals, 5)}", f"목표={cell(vals, 6)}", f"연동={cell(vals, 16)}"]
            elif "매출관리" in sheet_name:
                title = cell(vals, 2)
                desc_parts = [f"단계={cell(vals, 1)}", f"계산식={cell(vals, 3)}", f"목표={cell(vals, 4)}", f"의미={cell(vals, 7)}"]
            elif "시스템" in sheet_name:
                title = cell(vals, 2)
                desc_parts = [f"시스템={cell(vals, 1)}", f"KPI={cell(vals, 3)}", f"효과={cell(vals, 8)}", f"흐름={cell(vals, 12)}"]
            if not title or len(title) < 2:
                continue
            add_record(
                title=title,
                description="; ".join(desc_parts),
                domain="본사·대시보드" if ("KPI" in title or "율" in title or "수" in title or "대시" in title or "DX_AX" in sheet_name or "회사" in sheet_name or "매출관리" in sheet_name) else infer_domain(f"{title} {' '.join(desc_parts)}"),
                source_type="대시보드/KPI 요구사항",
                source_name="DashBoard_단계별_KPI_Structure_2026_0127 - 복사본.xlsx",
                source_path=PATHS["dashboard"],
                source_detail=f"{sheet_name}!R{row_no}",
                scope_hint="대시보드/KPI",
            )
    for sheet_name in ["4. 자동알림(신규_이탈위험) 트리거", "5. PT KPI"]:
        if sheet_name in wb.sheetnames:
            add_record(
                title=sheet_name.replace("4. ", "").replace("5. ", ""),
                description="시트 전체가 해당 운영/KPI 요구사항의 세부 정책 근거로 사용됨",
                domain="본사·대시보드" if "KPI" in sheet_name else "마케팅·소통",
                source_type="대시보드/KPI 요구사항",
                source_name="DashBoard_단계별_KPI_Structure_2026_0127 - 복사본.xlsx",
                source_path=PATHS["dashboard"],
                source_detail=sheet_name,
                scope_hint="시트단위 근거",
            )
    wb.close()


# 6. 회의록
for meeting_file in MEETING_FILES:
    text = meeting_file.read_text(encoding="utf-8", errors="replace") if meeting_file.stat().st_size else ""
    if not text.strip():
        continue
    topics = []
    current_topic = ""
    details: list[str] = []
    line_start = 0
    for line_no, line in enumerate(text.splitlines(), start=1):
        if re.match(r"^-\s+[^\s].+", line):
            if current_topic:
                topics.append((line_start, current_topic, details))
            current_topic = clean(re.sub(r"^-\s+", "", line))
            details = []
            line_start = line_no
        elif current_topic and re.match(r"^\s+-\s+", line):
            details.append(clean(re.sub(r"^\s+-\s+", "", line)))
    if current_topic:
        topics.append((line_start, current_topic, details))
    for line_no, topic, details in topics:
        if len(topic) > 120 and not details:
            keywords = ["기능", "대시보드", "권한", "KPI", "API", "결제", "환불", "미수", "예약", "수업", "회원", "지점", "정책", "문서", "검수", "퍼블리싱"]
            if not any(keyword in topic for keyword in keywords):
                continue
        desc = " / ".join(details[:12]) if details else topic
        add_record(
            title=topic,
            description=desc,
            domain=infer_domain(f"{topic} {desc}"),
            source_type="회의록",
            source_name=meeting_file.name,
            source_path=meeting_file,
            source_detail=f"L{line_no}",
            scope_hint="회의결정/논의",
        )


def similar(a: str, b: str) -> float:
    left, right = norm(a), norm(b)
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    if len(left) >= 5 and len(right) >= 5 and (left in right or right in left):
        return 0.88
    return SequenceMatcher(None, left, right).ratio()


merged: list[dict] = []
for rec in records:
    best_idx = None
    best_score = 0.0
    for index, existing in enumerate(merged):
        same_domain = rec["domain"] == existing["domain"] or rec["domain"] == "공통·기타" or existing["domain"] == "공통·기타"
        score = similar(rec["title"], existing["title"])
        if same_domain and score > best_score:
            best_idx = index
            best_score = score
    threshold = 0.90 if rec["source_type"] == "회의록" else 0.86
    if best_idx is not None and best_score >= threshold:
        existing = merged[best_idx]
        existing["source_count"] += 1
        existing["merged_sources"].append(rec)
        if rec["description"] and rec["description"] not in existing["description"]:
            existing["description"] = (existing["description"] + " / " + rec["description"])[:1800]
        if rec["priority"] and not existing["priority"]:
            existing["priority"] = rec["priority"]
        if rec["fitgenie_code"] and not existing["fitgenie_code"]:
            existing["fitgenie_code"] = rec["fitgenie_code"]
        for key, value in rec["apps"].items():
            if value and not existing["apps"].get(key):
                existing["apps"][key] = value
    else:
        merged.append(rec)


DOMAIN_ORDER = ["회원관리", "예약·일정관리", "수업관리", "매출·결제", "상품관리", "시설관리", "직원관리", "마케팅·소통", "설정·권한", "본사·대시보드", "회원앱·키오스크", "인프라·운영", "공통·기타"]
DOMAIN_PREFIX = {"회원관리": "MBR", "예약·일정관리": "RSV", "수업관리": "CLS", "매출·결제": "PAY", "상품관리": "PRD", "시설관리": "FAC", "직원관리": "STF", "마케팅·소통": "MKT", "설정·권한": "SET", "본사·대시보드": "HQ", "회원앱·키오스크": "APP", "인프라·운영": "OPS", "공통·기타": "GEN"}

merged.sort(key=lambda r: (DOMAIN_ORDER.index(r["domain"]) if r["domain"] in DOMAIN_ORDER else 99, norm(r["title"])))
domain_seq = defaultdict(int)
for rec in merged:
    domain_seq[rec["domain"]] += 1
    rec["req_id"] = f"REQ-{DOMAIN_PREFIX.get(rec['domain'], 'GEN')}-{domain_seq[rec['domain']]:03d}"


# docs4 index and matching.
docs4_root = ROOT / "docs4"
docs_files = [p for p in docs4_root.rglob("*.md") if p.is_file()]
heading_re = re.compile(r"^(##+)\s+((?:SCR|DLG)-[^\s]+)\s*(.*)$")
headings = []
file_texts = []
for path in docs_files:
    text = path.read_text(encoding="utf-8", errors="replace")
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    version = "V1" if "/V1/" in f"/{rel}" else ("V2" if "/V2/" in f"/{rel}" else "COMMON")
    lines = text.splitlines()
    file_texts.append((rel, version, text))
    for line_no, line in enumerate(lines, start=1):
        match = heading_re.match(line)
        if match:
            headings.append({"code": match.group(2), "title": clean(match.group(3)), "path": rel, "line": line_no, "version": version, "full": clean(line)})


def split_codes(codes: str) -> list[str]:
    parts = re.split(r"[,/·\n]+|\s+\+\s+|\s+및\s+", codes or "")
    result = []
    for part in parts:
        part = clean(part)
        if not part or part in ["—", "-"]:
            continue
        if part.isdigit() and len(part) <= 3:
            continue
        result.append(part)
    return result


ALIASES = {
    "미수금": ["SCR-S008", "PAY-03"],
    "분할": ["SCR-S003", "PAY-01"],
    "결제수단": ["SCR-S003", "SCR-S012"],
    "부분 환불": ["SCR-S012", "PAY-02", "SAL-EXT-04"],
    "환불": ["SCR-S007", "SCR-S012", "PAY-02"],
    "대기": ["SCR-C008", "waitlist", "대기열"],
    "노쇼": ["A05", "노쇼"],
    "전자계약": ["SCR-075", "MKT-05", "POL-05"],
    "락커": ["SCR-050", "SCR-051", "FAC-02"],
    "체성분": ["SCR-M006", "SCR-I006", "IOT-05"],
    "대시보드": ["SCR-094", "SCR-H1001", "KPI"],
    "권한": ["권한매트릭스", "SET-01"],
    "마일리지": ["MKT-04"],
    "쿠폰": ["MKT-03"],
    "자동알림": ["MKT-02", "NFR-19"],
    "급여": ["SCR-062", "STF-07"],
    "근태": ["SCR-061", "STF-06"],
}


def docs4_match(rec: dict) -> list[dict]:
    queries = split_codes(rec.get("fitgenie_code", ""))
    queries.append(rec["title"])
    full = f"{rec['title']} {rec.get('description', '')}"
    if rec.get("domain") == "본사·대시보드":
        queries.extend(["SCR-094", "SCR-H1001", "KPI", "대시보드"])
    elif rec.get("domain") == "회원앱·키오스크":
        queries.extend(["키오스크", "회원앱", "IOT", "MA-"])
    elif rec.get("domain") == "인프라·운영":
        queries.extend(["NFR", "외부연동", "API"])
    elif rec.get("domain") == "설정·권한":
        queries.extend(["권한매트릭스", "SET-"])
    for key, values in ALIASES.items():
        if key in full:
            queries.extend(values)
    found = []
    seen = set()
    for query in queries:
        query = clean(query)
        if not query or len(query) < 2 or query in ["○", "△", "×", "—"] or (query.isdigit() and len(query) <= 3):
            continue
        for rel, version, text in file_texts:
            idx = text.find(query)
            if idx < 0:
                continue
            line_no = text[:idx].count("\n") + 1
            key = (rel, line_no, query)
            if key in seen:
                continue
            seen.add(key)
            score = 100 if query in split_codes(rec.get("fitgenie_code", "")) else (80 if re.match(r"^[A-Z]+[-_A-Z0-9]+", query) else 50)
            score += 8 if version == "V1" else 4 if version == "V2" else 0
            found.append({"path": rel, "line": line_no, "version": version, "query": query, "score": score})
            if len(found) >= 8:
                break
        if len(found) >= 8:
            break
    if len(found) < 3:
        for heading in headings:
            score = max(similar(rec["title"], heading["title"]), similar(rec["title"], heading["full"]))
            if score >= 0.60:
                key = (heading["path"], heading["line"], heading["code"])
                if key in seen:
                    continue
                seen.add(key)
                found.append({"path": heading["path"], "line": heading["line"], "version": heading["version"], "query": heading["code"], "score": int(score * 70)})
    found.sort(key=lambda item: (-item["score"], 0 if item["version"] == "V1" else 1 if item["version"] == "V2" else 2, item["path"], item["line"]))
    collapsed = []
    seen_lines = set()
    for item in found:
        key = (item["path"], item["line"])
        if key in seen_lines:
            continue
        seen_lines.add(key)
        collapsed.append(item)
        if len(collapsed) >= 3:
            break
    return collapsed


def infer_scope(rec: dict, matches: list[dict]) -> str:
    text = f"{rec['title']} {rec.get('description', '')} {rec.get('scope_hint', '')}"
    fit = rec.get("apps", {}).get("FitGenie", "")
    versions = {m["version"] for m in matches}
    policy_words = ["정책 결정 필요", "확정 필요", "추후", "후속", "1.5", "제외", "우선순위 조정", "미확정", "신중하게"]
    if fit == "×" and not matches:
        return "후속/미반영 확인"
    if any(word in text for word in policy_words):
        if "V1" in versions:
            return "V1 반영 + 정책확인/후속 보완"
        if "V2" in versions:
            return "V2/후속 + 정책확인"
        return "후속/정책확인"
    if fit == "△":
        return "부분 반영/확인 필요"
    if "V1" in versions:
        return "V1"
    if "V2" in versions:
        return "V2/후속"
    if matches:
        return "공통/확인 필요"
    return "docs4 미확인"


for rec in merged:
    rec["docs4_matches"] = docs4_match(rec)
    rec["scope_judgment"] = infer_scope(rec, rec["docs4_matches"])
    refs = [(rec["source_type"], rec["source_path"])]
    refs.extend((m["source_type"], m["source_path"]) for m in rec["merged_sources"])
    evidence = []
    seen = set()
    for source_type, source_path in refs:
        key = (source_type, source_path)
        if key in seen:
            continue
        seen.add(key)
        evidence.append(f"{source_type}: {source_path}")
    rec["evidence"] = evidence


RELATION_GROUPS = {
    "체성분/인바디": ["체성분", "인바디", "IOT-05", "SCR-M006", "SCR-I006"],
    "미수금/미납/잔액": ["미수금", "미납", "잔액", "납부", "PAY-03"],
    "결제/수납/분할": ["결제", "수납", "분할", "승인번호", "PAY-01", "SCR-S003"],
    "환불/취소": ["환불", "취소", "위약금", "SCR-S012", "PAY-02", "SAL-EXT-04"],
    "대기열/예약제한": ["대기열", "Waitlist", "예약 제한", "정원", "노쇼"],
    "전자계약/서명": ["전자계약", "전자서명", "계약서", "MKT-05", "POL-05"],
    "회원등급/세그먼트": ["등급", "세그먼트", "POTENTIAL", "AT-RISK", "LOST", "LTV"],
    "대시보드/KPI": ["대시보드", "KPI", "지표", "랭킹", "신호등", "Today"],
    "권한/역할": ["권한", "역할", "Owner", "FC", "트레이너", "지점장", "대표"],
    "락커/사물함": ["락커", "사물함", "locker", "FAC-02"],
    "급여/정산/지출": ["급여", "정산", "지출", "명세서", "수당"],
    "자동알림/메시지": ["자동알림", "알림", "메시지", "SMS", "푸시", "알림톡"],
    "출입/키오스크/모바일": ["출입", "키오스크", "회원앱", "모바일앱", "QR", "IOT"],
}

PARTIAL_WORDS = [
    "탭",
    "필터",
    "검색",
    "목록",
    "테이블",
    "컬럼",
    "버튼",
    "모달",
    "팝업",
    "카드",
    "패널",
    "위젯",
    "입력",
    "조회",
    "상세",
    "배지",
    "차트",
]


def relation_groups_for(rec: dict) -> list[str]:
    docs_text = " ".join(match["query"] for match in rec.get("docs4_matches", []))
    text = f"{rec['title']} {rec.get('description', '')} {rec.get('fitgenie_code', '')} {docs_text}"
    lower = text.lower()
    groups = []
    for group, keywords in RELATION_GROUPS.items():
        if any(keyword.lower() in lower for keyword in keywords):
            groups.append(group)
    return groups


for rec in merged:
    rec["relation_groups"] = relation_groups_for(rec)

group_map: dict[str, list[dict]] = defaultdict(list)
for rec in merged:
    for group in rec["relation_groups"]:
        group_map[group].append(rec)


def related_records_for(rec: dict) -> list[dict]:
    candidates: dict[str, tuple[float, dict]] = {}
    for group in rec["relation_groups"]:
        for other in group_map[group]:
            if other is rec:
                continue
            score = 0.45
            if other["domain"] != rec["domain"]:
                score += 0.20
            score += max(similar(rec["title"], other["title"]), similar(rec.get("fitgenie_code", ""), other.get("fitgenie_code", ""))) * 0.45
            current = candidates.get(other["req_id"])
            if current is None or score > current[0]:
                candidates[other["req_id"]] = (score, other)
    ranked = sorted(candidates.values(), key=lambda item: (-item[0], DOMAIN_ORDER.index(item[1]["domain"]) if item[1]["domain"] in DOMAIN_ORDER else 99, item[1]["req_id"]))
    return [item[1] for item in ranked[:6]]


def infer_relation_type(rec: dict, related: list[dict]) -> str:
    title_desc = f"{rec['title']} {rec.get('description', '')}"
    has_partial_word = any(word in title_desc for word in PARTIAL_WORDS)
    if rec["source_count"] > 1:
        return "중복병합"
    if related:
        return "유사연계"
    if has_partial_word:
        return "부분포함"
    return "독립"


def relation_note_for(rec: dict, related: list[dict]) -> str:
    groups = ", ".join(rec.get("relation_groups", [])) or "-"
    if rec["source_count"] > 1:
        return f"동일 또는 사실상 같은 요구를 {rec['source_count']}개 출처에서 병합. 관련그룹={groups}"
    if related:
        sample = ", ".join(f"{item['req_id']} {item['title']}" for item in related[:4])
        return f"동일 주제권이나 화면/도메인/운영 목적 차이 가능. 관련그룹={groups}. 예: {sample}"
    if any(word in f"{rec['title']} {rec.get('description', '')}" for word in PARTIAL_WORDS):
        return "상위 화면의 탭/필터/목록/모달/입력항목으로 포함될 수 있어 화면 단위 검토 필요"
    return "현재 기준 독립 요구사항으로 판단"


for rec in merged:
    related = related_records_for(rec)
    rec["related_reqs"] = related
    rec["related_ids"] = ", ".join(item["req_id"] for item in related)
    rec["relation_type"] = infer_relation_type(rec, related)
    rec["relation_note"] = relation_note_for(rec, related)


summary_counts = defaultdict(int)
scope_counts = defaultdict(int)
source_counts = defaultdict(int)
relation_counts = defaultdict(int)
for rec in merged:
    summary_counts[rec["domain"]] += 1
    scope_counts[rec["scope_judgment"]] += 1
    source_counts[rec["source_type"]] += 1
    relation_counts[rec["relation_type"]] += 1


req_csv = OUT_DIR / f"요구사항_통합리스트_{TODAY}.csv"
trace_csv = OUT_DIR / f"요구사항_기능추적표_docs4_{TODAY}.csv"
relation_csv = OUT_DIR / f"요구사항_유사연계_검토리스트_{TODAY}.csv"

with req_csv.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["요구사항ID", "도메인", "요구사항", "관계유형", "관련 요구사항ID", "관계 설명", "요구 설명", "우선순위", "3사/핏지니 포함여부", "대표 출처", "중복 병합 출처 수", "비고"])
    for rec in merged:
        apps = ", ".join(f"{k}={v}" for k, v in rec["apps"].items() if v)
        writer.writerow([rec["req_id"], rec["domain"], rec["title"], rec["relation_type"], rec["related_ids"], rec["relation_note"], rec["description"], rec["priority"], apps, " | ".join(rec["evidence"][:4]), rec["source_count"], rec["scope_hint"]])

with trace_csv.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["요구사항ID", "요구사항", "기능/핏지니코드", "도메인", "관계유형", "관련 요구사항ID", "docs4 반영 위치", "V1/V2/후속 판단", "근거 출처", "비고"])
    for rec in merged:
        docs_pos = " / ".join(f"{m['version']} {m['path']}:{m['line']}({m['query']})" for m in rec["docs4_matches"]) or "미확인"
        writer.writerow([rec["req_id"], rec["title"], rec["fitgenie_code"] or rec["title"], rec["domain"], rec["relation_type"], rec["related_ids"], docs_pos, rec["scope_judgment"], " | ".join(rec["evidence"][:5]), rec["description"][:500]])

with relation_csv.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["요구사항ID", "도메인", "요구사항", "관계유형", "관계그룹", "관련 요구사항ID", "관계 설명", "docs4 판단", "출처"])
    for rec in merged:
        if rec["relation_type"] == "독립":
            continue
        writer.writerow([rec["req_id"], rec["domain"], rec["title"], rec["relation_type"], ", ".join(rec["relation_groups"]), rec["related_ids"], rec["relation_note"], rec["scope_judgment"], " | ".join(rec["evidence"][:4])])


req_md = OUT_DIR / f"요구사항_통합리스트_{TODAY}.md"
trace_md = OUT_DIR / f"요구사항_기능추적표_docs4_{TODAY}.md"
relation_md = OUT_DIR / f"요구사항_유사연계_검토리스트_{TODAY}.md"

with req_md.open("w", encoding="utf-8", newline="\n") as f:
    f.write("# Fit Genie 통합 요구사항 리스트\n\n")
    f.write(f"- 작성일: {TODAY}\n")
    f.write("- 기준: 3사 앱 비교자료, 스포짐 요구사항 자료, 대시보드/KPI 자료, 회의록을 통합 정리\n")
    f.write("- 주의: 이 문서는 원천 요구사항 목록이며 docs4 반영 여부는 별도 추적표에서 확인\n")
    f.write("- 중복 처리: 기능 목적, 사용자 행동, 데이터 객체, 운영 결과가 같은 항목은 하나의 요구사항으로 병합하고 출처를 누적\n")
    f.write("- 관계유형: 중복병합=같은 요구를 병합, 유사연계=주제는 같지만 화면/도메인/역할 분리 가능, 부분포함=상위 화면의 탭/필터/모달/입력항목 가능, 독립=별도 요구\n")
    f.write("- PDF 자료는 현재 로컬 텍스트 추출 도구 부재로 직접 행 추출 대상에서는 제외했으며, 구조화된 스포짐 엑셀 자료를 우선 사용\n\n")
    f.write("## 집계\n\n")
    f.write(f"- 통합 요구사항 수: {len(merged)}건\n")
    f.write(f"- 원천 추출 행 수: {len(records)}건\n")
    f.write(f"- 병합/중복 처리 수: {len(records) - len(merged)}건\n\n")
    f.write("| 도메인 | 요구사항 수 |\n|---|---:|\n")
    for domain in DOMAIN_ORDER:
        if summary_counts[domain]:
            f.write(f"| {domain} | {summary_counts[domain]} |\n")
    f.write("\n| 관계유형 | 요구사항 수 |\n|---|---:|\n")
    for key, value in sorted(relation_counts.items(), key=lambda item: (-item[1], item[0])):
        f.write(f"| {key} | {value} |\n")
    f.write("\n## 원천 자료\n\n")
    for key, path in PATHS.items():
        if path:
            f.write(f"- {key}: `{source_ref(path)}`\n")
    for meeting_file in MEETING_FILES:
        f.write(f"- meeting: `{source_ref(meeting_file)}` ({meeting_file.stat().st_size} bytes)\n")
    f.write("\n## 요구사항 리스트\n")
    current_domain = None
    for rec in merged:
        if current_domain != rec["domain"]:
            current_domain = rec["domain"]
            f.write(f"\n### {current_domain}\n\n")
            f.write("| ID | 요구사항 | 관계유형 | 관련ID | 설명 | 우선순위 | 출처 | 병합 |\n|---|---|---|---|---|---|---|---:|\n")
        apps = ", ".join(f"{k}={v}" for k, v in rec["apps"].items() if v)
        source = "<br>".join(one_line(e, 160) for e in rec["evidence"][:3])
        priority = one_line(rec["priority"] or apps or "-", 120)
        f.write(f"| {rec['req_id']} | {one_line(rec['title'], 120)} | {rec['relation_type']} | {one_line(rec['related_ids'] or '-', 100)} | {one_line(rec['description'], 300)} | {priority} | {source} | {rec['source_count']} |\n")

with trace_md.open("w", encoding="utf-8", newline="\n") as f:
    f.write("# 요구사항별 기능 추적표 docs4 매핑\n\n")
    f.write(f"- 작성일: {TODAY}\n")
    f.write("- 구조: 요구사항 → 기능/핏지니 코드 → docs4 반영 위치 → V1/V2/후속 판단 → 근거 출처\n")
    f.write("- 판단 기준: docs4 내 코드/키워드/화면 heading 검색 결과와 원천자료의 FitGenie 포함 여부, 회의록의 V1/V2/후속 표현을 함께 사용\n")
    f.write("- 관계유형은 기능 중복 여부가 아니라 구현 단위 검토 기준입니다. 유사연계는 병합 대상이 아니라 연동/화면분리 검토 대상입니다.\n")
    f.write("- 주의: 자동 매핑 1차본이므로 `docs4 미확인`, `부분 반영/확인 필요`, `정책확인` 항목은 사람이 최종 검수해야 함\n\n")
    f.write("## 집계\n\n")
    f.write("| 판단 | 건수 |\n|---|---:|\n")
    for key, value in sorted(scope_counts.items(), key=lambda item: (-item[1], item[0])):
        f.write(f"| {key} | {value} |\n")
    f.write("\n## 추적표\n")
    current_domain = None
    for rec in merged:
        if current_domain != rec["domain"]:
            current_domain = rec["domain"]
            f.write(f"\n### {current_domain}\n\n")
            f.write("| 요구사항 ID | 요구사항 | 기능/코드 | 관계유형 | docs4 반영 위치 | V1/V2/후속 판단 | 근거 출처 |\n|---|---|---|---|---|---|---|\n")
        docs_pos = "<br>".join(one_line(f"{m['version']} `{m['path']}:{m['line']}` 검색어={m['query']}", 180) for m in rec["docs4_matches"]) or "미확인"
        source = "<br>".join(one_line(e, 150) for e in rec["evidence"][:3])
        feature = one_line(rec["fitgenie_code"] or rec["title"], 120)
        f.write(f"| {rec['req_id']} | {one_line(rec['title'], 110)} | {feature} | {rec['relation_type']} | {docs_pos} | {one_line(rec['scope_judgment'], 80)} | {source} |\n")

with relation_md.open("w", encoding="utf-8", newline="\n") as f:
    f.write("# 요구사항 유사연계 검토리스트\n\n")
    f.write(f"- 작성일: {TODAY}\n")
    f.write("- 목적: 비슷해 보이지만 병합하면 위험한 요구사항을 화면/도메인/역할 기준으로 검토하기 위한 보조표\n")
    f.write("- `유사연계`는 병합 대상이 아니라, 같은 주제권 안에서 화면 분리/탭 포함/연동 여부를 판단해야 하는 항목입니다.\n\n")
    f.write("| ID | 도메인 | 요구사항 | 관계유형 | 관계그룹 | 관련ID | 관계 설명 |\n|---|---|---|---|---|---|---|\n")
    for rec in merged:
        if rec["relation_type"] == "독립":
            continue
        f.write(f"| {rec['req_id']} | {rec['domain']} | {one_line(rec['title'], 120)} | {rec['relation_type']} | {one_line(', '.join(rec['relation_groups']) or '-', 120)} | {one_line(rec['related_ids'] or '-', 120)} | {one_line(rec['relation_note'], 260)} |\n")


xlsx_out = OUT_DIR / f"요구사항_통합_및_docs4추적표_{TODAY}.xlsx"
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "통합요구사항"
ws.append(["요구사항ID", "도메인", "요구사항", "관계유형", "관련요구사항ID", "관계설명", "설명", "우선순위", "BroJ", "OnFit", "LessonBook", "FitGenie", "핏지니코드", "대표출처", "병합출처수"])
for rec in merged:
    ws.append([rec["req_id"], rec["domain"], rec["title"], rec["relation_type"], rec["related_ids"], rec["relation_note"], rec["description"], rec["priority"], rec["apps"].get("BroJ", ""), rec["apps"].get("OnFit", ""), rec["apps"].get("LessonBook", ""), rec["apps"].get("FitGenie", ""), rec["fitgenie_code"], " | ".join(rec["evidence"][:4]), rec["source_count"]])
ws2 = wb.create_sheet("docs4추적표")
ws2.append(["요구사항ID", "도메인", "요구사항", "기능/핏지니코드", "관계유형", "관련요구사항ID", "docs4반영위치", "판단", "근거출처", "비고"])
for rec in merged:
    docs_pos = " / ".join(f"{m['version']} {m['path']}:{m['line']}({m['query']})" for m in rec["docs4_matches"]) or "미확인"
    ws2.append([rec["req_id"], rec["domain"], rec["title"], rec["fitgenie_code"] or rec["title"], rec["relation_type"], rec["related_ids"], docs_pos, rec["scope_judgment"], " | ".join(rec["evidence"][:5]), rec["description"]])
ws_rel = wb.create_sheet("유사연계검토")
ws_rel.append(["요구사항ID", "도메인", "요구사항", "관계유형", "관계그룹", "관련요구사항ID", "관계설명", "docs4판단", "출처"])
for rec in merged:
    if rec["relation_type"] == "독립":
        continue
    ws_rel.append([rec["req_id"], rec["domain"], rec["title"], rec["relation_type"], ", ".join(rec["relation_groups"]), rec["related_ids"], rec["relation_note"], rec["scope_judgment"], " | ".join(rec["evidence"][:4])])
ws3 = wb.create_sheet("집계")
ws3.append(["구분", "항목", "건수"])
for domain in DOMAIN_ORDER:
    if summary_counts[domain]:
        ws3.append(["도메인", domain, summary_counts[domain]])
for key, value in sorted(scope_counts.items(), key=lambda item: (-item[1], item[0])):
    ws3.append(["판단", key, value])
for key, value in sorted(source_counts.items(), key=lambda item: (-item[1], item[0])):
    ws3.append(["원천유형", key, value])
for key, value in sorted(relation_counts.items(), key=lambda item: (-item[1], item[0])):
    ws3.append(["관계유형", key, value])
for sheet in wb.worksheets:
    sheet.freeze_panes = "A2"
    for col in sheet.columns:
        max_len = min(60, max((len(str(c.value)) if c.value is not None else 0) for c in col) + 2)
        sheet.column_dimensions[col[0].column_letter].width = max(12, max_len)
wb.save(xlsx_out)

print("generated")
print(req_md)
print(trace_md)
print(relation_md)
print(req_csv)
print(trace_csv)
print(relation_csv)
print(xlsx_out)
print("records", len(records), "merged", len(merged), "deduped", len(records) - len(merged))
print("domain_counts", dict(summary_counts))
print("scope_counts", dict(scope_counts))
print("relation_counts", dict(relation_counts))
