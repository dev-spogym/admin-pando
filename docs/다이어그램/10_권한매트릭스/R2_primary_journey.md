---
title: primary(최고관리자) 역할 Journey
type: journey
lastUpdated: 2026-04-20
---

# R2 — primary(최고관리자) Journey

> 지점 내 최상위 권한. 모든 메뉴 접근 가능. (수정 불가).

```mermaid
journey
    title primary(최고관리자) 하루 업무 여정

    section 출근 및 현황 파악
      로그인 /login: 5: primary
      지점 대시보드 확인 /: 5: primary
      오늘의 할일 확인 /today-tasks: 5: primary
      KPI 대시보드 조회 /kpi: 5: primary
      감사 로그 확인 /audit-log: 4: primary

    section 회원 관리
      회원 목록 조회 /: 5: primary
      신규 회원 등록 5: primary
      회원 상세 확인 5: primary
      체성분 데이터 확인 /body-composition: 4: primary
      출석 현황 확인 /: 4: primary

    section 매출 관리
      매출 현황 조회 /sales: 5: primary
      매출 통계 분석 5: primary
      POS 결제 처리 /pos: 4: primary
      환불 처리 /: 3: primary
      미수금 확인 /unpaid: 4: primary
      이연매출 조회 /deferred-revenue: 3: primary

    section 수업 및 시설
      캘린더 확인 /calendar: 5: primary
      수업 관리 /lessons: 4: primary
      시간표 등록 /class-schedule: 4: primary
      락커 관리 /locker: 3: primary
      운동복 관리 /clothing: 3: primary

    section 직원 및 급여
      직원 목록 확인 /staff: 5: primary
      직원 등록 4: primary
      직원 근태 확인 4: primary
      급여 관리 /payroll: 5: primary
      급여 명세서 4: primary

    section 마케팅
      리드 관리 /: 4: primary
      메시지 발송 /message: 4: primary
      쿠폰 관리 3: primary
      마일리지 설정 /mileage: 3: primary

    section 설정 및 본사 업무
      센터 설정 /settings: 4: primary
      권한 설정 5: primary
      지점 관리 /branches: 5: primary
      온보딩 대시보드 /onboarding: 4: primary
      구독 관리 /subscription: 3: primary
      KPI 프리뷰 공유 /kpi-preview: 4: primary
```

---

## primary 역할 접근 화면 목록

| 구분 | 화면 | 라우트 | 접근 수준 |
|------|------|--------|---------|
| 대시보드 | 지점 대시보드 | `/` | ● |
| 대시보드 | 오늘의 할일 | `/today-tasks` | ● |
| 본사 | 슈퍼 대시보드 | `/super-dashboard` | ● |
| 본사 | 지점 관리 | `/branches` | ● |
| 본사 | KPI 대시보드 | `/kpi` | ● |
| 본사 | KPI 프리뷰 | `/kpi-preview` | ● |
| 본사 | 온보딩 | `/onboarding` | ● |
| 본사 | 감사 로그 | `/audit-log` | ● |
| 본사 | 리포트 | `/reports` | ● |
| 본사 | 구독 관리 | `/subscription` | ● |
| 회원 | 전체 | `/*` | ● |
| 수업 | 전체 | `/calendar`, `/lessons*` | ● |
| 매출 | 전체 | `/sales*`, `/pos*`, `/*` | ● |
| 상품 | 전체 | `/*`, `/discount-settings` | ● |
| 시설 | 전체 | `/locker*`, `/rfid*`, `/rooms*` | ● |
| 직원 | 전체 | `/staff*` | ● |
| 급여 | 전체 | `/payroll*` | ● |
| 마케팅 | 전체 | `/`, `/message*`, `/mileage` | ● |
| 설정 | 전체 | `/settings*` | ● |
| 기타 | 공지/출석 | `/notices`, `/` | ● |

**접근 가능: 65개 / 차단: 2개 (`/super-dashboard` 일부 본사 전용, `/forbidden`)**
