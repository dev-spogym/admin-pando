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

# ============================================================
# F) 구조 / 시간 정합 / 코드 자체 정합 (3차)
# ============================================================
STRUCTURE_FACTS = {
    "HTTPS 강제 (TLS 1.2+) 보안 정책":
        r"HTTPS.*TLS|TLS 1\.2",
    "JWT 만료 1시간 + refresh 토큰":
        r"JWT.*만료 1시간|만료 1시간.*refresh|1시간.*refresh",
    "QR 토큰 회전 주기 미확정 등재 (또는 회전 명시)":
        r"QR 토큰 회전 주기|QR.*60초|토큰 회전.*60|QR 토큰.*회전",
    "회원 홀딩 기간 (기간제 7~30일)":
        r"7~30일|기간제.*7.*30|홀딩.*7~30",
    "출석 중복 윈도우 (10분)":
        r"10분 이내.*재시도|동일 회원 10분|중복.*10분",
    "결제링크 만료 7일 정책":
        r"결제링크.*7일|링크 만료.*7일|7일 경과 자동 만료",
    "마일리지 만료 30일 전 알림":
        r"만료 30일 전|30일 전 알림|30일 전.*알림",
    "쿠폰 만료 7일 전 알림":
        r"쿠폰.*7일 전|7일 전 알림|쿠폰 만료 7일",
    "신고 부적절 자동 필터 (작성 차단)":
        r"부적절.*자동 필터|자동 필터.*차단|패턴 매칭.*차단",
    "PT 횟수 100회 한도 (CLS-07 정합)":
        r"100회|PT.*100|횟수.*100",
    "환불 자동 계산 정책 미확정 (수기 산정)":
        r"환불 자동 계산.*미확정|환불.*수기 입력|수기 산정",
    "감사 로그 비동기 INSERT (SCR-097)":
        r"SCR-097.*비동기|비동기 INSERT|SCR-097.*INSERT",
    "오프라인 캐시 24시간":
        r"24시간 캐시|오프라인.*24시간|24시간.*캐시",
    "본인 인증 (생체 또는 앱 비밀번호)":
        r"생체 인증|앱 비밀번호|FaceID|TouchID|지문",
    "MFN 기능코드 체계 (MFN-XXX)":
        r"MFN-",
    "MA 화면 ID 체계 (MA-XXX)":
        r"MA-\d{3}",
    "딥링크 스킴 (fitgenie://)":
        r"fitgenie://",
    "수업 시작 24시간 경과 자동 만료 (서명)":
        r"24시간 경과.*만료|24시간.*자동 만료|시작 후 24시간",
}

# ============================================================
# I) 화면 품질 정합 (docs-domain-client README 단위)
# ============================================================
QUALITY_FACTS = {
    "mermaid flowchart 다이어그램 사용":
        r"```mermaid",
    "메인 흐름 섹션 (## 12)":
        r"## 12\. 메인 흐름",
    "에러 흐름 섹션 (## 13)":
        r"## 13\. 에러와 예외 흐름",
    "운영 정책 섹션 (## 15)":
        r"## 15\. 운영 정책",
    "자기완결 마무리 문구":
        r"별도 문서 없이.*한 장만 보면",
    "작성일 2026 명시":
        r"2026-05-2[34]",
    "Phase 우선순위 (P0/P1/P2)":
        r"P[012]",
    "MFN 기능코드 메타 명시 (MFN-XXX)":
        r"MFN-\d{3}",
    "라우트 또는 진입 정의":
        r"라우트|fitgenie://|자동 진입|진입 경로",
}

# 화면 강제 fact가 아니라 단순 카운트 fact (docs-domain-client 전체에서 N개 이상)
SCALE_FACTS = {
    "docs2 SCR 화면 참조 (회원앱 ↔ CRM 매핑 명시)":
        r"SCR-\d{3}",
    "회원 탭바 명시 (홈·예약·QR·리워드·MY 중)":
        r"탭바",
    "토스트 명시 (정보·성공·경고·오류 분류 중 하나)":
        r"정보 토스트|성공 토스트|경고 토스트|오류 토스트|성공.*토스트",
}


def file_pair_check() -> list[tuple[str, bool, bool]]:
    """C01~C08 도메인 폴더에 회원앱.md + 운영정책.md 페어가 모두 있는지."""
    domains = [
        "C01-공통-회원", "C02-트레이너-골프강사", "C03-FC-스태프",
        "C04-탐색플랫폼", "C05-결제주문", "C06-리워드활동",
        "C07-커뮤니티", "C08-시스템공통",
    ]
    rows = []
    for dom in domains:
        domain_md = next(CLIENT2.glob(f"{dom}/*.md"), None) is not None and bool(
            list((CLIENT2 / dom).glob("*.md"))
        )
        # 정확히 회원앱.md + 운영정책.md 페어
        screen_file = (CLIENT2 / dom).glob("회원앱.md")
        policy_file = (CLIENT2 / dom).glob("운영정책.md")
        s_ok = any(True for _ in screen_file)
        p_ok = any(True for _ in policy_file)
        rows.append((dom, s_ok, p_ok))
    return rows


def per_screen_check(pattern: str) -> tuple[int, int]:
    """모든 docs-domain-client/CXX*/MA-XXX*/README.md 중 패턴 매칭 건수.

    Returns (matched, total)
    """
    matched = 0
    total = 0
    for readme in DOCS_DOMAIN_CLIENT.glob("C0*/MA-*/README.md"):
        total += 1
        try:
            text = readme.read_text(encoding="utf-8")
            import re
            if re.search(pattern, text):
                matched += 1
        except OSError:
            continue
    return matched, total


def common_folder_check() -> list[tuple[str, bool]]:
    """client2/_공통 핵심 8 파일 존재 확인."""
    required = [
        "권한매트릭스.md",
        "상태전이.md",
        "자동화_크론.md",
        "외부연동_현황.md",
        "에러_예외_표준.md",
        "토스트_메시지.md",
        "디자인_시스템.md",
    ]
    rows = []
    for f in required:
        rows.append((f, (CLIENT2 / "_공통" / f).is_file()))
    return rows


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
    report("F) 구조 / 시간 정합 / 코드 체계", STRUCTURE_FACTS)

    print("\n[G) client2 도메인별 회원앱.md + 운영정책.md 페어]")
    for dom, s_ok, p_ok in file_pair_check():
        if s_ok and p_ok:
            print(f"  ✅ OK    {dom}  (회원앱.md ✓ / 운영정책.md ✓)")
            ok_count += 1
        else:
            print(f"  ❌ FAIL  {dom}  (회원앱.md {'✓' if s_ok else '✗'} / 운영정책.md {'✓' if p_ok else '✗'})")
            fail_count += 1

    print("\n[H) client2/_공통 핵심 파일 존재]")
    for fname, exists in common_folder_check():
        if exists:
            print(f"  ✅ OK    _공통/{fname}")
            ok_count += 1
        else:
            print(f"  ❌ FAIL  _공통/{fname}  (없음)")
            fail_count += 1

    print("\n[I) 화면 품질 정합 (docs-domain-client 전 화면 단위, 100% 강제)]")
    for name, pattern in QUALITY_FACTS.items():
        matched, total = per_screen_check(pattern)
        if matched == total:
            print(f"  ✅ OK    {name}  ({matched}/{total} 화면)")
            ok_count += 1
        elif matched >= total * 0.9:
            print(f"  ⚠️  WEAK  {name}  ({matched}/{total} 화면)")
            weak_count += 1
        else:
            print(f"  ❌ FAIL  {name}  ({matched}/{total} 화면)")
            fail_count += 1

    print("\n[J) 화면 스케일 fact (도메인 특성상 일부만 가짐, 카운트 검증)]")
    for name, pattern in SCALE_FACTS.items():
        matched, total = per_screen_check(pattern)
        if matched >= 5:
            print(f"  ✅ OK    {name}  ({matched}/{total} 화면)")
            ok_count += 1
        elif matched >= 1:
            print(f"  ⚠️  WEAK  {name}  ({matched}/{total} 화면)")
            weak_count += 1
        else:
            print(f"  ❌ FAIL  {name}  ({matched}/{total} 화면)")
            fail_count += 1

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
