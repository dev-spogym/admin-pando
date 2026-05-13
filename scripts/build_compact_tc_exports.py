import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPLIT_DIR = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/split_tabs"
OUTPUT_DIR = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/compact_tabs"

SOURCES = {
    "시트1": SPLIT_DIR / "full_massive_tc_enriched.csv",
    "Admin": SPLIT_DIR / "admin_core.csv",
    "회원앱": SPLIT_DIR / "member_app.csv",
    "Kiosk": SPLIT_DIR / "kiosk.csv",
    "통합연동": SPLIT_DIR / "integration.csv",
}

COMPACT_HEADERS = ["TC ID", "화면", "테스트 항목", "선행조건", "수행절차", "기대결과"]

DETAIL_LABELS = {
    "HAPPY": "정상 진입",
    "CHAIN": "연속 처리",
    "REENTRY": "재진입",
    "STALE": "선행 변경",
    "AUDIT": "후속 반영",
    "DEFAULT": "기본 표시",
    "LONGTEXT": "긴 데이터",
    "RESPONSIVE": "반응형",
    "DISABLED": "비활성",
    "FEEDBACK": "피드백",
    "PRIMARY": "대표 동선",
    "SECONDARY": "보조 동선",
    "BACK": "복귀",
    "EXPIRED": "만료 컨텍스트",
    "MULTI": "다중 실행",
    "VALID": "정상값",
    "BOUNDARY": "경계값",
    "DUPLICATE": "중복/충돌",
    "PERSIST": "영속성",
    "DOWNSTREAM": "하위 반영",
    "LOADING": "로딩",
    "EMPTY": "빈 상태",
    "ACTIVE": "활성 상태",
    "INACTIVE": "비활성 상태",
    "TRANSITION": "상태 전이",
    "ALLOW": "허용 권한",
    "READONLY": "읽기전용",
    "DENY": "권한 거절",
    "SCOPE": "권한 범위",
    "TRACE": "권한 추적",
    "VALIDATION": "검증 오류",
    "API": "API 실패",
    "TIMEOUT": "지연/타임아웃",
    "CONFLICT": "동시성 충돌",
    "RECOVERY": "오류 복구",
}

CONTEXT_LABELS = {
    "DESK_STD": "데스크톱 표준",
    "DESK_PEAK": "데스크톱 피크",
    "DESK_RETRY": "데스크톱 재시도",
    "DESK_MONTHEND": "데스크톱 월말",
    "DESK_CROSS": "데스크톱 다지점",
    "TABLET_STD": "태블릿 표준",
    "TABLET_PEAK": "태블릿 피크",
    "TABLET_RETRY": "태블릿 재시도",
    "TABLET_MONTHEND": "태블릿 월말",
    "TABLET_CROSS": "태블릿 다지점",
    "MOBILE_STD": "모바일 표준",
    "MOBILE_PEAK": "모바일 피크",
    "MOBILE_RETRY": "모바일 재진입",
    "MOBILE_MONTHEND": "모바일 월말",
    "HQ_SCOPE": "본사 권한",
    "BRANCH_SCOPE": "지점 권한",
    "LIMITED_ROLE": "제한 권한",
    "INTEGRATION_DELAY": "연동 지연",
}


def strip_noise(text):
    text = re.sub(r"\s+", " ", text or "").strip()
    patterns = [
        r"^기본 운영 데이터와 권한이 준비된 상태\s*/\s*",
        r"^.*?:\s*화면 진입 시 전제 조건 충족 상태에서 기본 레이아웃과 핵심 위젯이 표시된다\.\s*",
        r"^.*?:\s*검색, 필터, 정렬, 기간 조건 변경 시 목록/지표가 조건에 맞게 갱신된다\.\s*",
        r"^.*?:\s*오프라인, 단말 오류, 동기화 실패 시 fallback 절차가 동작한다\.\s*",
        r"^정상 진입, 브레드크럼/타이틀/기본 데이터 표시\s*",
        r"^조건 반영 조회 결과 표시\s*",
        r"^수동 처리 또는 재동기화 경로 제공\s*",
    ]
    for pattern in patterns:
        text = re.sub(pattern, "", text)
    return text.strip()


def split_detail(detail):
    parts = detail.split("_")
    for i in range(len(parts), 0, -1):
        head = "_".join(parts[:i])
        tail = "_".join(parts[i:])
        if head in DETAIL_LABELS:
            return DETAIL_LABELS[head], CONTEXT_LABELS.get(tail, tail or "-")
    return detail, "-"


def compact_row(row):
    detail = row.get("세부 분류", "").strip()
    detail_label, context_label = split_detail(detail)
    title = row.get("체크 제목", "").strip()
    item = f"{title} / {detail_label}"
    precondition = strip_noise(row.get("사전 조건", ""))
    action = strip_noise(row.get("실행 단계", ""))
    expected = strip_noise(row.get("기대 결과", ""))
    return {
        "TC ID": row.get("확장 TC ID", "").strip(),
        "화면": row.get("세부 섹션", "").strip(),
        "테스트 항목": item,
        "선행조건": context_label if not precondition else f"{context_label} / {precondition}",
        "수행절차": action,
        "기대결과": expected,
    }


def convert_file(sheet_name, source_path):
    output_path = OUTPUT_DIR / f"{sheet_name}.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with source_path.open("r", encoding="utf-8", newline="") as src, output_path.open(
        "w", encoding="utf-8", newline=""
    ) as dst:
        reader = csv.DictReader(src)
        writer = csv.DictWriter(dst, fieldnames=COMPACT_HEADERS)
        writer.writeheader()
        for row in reader:
            writer.writerow(compact_row(row))
            count += 1
    return {"sheet": sheet_name, "rows": count, "path": str(output_path.relative_to(ROOT))}


def main():
    results = [convert_file(sheet, path) for sheet, path in SOURCES.items()]
    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
