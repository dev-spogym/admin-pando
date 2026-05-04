# X03. PT / OT1 / OT2 예약 분기 시나리오

> xlsx 항목: #15 강사 정보 + NPS, #18 트레이너 프로필/전문분야, #19 PT/OT1/OT2 예약, #20 PT 패키지 + AI 추천

회원이 강사 상세 → 가능 시간 확인 → PT/OT1/OT2 분기 예약하는 흐름. PT는 트레이너 승인 대기, OT1·OT2는 등록 직후 즉시 확정.

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant API
    participant Trainer as 트레이너 앱
    participant Push as 푸시 시스템

    Member->>App: MA-120 → 강사 카드 탭
    App->>API: 강사 상세 + NPS + 전문분야 + 후기 조회
    API-->>App: 강사 데이터 + 가능 시간 슬롯
    App-->>Member: MA-125 강사 상세

    Member->>App: "예약 요청" 또는 슬롯 탭
    App-->>Member: MA-121 수업 상세/예약

    Member->>App: 수업 유형 라디오 선택

    alt PT 선택
        Member->>App: 가능 시간 + 메모 → "예약 요청"
        App->>API: 예약 생성 (status=requested)
        API-->>App: 승인 대기 상태
        App->>Push: 트레이너 푸시
        Push-->>Trainer: "회원 예약 요청 도착"
        App-->>Member: MA-122 진입 (승인 대기 표시)

        alt 트레이너 승인
            Trainer->>API: 승인 처리
            API->>Push: 회원 푸시 (예약 카테고리)
            Push-->>Member: "예약 확정" 알림
        else 트레이너 거절
            Trainer->>API: 거절 처리
            API->>Push: 회원 푸시
            Push-->>Member: "예약 거절 - 다른 시간을 선택해주세요"
        end

    else OT1 선택
        App->>API: OT 잔여 회차 조회
        alt OT 잔여 있음
            API-->>App: OT1 즉시 확정
        else OT 잔여 없음
            API-->>App: 무료 1회 자동 부여 → OT1 즉시 확정
        end
        App-->>Member: 토스트 "OT1 예약 완료" + MA-122

    else OT2 선택
        App->>API: OT1 완료 여부 조회
        alt OT1 완료
            App->>API: OT2 예약 생성
            API-->>App: OT2 즉시 확정
            App-->>Member: 토스트 + MA-122
        else OT1 미완료
            App-->>Member: "1차 OT를 먼저 진행해주세요" + OT1 예약 CTA
        end
    end
```

## PT 패키지 / AI 추천 진입

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant API

    Note over Member,App: 회원이 잔여 PT 부족 → 패키지 결제
    Member->>App: MA-131 → PT 잔여 0회 → "재등록 추천" CTA
    App->>API: 회원 활동 데이터 조회 (주 평균 PT 빈도, 카테고리)
    API-->>App: 활동 가중치
    App->>App: AI 추천 / 균형형 / 경제형 3종 산정
    App-->>Member: MA-138 재등록 추천 (3종 카드)
    Member->>App: AI 추천 카드 선택
    App-->>Member: MA-140 결제하기 진입
```

## NPS / 전문분야 / 후기 표기

| 표기 | 색상 분기 |
|---|---|
| NPS 70+ | promoter (초록) |
| NPS 30~69 | passive (회색) |
| NPS 30 미만 | detractor (빨강) |
| 별점 평균 | 5점 만점 + 후기 수 |
| 전문분야 칩 | 다이어트 / 체형교정 / 통증관리 / 근비대 / 재활 / 자세교정 / 골프 스윙 / 골프 퍼팅 / 필라테스 / 요가 |
