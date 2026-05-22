# 락커 자동 배정 — kiosk 흐름

> 작성일: 2026-05-04
> SCR-050 락커관리 + SCR-052 밴드카드관리 ↔ KIO-201/202/204 연동

## 1. 락커 자동 배정 시퀀스

```mermaid
sequenceDiagram
    participant kiosk as KIO-201
    participant admin
    participant L50 as SCR-050 락커풀
    participant L52 as SCR-052 밴드재고
    participant 프린터
    participant 알림 as admin 알림 채널
    participant clientapp as 회원앱

    kiosk->>admin: 출석 성공 + 락커 후처리 정책 = 자동 배정
    admin->>L50: 자동 배정 존(A,B)에서 가용 락커 검색
    L50-->>admin: 락커 번호 N

    alt 전달 방식 = 영수증
        admin-->>kiosk: 번호 N + 회원 정보
        kiosk->>프린터: 출력
        프린터-->>kiosk: 완료
        kiosk->>사용자: KIO-202 안내
    else 전달 방식 = 앱
        admin->>알림: 푸시 + 인앱 발송
        알림-->>clientapp: SCR-MA-150 락커 카드
        admin-->>kiosk: 발송 OK
        kiosk->>사용자: KIO-203 안내
    else 전달 방식 = 신발장 밴드
        admin->>L52: 밴드 N 재고 확인
        L52-->>admin: 사용 가능
        admin-->>kiosk: 번호 N 확정
        kiosk->>사용자: KIO-204 대형 번호
    end
```

## 2. 자동 배정 실패 분기

```mermaid
flowchart TD
    A[KIO-201 자동 배정 시도] --> B[admin → SCR-050 가용 검색]
    B --> C{가용 락커?}
    C -->|있음| D[전달 방식 분기로]
    C -->|없음| E[수동 배정 대기 안내]
    E --> F[KIO-201 모달에 프런트 안내]
    F --> G[자동 복귀]
```

## 3. 신발장 밴드 방식의 SCR-052 의존

```mermaid
flowchart TD
    A[KIO-204 신발장 밴드 방식] --> B[admin이 번호 N 배정]
    B --> C[SCR-052에 밴드 N 재고 확인]
    C --> D{재고 OK?}
    D -->|OK| E[번호 N 확정 → KIO-204에 대형 표시]
    D -->|밴드 분실| F[다음 번호 검색 또는 프런트 안내]
    F --> G[admin 운영 로그 적재]

    H[운영자: SCR-052에서 밴드 분실 입력] --> I[해당 번호 즉시 배정 불가 처리]
    I --> J[다음 KIO-204 진입에 영향]

    K[운영자: SCR-052에서 회수 처리] --> L[배정 가능 상태로 복원]
```

## 4. 회원 앱 발송 방식의 알림 채널

```mermaid
sequenceDiagram
    participant kiosk
    participant admin
    participant 알림채널
    participant clientapp as SCR-MA-150
    participant 회원

    kiosk->>admin: 락커 번호 = N + 전달 방식 = app
    admin->>알림채널: 푸시 + 인앱 발송
    알림채널-->>clientapp: 락커 알림 카드 표시
    admin-->>kiosk: 발송 결과

    alt 발송 성공
        kiosk->>회원: KIO-203 "앱에서 확인"
    else 발송 실패 (앱 미연동/푸시 실패)
        admin-->>kiosk: fallback 신호
        kiosk->>kiosk: KIO-202 영수증 또는 KIO-203 프런트 안내로 전환
    end
```

## 5. 락커 풀 갱신 타이밍

| 트리거 | SCR-050 갱신 |
|---|---|
| 키오스크 자동 배정 | 즉시 (락커 점유) |
| 회원이 락커 회수 (퇴장) | admin/SCR-050 운영자 회수 처리 |
| 일괄 회수 (영업 종료) | admin/SCR-050 일괄 회수 |
| 자동 만료 | 운영 정책에 따라 (영업 종료 시각 등) |

## 관련 산출물

- ../../화면설계서/D06-시설관리/SCR-050-락커관리/키오스크-연동.md
- ../../화면설계서/D06-시설관리/SCR-052-밴드카드관리/키오스크-연동.md
- ../../../kiosk/다이어그램/20_상태전이도/22_락커후처리_상태전이.md
- ../../../kiosk/다이어그램/30_시나리오_시퀀스/X04, X05, X06
