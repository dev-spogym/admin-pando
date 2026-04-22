---
title: 신규 리드 → 상담 → 가입 → PT 결제
type: sequenceDiagram
scope: 크로스도메인
actors: [리드, FC, 매니저, 시스템, PG]
relatedScreens: [SCR-070, SCR-M002, SCR-S002, SCR-S003, SCR-C001]
lastUpdated: 2026-04-20
---

# X01 — 신규 리드 → 상담 → 가입 → PT 결제

## 1. 시나리오 개요

신규 회원이 인스타그램 광고를 통해 상담 신청 → FC가 리드로 등록하고 상담 진행 → 계약 결정 후 회원 등록 → POS에서 PT 이용권 결제까지의 전체 입회 플로우.

| 항목 | 내용 |
|------|------|
| 트리거 | 외부 채널(SNS/광고/전화)을 통한 상담 신청 |
| 종료 조건 | PT 이용권 결제 완료 + 이용권 자동 개시 |
| 참여 도메인 | 마케팅(D8), 회원관리(D2), 매출관리(D3), 수업관리(D4) |
| 예상 소요 시간 | 15~30분 (현장 상담 기준) |

## 2. 전제조건

- FC(피트니스 컨설턴트) 계정이 `fc` 역할로 로그인 상태
- 매니저 계정이 결제 처리 권한 보유
- PG 연동 정상 상태
- 센터에 PT 이용권 상품이 등록되어 있음

## 3. 참여 액터

| 액터 | 설명 |
|------|------|
| 리드(Lead) | 가입 전 잠재 고객 |
| FC | 피트니스 컨설턴트 — 상담 및 리드 관리 담당 |
| 매니저 | 회원 등록 및 결제 처리 권한 보유 |
| CRM API | FitGenie CRM 백엔드 |
| DB | 데이터베이스 |
| PG | 결제 대행사 |
| 알림서비스 | SMS/카카오톡 발송 서비스 |

## 4. 시퀀스 다이어그램

```mermaid

    actor L as 리드
    actor FC as FC
    actor M as 매니저
    participant API as CRM API
    participant DB as DB
    participant PG as PG사
    participant N as 알림서비스

    Note over L,FC: [상담 신청 단계]
    L->>FC: 1. 상담 신청 (전화/SNS/방문) %% FC->>API: 2. POST / {name, phone, channel, memo} %% API->>DB: 3. (status=INQUIRY)
    DB-->>API: 4. lead_id 반환
    API-->>FC: 5. 201 Created {lead_id}
    Note over FC: SCR-070 리드 관리 화면에 노출

    Note over L,FC: [상담 진행 단계]
    FC->>L: 6. 상담 진행 (시설 안내 / 프로그램 소개)
    FC->>API: 7. PATCH {status=CONSULTING, memo} %% API->>DB: 8. SET status=CONSULTING
    DB-->>API: 9. OK
    API-->>FC: 10. 200 OK

    alt 상담 성공 — 가입 결정
        FC->>M: 11. 가입 처리 요청 %% M->>API: 12. POST / {name, phone, gender, birth} %% API->>DB: 13. (status=ACTIVE)
        DB-->>API: 14. member_id 반환
        API->>DB: 15. SET status=CONVERTED, member_id=?
        API-->>M: 16. 201 Created {member_id}
        Note over M: SCR-M002 회원 등록 완료

        Note over M,PG: [PT 결제 단계]
        M->>API: 17. GET /?type=PT %% API-->>M: 18. PT 상품 목록
        M->>API: 19. POST /sales {member_id, product_id, payment_method} %% API->>PG: 20. 결제 승인 요청

        alt PG 승인 성공
            PG-->>API: 21. 승인 응답 {approval_no} %% API->>DB: 22. sales, memberships (status=ACTIVE)
            DB-->>API: 23. OK
            API->>N: 24. 영수증 + 환영 메시지 발송 트리거
            N-->>L: 25. SMS/카카오톡 영수증 발송
            API-->>M: 26. 200 OK {sale_id, membership_id}
            Note over M: SCR-S002 영수증 화면 표시
        else PG 승인 실패 (한도초과/카드오류)
            PG-->>API: 27. 에러코드 반환 %% API-->>M: 28. 결제 실패 응답 {error_code}
            Note over M: 결제 수단 변경 후 재시도
        end

    else 상담 미결 — 추후 연락
        FC->>API: 29. PATCH {status=PENDING, follow_up_date} %% API->>DB: 30. SET status=PENDING
        API->>N: 31. 팔로업 예약 알림 등록
        API-->>FC: 32. 200 OK
        Note over FC: 팔로업 날짜에 자동 리마인더 발송 예정
    end
```

## 5. 주요 메시지 설명

| 번호 | 메시지 | 설명 |
|------|--------|------|
| 2 | POST / | 리드 신규 등록. channel 필드에 유입 경로(SNS/전화/방문) 기록 |
| 7 | PATCH | 상담 상태 업데이트. memo에 상담 내용 저장 |
| 12 | POST / | 회원 공식 등록. 를 CONVERTED로 자동 전환 |
| 19 | POST /sales | POS 판매 요청. product_id, payment_method(카드/현금/계좌이체) 포함 |
| 20 | 결제 승인 요청 | PG사로 실제 결제 요청 전송 |
| 22 | memberships | 결제 완료 즉시 이용권 레코드 생성, status=ACTIVE 로 개시 |
| 24 | 영수증 발송 | 알림서비스를 통해 결제 영수증 + 환영 메시지 발송 |

## 6. 예외/분기

| 상황 | 처리 방법 |
|------|-----------|
| 동일 전화번호 회원 중복 | POST / 시 409 반환 → DLG-M006 중복 확인 모달 표시 |
| PG 승인 실패 | 에러코드별 안내(한도초과/카드오류/네트워크) → 수단 변경 재시도 |
| PG 타임아웃 | 정산 확인 큐에 등록 → 수동 확인 안내 |
| FC 권한으로 결제 불가 | POST /sales 401 반환 → 매니저에게 처리 위임 |
| 상담 중 세션 만료 | 401 응답 → 재로그인 후 리드 정보 유지된 상태로 복귀 |

## 7. 관련 화면/모달 링크

| 화면/모달 | 설명 |
|-----------|------|
| SCR-070 리드 관리 | 리드 등록 및 상태 관리 |
| SCR-M002 회원 등록 | 신규 회원 등록 폼 |
| DLG-M006 중복 확인 | 전화번호 중복 시 기존 회원 연결 또는 신규 진행 선택 |
| SCR-S002 POS 판매 | 이용권 상품 선택 및 결제 |
| SCR-S003 결제 처리 | PG 결제 진행 화면 |
| SCR-M004 회원 상세 | 등록 완료 후 이동 화면 |
