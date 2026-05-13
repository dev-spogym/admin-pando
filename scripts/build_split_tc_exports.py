import csv
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT_CSV = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/full_massive_tc.csv"
OUTPUT_DIR = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/split_tabs"

BASE_HEADERS = [
    "순번",
    "소스 문서",
    "대분류",
    "세부 섹션",
    "부모 TC ID",
    "확장 TC ID",
    "기본 분류",
    "세부 분류",
    "체크 제목",
    "사전 조건",
    "실행 단계",
    "기대 결과",
    "상태",
    "근거",
    "생성 규칙",
]
EXTRA_HEADERS = ["채널구분", "판정상태", "판정사유"]
ALL_HEADERS = BASE_HEADERS + EXTRA_HEADERS

KIOSK_PATTERN = re.compile(r"키오스크|kiosk|X23|SCR-I002|SCR-I008|kiosk설정|kiosk운영현황", re.I)
MEMBER_APP_PATTERN = re.compile(
    r"회원앱|회원 앱|앱연동|회원직접결제|모바일|푸시|X31|X32|X33|X34|회원건강연동",
    re.I,
)
INTEGRATION_PATTERN = re.compile(
    r"연동|동기화|역유입|POS|VAN|PG|결제링크|키오스크|kiosk|회원앱|앱연동|IoT|X23|X31|X32|X33|X34|X35",
    re.I,
)
NEED_DATA_PATTERN = re.compile(r"VAN|PG|POS|IoT|결제링크|회원건강연동|kiosk|키오스크|외부 연동|동기화", re.I)
NEED_DECISION_PATTERN = re.compile(
    r"정산|인센티브|페이롤|급여정책|운영 정책|정책 확정|권장|보류|예외 케이스|방안 모색",
    re.I,
)


def read_rows():
    with INPUT_CSV.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def combined_text(row):
    return " ".join(
        [
            row["소스 문서"],
            row["대분류"],
            row["세부 섹션"],
            row["부모 TC ID"],
            row["확장 TC ID"],
            row["체크 제목"],
            row["사전 조건"],
            row["실행 단계"],
            row["기대 결과"],
            row["근거"],
            row["생성 규칙"],
        ]
    )


def classify_channels(row):
    text = combined_text(row)
    tags = []
    if MEMBER_APP_PATTERN.search(text):
        tags.append("회원앱")
    if KIOSK_PATTERN.search(text):
        tags.append("Kiosk")
    if INTEGRATION_PATTERN.search(text):
        tags.append("통합연동")
    if not tags:
        tags.append("Admin")
    return tags


def classify_status(row):
    text = combined_text(row)
    if NEED_DATA_PATTERN.search(text):
        return "Need-Data", "외부 연동/응답값/동기화 세부 데이터 확인 필요"
    if NEED_DECISION_PATTERN.search(text):
        return "Need-Decision", "정산/인센티브/페이롤/운영정책 기준 확정 필요"
    return "Ready", "현 문서 기준 즉시 검수 가능"


def enrich_rows(rows):
    enriched = []
    for row in rows:
        tags = classify_channels(row)
        status, reason = classify_status(row)
        enriched.append(
            {
                **row,
                "채널구분": ", ".join(tags),
                "판정상태": status,
                "판정사유": reason,
            }
        )
    return enriched


def write_csv(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=ALL_HEADERS)
        writer.writeheader()
        writer.writerows(rows)


def build_summary_rows(enriched_rows):
    channel_counter = Counter()
    status_counter = Counter()
    source_counter = Counter()

    for row in enriched_rows:
        for tag in row["채널구분"].split(", "):
            channel_counter[tag] += 1
        status_counter[row["판정상태"]] += 1
        source_counter[row["소스 문서"]] += 1

    rows = [
        ["구분", "값", "설명"],
        ["총 TC 행수", str(len(enriched_rows)), "시트1 전체 기준"],
        ["Admin 코어", str(channel_counter["Admin"]), "회원앱/Kiosk/통합연동으로 분류되지 않은 admin 코어 TC"],
        ["회원앱", str(channel_counter["회원앱"]), "회원앱 직접 시나리오 및 앱 연계 TC"],
        ["Kiosk", str(channel_counter["Kiosk"]), "키오스크 직접 연동 및 운영 TC"],
        ["통합연동", str(channel_counter["통합연동"]), "POS/VAN/PG/IoT/앱/키오스크 연동 포함 TC"],
        ["Ready", str(status_counter["Ready"]), "현 문서 기준 즉시 검수 가능"],
        ["Need-Data", str(status_counter["Need-Data"]), "외부 연동/동기화 세부 데이터 확인 필요"],
        ["Need-Decision", str(status_counter["Need-Decision"]), "정산/인센티브/페이롤/운영정책 기준 확정 필요"],
        ["", "", ""],
        ["분류 규칙", "회원앱", "회원앱/앱연동/회원직접결제/모바일/푸시/X31~X34/회원건강연동 포함"],
        ["분류 규칙", "Kiosk", "키오스크/kiosk/X23/SCR-I002/SCR-I008/kiosk 설정/운영현황 포함"],
        ["분류 규칙", "통합연동", "연동/동기화/역유입/POS/VAN/PG/결제링크/IoT/X23/X31~X35 포함"],
        ["", "", ""],
        ["상위 소스 문서", "행수", "설명"],
    ]

    for source, count in source_counter.most_common(12):
        rows.append([source, str(count), "확장 후 행 수"])

    return rows


def main():
    rows = read_rows()
    enriched_rows = enrich_rows(rows)

    admin_rows = [row for row in enriched_rows if row["채널구분"] == "Admin"]
    member_app_rows = [row for row in enriched_rows if "회원앱" in row["채널구분"].split(", ")]
    kiosk_rows = [row for row in enriched_rows if "Kiosk" in row["채널구분"].split(", ")]
    integration_rows = [row for row in enriched_rows if "통합연동" in row["채널구분"].split(", ")]

    write_csv(OUTPUT_DIR / "full_massive_tc_enriched.csv", enriched_rows)
    write_csv(OUTPUT_DIR / "admin_core.csv", admin_rows)
    write_csv(OUTPUT_DIR / "member_app.csv", member_app_rows)
    write_csv(OUTPUT_DIR / "kiosk.csv", kiosk_rows)
    write_csv(OUTPUT_DIR / "integration.csv", integration_rows)

    summary_rows = build_summary_rows(enriched_rows)
    with (OUTPUT_DIR / "summary.json").open("w", encoding="utf-8") as f:
        json.dump(
            {
                "total": len(enriched_rows),
                "admin": len(admin_rows),
                "member_app": len(member_app_rows),
                "kiosk": len(kiosk_rows),
                "integration": len(integration_rows),
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    with (OUTPUT_DIR / "summary.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(summary_rows)

    print(
        json.dumps(
            {
                "total": len(enriched_rows),
                "admin": len(admin_rows),
                "member_app": len(member_app_rows),
                "kiosk": len(kiosk_rows),
                "integration": len(integration_rows),
                "outputDir": str(OUTPUT_DIR.relative_to(ROOT)),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
