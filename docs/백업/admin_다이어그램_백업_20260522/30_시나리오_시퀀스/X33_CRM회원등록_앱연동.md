---
diagramId: X33
title: CRM 회원 등록 → 앱 연동 → 역할 분기
type: sequenceDiagram
scope: 크로스도메인
actors: [회원, FC/스태프, 시스템, 회원앱]
relatedScreens: [SCR-011, SCR-013, MA-002, MA-100, MA-200, MA-400, MA-500]
tcMappings: [TC-X33-01, TC-X33-02, TC-X33-03]
lastUpdated: 2026-04-22
---

# X33 — CRM 회원 등록 → 앱 연동 → 역할 분기

## 1. 시나리오 개요

CRM에서 회원 또는 현장 역할 사용자를 먼저 등록한 뒤, 모바일 앱에서 SMS 인증으로 계정을 연동하고 role 값에 따라 첫 화면이 분기되는 흐름.

| 항목 | 내용 |
|------|------|
| 트리거 | 센터에서 CRM 회원 등록 또는 역할 계정 지정 완료 |
| 종료 조건 | 앱 연동 성공 + role 기반 첫 화면 진입 |
| 참여 도메인 | 회원관리, 수업관리, 마케팅, 회원앱 |
| 목적 | `온라인 회원가입`과 `센터 등록 후 앱 연동` 사이의 정책 충돌 해소 |

## 2. 전제조건

- CRM에 회원 또는 역할 계정이 이미 등록되어 있다.
- 연락처가 검증 가능한 값으로 저장되어 있다.
- 앱 사용 역할이 CRM에서 하나로 지정되어 있다.

## 3. 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor U as 회원/직원
    actor S as FC/스태프
    participant CRM as CRM API
    participant DB as DB
    participant AUTH as SMS/Auth
    participant APP as 회원앱

    Note over S,CRM: [사전 등록 단계]
    S->>CRM: 1. CRM에서 회원 등록 또는 역할 지정 %% E_X33_REGISTER_01
    CRM->>DB: 2. members / staff / role 정보 저장
    CRM->>DB: 3. 앱 연동 가능 상태 기록 (연락처, branch, role)
    DB-->>CRM: 4. OK

    Note over U,APP: [앱 연동 단계]
    U->>APP: 5. 앱 설치 후 MA-002 진입
    U->>APP: 6. 이름 + 연락처 입력
    APP->>AUTH: 7. SMS 인증번호 요청 %% E_X33_SMS_01
    AUTH-->>U: 8. 인증번호 발송
    U->>APP: 9. 인증번호 입력
    APP->>CRM: 10. 연동 가능 사용자 조회 %% E_X33_LINK_LOOKUP_01
    CRM->>DB: 11. 연락처 + branch + role 조회

    alt CRM 등록 및 역할 확인 성공
        DB-->>CRM: 12. member/staff + role 반환
        CRM->>DB: 13. 앱 연동 완료 처리
        CRM-->>APP: 14. session + role 반환

        alt role = member
            APP-->>U: 15. MA-100 홈 진입
        else role = trainer or golf_trainer
            APP-->>U: 16. MA-200 강사 홈 진입
        else role = fc
            APP-->>U: 17. MA-400 FC 홈 진입
        else role = staff
            APP-->>U: 18. MA-500 스태프 홈 진입
        end

    else CRM 미등록 또는 역할 누락
        DB-->>CRM: 19. not found / invalid role
        CRM-->>APP: 20. 연동 불가 응답
        APP-->>U: 21. 센터 확인 안내 + 재시도
    end

    opt 후속 확장: 비대면 가입 신청
        U->>APP: 22. 공개 가입 신청서 작성
        APP->>CRM: 23. lead 등록
        Note over CRM,DB: 회원 전환 완료 후에만 앱 연동 가능
    end
```

## 4. 정책 정리

| 항목 | 현재 기준 | 후속 기준 |
|------|----------|-----------|
| 앱 계정 생성 | CRM 등록 사용자만 연동 | 공개 신청은 리드 생성 후 전환 |
| role 결정 | CRM 원천값 사용 | 앱 내 임의 역할 변경 없음 |
| 첫 화면 분기 | `member/trainer/golf_trainer/fc/staff` | 역할 추가 시 동일 패턴 확장 |

## 5. 예외/분기

| 상황 | 처리 |
|------|------|
| 동일 연락처 중복 | CRM에서 기존 회원 확인 후 연동 대상 1건만 허용 |
| 소속 지점 불일치 | 앱 연동 차단 후 센터 확인 안내 |
| role 누락 | 연동 실패 처리, 운영자 보정 필요 |
