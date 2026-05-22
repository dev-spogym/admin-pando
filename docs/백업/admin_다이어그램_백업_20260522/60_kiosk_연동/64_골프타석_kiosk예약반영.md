# 골프 타석 — kiosk 예약 반영

> 작성일: 2026-05-04
> SCR-054 골프타석관리 ↔ KIO-501~504 ↔ client/SCR-MA-123 동기화

## 1. 3채널 동기화 구조

```mermaid
flowchart TD
    A[admin/SCR-054 골프타석관리<br/>운영자 직접 편집] --> DB[(공통 DB)]
    K[kiosk/KIO-501~504<br/>입구 단말 셀프 예약] --> DB
    C[client/SCR-MA-123<br/>회원앱 셀프 예약] --> DB
    DB --> A
    DB --> K
    DB --> C
```

세 채널은 동일 데이터 원천을 본다. 어디서 예약/취소해도 즉시 반영되며, 키오스크는 로컬 상태만으로 예약을 확정하지 않는다.

## 2. 키오스크 예약 시퀀스

```mermaid
sequenceDiagram
    actor 회원
    participant kiosk as KIO-501~504
    participant admin
    participant SCR054 as admin/SCR-054
    participant 알림 as 알림 채널
    participant clientapp as 회원앱 SCR-MA-150/123

    회원->>kiosk: 인증 + 시간/타석 선택
    kiosk->>admin: 예약 확정 요청
    admin->>admin: 중복/충돌 검증
    admin->>SCR054: 예약 INSERT (즉시 반영)
    admin->>admin: 이용권 차감
    admin->>알림: 회원앱 알림
    알림-->>clientapp: SCR-MA-150 예약 알림
    admin-->>kiosk: 예약 ID
    kiosk->>회원: KIO-504 예약 완료
    Note over clientapp: SCR-MA-123에서 즉시 조회 가능
```

## 3. 대기 등록 + 자동 승격

```mermaid
sequenceDiagram
    participant kiosk
    participant admin
    participant SCR054
    participant 알림
    participant clientapp
    actor 회원2 as 다른 회원

    kiosk->>admin: 만석 → 대기 등록
    admin->>SCR054: 대기열 push (순번 N)
    admin-->>kiosk: 순번 N
    kiosk->>회원2: KIO-504 대기 등록 완료

    Note over admin: 시간 경과
    회원2->>admin: 다른 회원 예약 취소
    admin->>SCR054: 빈 자리 발생
    admin->>admin: 자동 승격 (1순위)
    admin->>알림: 승격 푸시
    알림-->>clientapp: SCR-MA-150에 카드
    Note over kiosk: 회원이 다음 진입 시 KIO-303에서도 표시됨
```

## 4. 동시 시도 충돌 방지

```mermaid
flowchart TD
    A[같은 시간/타석을 회원앱과 키오스크에서 동시 시도] --> B[admin 단일 검증]
    B --> C{먼저 도달한 요청?}
    C -->|회원앱 우선| D[회원앱 예약 확정 / 키오스크 차단]
    C -->|키오스크 우선| E[키오스크 예약 확정 / 회원앱 차단]
    D --> F[차단된 채널은 즉시 사용자에게 안내]
    E --> F
```

admin이 단일 검증을 수행하므로 충돌은 발생하지 않는다. KIO-501~504의 골프 UX는 타석 상태, 대기열, 이용권 차감, 채널 차단 정책을 모두 admin 결과에 맞춰 표시한다.

## 5. SCR-054에 키오스크 채널 표시

```mermaid
flowchart LR
    K[KIO-503 예약 확정] --> M[예약 메타에 via=kiosk 라벨]
    M --> A[admin/SCR-054 예약 행 표시]
    A --> O[운영자가 채널 통계 가능]
```

## 6. 키오스크 채널 일시 차단 (점검 시)

```mermaid
sequenceDiagram
    actor 운영자
    participant admin as admin/SCR-054
    participant kiosk

    운영자->>admin: 키오스크 채널 일시 차단 ON
    admin->>kiosk: 다음 KIO-501 진입 시 신호 전달
    kiosk->>kiosk: KIO-501에서 "현재 키오스크 예약이 일시 중단입니다" 안내
    Note over admin: 회원앱은 정상 동작
```

## 관련 산출물

- ../../화면설계서/D06-시설관리/SCR-054-골프타석관리/키오스크-연동.md
- ../../../client/화면설계서/D12-회원앱/SCR-MA-123-골프예약상세/키오스크-연동.md
- ../../../kiosk/다이어그램/20_상태전이도/23_골프예약_상태전이.md
- ../../../kiosk/다이어그램/30_시나리오_시퀀스/X07, X08
- 30_시나리오_시퀀스/X31_회원앱_골프예약_타석선택_대기전환.md
