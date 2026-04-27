---
diagramId: RBAC_R6
title: staff(스태프) 역할 Journey
type: journey
lastUpdated: 2026-04-20
---

# R6 — staff(스태프) Journey

> 기본 조회/출석 확인 담당. 대부분 화면 차단. 시설 일부(락커/운동복) 접근 가능.

```mermaid
journey
    title staff(스태프) 하루 업무 여정

    section 출근 및 기본 확인
      로그인 /login: 5: staff
      지점 대시보드 확인 /: 5: staff
      오늘의 할일 /today-tasks: 5: staff
      KPI 프리뷰 확인 /kpi-preview: 4: staff
      공지사항 확인 /notices: 5: staff

    section 회원 출석 처리 (핵심 업무)
      출석 관리 /attendance: 5: staff
      회원 목록 조회(○) /members: 3: staff
      회원 상세 조회(○) /members/detail: 3: staff
      캘린더 조회(○) /calendar: 3: staff
      수업 현황 조회(○) /class-stats: 2: staff

    section 시설 관리
      락커 관리 /locker: 4: staff
      사물함 배정 /locker/management: 4: staff
      밴드/카드 관리 /rfid: 4: staff
      운동복 관리 /clothing: 4: staff

    section 전자계약 지원
      전자계약 /contracts/new: 3: staff

    section 차단 업무 (대부분 차단)
      회원 등록/수정: 1: staff
      수업 등록/수정: 1: staff
      매출/POS 접근: 1: staff
      직원/급여 관리: 1: staff
      마케팅 도구: 1: staff
      설정 접근: 1: staff
```

---

## staff 역할 접근 상세

| 화면 | 라우트 | 접근 | 비고 |
|------|--------|:---:|------|
| 대시보드/할일 | `/`, `/today-tasks` | ● | |
| KPI 프리뷰 | `/kpi-preview` | ● | |
| 공지사항 | `/notices` | ● | |
| 출석 관리 | `/attendance` | ● | |
| 회원 목록 | `/members` | ○ | 조회만 |
| 회원 상세 | `/members/detail` | ○ | 조회만 |
| 회원 등록/수정/이관 | `/members/new`, `/members/edit`, `/members/transfer` | — | 차단 |
| 캘린더 | `/calendar` | ○ | 조회만 |
| 수업 관리 | `/lessons` | — | 차단 |
| 수업 현황 | `/class-stats` | — | 차단 |
| 전자계약 | `/contracts/new` | ● | |
| 락커 관리 | `/locker` | ● | |
| 사물함 배정 | `/locker/management` | ● | |
| 밴드/카드 | `/rfid` | ● | |
| 운동복 | `/clothing` | ● | |
| 운동룸/골프타석 | `/rooms`, `/golf-bays` | — | 차단 |
| 매출 전체 | `/sales*`, `/pos*`, `/refunds*` | — | 차단 |
| 상품 전체 | `/products*` | — | 차단 |
| 직원/급여 | `/staff*`, `/payroll*` | — | 차단 |
| 마케팅 전체 | `/leads`, `/message*`, `/mileage` | — | 차단 |
| 설정 전체 | `/settings*` | — | 차단 |
| 본사관리 | `/super-dashboard`, `/kpi`, `/audit-log` 등 | — | 차단 |

**접근 가능: 13개 / 조회만: 2개 / 차단: 52개**
