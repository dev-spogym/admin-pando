# X02. GX 예약 플로우 시나리오

> xlsx 항목: #12 오늘/주간 GX 스케줄, #13 GX 예약/취소, #14 정원·대기 상태

회원이 GX 클래스를 탐색·예약하거나 만석 시 대기 등록하는 흐름. 정원 자동 확정과 자리 발생 시 자동 확정 로직 포함.

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant API
    participant Wait as 대기열 시스템

    Member->>App: MA-100 → "GX 스케줄" 카드
    App-->>Member: MA-120 수업 목록 (GX 탭)
    Member->>App: 카테고리=GX, 날짜 선택, 강사 필터
    App->>API: GX 클래스 조회
    API-->>App: 클래스 리스트 + 정원/잔여석/예약 가능 상태

    Member->>App: 클래스 카드 탭
    App-->>Member: MA-121 수업 상세

    alt 정원 여유
        Member->>App: "예약하기" CTA
        App->>API: 예약 생성 (수업 ID, 회원 ID)
        API->>API: 정원 점검 (atomic)
        API-->>App: 예약 confirmed
        App-->>Member: 토스트 "예약 완료" + MA-122 진입
    else 정원 만석
        App-->>Member: "대기 등록" 활성
        Member->>App: "대기 등록" CTA
        App->>API: 대기 등록 (수업 ID, 회원 ID)
        API->>Wait: 대기열 추가 → 순번 N
        Wait-->>App: 대기 순번
        App-->>Member: MA-124 대기 예약 관리 진입 + 순번 표시
    end

    Note over Wait,Member: 자리 발생 시 (다른 회원 취소)
    Wait->>API: 대기열 1순위 자동 확정
    API->>App: 푸시 알림 (예약 카테고리)
    App-->>Member: "GX 예약이 자동 확정되었어요"
    Member->>App: 알림 탭 → MA-122 진입
```

## 정원 / 대기 정책

| 항목 | 정책 |
|---|---|
| 정원 점검 | atomic 처리 (동시 예약 시 충돌 방지) |
| 대기 등록 | 정원 만석 + 센터가 대기 허용 시 |
| 자동 확정 | 다른 회원 취소 / 노쇼 시 1순위 자동 확정 |
| 알림 발송 | 자동 확정 시 푸시 (예약 카테고리) |
| 대기 취소 | 회원 임의 취소 가능 |
