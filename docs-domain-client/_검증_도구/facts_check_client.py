#!/usr/bin/env python3
"""
회원앱(client2 + docs-domain-client) 정합성 자동 검증 도구.

사용법: python3 docs-domain-client/_검증_도구/facts_check_client.py

검증 범위:
  A) docs2 정본 정합 (회원앱이 표시해야 하는 fact들이 docs-domain-client에 명시되었는지)
  B) 회원앱 자체 정본 (5종 role, 8 도메인 코드, MA-ID 체계)
  C) client2 ↔ docs-domain-client 양방향 정합 (도메인/화면 ID 참조)
  D) 정책 정합 (Owner, PAY-06, HQ-09, NFR-05, CLS-07/08, A05)
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DOCS_DOMAIN_CLIENT = REPO_ROOT / "docs-domain-client"
CLIENT2 = REPO_ROOT / "client2"

# ============================================================
# A) docs2 정본 fact — 회원앱에 표시·반영되어야 하는 fact
# ============================================================
DOCS2_CANONICAL_FACTS = {
    "회원 실제 상태 7종 (ACTIVE/EXPIRED/SCHEDULED/EXPIRING/HOLDING/UNREGISTERED/WITHDRAWN)":
        r"ACTIVE.*EXPIRED.*SCHEDULED.*EXPIRING.*HOLDING.*UNREGISTERED.*WITHDRAWN",
    "결제링크 상태 5종 (발송됨·결제완료·만료·무효화·발송실패)":
        r"발송됨.*결제완료.*만료.*무효화.*발송실패",
    "상품 대분류 5종 코드 (MEMBERSHIP/LESSON_PASS/LOCKER/WEAR/GENERAL)":
        r"MEMBERSHIP.*LESSON_PASS.*LOCKER.*WEAR.*GENERAL",
    "상품 대분류 5종 라벨 (회원권·수강권·락커·운동복·일반)":
        r"회원권.*수강권.*락커.*운동복.*일반",
    "회원 등급 5단계 (브론즈·실버·골드·플래티넘·다이아몬드)":
        r"브론즈.*실버.*골드.*플래티넘.*다이아몬드",
    "GX 세부 6종 (요가·필라테스·스피닝·줌바·에어로빅·GX 기타)":
        r"요가.*필라테스.*스피닝.*줌바.*에어로빅.*GX 기타",
    "강습 세션 4종 (PT·필라테스·스트레칭·테라피)":
        r"PT.*필라테스.*스트레칭.*테라피",
    "출석 결과 3종 (성공·실패·중복)":
        r"성공.*실패.*중복",
}

# ============================================================
# B) 회원앱 자체 정본
# ============================================================
CLIENT_CANONICAL_FACTS = {
    "회원앱 역할 5종 (member/trainer/golf_trainer/fc/staff)":
        r"member.*trainer.*golf_trainer.*fc.*staff",
    "회원앱 8 도메인 (C01~C08) 본문 참조":
        r"C01.*C02.*C03.*C04.*C05.*C06.*C07.*C08",
}

# ============================================================
# D) 정책 정합 — docs2와의 분리 원칙, 호칭, 보류 정책
# ============================================================
POLICY_FACTS = {
    "Owner(지점장) 호칭 (정본 호칭)":
        r"Owner.*지점장|지점장.*Owner",
    "PAY-06 결제링크 회원앱 보류 정책":
        r"PAY-06.*보류|PAY-06.*노출.*보류|PAY-06.*결제링크",
    "HQ-09 회원 이용권 만료 step":
        r"HQ-09",
    "NFR-05 알림 결과 동기화":
        r"NFR-05",
    "CLS-07 횟수 차감":
        r"CLS-07",
    "CLS-08 페널티":
        r"CLS-08",
    "A05 자동 노쇼":
        r"A05",
    "docs2 정합 명시 (정합·정본 키워드 + docs2 인용)":
        r"docs2.*정합|docs2.*정본",
    "5종 role 분리 원칙 (CRM 8종 ≠ 회원앱 5종)":
        r"CRM.*분리|회원앱.*분리|CRM.*8.*회원앱.*5",
    "SCR-097 감사 로그 (회원앱 액션 추적)":
        r"SCR-097",
}

# ============================================================
# E) 운영정책 세부 fact (회원앱 한정)
# ============================================================
OPERATION_FACTS = {
    "출석 인증 수단 4종 (밴드·QR·얼굴·핀)":
        r"밴드.*QR.*얼굴.*핀|QR.*밴드.*얼굴.*핀|QR.*얼굴.*핀.*밴드",
    "InBody 측정기 외부 연동 명시":
        r"InBody",
    "마일리지 정책 (1% 적립·1년 만료)":
        r"1%.*적립.*1년.*만료|마일리지.*1%.*만료|1% \(센터 설정\)",
    "A05 자동 노쇼 30분 기본 정책 (docs2 정본)":
        r"A05.*30분|30분.*A05|자동 노쇼.*30분|노쇼.*30분|기본 30분",
    "노쇼 페널티 (3회·30일)":
        r"3회.*30일|노쇼.*3회|페널티.*30일",
    "알림 3채널 (푸시·SMS·인앱)":
        r"푸시.*SMS.*인앱|SMS.*푸시.*인앱|인앱.*푸시.*SMS|푸시 알림.*SMS",
    "토스페이먼츠 SDK 결제 명시":
        r"토스페이먼츠",
    "결제 후 5초 이내 CRM 매출 갱신":
        r"5초 이내 CRM|5초.*CRM.*매출|매출.*5초.*갱신|매출 카드 갱신",
    "회원 상태 한국어 라벨 7종 (활성·만료·예정·임박·홀딩·미등록·탈퇴)":
        r"활성.*만료.*예정.*임박.*홀딩.*미등록.*탈퇴",
    "친구 초대 한도 100명":
        r"친구.*100명|초대.*100명|회원당 최대 100명",
    "Q&A 카테고리 5종 (운동·식단·이용권·시설·기타)":
        r"운동.*식단.*이용권.*시설.*기타",
    "신고 자동 숨김 (3건 누적)":
        r"신고.*3건|3건.*자동 숨김|3건 누적",
    "다크 모드 대응 명시":
        r"다크 모드|다크모드",
    "접근성 (스크린리더·VoiceOver·TalkBack 중 하나)":
        r"VoiceOver|TalkBack|스크린리더|접근성",
    "결제 멱등성 키 (중복 결제 5분 윈도우)":
        r"멱등성.*5분|5분 이내 멱등성|동일.*5분 이내",
}


def grep_count(pattern: str, target_dir: Path) -> int:
    """target_dir 내 패턴 매칭 파일 수를 반환."""
    result = subprocess.run(
        ["grep", "-rlE", pattern, str(target_dir)],
        capture_output=True, text=True,
    )
    return len([line for line in result.stdout.split("\n") if line.strip()])


def grep_count_both(pattern: str) -> tuple[int, int]:
    """docs-domain-client / client2 양쪽 매칭 파일 수."""
    return (
        grep_count(pattern, DOCS_DOMAIN_CLIENT),
        grep_count(pattern, CLIENT2),
    )


def domain_pair_check() -> list[tuple[str, bool, bool]]:
    """C01~C08 도메인 폴더가 docs-domain-client / client2 양쪽 존재하는지."""
    domains = [
        ("C01 공통-회원", "C01-공통-회원"),
        ("C02 트레이너-골프강사", "C02-트레이너-골프강사"),
        ("C03 FC-스태프", "C03-FC-스태프"),
        ("C04 탐색플랫폼", "C04-탐색플랫폼"),
        ("C05 결제주문", "C05-결제주문"),
        ("C06 리워드활동", "C06-리워드활동"),
        ("C07 커뮤니티", "C07-커뮤니티"),
        ("C08 시스템공통", "C08-시스템공통"),
    ]
    rows = []
    for dd_name, c2_name in domains:
        dd_exists = (DOCS_DOMAIN_CLIENT / dd_name).is_dir()
        c2_exists = (CLIENT2 / c2_name).is_dir()
        rows.append((dd_name, dd_exists, c2_exists))
    return rows


def main() -> int:
    print("회원앱 정합성 검증 — client2 ↔ docs-domain-client ↔ docs2")
    print("=" * 80)

    fail_count = 0
    weak_count = 0
    ok_count = 0

    def report(group_name: str, facts: dict[str, str]) -> None:
        nonlocal fail_count, weak_count, ok_count
        print(f"\n[{group_name}]")
        for name, pattern in facts.items():
            dd, c2 = grep_count_both(pattern)
            total = dd + c2
            if total == 0:
                print(f"  ❌ FAIL  {name}  (dd={dd} c2={c2})")
                fail_count += 1
            elif total == 1:
                print(f"  ⚠️  WEAK  {name}  (dd={dd} c2={c2})")
                weak_count += 1
            else:
                print(f"  ✅ OK    {name}  (dd={dd} c2={c2})")
                ok_count += 1

    report("A) docs2 정본 fact 정합", DOCS2_CANONICAL_FACTS)
    report("B) 회원앱 자체 정본", CLIENT_CANONICAL_FACTS)
    report("D) 정책 정합 (Owner/PAY-06/HQ-09/NFR-05/CLS/A05)", POLICY_FACTS)
    report("E) 운영정책 세부 fact (회원앱 한정)", OPERATION_FACTS)

    print("\n[C) 도메인 폴더 양방향 매칭]")
    domain_fail = 0
    for dd_name, dd_exists, c2_exists in domain_pair_check():
        if dd_exists and c2_exists:
            print(f"  ✅ OK    {dd_name}  (dd ✓ / c2 ✓)")
            ok_count += 1
        else:
            print(f"  ❌ FAIL  {dd_name}  (dd {'✓' if dd_exists else '✗'} / c2 {'✓' if c2_exists else '✗'})")
            domain_fail += 1
            fail_count += 1

    print()
    print("=" * 80)
    print(f"요약: FAIL {fail_count} / WEAK {weak_count} / OK {ok_count}")
    print("=" * 80)

    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
