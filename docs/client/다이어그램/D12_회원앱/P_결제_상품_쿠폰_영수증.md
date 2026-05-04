# P. 결제 / 상품 / 쿠폰 / 영수증 흐름

> 화면설계서 참조: P1 결제이력 / P2 상품스토어 AI 추천 / P3 쿠폰 사용 / P4 상품 상세 결제 / P5 결제 플로우 / P6 개인 결제 / P7 영수증 조회.

## P1. 결제 이력 조회 (MA-133)

```mermaid
graph TD
    MA133[MA-133 결제 내역] --> Filter[기간/카테고리/상태 필터]
    Filter --> Group[월별 그룹]
    Group --> Card[결제 카드]
    Card --> MA142[MA-142 영수증]
    Card --> MA403[MA-403 주문 상세]
    Card --> MA404[MA-404 환불 신청]
```

## P2. 상품 스토어 AI 추천 산정

```mermaid
flowchart LR
    Member[회원 활동 데이터] --> AI[AI 추천 산정]
    AI --> Plan1[AI 추천 - 활동 기반]
    AI --> Plan2[균형형 - 평균]
    AI --> Plan3[경제형 - 최소+할인]

    Plan1 --> MA134[MA-134 상단 가로 스크롤]
    Plan2 --> MA134
    Plan3 --> MA134

    MA134 --> MA138[MA-138 재등록 추천 시 동일 산정]
```

## P3. 쿠폰 사용 흐름

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant API

    Member->>App: MA-135 쿠폰함 → 쿠폰 선택 → "결제하기"
    App->>API: 결제 화면 진입 (쿠폰 ID 보유)
    App->>App: 쿠폰 자동 선택 + 합계 계산
    Member->>App: 결제 진행
    App->>API: 결제 완료
    API->>API: 쿠폰 used 처리
    API-->>App: 영수증 진입
```

## P4. 상품 상세 → 결제

```mermaid
graph TD
    MA139[MA-139 상품 상세] --> Option[회차/강사 옵션]
    Option --> Cart[MA-401 장바구니 담기]
    Option --> Direct[MA-400 옵션 결제 - PT/그룹]
    Option --> Quick[MA-140 바로 결제 - 단순 이용권]

    Cart --> MA140[MA-140 결제하기]
    Direct --> MA140
    Quick --> MA140
```

## P5. 결제 플로우 (단건/장바구니/재등록)

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant PG as 토스페이먼츠
    participant API

    Member->>App: MA-140 진입
    App->>API: 결제수단 + 쿠폰 + 마일리지 + 등급 할인 조회
    Member->>App: 결제수단 / 쿠폰 / 마일리지 선택
    App->>App: 합계 실시간 계산
    Member->>App: 결제 동의 + 결제하기
    App->>PG: 결제 요청
    PG-->>App: 승인
    App->>API: 결제 완료
    API->>API: 주문 OrderItem 생성 (status=pending)
    API->>API: 마일리지 차감 + 쿠폰 사용

    alt 단건
        App-->>Member: MA-142 영수증 자동 진입
    else 장바구니 다중
        API->>API: 비례 분배 + 항목별 OrderItem
        App-->>Member: MA-402 주문 내역 자동 진입
    end
```

## P5b. 관리자 발송 결제링크 (admin SCR-S016 → MA-140 재사용)

```mermaid
sequenceDiagram
    actor Staff as 직원
    participant AdminWeb as Admin Web (SCR-S016)
    participant Channel as SMS/카카오/이메일
    actor Member
    participant App
    participant API
    participant PG

    Staff->>AdminWeb: 회원/상품/금액/만료시점 입력 → 발송
    AdminWeb->>Channel: 결제링크 발송
    Channel-->>Member: "결제 안내 — 링크 클릭"
    Member->>App: 링크 탭 → MA-140 (결제링크 모드)
    App->>API: link_token 검증

    alt 유효
        App-->>Member: 상품/금액/할인 = 회색 (편집 불가) + 결제수단만 활성
        Member->>App: 결제수단 + 동의 → 결제하기
        App->>PG: 결제 요청
        PG-->>App: 승인
        App->>API: 결제 완료 + SCR-S016 status=completed
        API-->>App: MA-142 영수증 ("결제링크 결제" 출처 배지)
        API-->>App: MA-402/403 자동 편입
    else 만료/이미 결제
        API-->>App: 안내 + 적절한 화면으로 라우팅
    end
```

**편집 가능/불가 매트릭스**

| 항목 | 일반 결제 (MA-140) | 결제링크 모드 (MA-140) |
|---|---|---|
| 상품 / 금액 / 할인 | 자유 | 직원 고정 (편집 불가, 회색) |
| 쿠폰 | 자유 | 불가 |
| 마일리지 | 자유 | 불가 |
| 결제수단 | 자유 | 자유 |
| 결제 동의 | 필수 | 필수 |

## P6. 개인 결제 (락커/사우나/굿즈)

```mermaid
graph LR
    MA141[MA-141 개인 결제] --> Recommend[추천 항목 카드 8~10개]
    MA141 --> Manual[직접 입력 폼]

    Recommend --> R1[락커 1개월/3개월]
    Recommend --> R2[운동복/수건]
    Recommend --> R3[사우나 1회/10회권]
    Recommend --> R4[굿즈]

    Manual --> Name[상품명]
    Manual --> Price[금액]
    Manual --> Memo[메모]

    Recommend --> MA140[MA-140 결제]
    Manual --> MA140
```

## P7. 영수증 조회 / 환불

```mermaid
sequenceDiagram
    actor Member
    participant App
    participant API

    Member->>App: MA-140 결제 완료 또는 MA-133에서 진입
    App->>API: 영수증 조회
    API-->>App: 명세 + 결제수단 + 적립 P
    App-->>Member: MA-142 영수증

    alt 환불 신청
        Member->>App: "환불 신청" → MA-404
        Member->>App: 사유 + 동의
        App->>API: 환불 요청
        API->>API: 회차/기간 비율로 환불액 산정
        API-->>App: 영수증에 "환불 진행 중" 표시
    else PDF 다운로드
        Member->>App: "PDF 다운로드"
        App->>API: PDF 생성
        API-->>App: PDF 파일
        App-->>Member: 단말 저장
    end
```
