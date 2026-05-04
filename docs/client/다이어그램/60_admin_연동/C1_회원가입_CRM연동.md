# C1. 회원가입 → CRM 연동

> 회원앱은 공개형 자체 회원 생성을 지원하지 않는다. CRM에 사전 등록된 회원만 SMS 인증 + 비밀번호 설정 + 지점 선택을 통해 앱 연동을 완료할 수 있다.

## 주요 화면

| 시스템 | 화면 |
|---|---|
| client | MA-001 로그인 / MA-002 앱 가입·연동 / MA-127 운동 온보딩 |
| admin | SCR-070 리드 관리 / SCR-M002 회원 등록 / SCR-M004 회원 상세 / SCR-061 직원 등록 |

## 연동 시퀀스

```mermaid
sequenceDiagram
    actor FC as FC / 스태프
    participant AdminWeb as Admin Web
    participant CRM as CRM DB
    actor Member as 회원
    participant App as 회원앱
    participant API
    participant SMS

    Note over FC,CRM: 1. CRM 사전 등록 (admin)
    FC->>AdminWeb: SCR-070 리드 → 상담 → 등록 결정
    FC->>AdminWeb: SCR-M002 회원 등록 (이름/연락처/지점/이용권)
    AdminWeb->>CRM: 회원 INSERT + 가입 지점 매핑
    CRM-->>AdminWeb: 회원 ID + 회원번호 발급

    Note over Member,API: 2. 회원이 앱 설치 + 연동 (client)
    Member->>App: MA-001 → "앱 연동하기" → MA-002
    Member->>App: 1단계 - 연락처 입력
    App->>API: CRM 회원 일치 확인
    API->>CRM: 연락처/이메일로 회원 조회

    alt CRM 일치
        CRM-->>API: 회원 데이터 + 가입 지점 목록
        API->>SMS: 인증번호 발송 (3분 유효)
        SMS-->>Member: 6자리 OTP
        Member->>App: 2단계 인증번호 입력
        App->>API: 인증
        Member->>App: 3단계 비밀번호 설정
        Member->>App: 4단계 지점 선택 (단일 자동 / 다중 선택)
        Member->>App: 5단계 약관 동의
        App->>API: 회원 계정 활성화 + app_linked_at 저장
        API->>CRM: 회원 상태 active + 앱 연동 플래그
        CRM-->>AdminWeb: 회원 상세(SCR-M004)에 "앱 연동 완료" 배지 노출
    else CRM 미등록
        CRM-->>API: 미일치
        API-->>App: 등록되지 않은 회원
        App-->>Member: "센터 문의(MA-153)" 진입 유도
    end

    Note over Member,App: 3. 운동 온보딩 자동 진입 (1회)
    App->>App: hasCompletedOnboarding=false 확인
    App-->>Member: MA-127 운동 온보딩 자동 진입
    Member->>App: 3페이지 입력 (목적/통증/체형)
    App->>API: 온보딩 데이터 저장
    API->>CRM: 회원 메모 + 운동 프로그램 권장 자동 생성
    CRM-->>AdminWeb: SCR-M004 + SCR-C010 운동 프로그램 권장 표시
```

## 데이터 동기화

| 데이터 | 소유 | client 표시 | admin 표시 |
|---|---|---|---|
| 회원 기본 정보 (이름/연락처/이메일/성별/생년월일) | CRM (admin 소유) | MA-130 마이페이지 | SCR-M004 회원 상세 |
| 가입 지점 | CRM | MA-130 (변경 신청 진입) | SCR-M005 회원 이관 |
| 회원 등급 (BRONZE~VVIP) | 자동 산정 (누적 결제) | MA-500 / MA-130 배지 | SCR-M009 등급 관리 |
| 앱 연동 상태 (app_linked_at) | client → admin 동기화 | (내부) | SCR-M004 배지 |
| 운동 온보딩 입력값 | client → admin 동기화 | MA-127/128 | SCR-M004 메모 + SCR-C010 |

## R&R 분리

| 영역 | client | admin |
|---|---|---|
| 회원 생성 | ❌ (불가) | ✅ SCR-M002 |
| 앱 연동 (SMS 인증) | ✅ MA-002 | ❌ |
| 비밀번호 재설정 | ✅ MA-001 → MA-002 | ✅ SCR-061 직원 비밀번호 |
| 회원 정보 수정 | ✅ MA-130 (제한적) | ✅ SCR-M003 (전체) |
| 가입 지점 변경 | ❌ (신청만) | ✅ SCR-M005 회원 이관 |

## 예외 시나리오

| 상황 | 처리 |
|---|---|
| CRM 미등록 연락처 입력 | "등록되지 않은 회원" + MA-153 안내 |
| SMS 인증 5회 실패 | 10분 잠금 |
| 가입 지점 0개 | "센터 등록 먼저" 안내 |
| 회원이 admin에서 status=hold | 앱 로그인 차단 + "센터 문의" 안내 |
