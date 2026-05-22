---
title: DB 트랜잭션 실패 에러 플로우
type: flowchart
scope: SYSTEM_DB
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
    REQ([DB 쓰기 요청]) --> TXN_START[트랜잭션 시작<br/>BEGIN TRANSACTION]

    TXN_START --> EXEC[쿼리 실행]

    EXEC -->|성공|COMMIT{COMMIT}
    EXEC -->|데드락|DEADLOCK[데드락 감지]
    EXEC -->|타임아웃|TXN_TIMEOUT[트랜잭션 타임아웃]
    EXEC -->|제약 위반|CONSTRAINT[DB 제약 조건 위반]
    EXEC -->|연결 끊김|CONN_FAIL[DB 연결 실패]

    COMMIT -->|성공|RESP_OK[200 성공 응답]
    COMMIT -->|실패|COMMIT_FAIL[커밋 실패]

    DEADLOCK --> RETRY_DL{재시도?}
    RETRY_DL --> TXN_START
    RETRY_DL -->|초과|ROLLBACK_LOG[롤백 + 오류 로그]

    TXN_TIMEOUT & CONN_FAIL --> ROLLBACK[자동 롤백]
    CONSTRAINT --> ROLLBACK
    COMMIT_FAIL --> ROLLBACK

    ROLLBACK & ROLLBACK_LOG --> LOG_ERR[서버 에러 로그<br/>트랜잭션 정보 포함]
    LOG_ERR --> ALERT{오류 빈도<br/>임계치?}

    ALERT -->|임계치 초과|OPS_ALERT[운영팀 알림<br/>DB 상태 점검]
    ALERT -->|정상|RESP_ERR[E500001 응답]
    OPS_ALERT --> RESP_ERR

    RESP_ERR --> CLIENT_TOAST[전역 에러 토스트<br/>일시적 오류 안내<br/>입력값 보존]

    CLIENT_TOAST -->|재시도|REQ
    CLIENT_TOAST -->|닫기|STAY[현재 화면 유지]

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
