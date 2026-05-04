---
title: POS 결제 → 영수증 → 이용권 자동 개시
type: sequenceDiagram
scope: 크로스도메인
actors: [프론트직원, 회원, 시스템, PG]
relatedScreens: [SCR-S002, SCR-S003, SCR-M004]
lastUpdated: 2026-05-04
---

# X05 — POS 결제 → 영수증 → 이용권 자동 개시

## 1. 시나리오 개요

프론트 직원이 POS 화면에서 회원 검색 → 상품 선택 → 전액 결제 또는 계약금 수납 → 승인 처리 → 영수증 발행까지의 매출 처리 플로우. 계약금 수납 시에도 운영자가 이용권 즉시 개시 여부를 선택할 수 있다.

| 항목 | 내용 |
|------|------|
| 트리거 | 프론트 직원이 POS 화면에서 결제 진행 |
| 종료 조건 | 전액 결제 시 `APPROVED + 이용권 ACTIVE`, 계약금 수납 시 `INSTALLMENT + 잔액 생성`, 필요 시 이용권 즉시 개시 |
| 참여 도메인 | 매출관리(D3), 회원관리(D2) |

## 2. 전제조건

- 프론트 직원 또는 매니저 계정 로그인 상태
- 상품(이용권)이 시스템에 등록되어 있음
- PG 연동 정상 상태
- 계약금 정책이 설정되어 있고 잔액 수납 방식이 정의되어 있음

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

    F->>API: 1. GET /members?q={name|phone}
    API->>DB: 2. 회원 검색
    DB-->>API: 3. 회원 목록
    API-->>F: 4. 회원 검색 결과
    Note over F: SCR-S002 POS 화면 - 회원 선택

    F->>API: 5. GET /products?status=ACTIVE
    API-->>F: 6. 판매 가능 상품 목록
    F->>F: 7. 상품 선택 + 할인 + 수납 방식 선택
    F->>API: 8. POST /sales/preview {member_id, product_id, collection_mode, payment_method}
    API-->>F: 9. 결제 금액 / 잔액 미리보기

    alt 전액 수납
        F->>API: 10. POST /sales {member_id, product_id, collection_mode=FULL, payment_method, amount}
        opt 카드 결제
            API->>PG: 11. 결제 승인 요청
        end

        alt 승인 성공
            PG-->>API: 12. 승인 응답 {approval_no, approved_at}
            API->>DB: 13. payment {amount, payment_channel=POS, collection_mode=FULL, status=APPROVED}
            API->>DB: 14. memberships {member_id, product_id, start_date=TODAY, status=ACTIVE}
            DB-->>API: 15. payment_id, membership_id
            API->>N: 16. 영수증 발송 트리거 {member_id, payment_id}
            N-->>MB: 17. SMS/카카오톡 영수증
            API-->>F: 18. 200 OK {payment_id, membership_id, receipt_url}
            Note over F: 영수증 화면 표시 + 프린터 출력 옵션
        else 승인 실패
            PG-->>API: 19. 에러 응답
            API-->>F: 20. 결제 실패 안내
            Note over F: 다른 카드 또는 현금 결제 유도
        else PG 타임아웃
            PG-->>API: 21. 타임아웃
            API->>DB: 22. payment {status=PENDING, payment_channel=POS}
            API-->>F: 23. 정산 확인 후 수동 처리 안내
        end

    else 계약금 수납
        F->>API: 24. POST /sales {member_id, product_id, collection_mode=DEPOSIT, payment_method, paid_amount, remaining_amount}
        opt 카드 결제
            API->>PG: 25. 계약금 승인 요청
            PG-->>API: 26. 승인 응답 {approval_no, approved_at}
        end
        API->>DB: 27. payment {paid_amount, remaining_amount, payment_channel=POS, collection_mode=DEPOSIT, membership_start_mode, status=INSTALLMENT}
        API->>DB: 28. unpaid {origin_payment_id, amount=remaining_amount, source_type=deposit_balance}
        opt 이용권 즉시 개시 선택
            API->>DB: 29. memberships {member_id, product_id, start_date=정책 기준일, status=ACTIVE|SCHEDULED}
        end
        API-->>F: 30. 200 OK {payment_id, remaining_amount}
        Note over F: 계약금은 영수증 발행 가능. 이용권 개시는 즉시 개시/완납 후 개시 중 선택
    end

    Note over F: 현금 결제는 PG 호출 없이 DB 저장 단계부터 직접 진행
```

## 5. 주요 메시지 설명

| 번호 | 메시지 | 설명 |
|------|--------|------|
| 8 | POST /sales/preview | 실제 결제 전 금액, 할인, 계약금/잔액 미리보기 |
| 13 | payment APPROVED | 전액 수납 성공 시 결제 상태는 `APPROVED` |
| 14 | memberships ACTIVE | 전액 수납 성공 시 이용권 자동 개시 |
| 27 | payment INSTALLMENT | 계약금 수납은 `INSTALLMENT + remaining_amount + membership_start_mode`로 기록 |
| 28 | unpaid | 계약금 잔액은 미수금으로 연결 |
| 29 | memberships | `즉시 개시` 선택 시 계약금 상태에서도 이용권 생성 가능 |

## 6. 예외/분기

| 상황 | 처리 방법 |
|------|-----------|
| 현금 결제 | PG 호출 없이 payment 직접 처리 |
| 이미 활성 이용권 보유 | 경고 토스트 후 확인 시 중복 등록 허용 (정책에 따라) |
| 영수증 발송 실패 | 영수증 URL을 화면에 표시하여 수동 전달 가능 |
| PG 타임아웃 | `PENDING` 상태로 저장, 이중결제 방지를 위해 수동 확인 |
| 계약금 수납 | 잔액 수납 계획 생성, 이용권 개시는 즉시 개시/완납 후 개시 중 선택 |

## 7. 관련 화면/모달 링크

| 화면/모달 | 설명 |
|-----------|------|
| SCR-S002 POS 판매 | 메인 POS 화면 |
| SCR-S003 결제 처리 | 결제 진행 및 PG 통신 |
| SCR-M004 회원 상세 > 결제이력 탭 | 결제 완료 후 이력 확인 |
| SCR-M004 회원 상세 > 이용권 탭 | 개시된 이용권 확인 |
