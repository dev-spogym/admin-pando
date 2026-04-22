---
title: FitGenie CRM URL 패턴맵
type: flowchart
lastUpdated: 2026-04-20
---

# N4 — URL 패턴맵

> 파라미터화된 URL 패턴 정리. 동적 세그먼트(`:id` 등)와 Query String 기준.

```mermaid
flowchart LR
    subgraph STATIC["정적 라우트 (파라미터 없음)"]
        S01["/login"]
        S02["/"]
        S03["/"]
        S04[""]
        S05["/calendar"]
        S06["/lessons"]
        S07["/class-schedule"]
        S08["/class-stats"]
        S09["/instructor-status"]
        S10["/class-templates"]
        S11["/schedule-requests"]
        S12["/lesson-counts"]
        S13["/valid-lessons"]
        S14["/penalties"]
        S15["/exercise-programs"]
        S16["/sales"]
        S17[""]
        S18[""]
        S19["/pos"]
        S20["/"]
        S21["/deferred-revenue"]
        S22["/unpaid"]
        S23["/"]
        S24[""]
        S25["/discount-settings"]
        S26["/locker"]
        S27[""]
        S28["/rfid"]
        S29["/rooms"]
        S30["/golf-bays"]
        S31["/clothing"]
        S32["/staff"]
        S33[""]
        S34["/staff/"]
        S35["/payroll"]
        S36[""]
        S37["/"]
        S38["/message"]
        S39[""]
        S40[""]
        S41["/mileage"]
        S42[""]
        S43["/settings"]
        S44[""]
        S45[""]
        S46[""]
        S47["/subscription"]
        S48["/notices"]
        S49["/"]
        S50["/body-composition"]
        S51["/super-dashboard"]
        S52["/branches"]
        S53["/branch-report"]
        S54["/kpi"]
        S55["/kpi-preview"]
        S56["/onboarding"]
        S57["/audit-log"]
        S58["/today-tasks"]
        S59["/reports"]
        S60["/forbidden"]
    end

    subgraph QUERY["Query String 파라미터"]
        Q01["\n?id={판단}"]
        Q02["\n?id={판단}"]
        Q03["\n?={id}"]
        Q04["\n?id={판단}"]
        Q05["\n?id={판단}"]
        Q06["\n?={판단}"]
        Q07["\n?={판단}"]
    end

    subgraph PATTERN["URL 패턴 분류"]
        P01["목록 패턴\n/resource"]
        P02["등록 패턴\n"]
        P03["수정 패턴\n"]
        P04["상세 패턴\n"]
        P05["하위 액션 패턴\n"]
        P06["중첩 라우트 패턴\n"]
        P07["설정 패턴\n"]
    end

    P01 --> Q01
    P02 --> Q01
    P03 --> Q01
    P04 --> Q02
    P05 --> Q03
    P06 --> Q07
    P07 --> Q04

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef info fill:#E0F7FA,stroke:#00838F
    classDef system fill:#EDE7F6,stroke:#5E35B2

    class Q01,Q02,Q03,Q04,Q05,Q06,Q07 info
    class P01,P02,P03,P04,P05,P06,P07 system
```

---

## URL 패턴 전수 목록

### 정적 라우트 (60개)

| 라우트 | SCR | 설명 |
|--------|-----|------|
| `/login` | SCR-100 | 로그인 |
| `/` | SCR-090 | 지점 대시보드 |
| `/super-dashboard` | SCR-091 | 슈퍼 대시보드 |
| `/branches` | SCR-092 | 지점 관리 |
| `/branch-report` | SCR-093 | 지점 리포트 |
| `/kpi` | SCR-094 | KPI 대시보드 |
| `/kpi-preview` | SCR-095 | KPI 프리뷰 |
| `/onboarding` | SCR-096 | 온보딩 |
| `/audit-log` | SCR-097 | 감사 로그 |
| `/today-tasks` | SCR-098 | 오늘의 할일 |
| `/reports` | SCR-099 | 리포트 |
| `/` | SCR-010 | 회원 목록 |
| `` | SCR-011 | 회원 등록 |
| `/calendar` | SCR-020 | 캘린더 |
| `/lessons` | SCR-021 | 수업 관리 |
| `/class-schedule` | SCR-022 | 시간표 등록 |
| `/class-stats` | SCR-023 | 수업 현황 |
| `/instructor-status` | SCR-023B | 강사 현황 |
| `/class-templates` | SCR-024 | 수업 템플릿 |
| `/schedule-requests` | SCR-025 | 일정 요청 |
| `/lesson-counts` | SCR-026 | 횟수 관리 |
| `/valid-lessons` | SCR-027 | 유효 수업 |
| `/penalties` | SCR-028 | 페널티 관리 |
| `/exercise-programs` | SCR-029 | 운동 프로그램 |
| `/sales` | SCR-030 | 매출 현황 |
| `` | SCR-031 | 매출 통계 |
| `` | SCR-032 | 통계 관리 |
| `/pos` | SCR-033 | POS |
| `/` | SCR-035 | 환불 관리 |
| `/deferred-revenue` | SCR-036 | 이연매출 |
| `/unpaid` | SCR-037 | 미수금 |
| `/` | SCR-040 | 상품 목록 |
| `` | SCR-041 | 상품 등록 |
| `/discount-settings` | SCR-043 | 할인 설정 |
| `/locker` | SCR-050 | 락커 관리 |
| `` | SCR-051 | 사물함 배정 |
| `/rfid` | SCR-052 | 밴드/카드 |
| `/rooms` | SCR-053 | 운동룸 |
| `/golf-bays` | SCR-054 | 골프 타석 |
| `/clothing` | SCR-055 | 운동복 |
| `/staff` | SCR-060 | 직원 목록 |
| `` | SCR-061 | 직원 등록 |
| `/staff/` | SCR-063 | 직원 근태 |
| `/payroll` | SCR-064 | 급여 관리 |
| `` | SCR-065 | 급여 명세서 |
| `/` | SCR-070 | 리드 관리 |
| `/message` | SCR-071 | 메시지 발송 |
| `` | SCR-072 | 자동 알림 |
| `` | SCR-073 | 쿠폰 관리 |
| `/mileage` | SCR-074 | 마일리지 |
| `` | SCR-075 | 전자계약 |
| `/settings` | SCR-080 | 센터 설정 |
| `` | SCR-081 | 권한 설정 |
| `` | SCR-082 | 키오스크 |
| `` | SCR-083 | IoT/출입 |
| `/subscription` | SCR-084 | 구독 관리 |
| `/notices` | SCR-085 | 공지사항 |
| `/` | SCR-086 | 출석 관리 |
| `/body-composition` | SCR-015 | 체성분 관리 |
| `/forbidden` | ERR-001 | 403 접근불가 |

### Query String 파라미터 라우트 (7개)

| 라우트 패턴 | SCR | 파라미터 | 설명 |
|------------|-----|---------|------|
| `` | SCR-012 | `id`: 회원 PK | 회원 수정 |
| `` | SCR-013 | `id`: 회원 PK | 회원 상세 |
| `` | SCR-014 | ``: 회원 PK | 회원 이관 |
| `` | SCR-042 | `id`: 상품 PK | 상품 수정 |
| `` | SCR-061B | `id`: 직원 PK | 직원 수정 |
| `` | SCR-062 | ``: 직원 PK | 퇴사 처리 |
| `` | SCR-034 | ``: 주문 PK | POS 결제 |
