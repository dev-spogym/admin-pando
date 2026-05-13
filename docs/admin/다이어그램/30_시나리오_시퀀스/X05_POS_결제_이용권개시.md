---
title: POS 선결제 등록 → 혼합결제 저장 → 이용권 개시
type: sequenceDiagram
scope: 크로스도메인
actors: [프론트직원, 회원, 시스템, 외부POS]
relatedScreens: [SCR-S002, SCR-S003, SCR-M004]
lastUpdated: 2026-05-13
---

# X05 — POS 결제 → 영수증 → 이용권 자동 개시

## 1. 시나리오 개요

프론트 직원이 POS 화면에서 회원 검색 → 상품 선택 → 외부 POS/현금/계좌이체 선결제 → CRM 혼합결제 등록 → 이용권 개시까지의 매출 처리 플로우. 계약금 수납 시에도 운영자가 이용권 즉시 개시 여부를 선택할 수 있다.

| 항목 | 내용 |
|------|------|
| 트리거 | 프론트 직원이 POS 화면에서 결제 진행 |
| 종료 조건 | 전액 결제 시 `APPROVED + 이용권 ACTIVE`, 계약금 수납 시 `INSTALLMENT + 잔액 생성`, 필요 시 이용권 즉시 개시 |
| 참여 도메인 | 매출관리(D3), 회원관리(D2) |

## 2. 전제조건

- 프론트 직원 또는 매니저 계정 로그인 상태
- 상품(이용권)이 시스템에 등록되어 있음
- 외부 POS 또는 현장 수납 절차가 정상 동작
- 계약금 정책이 설정되어 있고 잔액 수납 방식이 정의되어 있음

## 3. 참여 액터

| 액터 | 설명 |
|------|------|
| 프론트 | 프론트 직원 — POS 운영 담당 |
| 회원 | 결제 당사자 |
| CRM API | FitGenie CRM 백엔드 |
| DB | 데이터베이스 |
| POS/VAN | 외부 결제 단말 또는 승인 결과 조회 시스템 |
| 알림서비스 | SMS/카카오톡 영수증 발송 |

## 4. 시퀀스 다이어그램

```mermaid
    actor F as 프론트
    actor MB as 회원
    participant API as CRM API
    participant DB as DB
    participant POS as 외부POS/VAN
    participant N as 알림서비스

    F->>API: 1. GET /members?q={name|phone}
    API->>DB: 2. 회원 검색
    DB-->>API: 3. 회원 목록
    API-->>F: 4. 회원 검색 결과
    Note over F: SCR-S002 POS 화면 - 회원 선택

    F->>API: 5. GET /products?status=ACTIVE
    API-->>F: 6. 판매 가능 상품 목록
    F->>F: 7. 상품 선택 + 할인 + 수납 방식 선택
    F->>API: 8. POST /sales/preview {member_id, product_id, collection_mode, branch_attribution_defaults}
    API-->>F: 9. 결제 금액 / 잔액 미리보기

    alt 전액 수납
        F->>POS: 10. 카드/현금/계좌이체 선결제 수행
        POS-->>F: 11. 승인결과/영수증/이체증빙
        F->>API: 12. POST /sales {member_id, product_id, collection_mode=FULL, tender_lines[], point_amount, paymentBranchId, usageBranchId, salesAttributionBranchId, settlementBranchId, incentiveOwnerId}
        API->>DB: 13. payment {amount, payment_channel=POS, collection_mode=FULL, status=APPROVED}
        API->>DB: 14. payment_tender_lines {card/cash/transfer, approval_no, terminal_id, transfer_ref, amount}
        API->>DB: 15. memberships {member_id, product_id, start_date=TODAY, status=ACTIVE, usage_branch_id, settlement_branch_id}
        DB-->>API: 16. payment_id, membership_id
        API->>N: 17. 영수증 발송 트리거 {member_id, payment_id}
        N-->>MB: 18. SMS/카카오톡 영수증
        API-->>F: 19. 200 OK {payment_id, membership_id, receipt_url}
        Note over F: 혼합결제 저장 + 지점 귀속 필드 저장 + 이용권 자동 개시

    else 계약금 수납
        F->>POS: 20. 계약금 선결제 수행
        POS-->>F: 21. 승인결과/영수증 반환
        F->>API: 22. POST /sales {member_id, product_id, collection_mode=DEPOSIT, tender_lines[], paid_amount, remaining_amount, membership_start_mode, paymentBranchId, usageBranchId, salesAttributionBranchId, settlementBranchId, incentiveOwnerId}
        API->>DB: 23. payment {paid_amount, remaining_amount, payment_channel=POS, collection_mode=DEPOSIT, membership_start_mode, status=INSTALLMENT}
        API->>DB: 24. payment_tender_lines {card/cash/transfer, amount}
        API->>DB: 25. unpaid {origin_payment_id, amount=remaining_amount, source_type=deposit_balance}
        opt 이용권 즉시 개시 선택
            API->>DB: 26. memberships {member_id, product_id, start_date=정책 기준일, status=ACTIVE|SCHEDULED}
        end
        API-->>F: 27. 200 OK {payment_id, remaining_amount}
        Note over F: 계약금은 영수증 발행 가능. 이용권 개시는 즉시 개시/완납 후 개시 중 선택
    end
```

## 5. 주요 메시지 설명

| 번호 | 메시지 | 설명 |
|------|--------|------|
| 8 | POST /sales/preview | 실제 결제 전 금액, 할인, 귀속 기본값, 계약금/잔액 미리보기 |
| 14 | payment_tender_lines | 카드/현금/계좌이체 혼합결제 행 저장 |
| 15 | memberships ACTIVE | 전액 수납 성공 시 이용권 자동 개시 |
| 23 | payment INSTALLMENT | 계약금 수납은 `INSTALLMENT + remaining_amount + membership_start_mode`로 기록 |
| 25 | unpaid | 계약금 잔액은 미수금으로 연결 |
| 26 | memberships | `즉시 개시` 선택 시 계약금 상태에서도 이용권 생성 가능 |

## 6. 예외/분기

| 상황 | 처리 방법 |
|------|-----------|
| 현금/계좌이체 결제 | 외부 POS 승인 호출 없이 수납 증빙과 함께 payment_tender_lines 저장 |
| 이미 활성 이용권 보유 | 경고 토스트 후 확인 시 중복 등록 허용 (정책에 따라) |
| 영수증 발송 실패 | 영수증 URL을 화면에 표시하여 수동 전달 가능 |
| VAN/POS 승인정보 누락 | 저장은 허용하되 추후 보완 경고 표시 |
| 계약금 수납 | 잔액 수납 계획 생성, 이용권 개시는 즉시 개시/완납 후 개시 중 선택 |

## 7. 관련 화면/모달 링크

| 화면/모달 | 설명 |
|-----------|------|
| SCR-S002 POS 판매 | 메인 POS 화면 |
| SCR-S003 결제 처리 | 결제 진행 및 외부 POS 결과 등록 |
| SCR-M004 회원 상세 > 결제이력 탭 | 결제 완료 후 이력 확인 |
| SCR-M004 회원 상세 > 이용권 탭 | 개시된 이용권 확인 |
