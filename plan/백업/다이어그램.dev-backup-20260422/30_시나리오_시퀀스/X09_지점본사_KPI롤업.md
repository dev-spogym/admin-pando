---
diagramId: X09
title: 지점 → 본사 KPI 롤업 → 주간 리포트 자동 발행
type: sequenceDiagram
scope: 크로스도메인
actors: [시스템, 본사관리자]
relatedScreens: [SCR-093, SCR-094, SCR-095, SCR-099]
tcMappings: []
lastUpdated: 2026-04-20
---

# X09 — 지점 → 본사 KPI 롤업 → 주간 리포트 자동 발행

## 1. 시나리오 개요

매주 월요일 스케줄러가 전주 데이터를 각 지점에서 집계 → 본사 KPI로 롤업 → 주간 리포트 자동 생성 → 본사 관리자에게 발송하는 시나리오.

| 항목 | 내용 |
|------|------|
| 트리거 | 매주 월요일 03:00 스케줄러 |
| 종료 조건 | 주간 리포트 생성 + 본사 관리자 알림 |
| 참여 도메인 | 본사관리(D10), 매출관리(D3), 회원관리(D2) |

## 2. 전제조건

- 지점 데이터가 중앙 DB 또는 지점별 DB에 축적되어 있음
- KPI 정의서에 따라 KPI 지표가 설정되어 있음
- 본사 관리자 계정이 리포트 수신 설정되어 있음

## 3. 참여 액터

| 액터 | 설명 |
|------|------|
| 스케줄러 | 주간 리포트 생성 크론잡 |
| 지점 DB | 각 지점 데이터 소스 |
| CRM API | FitGenie CRM 백엔드 |
| 집계엔진 | KPI 계산 및 롤업 서비스 |
| DB | 중앙 데이터베이스 |
| 본사관리자 | 리포트 수신 및 확인 |
| 알림서비스 | 리포트 발송 |

## 4. 시퀀스 다이어그램

```mermaid
sequenceDiagram
    participant SCH as 스케줄러
    participant API as CRM API
    participant BDB as 지점DB
    participant AGG as 집계엔진
    participant DB as 중앙DB
    actor HQ as 본사관리자
    participant N as 알림서비스

    Note over SCH,DB: [매주 월요일 03:00]
    SCH->>API: 1. 주간 KPI 롤업 트리거 { week_start, week_end } %% E_SCH_KPI_ROLLUP_01
    API->>BDB: 2. SELECT 전주 매출/회원/수업 원시 데이터 (지점별) %% E_API_FETCH_RAW_01
    BDB-->>API: 3. 지점별 raw 데이터

    API->>AGG: 4. 집계 요청 { raw_data, kpi_definitions } %% E_API_AGG_REQUEST_01
    Note over AGG: KPI 계산: 신규회원수, 매출액, 출석율, 이탈율, PT전환율 등
    AGG-->>API: 5. 지점별 KPI 결과

    API->>AGG: 6. 본사 롤업 집계 (지점합산 + 전주 비교) %% E_API_HQ_ROLLUP_01
    AGG-->>API: 7. 본사 KPI { total, by_branch, week_over_week }

    API->>DB: 8. INSERT kpi_snapshots { week, branch_id, kpi_data } %% E_API_INSERT_KPI_01
    DB-->>API: 9. snapshot_id

    API->>DB: 10. INSERT reports { type=WEEKLY, period, data, status=GENERATED } %% E_API_INSERT_REPORT_01
    DB-->>API: 11. report_id

    alt KPI 이상 감지 (임계값 초과 지점 있음)
        API->>N: 12. 이상 알림 트리거 { branch_id, kpi_name, value, threshold } %% E_API_KPI_ALERT_01
        N-->>HQ: 13. 긴급 알림 — "OO지점 신규회원 전주 대비 -30%"
    end

    API->>N: 14. 주간 리포트 발송 트리거 { report_id } %% E_API_REPORT_NOTIFY_01
    N-->>HQ: 15. 이메일/앱 알림 — "주간 리포트 생성 완료"

    Note over HQ,API: [본사관리자 리포트 확인]
    HQ->>API: 16. GET /reports/{report_id} %% E_HQ_GET_REPORT_01
    API->>DB: 17. SELECT report WHERE id=?
    DB-->>API: 18. 리포트 데이터
    API-->>HQ: 19. 주간 KPI 리포트
    Note over HQ: SCR-099 리포트 생성 / SCR-095 KPI 대시보드
    HQ->>API: 20. GET /kpi-dashboard?week={week} %% E_HQ_VIEW_KPI_01
    API-->>HQ: 21. 지점별 KPI 비교 차트 데이터
    Note over HQ: SCR-094 지점 성과 리포트
```

## 5. 주요 메시지 설명

| 번호 | 메시지 | 설명 |
|------|--------|------|
| 4 | 집계 요청 | KPI 정의서의 산식에 따라 신규회원, 매출, 출석률, 이탈률 등 계산 |
| 6 | 본사 롤업 | 지점 합산 + 전주 대비 증감률 + 목표 대비 달성률 계산 |
| 8 | INSERT kpi_snapshots | 주차별 스냅샷 저장. 시계열 분석에 활용 |
| 12 | 이상 알림 | 임계값(예: 전주 대비 -20% 이상 하락) 초과 시 즉시 알림 |

## 6. 예외/분기

| 상황 | 처리 방법 |
|------|-----------|
| 지점 데이터 누락 | 해당 지점 skip, 부분 리포트 생성, 관리자에게 데이터 누락 경고 |
| 집계 엔진 타임아웃 | 재시도 3회 후 실패 시 관리자 알림, 수동 재실행 |
| KPI 임계값 미설정 | 이상 감지 skip, 기본 리포트만 발송 |
| 리포트 발송 실패 | 재발송 큐 등록, 다음 배치에서 재시도 |

## 7. 관련 화면/모달 링크

| 화면/모달 | 설명 |
|-----------|------|
| SCR-093 본사 대시보드 | 전체 지점 현황 |
| SCR-094 지점 성과 리포트 | 지점별 KPI 비교 |
| SCR-095 KPI 대시보드 | KPI 지표 시각화 |
| SCR-099 리포트 생성 | 수동/자동 리포트 목록 |

## 8. TC 후보 테이블

| TC ID | 구분 | Given | When | Then |
|-------|:----:|-------|------|------|
| TC-X09-01 | positive | 전주 데이터 완비, 임계값 미초과 | 주간 스케줄러 실행 | KPI 집계, 리포트 생성, 본사관리자 알림 수신 |
| TC-X09-02 | positive | 특정 지점 KPI 임계값 초과 | 주간 스케줄러 실행 | 긴급 알림 발송 + 일반 리포트 발송 |
| TC-X09-03 | negative | 1개 지점 데이터 누락 | 스케줄러 실행 | 부분 리포트 생성, 누락 지점 경고 표시 |
| TC-X09-04 | negative | 집계 엔진 타임아웃 | 스케줄러 실행 | 3회 재시도 후 실패 알림, 수동 재실행 안내 |
| TC-X09-05 | positive | 본사관리자 로그인 | 리포트 URL 클릭 | 주간 KPI 리포트 정상 조회 |
