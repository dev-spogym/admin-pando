---
diagramId: RBAC_R4
title: manager(매니저) 역할 Journey
type: journey
lastUpdated: 2026-04-20
---

# R4 — manager(매니저) Journey

> 운영 전반 관리. 매출 조회만(○), 직원/급여/상품/설정 접근 불가.

```mermaid
journey
    title manager(매니저) 하루 업무 여정

    section 출근 및 현황 파악
      로그인 /login: 5: manager
      지점 대시보드 확인 /: 5: manager
      오늘의 할일 /today-tasks: 5: manager
      KPI 대시보드 조회(○) /kpi: 3: manager
      KPI 프리뷰 /kpi-preview: 5: manager
      감사 로그 확인 /audit-log: 3: manager

    section 회원 관리
      회원 목록 조회 /members: 5: manager
      신규 회원 등록 /members/new: 5: manager
      회원 상세 확인 /members/detail: 5: manager
      출석 관리 /attendance: 5: manager
      체성분 확인 /body-composition: 4: manager

    section 수업 관리
      캘린더 확인 /calendar: 5: manager
      수업 관리 /lessons: 5: manager
      시간표 등록 /class-schedule: 5: manager
      수업 현황 확인 /class-stats: 5: manager
      횟수 관리 /lesson-counts: 5: manager
      페널티 관리 /penalties: 4: manager
      일정 요청 처리 /schedule-requests: 4: manager

    section POS 및 시설
      POS 판매 /pos: 5: manager
      POS 결제 처리 /pos/payment: 5: manager
      매출 현황 조회(○) /sales: 3: manager
      미수금 조회(○) /unpaid: 3: manager
      락커 관리 /locker: 5: manager
      시설 전반 관리: 4: manager

    section 마케팅
      리드 관리 /leads: 5: manager
      메시지 발송 /message: 5: manager
      자동 알림 설정 /message/auto-alarm: 4: manager
      쿠폰 관리 /message/coupon: 4: manager
      마일리지 관리 /mileage: 4: manager
      전자계약 /contracts/new: 4: manager

    section 차단 업무 (접근 불가)
      매출 수정/환불: 1: manager
      직원 관리: 1: manager
      급여 관리: 1: manager
      상품 관리: 1: manager
      센터 설정: 1: manager
```

---

## manager 역할 접근 상세

| 화면 | 라우트 | 접근 | 비고 |
|------|--------|:---:|------|
| 대시보드 | `/`, `/today-tasks` | ● | |
| KPI 대시보드 | `/kpi` | ○ | 조회만 |
| KPI 프리뷰 | `/kpi-preview` | ● | |
| 감사 로그 | `/audit-log` | ● | |
| 리포트 | `/reports` | ○ | 조회만 |
| 회원 목록/등록/수정/상세 | `/members*` | ● | |
| 회원 이관 | `/members/transfer` | — | 차단 |
| 캘린더 | `/calendar` | ● | |
| 수업 관리 | `/lessons` | ● | |
| 시간표 등록 | `/class-schedule` | ● | |
| 수업 현황 | `/class-stats` | ● | |
| 횟수/유효수업/페널티 | `/lesson-counts*` | ● | |
| 매출 현황 | `/sales` | ● | |
| 매출 통계 | `/sales/stats` | ○ | 조회만 |
| POS 전체 | `/pos*` | ● | |
| 환불 관리 | `/refunds` | — | 차단 |
| 이연매출 | `/deferred-revenue` | ● | |
| 미수금 | `/unpaid` | ○ | 조회만 |
| 상품 관리 | `/products*` | — | 차단 |
| 락커/사물함/RFID/운동복 | `/locker*`, `/rfid`, `/clothing` | ● | |
| 운동룸/골프타석 | `/rooms`, `/golf-bays` | ● | |
| 직원 관리 | `/staff*` | — | 차단 |
| 직원 근태 | `/staff/attendance` | ○ | 조회만 |
| 급여 관리 | `/payroll*` | — | 차단 |
| 리드/메시지/쿠폰/마일리지 | `/leads`, `/message*`, `/mileage` | ● | |
| 전자계약 | `/contracts/new` | ● | |
| 센터 설정/권한/키오스크/IoT | `/settings*` | — | 차단 |
| 공지사항/출석 | `/notices`, `/attendance` | ● | |
