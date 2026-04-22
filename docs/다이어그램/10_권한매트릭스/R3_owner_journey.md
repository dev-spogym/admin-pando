---
title: owner(센터장) 역할 Journey
type: journey
lastUpdated: 2026-04-20
---

# R3 — owner(센터장) Journey

> 지점 경영/매출 관리 담당. 본사 전용 메뉴(슈퍼대시보드, 지점리포트 등) 제외.

```mermaid
journey
    title owner(센터장) 하루 업무 여정

    section 출근 및 현황 파악
      로그인 /login: 5: owner
      지점 대시보드 확인 /: 5: owner
      오늘의 할일 확인 /today-tasks: 5: owner
      KPI 대시보드 조회 /kpi: 5: owner
      지점 관리 확인 /branches: 4: owner
      감사 로그 확인 /audit-log: 4: owner

    section 회원 관리
      회원 목록 조회 /: 5: owner
      신규 회원 등록 5: owner
      회원 상세 확인 5: owner
      회원 이관 처리 4: owner
      출석 현황 확인 /: 5: owner

    section 매출 관리
      매출 현황 조회 /sales: 5: owner
      매출 통계 분석 5: owner
      통계 관리 4: owner
      환불 처리 /: 4: owner
      미수금 관리 /unpaid: 4: owner
      이연매출 조회 /deferred-revenue: 4: owner

    section 상품 및 시설
      상품 목록 관리 /: 5: owner
      할인 설정 /discount-settings: 4: owner
      락커 관리 /locker: 4: owner
      시설 운영 전반: 4: owner

    section 직원 및 급여
      직원 목록 확인 /staff: 5: owner
      직원 등록/수정: 5: owner
      직원 근태 확인 4: owner
      급여 관리 /payroll: 5: owner
      급여 명세서 4: owner

    section 마케팅 및 설정
      리드 관리 /: 4: owner
      메시지 발송 /message: 4: owner
      쿠폰/마일리지 관리: 3: owner
      센터 설정 /settings: 5: owner
      권한 설정 5: owner
      키오스크 설정 4: owner
      IoT 설정 4: owner
```

---

## owner 역할 접근/차단 화면

| 화면 | 라우트 | 접근 |
|------|--------|:---:|
| 지점 대시보드 | `/` | ● |
| KPI 대시보드 | `/kpi` | ● |
| KPI 프리뷰 | `/kpi-preview` | ● |
| 지점 관리 | `/branches` | ● |
| 온보딩 | `/onboarding` | ● |
| 감사 로그 | `/audit-log` | ● |
| 구독 관리 | `/subscription` | ● |
| 리포트 | `/reports` | ● |
| 회원 전체 | `/*` | ● |
| 수업 전체 | `/calendar`, `/lessons*` | ● |
| 매출 전체 | `/sales*`, `/pos*`, `/*` | ● |
| 상품 전체 | `/*`, `/discount-settings` | ● |
| 시설 전체 | `/locker*`, `/rfid`, `/rooms*` | ● |
| 직원 전체 | `/staff*` | ● |
| 급여 전체 | `/payroll*` | ● |
| 마케팅 전체 | `/`, `/message*`, `/mileage` | ● |
| 설정 전체 | `/settings*` | ● |
| **슈퍼 대시보드** | `/super-dashboard` | **—** |
| **지점 리포트** | `/branch-report` | **—** |
