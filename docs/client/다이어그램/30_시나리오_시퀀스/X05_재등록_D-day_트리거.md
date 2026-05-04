# X05. 재등록 D-day 트리거 시나리오

> xlsx 항목: #25 재등록 추천 플랜 3종 (D-14/D-7/D-1)

회원권 만료 14일/7일/1일 전에 본사 정책 세트 기반 자동 트리거가 발동, 회원에게 푸시 + 홈 배너 + MA-138 진입을 유도하는 흐름.

```mermaid
sequenceDiagram
    participant Cron as 스케줄러 (일배치)
    participant API
    participant Policy as 본사 정책 세트
    participant Push as 푸시 시스템
    actor Member
    participant App

    Note over Cron,Push: 매일 새벽 (0AM KST)
    Cron->>API: 만료 D-14/D-7/D-1 회원 목록 조회
    API->>Policy: D-day 정책 세트 조회
    Policy-->>API: D-14 / D-7 / D-1 트리거 활성

    par 회원별 트리거 발동
        API->>Push: D-14 푸시 (info)
        Push-->>Member: "회원권 만료 14일 전 - 추천 플랜을 확인해보세요"
    and
        API->>Push: D-7 푸시 (warning)
        Push-->>Member: "이번 주 만료 - 재등록 시 +10% 혜택"
    and
        API->>Push: D-1 푸시 (danger)
        Push-->>Member: "내일 만료 - 마지막 안내"
    end

    Member->>App: 푸시 탭
    App->>API: MA-138 진입 + 회원 활동 데이터 조회
    API-->>App: 추천 플랜 3종 (AI / 균형 / 경제)
    App-->>Member: MA-138 D-day 배너 + 추천 플랜 3종

    Member->>App: AI 추천 카드 → "이 플랜으로 결제"
    App-->>Member: MA-140 결제하기
    Member->>App: 결제수단 선택 + 마일리지 사용
    App->>API: 결제 처리
    API-->>App: 결제 완료 + 회원권 갱신 (active 상태)
    App-->>Member: MA-142 영수증 + 토스트 "재등록 완료"

    Note over API,Member: 재등록 완료 → D-day 트리거 종료
    API->>Push: D-day 트리거 비활성
```

## D-day 트리거 매트릭스

| D-day | 알림 톤 | 푸시 횟수 | 홈 배너 | MA-138 표시 |
|-------|---------|-----------|---------|-------------|
| D-14 | info | 1회 | 보조 톤 | 기본 |
| D-7 | warning | 1회 | 강조 톤 | 강조 |
| D-1 | danger | 1회 | 빨강 톤 | 최우선 |
| 만료 후 | warning | 4주 후 1회 | AT-RISK 메시지 | + 1:1 문의 |

## AT-RISK 케어 시나리오

```mermaid
sequenceDiagram
    participant Cron
    participant API
    participant FCSystem as FC 시스템
    actor Member

    Note over Cron,Member: 만료 후 4주 미재등록
    Cron->>API: AT-RISK 회원 목록 조회
    API->>FCSystem: FC에게 케어 알림 (담당 회원)
    API->>Member: 회원에게 AT-RISK 푸시 (cat: AT-RISK)
    Member->>App: 푸시 탭 → MA-138
    Note over App: AT-RISK 메시지 + 1:1 문의(MA-153) CTA
```
