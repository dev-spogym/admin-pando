# 키오스크 골프 예약 → 회원앱 알림

> 작성일: 2026-05-04
> KIO-501~504 → SCR-MA-150 알림 → SCR-MA-123 동기화

## 1. 즉시 예약 시퀀스

```mermaid
sequenceDiagram
    actor 회원
    participant kiosk as 키오스크 KIO-501~504
    participant admin
    participant SCR054 as admin/SCR-054
    participant 알림
    participant clientapp as 회원앱

    회원->>kiosk: 인증 + 시간 + 타석 선택
    kiosk->>admin: 예약 확정 요청
    admin->>SCR054: 예약 INSERT (즉시 반영)
    admin->>admin: 이용권 차감
    admin->>알림: 예약 알림
    알림-->>clientapp: SCR-MA-150 카드 (예약 완료)
    admin-->>kiosk: 예약 ID
    kiosk->>회원: KIO-504 예약 완료

    Note over clientapp: 회원이 앱 진입 시
    회원->>clientapp: SCR-MA-123 골프예약상세
    clientapp->>admin: 예약 조회
    admin-->>clientapp: 동일 예약 데이터 (via=kiosk 라벨)
```

## 2. 대기 등록 + 자동 승격 시퀀스

```mermaid
sequenceDiagram
    participant kiosk
    participant admin
    participant SCR054
    participant 알림
    participant clientapp
    actor 회원

    kiosk->>admin: 만석 → 대기 등록 요청
    admin->>SCR054: 대기열 push (순번 N)
    admin->>알림: 대기 등록 알림
    알림-->>clientapp: SCR-MA-150 카드 (대기 N번)
    admin-->>kiosk: 순번 N
    kiosk->>회원: KIO-504 대기 등록 완료

    Note over admin: 시간 경과, 빈 자리 발생
    admin->>SCR054: 자동 승격 (1순위)
    admin->>알림: 승격 푸시
    알림-->>clientapp: SCR-MA-150 카드 (대기 → 예약 승격)
    Note over clientapp: 회원이 알림 확인 시
    회원->>clientapp: 알림 클릭
    clientapp-->>회원: SCR-MA-123에서 새 예약 확인
```

## 3. 회원앱 알림 카드 형식

| 종류 | 카드 표시 |
|---|---|
| 예약 완료 (키오스크 발) | "골프 타석 예약이 확정되었습니다" + 일시/타석 |
| 대기 등록 완료 | "대기 N번으로 등록되었습니다" |
| 자동 승격 | "대기에서 예약으로 승격되었습니다" + 일시/타석 |
| 운영자 사유 취소 | "예약이 취소되었습니다" + 사유 |

모든 카드에 `출처=키오스크` 라벨 옵션.

## 4. 회원앱 SCR-MA-123에서 키오스크 예약 표시

```mermaid
flowchart TD
    A[SCR-MA-123 예약 상세 진입] --> B[admin 조회]
    B --> C{예약 출처}
    C -->|via=kiosk| D[메타에 "키오스크 예약" 라벨 표시]
    C -->|via=app| E[메타에 "앱 예약" 라벨 표시]
    C -->|via=admin| F[메타에 "운영자 예약" 라벨 표시]
    D --> G[취소/변경 가능]
    E --> G
    F --> G
```

키오스크에서 한 예약도 회원앱에서 동일하게 취소/변경 가능하다 (단일 데이터 원천).

## 5. 회원앱 SCR-MA-124 대기 예약 관리

```mermaid
flowchart LR
    K[KIO-503 대기 등록] --> A[admin/SCR-054 대기열]
    A --> CL[client/SCR-MA-124 대기예약관리]
    CL --> R[회원이 대기 순번 / 자동 승격 여부 확인]
```

회원이 키오스크에서 대기 등록 후 회원앱에서 대기 상태를 모니터링할 수 있어야 한다.

## 관련 산출물

- ../../화면설계서/D12-회원앱/SCR-MA-123-골프예약상세/키오스크-연동.md
- ../../화면설계서/D12-회원앱/SCR-MA-150-알림센터/키오스크-연동.md
- ../../../kiosk/다이어그램/30_시나리오_시퀀스/X07_골프예약_타석선택.md
- ../../../kiosk/다이어그램/30_시나리오_시퀀스/X08_골프예약_대기등록.md
