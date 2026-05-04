# N / O. 공지 / 온보딩 흐름

> 화면설계서 참조: N1 공지 분류 노출 / O1 온보딩 완료 플로우.

## N1. 공지 분류 노출

```mermaid
graph TD
    MA152[MA-152 공지사항] --> Tab[카테고리 탭]
    Tab --> T1[전체]
    Tab --> T2[운영 안내]
    Tab --> T3[이벤트/프로모션]
    Tab --> T4[시스템 안내]

    T2 --> List[공지 카드 리스트]
    T3 --> List
    T4 --> List

    List --> Card[공지 카드 - 미읽음 점/중요 마크]
    Card --> Detail[공지 상세 모달]
    Detail --> Body[본문 + 첨부 + 작성일]
    Detail --> Link[관련 링크 → 해당 화면]
    Detail --> Share[ShareSheet]

    MA100[MA-100 홈 배너] --> MA152
    MA150[MA-150 알림센터 - 공지 카테고리] --> MA152
```

## O1. 온보딩 완료 플로우

```mermaid
flowchart TD
    MA127[MA-127 온보딩 설문] --> P1[페이지 1: 목적/성향]
    P1 --> P2[페이지 2: 통증/부상]
    P2 --> P3[페이지 3: 체형/집중]
    P3 --> Submit[입력 완료]
    Submit --> MA128[MA-128 온보딩 완료]

    MA128 --> Summary[입력 요약 카드 4영역]
    MA128 --> Rate[입력 완료율 + 정확도 안내]
    MA128 --> Routine[첫 루틴 3종]

    Routine --> R1[목적 맞춤형]
    Routine --> R2[통증 회복형]
    Routine --> R3[균형 강화형]

    Routine --> Action{회원 선택}
    Action -->|루틴 시작| Run[루틴 화면]
    Action -->|트레이너 공유| Share[트레이너에게 정보 공유]
    Action -->|OT1 예약| MA121[MA-121 OT1 라디오]
    Action -->|홈 이동| MA100[MA-100]
    Action -->|마켓| MA300[MA-300]

    MA127 -->|나중에 입력| Skip[미완료 → MA-128 + 홈 배너]
```

## 첫 루틴 정확도

```mermaid
graph LR
    Input[입력 완료율] --> Rate{정확도}
    Rate -->|100%| High[당신에게 딱 맞는 루틴]
    Rate -->|80% 내외| Mid[추가 입력 시 더 정확해져요]
    Rate -->|50% 미만| Low[일반 추천 - 추가 입력 권장]
```

## 운동 온보딩 vs 환영 온보딩

| 구분 | MA-127/128 운동 온보딩 | MA-900 환영 슬라이드 |
|---|---|---|
| 목적 | 운동 정보 입력 | 앱 핵심 가치 안내 |
| 진입 | MA-002 연동 직후 자동 | 운동 온보딩 완료 후 |
| 슬라이드 | 3페이지 입력 | 4 슬라이드 안내 |
| 노출 | 1회 + 미완료 시 재안내 | 1회 + 설정에서 다시 보기 |
