# RW. 마일리지 / 배지 흐름

> 화면설계서 참조: RW1 마일리지 적립/사용 / RW2 배지 획득.

## RW1. 마일리지 적립 → 사용

```mermaid
flowchart TD
    Trigger[적립 트리거 발생] --> Type{트리거 유형}
    Type -->|루틴 완료/출석/측정/스트레칭/후기| Available[즉시 available]
    Type -->|친구 초대 단계| Pending[7일 검증 pending]

    Pending -->|검증 통과| Available
    Pending -->|검증 실패| Rejected[적립 취소]

    Available --> Boost{등급 보너스 적용}
    Boost --> Stored[잔액 저장]

    Stored --> Use{회원 사용처}
    Use -->|재등록 결제| MA138[MA-138 → MA-140]
    Use -->|리커버리 결제| MA141[MA-141 → MA-140]
    Use -->|굿즈 교환| External[외부 운영]
    Use -->|마켓 결제| MA400[MA-400 → MA-140]

    Available --> Expire{1년 미사용}
    Expire -->|만료 30일 전| Warn[안내 알림]
    Expire -->|만료 도달| Expired[만료 처리]
```

## RW2. 배지 자동 부여

```mermaid
sequenceDiagram
    participant API
    participant System
    actor Member
    participant App
    participant Push

    System->>API: 회원 활동 누적 감지
    API->>API: 마일스톤 8종 조건 검증

    alt 조건 충족
        API->>API: 배지 자동 부여 + 보상 마일리지
        API->>Push: 리워드 카테고리 푸시
        Push-->>Member: "마일스톤 배지 획득!"
        Member->>App: 알림 탭 → MA-137
        App-->>Member: 획득 배지 강조 + 공유 CTA
    else 진척 중
        API->>App: 진척률 갱신 (예: 7/10)
        App-->>Member: MA-137 미획득 카드에 진척 표시
    end
```

## 배지 카테고리

| 카테고리 | 예시 |
|---|---|
| 출석 | 첫 출석 / 10회 / 100회 / 1년 |
| 수업 | 첫 PT 완주 / PT 50회 / GX 100회 |
| 측정 | 첫 인바디 / FMS 향상 |
| 리워드 | 마일리지 1만/10만 / 쿠폰 사용 |
| 친구 | 첫 추천 / 친구 5명 |
| 마일스톤 (활동 기반) | 8종 — 첫 PT 완주 / 10회 연속 출석 / 첫 후기 / 한 달 개근 / 누적 결제 200만원 / 친구 초대 마스터 / 얼리버드 / 마라토너 |

## 등급별 적립 보너스

| 등급 | 보너스 |
|---|---|
| BRONZE | 0% |
| SILVER | +5% |
| GOLD | +10% |
| VIP | +15% |
| VVIP | +20% |
