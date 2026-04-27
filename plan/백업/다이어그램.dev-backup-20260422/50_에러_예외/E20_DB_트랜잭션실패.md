---
diagramId: E20_DB_트랜잭션실패
title: DB 트랜잭션 실패 에러 플로우
type: flowchart
scope: SYSTEM_DB
tcMappings: []
lastUpdated: 2026-04-20
---

# E20 — DB 트랜잭션 실패

## 1. 개요

| 항목 | 내용 |
|------|------|
| 에러코드 | E500001 (DB 트랜잭션 실패) |
| HTTP | 500 Internal Server Error |
| 발생 모듈 | 전 모듈 |
| 영향 화면 | 저장/수정/삭제 작업이 있는 모든 화면 |

## 2. 발생 조건

- DB 연결 끊김
- 트랜잭션 타임아웃
- 데드락 발생
- 제약 조건 위반 (FK, UNIQUE 등 — 서버 미처리 시)
- DB 디스크 용량 부족
- 쿼리 실행 오류

## 3. 다이어그램

```mermaid
flowchart TD
    REQ([DB 쓰기 요청]) -->|E_E20_TXN_START_01| TXN_START[트랜잭션 시작<br/>BEGIN TRANSACTION]

    TXN_START -->|E_E20_EXEC_01| EXEC[쿼리 실행]

    EXEC -->|E_E20_EXEC_OK_01 성공| COMMIT{COMMIT}
    EXEC -->|E_E20_DEADLOCK_01 데드락| DEADLOCK[데드락 감지]
    EXEC -->|E_E20_TIMEOUT_01 타임아웃| TXN_TIMEOUT[트랜잭션 타임아웃]
    EXEC -->|E_E20_CONSTRAINT_01 제약 위반| CONSTRAINT[DB 제약 조건 위반]
    EXEC -->|E_E20_CONN_FAIL_01 연결 끊김| CONN_FAIL[DB 연결 실패]

    COMMIT -->|E_E20_COMMIT_OK_01 성공| RESP_OK[200 성공 응답]
    COMMIT -->|E_E20_COMMIT_FAIL_01 실패| COMMIT_FAIL[커밋 실패]

    DEADLOCK -->|E_E20_DEADLOCK_RETRY_01| RETRY_DL{재시도 < 3?}
    RETRY_DL -->|E_E20_RETRY_DL_YES_01| TXN_START
    RETRY_DL -->|E_E20_RETRY_DL_NO_01 초과| ROLLBACK_LOG[롤백 + 오류 로그]

    TXN_TIMEOUT & CONN_FAIL -->|E_E20_ROLLBACK_01| ROLLBACK[자동 롤백]
    CONSTRAINT -->|E_E20_CONSTRAINT_ROLLBACK_01| ROLLBACK
    COMMIT_FAIL -->|E_E20_COMMIT_ROLLBACK_01| ROLLBACK

    ROLLBACK & ROLLBACK_LOG -->|E_E20_LOG_01| LOG_ERR[서버 에러 로그<br/>트랜잭션 정보 포함]
    LOG_ERR -->|E_E20_ALERT_01| ALERT{오류 빈도<br/>임계치?}

    ALERT -->|E_E20_ALERT_YES_01 임계치 초과| OPS_ALERT[운영팀 알림<br/>DB 상태 점검]
    ALERT -->|E_E20_ALERT_NO_01 정상| RESP_ERR[E500001 응답]
    OPS_ALERT -->|E_E20_OPS_RESP_01| RESP_ERR

    RESP_ERR -->|E_E20_CLIENT_01| CLIENT_TOAST[전역 에러 토스트<br/>일시적 오류 안내<br/>입력값 보존]

    CLIENT_TOAST -->|E_E20_RETRY_BTN_01 재시도| REQ
    CLIENT_TOAST -->|E_E20_STAY_01 닫기| STAY[현재 화면 유지]

    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef system fill:#EDE7F6,stroke:#5E35B2
    classDef warning fill:#FFF8E1,stroke:#F9A825,color:#F57F17

    class DEADLOCK,TXN_TIMEOUT,CONSTRAINT,CONN_FAIL,COMMIT_FAIL,ROLLBACK,ROLLBACK_LOG,RESP_ERR,CLIENT_TOAST error
    class RESP_OK success
    class TXN_START,EXEC,COMMIT,RETRY_DL,ALERT system
    class OPS_ALERT,STAY warning
```

## 4. 복구/재시도 전략

| 상황 | 전략 |
|------|------|
| 데드락 | 자동 3회 재시도 (100ms, 200ms, 400ms backoff) |
| 타임아웃/연결 실패 | 즉시 롤백, 에러 로그, 재시도 버튼 |
| 제약 조건 위반 | 롤백, 상위 레이어 검증 코드 점검 |
| 반복 실패 | 운영팀 알림, DB 상태 점검 |
| 폼 입력 보존 | 롤백 시 클라이언트 입력값 유지 |

## 5. 사용자 노출 메시지

| 에러코드 | 메시지 |
|----------|--------|
| E500001 | 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요 |
| 재시도 권유 | 입력하신 내용은 유지됩니다. 다시 시도해주세요. |

## 6. TC 후보

| TC ID | 타입 | Given | When | Then |
|-------|------|-------|------|------|
| TC-E20-01 | negative | DB 데드락 발생 | 저장 요청 | 3회 재시도, 실패 시 에러 토스트 |
| TC-E20-02 | negative | DB 연결 끊김 | 저장 요청 | 즉시 롤백, 에러 토스트 |
| TC-E20-03 | negative | 트랜잭션 타임아웃 | 대용량 쓰기 | 롤백, 재시도 버튼 |
| TC-E20-04 | positive | 2회 실패 후 커밋 성공 | 재시도 | 정상 저장 |
| TC-E20-05 | edge | 롤백 시 입력값 보존 | 에러 발생 | 폼 데이터 유지 확인 |
