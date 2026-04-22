---
title: 외부 API 연동 실패 에러 플로우
type: flowchart
scope: SYSTEM_EXTERNAL
lastUpdated: 2026-04-20
---

# E18 — 외부 API 실패

## 1. 개요

| 항목 | 내용 |
|------|------|
| 에러코드 | E503001 / E503002 |
| HTTP | 503 Service Unavailable |
| 발생 모듈 | 전 모듈 (외부 연동) |
| 영향 화면 | SCR-S003 결제, SCR-075 전자계약, SCR-083 IoT, SCR-071 메시지 |

## 2. 발생 조건

- PG사 API 장애
- 전자계약 외부 서비스 장애
- 세금계산서 발행 API 오류
- IoT 클라우드 플랫폼 장애
- SMS/카카오 발송 API 장애

## 3. 다이어그램

```mermaid
flowchart TD
    REQ([외부 API 호출 요청]) --> EXT_API[EXT: 외부 API 호출]

    EXT_API -->|200 성공|RESP_OK[정상 응답 처리]
    EXT_API -->|4xx 클라이언트 오류|CLIENT_ERR{오류 코드 분석}
    EXT_API -->|5xx 서버 오류|SERVER_ERR[외부 서버 장애]
    EXT_API -->|타임아웃|TIMEOUT[응답 타임아웃]
    EXT_API -->|네트워크 오류|NET_ERR[네트워크 연결 실패]

    CLIENT_ERR -->|인증 오류|API_AUTH_ERR[API 키/인증 오류<br/>설정 점검 필요]
    CLIENT_ERR -->|파라미터 오류|PARAM_ERR[요청 파라미터 오류<br/>로그 분석 필요]

    SERVER_ERR & TIMEOUT & NET_ERR --> RETRY{재시도<br/>?}
    RETRY --> EXT_API
    RETRY -->|초과|FALLBACK{대체 수단<br/>있음?}

    FALLBACK -->|있음|FALLBACK_PROC[대체 처리<br/>예: PG→수기, 카카오→SMS]
    FALLBACK -->|없음|E503001_2[E503001/E503002<br/>서비스 일시 중단]

    API_AUTH_ERR & PARAM_ERR --> OPS_ALERT[운영팀 긴급 알림<br/>설정/코드 수정 필요]

    E503001_2 --> USER_TOAST[전역 에러 토스트<br/>재시도 버튼]
    FALLBACK_PROC --> LOG_FALLBACK[대체 처리 이력 로그]

    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef system fill:#EDE7F6,stroke:#5E35B2
    classDef external fill:#ECEFF1,stroke:#455A64,stroke-dasharray:3 3
    classDef warning fill:#FFF8E1,stroke:#F9A825,color:#F57F17

    class SERVER_ERR,TIMEOUT,NET_ERR,API_AUTH_ERR,PARAM_ERR,E503001_2,USER_TOAST error
    class RESP_OK,FALLBACK_PROC success
    class CLIENT_ERR,RETRY,FALLBACK system
    class EXT_API external
    class OPS_ALERT,LOG_FALLBACK warning
```

## 4. 복구/재시도 전략

| 상황 | 전략 |
|------|------|
| 5xx / 타임아웃 | 최대 3회 자동 재시도 (exponential backoff) |
| 대체 수단 있음 | 자동 fallback (카카오→SMS, PG→수기 등) |
| 대체 수단 없음 | 에러 토스트, 사용자 재시도 버튼 |
| API 인증 오류 | 운영팀 즉시 알림, 수동 설정 수정 |

## 5. 사용자 노출 메시지

| 에러코드 | 메시지 |
|----------|--------|
| E503001 | 결제 단말기 연결에 실패했습니다. 연결 상태를 확인해주세요 |
| E503002 | 결제 서비스에 일시적인 문제가 발생했습니다 |
| 일반 외부 API | 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요 |
