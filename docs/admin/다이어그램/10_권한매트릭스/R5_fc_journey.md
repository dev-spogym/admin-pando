---
title: fc(피트니스코치) 역할 Journey
type: journey
lastUpdated: 2026-04-20
---

# R5 — fc(피트니스코치) Journey

> 상담/결제/수업 담당. 매출/상품/직원/급여/설정 접근 불가. 담당 회원 중심 업무.

```mermaid
journey
    title fc(피트니스코치) 하루 업무 여정

    section 출근 및 현황 파악
      로그인 /login: 5: fc
      지점 대시보드 확인 /: 5: fc
      오늘의 할일 /today-tasks: 5: fc
      KPI 센터 확인 /kpi-preview: 4: fc
      공지사항 확인 /notices: 4: fc

    section 회원 관리 (핵심 업무)
      회원 목록 조회 /: 5: fc
      신규 회원 등록 5: fc
      회원 상세 확인 5: fc
      체성분 입력 /body-composition: 5: fc
      출석 처리 /: 5: fc

    section 수업 관리
      캘린더 확인 /calendar: 5: fc
      수업 관리 (본인 수업) /lessons: 5: fc
      시간표 등록 /class-schedule: 4: fc
      횟수 관리 /lesson-counts: 5: fc
      유효 수업 확인 /valid-lessons: 4: fc
      수업 현황 확인(○) /class-stats: 3: fc
      일정 요청 처리 /schedule-requests: 4: fc

    section POS 및 마케팅
      POS 판매 /pos: 5: fc
      POS 결제 처리 5: fc
      리드 관리 /: 4: fc
      전자계약 5: fc
      메시지 발송 /message: 4: fc
      쿠폰 적용 3: fc
      마일리지 조회 /mileage: 3: fc

    section 차단 업무 (접근 불가)
      매출 현황: 1: fc
      환불 처리: 1: fc
      상품 관리: 1: fc
      직원 관리: 1: fc
      급여 관리: 1: fc
      센터 설정: 1: fc
      회원 이관: 1: fc
```

---

## fc 역할 접근 상세

| 화면 | 라우트 | 접근 | 비고 |
|------|--------|:---:|------|
| 대시보드/할일 | `/`, `/today-tasks` | ● | |
| KPI 센터 | `/kpi-preview` | ● | |
| 공지사항 | `/notices` | ● | |
| 회원 목록 | `/` | ● | |
| 회원 등록/수정 | ``, `` | ● | |
| 회원 상세 | `` | ● | |
| 회원 이관 | `` | — | 차단 |
| 체성분 관리 | `/body-composition` | ● | |
| 출석 관리 | `/` | ● | |
| 캘린더 | `/calendar` | ● | |
| 수업 관리 | `/lessons` | ● | 본인 수업만 수정 |
| 시간표 등록 | `/class-schedule` | ● | |
| 수업 현황 | `/class-stats` | ○ | 조회만 |
| 강사 현황 | `/instructor-status` | ○ | 조회만 |
| 횟수/유효수업 | `/lesson-counts`, `/valid-lessons` | ● | |
| 페널티/수업템플릿 | `/penalties`, `/class-templates` | — | 차단 |
| POS 전체 | `/pos`, `` | ● | |
| 매출 현황/통계 | `/sales*` | — | 차단 |
| 환불/미수금 | `/`, `/unpaid` | — | 차단 |
| 상품 관리 | `/*` | — | 차단 |
| 시설 전체 | `/locker*`, `/rfid`, `/rooms*` | — | 차단 |
| 직원/급여 | `/staff*`, `/payroll*` | — | 차단 |
| 리드 관리 | `/` | ● | |
| 메시지 발송 | `/message` | ● | |
| 자동 알림 | `` | ● | |
| 쿠폰/마일리지 | ``, `/mileage` | ● | |
| 전자계약 | `` | ● | |
| 설정 전체 | `/settings*` | — | 차단 |
