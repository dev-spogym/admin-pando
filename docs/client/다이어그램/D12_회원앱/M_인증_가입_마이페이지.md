# M. 인증 / 가입 / 마이페이지 흐름

> 화면설계서 참조: M1 로그인 분기 / M2 앱가입 5단계 / M3 마이페이지 허브.

## M1. 로그인 → 역할 분기

```mermaid
flowchart TD
    Start[앱 실행] --> Token{토큰 유효?}
    Token -->|Yes| AutoHome[역할별 자동 홈]
    Token -->|No| Login[MA-001 로그인]

    Login --> Tab{탭 선택}
    Tab -->|회원 탭| MemberInput[전화번호 + 비밀번호]
    Tab -->|직원 탭| StaffSel[직원 유형 선택]

    StaffSel --> Trainer[트레이너]
    StaffSel --> FC[FC]
    StaffSel --> Staff[스태프]
    Trainer --> StaffInput[아이디 + 비밀번호]
    FC --> StaffInput
    Staff --> StaffInput

    MemberInput --> AuthM[인증]
    StaffInput --> AuthS[인증 + 역할 일치 검증]

    AuthM -->|성공| MA100[MA-100 회원 홈]
    AuthS -->|성공 trainer/golf| MA200[MA-200 트레이너 홈]
    AuthS -->|성공 fc| MA400[MA-400 FC 홈]
    AuthS -->|성공 staff| MA500[MA-500 스태프 홈]

    AuthM -->|실패| Error[인라인 에러]
    AuthS -->|역할 불일치| Error
```

## M2. 앱 가입 5단계

```mermaid
flowchart LR
    S1[1단계 연락처] --> S2[2단계 SMS 인증]
    S2 --> S3[3단계 비밀번호]
    S3 --> S4[4단계 지점 선택]
    S4 --> S5[5단계 약관 동의]
    S5 --> Onboard[MA-127 온보딩]
```

각 단계별 검증:
- 1: CRM 일치 확인 → 미등록 시 MA-153 안내
- 2: 6자리 OTP, 3분 유효, 5회 실패 시 10분 잠금
- 3: 8~16자 + 영문 + 숫자 + 특수문자
- 4: 단일 자동 / 다중 회원 선택
- 5: 필수 약관 모두 동의 시 활성

## M3. 마이페이지 허브

```mermaid
graph TD
    MA130[MA-130 마이페이지] --> Profile[프로필 카드]
    MA130 --> Basic[기본 정보 편집]
    MA130 --> Service[서비스 진입 그리드]
    MA130 --> System[시스템 메뉴]

    Service --> MA131[이용권/잔여]
    Service --> MA133[결제 내역]
    Service --> MA132[체성분/FMS]
    Service --> MA135[쿠폰함]
    Service --> MA136[리워드]
    Service --> MA137[배지]
    Service --> MA500[멤버십 등급]
    Service --> MA502[활동 이력]
    Service --> MA501[친구 초대]

    System --> MA150[알림센터]
    System --> MA155[설정]
    System --> MA153[1:1 문의]
    System --> MA156[약관/정책]
    System --> MA157[동의관리]
    System --> MA158[회원 탈퇴]
    System --> Logout[로그아웃 → MA-001]

    Basic --> EditName[이름 즉시 저장]
    Basic --> EditPhone[연락처 SMS 인증]
    Basic --> EditEmail[이메일 인증]
    Basic --> EditOther[성별/생년월일/사진]
```
