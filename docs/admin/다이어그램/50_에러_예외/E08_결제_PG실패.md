---
title: 결제 PG 실패 에러 플로우
type: flowchart
scope: PAYMENT
lastUpdated: 2026-04-20
---

# E08 — 결제 PG 실패

## 1. 개요

| 항목 | 내용 |
|------|------|
| 에러코드 | E402001 / E503002 |
| HTTP | 402 / 503 |
| 발생 모듈 | 매출/결제 |
| 영향 화면 | SCR-S002 POS 판매, SCR-S003 결제 처리 |

## 2. 발생 조건

| 에러코드 | 조건 |
|----------|------|
| E402001 | PG사 결제 응답 실패 (거절/오류) |
| E503002 | PG API 자체 장애 또는 타임아웃 |

## 3. 다이어그램

```mermaid
flowchart TD
    POS([SCR-S002 POS 판매<br/>결제 요청]) --> PG[EXT: PG사 결제 요청]

    PG -->|승인|APPROVED[결제 승인<br/>Payment]
    APPROVED --> RECEIPT[영수증 발행<br/>이용권 자동 개시]

    PG -->|거절|REJECT_TYPE{거절 사유 분류}
    PG -->|타임아웃|TIMEOUT[E503002<br/>PG 연동 오류]
    PG -->|오류 응답|PG_ERR[E402001<br/>결제 처리 실패]

    REJECT_TYPE -->|한도초과|LIMIT_ERR[E402001<br/>한도 초과 사유]
    REJECT_TYPE -->|카드 오류|CARD_ERR[E402002<br/>카드 승인 실패]
    REJECT_TYPE -->|기타 거절|PG_ERR

    PG_ERR --> ERR_MODAL[결제 실패 모달<br/>다시 시도해주세요]
    TIMEOUT --> RETRY{자동 재시도<br/>?}
    LIMIT_ERR --> LIMIT_MODAL[한도 초과 모달<br/>E09 참조]
    CARD_ERR --> CARD_MODAL[카드 오류 모달<br/>E10 참조]

    RETRY --> PG
    RETRY -->|초과|TIMEOUT_MODAL[타임아웃 안내 모달<br/>수동 처리 유도]

    ERR_MODAL -->|재시도|POS
    ERR_MODAL -->|취소|CANCEL[결제 취소<br/>POS 초기화]
    TIMEOUT_MODAL --> RECONCILE[정산 확인 큐]

    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef system fill:#EDE7F6,stroke:#5E35B2
    classDef external fill:#ECEFF1,stroke:#455A64,stroke-dasharray:3 3
    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef modal fill:#FFF3E0,stroke:#F57C00,color:#E65100

    class PG_ERR,TIMEOUT,LIMIT_ERR,CARD_ERR,ERR_MODAL,TIMEOUT_MODAL error
    class APPROVED,RECEIPT success
    class REJECT_TYPE,RETRY system
    class PG external
    class POS screen
    class LIMIT_MODAL,CARD_MODAL modal
```

## 4. 복구/재시도 전략

| 상황 | 전략 |
|------|------|
| PG 거절 | 실패 모달, 다른 결제 수단 유도 |
| PG 타임아웃 | 3회 자동 재시도, 정산 확인 큐 |
| 결제 불명 | 관리자 수동 정산 확인 |

## 5. 사용자 노출 메시지

| 에러코드 | 메시지 |
|----------|--------|
| E402001 | 결제 처리에 실패했습니다. 다시 시도해주세요 |
| E503002 | 결제 서비스에 일시적인 문제가 발생했습니다 |
