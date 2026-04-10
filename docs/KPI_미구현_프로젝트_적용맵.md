# KPI 미구현 프로젝트 적용맵

## 1. 결론

엑셀 KPI 중 현재 프로젝트에 바로 적용 가능한 영역과 선행 데이터모델이 필요한 영역이 명확히 나뉜다.

### 바로 적용 가능한 KPI

- 활성 회원 비율
- 월 방문 빈도
- 지점별 월 매출 목표 달성률의 기초 버전
- PT 출석률
- PT 완료율의 기초 버전
- PT 노쇼율의 기초 버전
- 강사별 수업 출석률
- 미수금, 환불, 결제수단별 매출
- 전사/지점 회원수, 매출, 출석, 직원수

### 데이터모델 추가 후 적용 가능한 KPI

- 신규 상담 전환율
- 리드 누락률
- 재등록 전환율
- Today Tasks 완료율
- PT 체험/체험 참여율/체험 -> 구매 전환율
- PT 재구매율
- 만족도 / 리뷰 / NPS
- CAC / ROI
- 시설 이용률 / 운영비 / 영업이익률

## 2. 현재 프로젝트에서 이미 있는 데이터

| 데이터 | 현재 보유 여부 | 근거 |
|---|---|---|
| 회원 기본정보 | 있음 | `prisma/schema.prisma` `Member` |
| 회원 상태 / 만료일 / 최근방문일 | 있음 | `Member.status`, `membershipExpiry`, `lastVisitAt` |
| 담당 직원(F.C.) | 일부 있음 | `Member.staffId` |
| 결제 / 매출 | 있음 | `Sale` |
| 출석 | 있음 | `Attendance` |
| 수업 / 강사 배정 | 있음 | `Class`, `lesson_bookings` 사용 흔적 |
| 직원 / 급여 | 있음 | `Staff`, `Payroll` |
| 상담 기록 | 일부 있음 | `Consultation`, `TabConsultation.tsx` |
| 자동알림 규칙 UI | 일부 있음 | `AutoAlarm.tsx` |
| 지점별 통합 대시보드 | 있음 | `SuperDashboard.tsx`, `BranchReport.tsx` |

## 3. 현재 프로젝트에 없는 핵심 데이터

| 데이터 | 필요 이유 |
|---|---|
| `leads` | 비회원 문의/잠재고객을 회원과 분리 관리 |
| `lead_activities` 또는 상담 결과 컬럼 | 리드 누락률, 상담 전환율 계산 |
| `member_renewals` | 재등록 전환율 계산 |
| `today_tasks` | TM 완료율, Today Tasks 완료율 계산 |
| `pt_trials` | PT 체험 신청, 참여, 전환 계산 |
| `satisfaction_surveys` | 만족도 계산 |
| `reviews` | 리뷰 생성률 계산 |
| `nps_surveys` | NPS 계산 |
| `marketing_costs` | CAC / ROI 계산 |
| `facility_usage` | 회복존/사우나/시설 이용률 계산 |
| `operating_costs` | 영업이익률/운영비 계산 |

## 4. 바로 적용 가능한 KPI와 붙일 위치

### A. 본사 / 지점 대시보드에 바로 반영 가능

| KPI | 계산 가능 여부 | 데이터 원천 | 붙일 화면 |
|---|---|---|---|
| 전사 회원수 | 가능 | `members` | `SuperDashboard.tsx` |
| 전사 매출 | 가능 | `sales` | `SuperDashboard.tsx` |
| 전사 출석 | 가능 | `attendance` | `SuperDashboard.tsx` |
| 지점별 비교 | 가능 | `members`, `sales`, `attendance`, `staff` | `BranchReport.tsx` |
| 활성 회원 비율 | 가능 | `members.status` | `Dashboard.tsx`, `BranchReport.tsx` |
| 월 방문 빈도 | 가능 | `attendance`, `members` | `Dashboard.tsx`, `StatisticsManagement.tsx` |
| 결제수단별 매출 | 가능 | `sales.paymentMethod` | `SalesStats.tsx`, `Dashboard.tsx` |
| 미수금 | 가능 | `sales.status`, `unpaid` | `Dashboard.tsx`, `UnpaidManagement.tsx` |
| 환불건수 | 가능 | `sales.status=REFUNDED` | `Sales.tsx`, `RefundManagement.tsx` |

### B. 강사/트레이너 화면에 바로 반영 가능

| KPI | 계산 가능 여부 | 데이터 원천 | 붙일 화면 |
|---|---|---|---|
| PT 출석률 | 가능 | `lesson_bookings.status`, `classes` | `InstructorStatus.tsx` |
| PT 노쇼율 | 가능 | `lesson_bookings.status=NO_SHOW` 또는 수업 상태 | `InstructorStatus.tsx` |
| PT 완료율 기초판 | 가능 | `usedCount`, `totalCount` 또는 완료 상태 | `InstructorStatus.tsx`, `LessonCounts.tsx` |
| 강사별 수업 출석률 | 가능 | `classes`, `lesson_bookings` | `ClassStats.tsx`, `InstructorStatus.tsx` |
| 강사별 담당 회원 수 | 가능 | 이미 일부 가능 | `InstructorStatus.tsx` |

## 5. 부분 적용만 가능한 KPI

| KPI | 현재 상태 | 부족한 점 |
|---|---|---|
| 신규 상담 전환율 | 상담 기록 일부 존재 | 상담 결과값과 결제 연결 없음 |
| 재등록 전환율 | 만료 데이터 있음 | 재등록 이벤트를 별도 추적하지 않음 |
| 이탈률 | 만료/상태 있음 | 이탈 정의와 월 스냅샷 부재 |
| PT 재구매율 | PT 구매 이력 일부 가능 | 구매 시퀀스 / 완강 후 재구매 연결 없음 |
| 자동알림 진행률 | 규칙 UI 있음 | 발송 엔진, 실행 로그 없음 |

## 6. 선행 모델이 필요한 KPI

### 영업 / FC

| KPI | 필요한 선행조건 |
|---|---|
| 신규 상담 전환율 | `consultations.result`, `sales.consultationId` |
| 리드 누락률 | `leads`, `lead_status`, `first_response_at` |
| 리드 응대 시간 | `leads.createdAt`, `first_response_at` |
| 상담 후 재방문율 | 상담과 출석 연결 로직 |
| Today Tasks 완료율 | `today_tasks` |

### 재등록 / 이탈

| KPI | 필요한 선행조건 |
|---|---|
| 재등록 전환율 | `member_renewals` 또는 renewal event |
| 유지율 | 월별 회원 스냅샷 |
| 이탈률 | 이탈 정의 확정 + churn event |
| LTV | 구매횟수 + 유지기간 + 평균 결제액 집계 |

### PT Full Funnel

| KPI | 필요한 선행조건 |
|---|---|
| PT 체험 | `pt_trials` |
| 체험 참여율 | `pt_trials.status` |
| 체험 -> 구매 전환 | `pt_trials.convertedSaleId` |
| PT 재구매율 | `purchaseSequence` 또는 재구매 매칭 테이블 |
| 만족도 / 리뷰 / NPS | `satisfaction_surveys`, `reviews`, `nps_surveys` |

### 마케팅 / 운영비

| KPI | 필요한 선행조건 |
|---|---|
| CAC | `marketing_costs` |
| 채널 ROI | 유입경로 + 비용 + 매출 연결 |
| 시설 이용률 | `facility_usage` |
| 영업이익률 | `operating_costs` |

## 7. 현재 코드 기준 적용 위치

### 대시보드 계열

- `src/pages/SuperDashboard.tsx`
- `src/pages/BranchReport.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/StatisticsManagement.tsx`
- `src/pages/SalesStats.tsx`

### 수업 / 트레이너 계열

- `src/pages/InstructorStatus.tsx`
- `src/pages/ClassStats.tsx`
- `src/pages/ClassSchedule.tsx`
- `src/pages/LessonCounts.tsx`

### 영업 / 자동화 계열

- `src/components/member/TabConsultation.tsx`
- `src/pages/AutoAlarm.tsx`
- `src/pages/MessageSend.tsx`
- 신규 필요: `src/pages/Leads.tsx`
- 신규 필요: `src/pages/TodayTasks.tsx`
- 신규 필요: `src/pages/PtKpiDashboard.tsx`

## 8. DB 적용 우선순위

### Phase 1: 기존 데이터만으로 구현

1. `Dashboard.tsx`
   - 활성 회원 비율
   - 월 방문 빈도
   - 환불/미수금 요약

2. `SuperDashboard.tsx`
   - 지점별 활성 회원 비율
   - 지점별 매출/출석 효율

3. `InstructorStatus.tsx`
   - PT 출석률
   - PT 노쇼율
   - PT 완료율 기초판

4. `SalesStats.tsx`
   - 결제수단별 매출 비중
   - 환불 비율
   - PT/GX/회원권 카테고리별 매출

### Phase 2: 최소 스키마 추가

1. `consultations` 확장
   - `result`
   - `nextAction`
   - `linkedSaleId`

2. 신규 테이블
   - `leads`
   - `today_tasks`
   - `member_renewals`
   - `pt_trials`

3. 신규 화면
   - 리드 관리
   - Today Tasks
   - FC KPI 대시보드
   - PT KPI 대시보드

### Phase 3: 고도화

1. 만족도 / 리뷰 / NPS
2. 자동알림 실행 엔진 + 로그
3. CAC / ROI
4. 운영비 / 영업이익률
5. AI 스크립트 / CTI / 세일즈북

## 9. 실제 적용 판단

### 지금 당장 적용 가능

- 기존 테이블만으로 계산 가능한 KPI를 현재 대시보드/강사현황/매출통계에 추가

### 선행 설계 후 적용 가능

- 상담, 리드, 재등록, PT 체험, 만족도 계열 KPI

### 아직 범위 확정이 먼저 필요한 것

- CAC / ROI
- 시설 이용률
- 영업이익률
- AI 세일즈북 / CTI / 녹취 요약

## 10. 추천 적용 순서

1. 기존 데이터 기반 KPI를 먼저 붙인다.
2. 상담 / 재등록 / PT 체험 모델을 추가한다.
3. 자동알림 엔진과 Tasks를 붙인다.
4. 만족도 / NPS / 리뷰를 붙인다.
5. 운영비 / CAC / ROI를 붙인다.

