---
title: IoT 기기 연결 실패 에러 플로우
type: flowchart
scope: IOT
lastUpdated: 2026-04-20
---

# E16 — IoT 연결 실패

## 1. 개요

| 항목 | 내용 |
|------|------|
| 에러코드 | E503001 (IoT/단말기) |
| HTTP | 503 Service Unavailable |
| 발생 모듈 | 시설/IoT |
| 영향 화면 | SCR-083 IoT/출입 관리, SCR-I003 IoT 연동, SCR-I001 통합 출석 |

## 2. 발생 조건

- IoT 게이트웨이 통신 오류
- RFID/밴드 리더기 연결 끊김
- 체성분 측정기(InBody) 연동 실패
- 키오스크 하드웨어 오류
- 출입문 컨트롤러 통신 실패

## 3. 다이어그램

```mermaid
flowchart TD
    IOT_ACTION([IoT 연동 요청]) --> GATEWAY{IoT 게이트웨이<br/>연결 확인}

    GATEWAY -->|연결됨|DEVICE{기기 응답}
    GATEWAY -->|게이트웨이 오류|GW_ERR[게이트웨이 연결 실패]

    DEVICE -->|응답 정상|PROCESS[데이터 처리<br/>출석/체성분/출입]
    DEVICE -->|RFID 오류|RFID_ERR[RFID 리더기 오류]
    DEVICE -->|InBody 오류|INBODY_ERR[체성분 측정기 오류]
    DEVICE -->|출입문 오류|DOOR_ERR[출입 컨트롤러 오류]
    DEVICE -->|키오스크 오류|KIOSK_ERR[키오스크 하드웨어 오류]

    GW_ERR & RFID_ERR & INBODY_ERR & DOOR_ERR & KIOSK_ERR --> RETRY{자동 재시도<br/>?}

    RETRY --> GATEWAY
    RETRY -->|초과|E503001[E503001<br/>연결 실패 확정]

    E503001 --> ERR_ROUTE{기능 유형}
    ERR_ROUTE -->|출석|MANUAL_ATTEND[수동 출석 처리 유도<br/>관리자 SCR-086]
    ERR_ROUTE -->|체성분|MANUAL_INBODY[수동 체성분 입력 유도<br/>SCR-M006]
    ERR_ROUTE -->|출입|EMERGENCY[비상 출입 절차<br/>관리자 수동 개방]
    ERR_ROUTE -->|키오스크|KIOSK_OFFLINE[키오스크 오프라인 모드]

    MANUAL_ATTEND & MANUAL_INBODY & EMERGENCY & KIOSK_OFFLINE --> LOG_ERR[IoT 오류 로그<br/>관리자 알림]
    LOG_ERR --> END([처리 완료])

    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef system fill:#EDE7F6,stroke:#5E35B2
    classDef external fill:#ECEFF1,stroke:#455A64,stroke-dasharray:3 3
    classDef warning fill:#FFF8E1,stroke:#F9A825,color:#F57F17

    class GW_ERR,RFID_ERR,INBODY_ERR,DOOR_ERR,KIOSK_ERR,E503001 error
    class PROCESS success
    class GATEWAY,DEVICE,RETRY,ERR_ROUTE system
    class MANUAL_ATTEND,MANUAL_INBODY,EMERGENCY,KIOSK_OFFLINE warning
```

## 4. 복구/재시도 전략

| 상황 | 전략 |
|------|------|
| 자동 재시도 3회 실패 | 수동 대체 절차 안내 |
| 출석 IoT 실패 | 관리자 수동 출석 처리 |
| 체성분 IoT 실패 | 수동 입력 폼 유도 |
| 출입문 실패 | 비상 절차, 관리자 수동 개방 |
| 키오스크 실패 | 오프라인 모드 전환 |

## 5. 사용자 노출 메시지

| 에러코드 | 메시지 |
|----------|--------|
| E503001 (출석) | "출석 단말기에 연결할 수 없습니다. 관리자에게 문의해주세요." |
| E503001 (체성분) | "체성분 측정기 연결에 실패했습니다. 수동으로 입력해주세요." |
| E503001 (출입) | "출입 시스템 오류가 발생했습니다. 관리자를 호출해주세요." |
