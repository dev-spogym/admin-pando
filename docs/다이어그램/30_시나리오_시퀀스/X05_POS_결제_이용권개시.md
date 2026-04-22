---
title: POS 결제 → 영수증 → 이용권 자동 개시
type: sequenceDiagram
scope: 크로스도메인
actors: [프론트직원, 회원, 시스템, PG]
relatedScreens: [SCR-S002, SCR-S003, SCR-M004]
lastUpdated: 2026-04-20
---

# X05 — POS 결제 → 영수증 → 이용권 자동 개시

## 1. 시나리오 개요

프론트 직원이 POS 화면에서 회원 검색 → 상품 선택 → 카드/현금 결제 → PG 승인 → 이용권 자동 개시 → 영수증 발행까지의 매출 처리 플로우.

| 항목 | 내용 |
|------|------|
| 트리거 | 프론트 직원이 POS 화면에서 결제 진행 |
| 종료 조건 | 결제 완료 + 이용권 ACTIVE + 영수증 발송 |
| 참여 도메인 | 매출관리(D3), 회원관리(D2) |

## 2. 전제조건

- 프론트 직원 또는 매니저 계정 로그인 상태
- 상품(이용권)이 시스템에 등록되어 있음
- PG 연동 정상 상태

## 3. 참여 액터

| 액터 | 설명 |
|------|------|
| 프론트 | 프론트 직원 — POS 운영 담당 |
| 회원 | 결제 당사자 |
| CRM API | FitGenie CRM 백엔드 |
| DB | 데이터베이스 |
| PG | 결제 대행사 |
| 알림서비스 | SMS/카카오톡 영수증 발송 |

## 4. 시퀀스 다이어그램

```mermaid

    actor F as 프론트
    actor MB as 회원
    participant API as CRM API
    participant DB as DB
    participant PG as PG사
    participant N as 알림서비스

    F->>API: 1. GET /?q={name|phone} %% API->>DB: 2. WHERE name LIKE ? OR phone=?
    DB-->>API: 3. 회원 목록
    API-->>F: 4. 회원 검색 결과
    Note over F: SCR-S002 POS 화면 — 회원 선택

    F->>API: 5. GET /?status=ACTIVE %% API-->>F: 6. 판매 가능 상품 목록
    F->>F: 7. 상품 선택 + 결제 수단 선택
    F->>API: 8. POST {member_id, product_id, payment_method} %% API-->>F: 9. 결제 금액 미리보기

    F->>API: 10. POST /sales {member_id, product_id, payment_method, amount} %% API->>PG: 11. 결제 승인 요청 (카드 결제 시)

    alt PG 승인 성공
        PG-->>API: 12. 승인 응답 {approval_no, approved_at} %% API->>DB: 13. sales {member_id, product_id, amount, approval_no, status=PAID}
        API->>DB: 14. memberships {member_id, product_id, start_date=TODAY, status=ACTIVE}
        DB-->>API: 15. sale_id, membership_id 반환
        API->>N: 16. 영수증 발송 트리거 {member_id, sale_id} %% N-->>MB: 17. SMS/카카오톡 영수증
        API-->>F: 18. 200 OK {sale_id, membership_id, receipt_url}
        Note over F: 영수증 화면 표시 + 프린터 출력 옵션
    else PG 승인 실패 — 한도초과 (51001)
        PG-->>API: 19. 에러 응답 {error_code: 51001} %% API-->>F: 20. 결제 실패 — 한도 초과 안내
        Note over F: 다른 카드 또는 현금 결제 유도
    else PG 승인 실패 — 카드 오류 (51002)
        PG-->>API: 21. 에러 응답 {error_code: 51002} %% API-->>F: 22. 결제 실패 — 카드 재시도 안내
    else PG 타임아웃 (51004)
        PG-->>API: 23. 타임아웃 %% API->>DB: 24. sales {status=PENDING}
        API-->>F: 25. 타임아웃 — 정산 확인 후 수동 처리 안내
    end

    Note over F: 현금 결제 시 PG 호출 없음 — 13번부터 직접 진행
```

## 5. 주요 메시지 설명

| 번호 | 메시지 | 설명 |
|------|--------|------|
| 8 | POST | 실제 결제 전 금액 확인. 쿠폰/마일리지 적용 금액 미리보기 |
| 13 | sales | 결제 완료 즉시 매출 레코드 생성. status=PAID |
| 14 | memberships | 이용권 자동 개시. start_date=결제일, 만료일 = start_date + 상품 기간 |
| 16 | 영수증 발송 | 카카오 알림톡 우선, 실패 시 SMS fallback |
| 24 | sales PENDING | 타임아웃 시 결제 상태 불확실 — PENDING으로 저장 후 수동 정산 확인 |

## 6. 예외/분기

| 상황 | 처리 방법 |
|------|-----------|
| 현금 결제 | PG 호출 없이 sales 직접 처리 |
| 이미 활성 이용권 보유 | 경고 토스트 후 확인 시 중복 등록 허용 (정책에 따라) |
| 영수증 발송 실패 | 영수증 URL을 화면에 표시하여 수동 전달 가능 |
| PG 타임아웃 | PENDING 상태로 저장, 이중결제 방지를 위해 수동 확인 |

## 7. 관련 화면/모달 링크

| 화면/모달 | 설명 |
|-----------|------|
| SCR-S002 POS 판매 | 메인 POS 화면 |
| SCR-S003 결제 처리 | 결제 진행 및 PG 통신 |
| SCR-M004 회원 상세 > 결제이력 탭 | 결제 완료 후 이력 확인 |
| SCR-M004 회원 상세 > 이용권 탭 | 개시된 이용권 확인 |
