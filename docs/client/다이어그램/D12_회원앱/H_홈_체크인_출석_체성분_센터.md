# H. 홈 / 체크인 / 출석 / 체성분 / 센터 정보 흐름

> 화면설계서 참조: H1 홈진입 우선카드 / H2 체크인 QR / H3 출석이력 분석 / H4 체성분 FMS / H5 센터정보 허브.

## H1. 홈 진입 + 우선 카드

```mermaid
flowchart TD
    Login[로그인 성공] --> Load[홈 데이터 병렬 조회]
    Load --> P{우선 카드 결정}

    P -->|만료 D-1 / 만료 후| MA138_1[MA-138 danger 배너]
    P -->|만료 D-7| MA138_2[MA-138 warning 배너]
    P -->|만료 D-14| MA138_3[MA-138 info 배너]
    P -->|AT-RISK 4주 미방문| MA138_4[MA-138 + AT-RISK 메시지]
    P -->|온보딩 미완료| MA127[MA-127 온보딩 안내]
    P -->|일반| Default[핵심 바로가기 + 오늘 수업 + 마일리지/배지 + 공지]
```

## H2. QR 체크인

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant Kiosk as 센터 키오스크
    participant API

    alt 회원 → 센터 QR 표시
        Member->>App: MA-110 진입
        App->>API: 회원 QR (60초 갱신)
        Member->>Kiosk: QR 스캔
        Kiosk->>API: 체크인 요청
        API-->>App: 출석 완료 + 카운트 갱신
        App-->>Member: 토스트 + 햅틱
    else 센터 QR 스캔 (회원 카메라)
        Member->>App: 스캔 모드
        App->>App: 카메라 활성
        Member->>Kiosk: 센터 QR 스캔
        App->>API: 체크인 요청
        API-->>App: 출석 완료
    end
```

## H3. 출석 이력 분석

```mermaid
graph LR
    MA111[MA-111 출석 이력] --> Stats[4지표 카드]
    MA111 --> Cal[월간 캘린더 + 카테고리 도트]
    MA111 --> Donut[카테고리 비중 도넛]
    MA111 --> Heat[요일×시간 히트맵]
    MA111 --> Insight[분석 카드 4종]
    MA111 --> List[출석 카드 리스트]

    Stats --> S1[이번 달 출석]
    Stats --> S2[주간 평균]
    Stats --> S3[월간 평균]
    Stats --> S4[연속 출석]

    Donut --> D1[PT]
    Donut --> D2[OT]
    Donut --> D3[GX]
    Donut --> D4[필라테스 - 별도 분리]
    Donut --> D5[Golf]

    Insight --> I1[가장 많이 참여한 클래스]
    Insight --> I2[자주 가는 시간대]
    Insight --> I3[전월 대비 +/-]
    Insight --> I4[개근 진척률]
```

## H4. 체성분 / FMS 흐름

```mermaid
sequenceDiagram
    actor Trainer
    actor Member
    participant TApp as 트레이너앱
    participant App as 회원앱
    participant API

    Trainer->>TApp: 측정 입력 (체중/체지방/근육/BMI)
    TApp->>API: 인바디 저장
    Trainer->>TApp: FMS 7항목 + 메모
    TApp->>API: FMS 저장
    API->>App: 푸시 (수업·후기 카테고리)
    App-->>Member: "측정 결과 도착"
    Member->>App: MA-132 진입
    App-->>Member: 인바디 변화 그래프 + FMS 점수 + 코치 메모
```

## H5. 센터 정보 허브

```mermaid
graph TD
    MA151[MA-151 센터 정보] --> Header[센터 헤더 + 별점]
    MA151 --> Hours[영업시간 + 휴무]
    MA151 --> Map[위치 + 길찾기]
    MA151 --> Contact[연락처 + 1:1 문의]
    MA151 --> Facility[시설 + 부가 서비스]
    MA151 --> Trainers[소속 강사 → MA-125]
    MA151 --> Banner[공지 미니 배너 → MA-152]

    Map --> Kakao[카카오맵]
    Map --> Naver[네이버맵]
    Map --> Google[Google Maps]

    Facility --> Pay[부가 서비스 결제 → MA-141]
```
