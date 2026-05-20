# 키오스크 ↔ 회원앱(client) 연동 다이어그램

> 작성일: 2026-05-04
> kiosk-pando 시점에서 client(회원앱)와 만나는 흐름

## 1. 전체 채널 관계

```mermaid
flowchart LR
    subgraph clientapp[회원앱 client-pando]
        C110[SCR-MA-110 QR 입장]
        C111[SCR-MA-111 출석이력]
        C122[SCR-MA-122 내예약수업이력]
        C123[SCR-MA-123 골프예약상세]
        C124[SCR-MA-124 대기예약관리]
        C131[SCR-MA-131 이용권잔여회차]
        C133[SCR-MA-133 결제내역]
        C150[SCR-MA-150 알림센터]
    end

    subgraph kiosk[kiosk-pando]
        K101[KIO-101 QR 입장]
        K201[KIO-201 출석 결과]
        K203[KIO-203 앱 확인]
        K302[KIO-302 이용권]
        K303[KIO-303 예약]
        K501[KIO-501~504 골프]
    end

    subgraph admin[admin]
        A[admin DB / 알림 채널]
        C02[SCR-C002 수업관리]
        C16[SCR-C016 예약목록]
        G54[SCR-054 골프타석관리]
    end

    %% 회원앱 → 키오스크 (QR)
    C110 -.QR 토큰.-> K101

    %% 키오스크 → 회원앱 (admin 경유)
    K201 -->|출석 동기화| A
    A -->|즉시 반영| C111

    K203 -->|락커 알림 트리거| A
    A -->|푸시 + 인앱| C150

    K501 -->|골프 예약/대기| G54
    G54 --> A
    A -->|예약 알림| C150
    A -->|예약 데이터 동기화| C123
    A -->|대기 데이터 동기화| C124

    K702 -->|결제| A
    A -->|결제 내역 동기화| C133

    %% 같은 데이터 다른 UX
    A -.동일 데이터.-> K302
    A -.동일 데이터.-> C131
    C16 -.일반 예약 원장.-> K303
    C02 -.수업 마스터.-> K303
    C16 -.일반 예약 원장.-> C122
    C02 -.수업 마스터.-> C122
    G54 -.골프 예약.-> K303
```

키오스크와 회원앱은 직접 통신하지 않는다 (단, QR 토큰의 시각적 노출은 예외). 모든 동기화는 admin을 경유한다.

## 2. 시퀀스 — 회원앱 QR로 키오스크 출석

```mermaid
sequenceDiagram
    actor 회원
    participant clientapp as 회원앱 SCR-MA-110
    participant kiosk as 키오스크 KIO-101
    participant admin

    회원->>clientapp: QR 발급 요청
    clientapp->>admin: 토큰 발급
    admin-->>clientapp: 토큰 (60초 유효)
    clientapp-->>회원: QR 표시
    회원->>kiosk: QR 노출
    kiosk->>admin: 토큰 검증 + 회원 식별
    admin-->>kiosk: 회원 ID + 이용권
    kiosk->>회원: 출석 결과
    admin->>clientapp: SCR-MA-111 즉시 갱신
```

## 3. 시퀀스 — 키오스크 출석 후 락커 번호 앱 발송

```mermaid
sequenceDiagram
    participant kiosk as 키오스크 KIO-201/203
    participant admin
    participant 알림채널 as admin 알림 채널
    participant clientapp as 회원앱 SCR-MA-150
    actor 회원

    kiosk->>admin: 락커 자동 배정 + 전달 방식 = app
    admin->>알림채널: 푸시 + 인앱 발송
    알림채널-->>clientapp: 락커 알림 카드 (번호/위치/유효시간)
    admin-->>kiosk: 발송 OK
    kiosk->>회원: KIO-203 "앱에서 확인"
    회원->>clientapp: SCR-MA-150 진입 → 번호 확인
```

## 4. 시퀀스 — 키오스크 골프 예약 후 회원앱 알림

```mermaid
sequenceDiagram
    participant kiosk as 키오스크 KIO-503/504
    participant admin
    participant 알림채널
    participant clientapp as 회원앱 SCR-MA-150/123

    kiosk->>admin: 예약 확정 (또는 대기 등록)
    admin->>admin: SCR-054 즉시 반영
    admin->>알림채널: 예약 알림
    알림채널-->>clientapp: SCR-MA-150 알림 카드
    Note over clientapp: 회원이 알림 클릭 시
    clientapp->>admin: 예약 상세 조회
    admin-->>clientapp: SCR-MA-123 데이터
```

## 5. 시퀀스 — 골프 대기 자동 승격

```mermaid
sequenceDiagram
    participant admin
    participant 알림채널
    participant clientapp
    actor 회원
    participant kiosk

    Note over admin: 빈 자리 발생, 1순위 자동 승격
    admin->>알림채널: 승격 푸시
    알림채널-->>clientapp: SCR-MA-150에 카드
    회원->>clientapp: 알림 확인
    Note over 회원: 또는 키오스크 다음 진입
    회원->>kiosk: KIO-303 예약 조회
    kiosk->>admin: 예약 조회
    admin-->>kiosk: 승격된 예약 표시
```

## 6. 같은 회원의 동시 시도 충돌 방지

```mermaid
flowchart TD
    A[회원 동시에 두 채널 사용] --> B{어느 채널이 먼저?}
    B -->|회원앱 먼저| C1[회원앱 예약 확정]
    B -->|키오스크 먼저| C2[키오스크 예약 확정]
    C1 --> D[admin 단일 검증으로 다른 채널은 차단]
    C2 --> D
    D --> E[중복/충돌은 발생하지 않음]
```

admin 단일 검증으로 동시 충돌은 발생하지 않는다.

## 7. 회원앱 측 보강 필요 항목

| 항목 | 회원앱 화면 | 사유 |
|---|---|---|
| 락커 알림 카드 형식 | SCR-MA-150 | 키오스크 KIO-203 흐름 활성화 |
| QR 토큰 자동 재발급 | SCR-MA-110 | 키오스크 인식 안정성 |
| 키오스크 출처 표시(옵션) | SCR-MA-122/123 | 어느 채널에서 예약했는지 라벨 |

## 관련 산출물

- client/KIOSK-연동매트릭스.md
- client/화면설계서/D12-회원앱/SCR-MA-110-QR체크인/키오스크-연동.md
- client/화면설계서/D12-회원앱/SCR-MA-123-골프예약상세/키오스크-연동.md
- client/화면설계서/D12-회원앱/SCR-MA-150-알림센터/키오스크-연동.md
- 30_시나리오_시퀀스/X02, X05, X07, X08
