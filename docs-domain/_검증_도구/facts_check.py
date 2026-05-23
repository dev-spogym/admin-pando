#!/usr/bin/env python3
"""
docs2 canonical fact 기반 docs-domain 정합성 자동 검증 도구.

사용법: python3 docs-domain/_검증_도구/facts_check.py

docs2/registry/facts.yml의 canonical_fact_candidates 15종 카테고리를
정본으로 삼아 docs-domain에 각 fact가 명시되어 있는지 grep으로 자동 검증한다.
누락된 fact를 도메인별 리포트로 출력한다.
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DOCS_DOMAIN = REPO_ROOT / "docs-domain"

# docs2 canonical_fact_candidates 정본 (2026-05-23 기준)
CANONICAL_FACTS = {
    "강습 세션 4종 (PT·필라테스·스트레칭·테라피)":
        r"PT.*필라테스.*스트레칭.*테라피",
    "GX 세부종목 6종 (요가·필라테스·스피닝·줌바·에어로빅·GX 기타)":
        r"요가.*필라테스.*스피닝.*줌바.*에어로빅.*GX 기타",
    "IoT 기기 4종 (출입게이트·키오스크·락커컨트롤러·InBody)":
        r"출입 게이트.*키오스크.*락커 컨트롤러.*InBody",
    "회원 실제 상태 7종 (ACTIVE/EXPIRED/SCHEDULED/EXPIRING/HOLDING/UNREGISTERED/WITHDRAWN)":
        r"ACTIVE.*EXPIRED.*SCHEDULED.*EXPIRING.*HOLDING.*UNREGISTERED.*WITHDRAWN",
    "회원 상태 필터 8탭 (전체+활성/만료/예정/임박/홀딩/미등록/탈퇴)":
        r"전체.*활성.*만료.*예정.*임박.*홀딩.*미등록.*탈퇴",
    "회원 자동 세그먼트 7종 (신규·이탈위험·만료임박·충성·활발·관심필요·만료후미등록)":
        r"신규.*이탈위험.*만료임박.*충성.*활발.*관심필요.*만료후미등록",
    "회원 등급 5단계 (브론즈·실버·골드·플래티넘·다이아몬드)":
        r"브론즈.*실버.*골드.*플래티넘.*다이아몬드",
    "결제링크 상태 5종 (발송됨·결제완료·만료·무효화·발송실패)":
        r"발송됨.*결제완료.*만료.*무효화.*발송실패",
    "미수금 상태 5탭 (전체·미결제·일부결제·연체·완료)":
        r"전체.*미결제.*일부결제.*연체.*완료",
    "상품 대분류 5종 코드 (MEMBERSHIP/LESSON_PASS/LOCKER/WEAR/GENERAL)":
        r"MEMBERSHIP.*LESSON_PASS.*LOCKER.*WEAR.*GENERAL",
    "상품 대분류 5종 라벨 (회원권·수강권·락커·운동복·일반)":
        r"회원권.*수강권.*락커.*운동복.*일반",
    "역할 코드 8종 (superAdmin/primary/owner/manager/fc/trainer/staff/readonly)":
        r"superAdmin.*primary.*owner.*manager.*fc.*trainer.*staff.*readonly",
}


def grep_count(pattern: str) -> int:
    """docs-domain에서 패턴 매칭 파일 수를 반환."""
    result = subprocess.run(
        ["grep", "-rlE", pattern, str(DOCS_DOMAIN)],
        capture_output=True, text=True,
    )
    return len([line for line in result.stdout.split("\n") if line.strip()])


def main():
    print(f"docs2 canonical fact → docs-domain 정합 검증 ({len(CANONICAL_FACTS)}개 fact)")
    print("=" * 80)

    missing = []
    weak = []
    ok = []

    for name, pattern in CANONICAL_FACTS.items():
        count = grep_count(pattern)
        if count == 0:
            missing.append((name, count))
        elif count == 1:
            weak.append((name, count))
        else:
            ok.append((name, count))

    if missing:
        print(f"\n🔴 누락 (0파일) {len(missing)}건 — 즉시 보정 필요:")
        for name, _ in missing:
            print(f"  ❌ {name}")

    if weak:
        print(f"\n🟡 단일 파일만 명시 ({len(weak)}건) — 추가 명시 검토:")
        for name, count in weak:
            print(f"  ⚠️  {name} ({count}파일)")

    if ok:
        print(f"\n🟢 양호 (2+ 파일) {len(ok)}건:")
        for name, count in ok:
            print(f"  ✅ {name} ({count}파일)")

    print()
    print(f"요약: 누락 {len(missing)} / 단일 {len(weak)} / 양호 {len(ok)} / 전체 {len(CANONICAL_FACTS)}")

    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
