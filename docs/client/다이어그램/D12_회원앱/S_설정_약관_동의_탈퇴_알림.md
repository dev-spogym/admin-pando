# S. 설정 / 약관 / 동의 / 탈퇴 / 알림 흐름

> 화면설계서 참조: S1 알림설정 매트릭스 / S2 약관 변경 재동의 / S3 동의 변경 저장 / S4 회원 탈퇴.

## S1. 알림 설정 매트릭스 (카테고리 × 채널)

```mermaid
graph TD
    MA155[MA-155 설정] --> CatList[7개 카테고리]
    CatList --> C1[예약]
    CatList --> C2[이용권]
    CatList --> C3[리워드]
    CatList --> C4[공지]
    CatList --> C5[AT-RISK 케어]
    CatList --> C6[수업·후기]
    CatList --> C7[부가시설]

    C1 --> Switch[메인 ON/OFF]
    Switch --> Channel[채널 다중 선택]
    Channel --> CH1[앱 푸시]
    Channel --> CH2[SMS]
    Channel --> CH3[이메일]

    MA155 --> Night[야간 차단 22-07]
    MA155 --> System[시스템 메뉴 진입]
    System --> MA156[약관/정책]
    System --> MA157[동의관리]
    System --> MA158[회원 탈퇴]
    System --> MA153[1:1 문의]
    System --> Logout[로그아웃]
```

## S2. 약관 변경 → 재동의

```mermaid
sequenceDiagram
    participant Ops as 운영팀
    participant API
    actor Member
    participant App

    Ops->>API: 약관 개정 (시행일 등록)
    API->>App: 회원 진입 시 약관 변경 감지
    App-->>Member: MA-156 상단 배너 + 변경 안내

    alt 필수 약관 개정
        App-->>Member: 재동의 모달 (필수)
        Member->>App: 동의 또는 탈퇴 안내
        App->>API: 재동의 저장
    else 선택 약관 개정
        Member->>App: MA-156에서 본문 확인 (강제 X)
    end
```

## S3. 동의 관리 변경

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant API

    Member->>App: MA-157 동의관리
    App-->>Member: 필수 동의 (조회 전용) + 선택 동의 (스위치)
    Member->>App: 마케팅 SMS OFF
    App->>API: 즉시 저장
    API-->>App: 변경 완료 + 최근 변경일 갱신
    App-->>Member: 토스트 "마케팅 SMS 수신 OFF"
```

## S4. 회원 탈퇴

```mermaid
flowchart TD
    MA155[MA-155 설정] --> MA158[MA-158 회원 탈퇴]
    MA158 --> Notice[탈퇴 전 안내 카드]
    Notice --> N1[잔여 회차 + 환불 안내]
    Notice --> N2[보유 마일리지 즉시 소멸 안내]
    Notice --> N3[진행 중 주문 환불 안내]

    MA158 --> Reason[사유 단일 선택]
    MA158 --> Memo[추가 의견]
    MA158 --> Agree[동의 3개 체크]

    Agree --> CTA{탈퇴 신청 활성?}
    CTA -->|모두 체크| Active[탈퇴 신청 CTA 활성]
    CTA -->|미체크| Disabled[비활성]

    Active --> Confirm[ConfirmDialog 위험 톤]
    Confirm -->|확인| Submit[탈퇴 요청 접수]
    Confirm -->|취소| Back[이전 화면]

    Submit --> Result[처리 결과 화면]
    Result --> Logout[자동 로그아웃 → MA-001]

    Note over Submit: 즉시 삭제 X / 운영 승인 후 처리
```
