# N2. trainer / golf_trainer 사이트맵

> 트레이너·골프강사 모드. 직원 로그인 → 트레이너 선택 진입.

```mermaid
graph TD
    Login[MA-001 로그인] --> SelectTrainer[직원 로그인 → 트레이너 선택]
    SelectTrainer --> Home[MA-200 트레이너 홈]

    Home --> Calendar[MA-210 수업 캘린더]
    Home --> ClassList[MA-211 수업 목록]
    Home --> Members[MA-220 담당 회원]
    Home --> KPI[MA-240 강사 근무현황/성과]
    Home --> Notify[MA-251 알림]
    Home --> Settings[MA-252 설정]

    Calendar --> Class[MA-212 수업 시작/완료/서명]
    Class --> NoShow[MA-213 노쇼/페널티]
    Class --> Template[MA-214 수업 템플릿]

    Members --> MemberDetail[MA-221 회원 상세]
    MemberDetail --> Body[MA-222 체성분/신체정보 기록]
    MemberDetail --> Eval[MA-223 회원 평가]
    MemberDetail --> Program[MA-224 운동 프로그램 배정]
    MemberDetail --> ExerciseLog[MA-225 운동 이력 기록]

    Calendar --> PT[MA-230 PT 횟수/완강 현황]

    %% 골프강사 추가 화면
    Class --> GolfSign[MA-312 쌍방서명 - 골프 전용]
    Class --> Confirm[MA-313 레슨 확인서 - 골프 전용]
```

## 트레이너 vs 골프강사 차이

| 화면 | trainer | golf_trainer |
|---|---|---|
| MA-212 수업 완료/서명 | 강사 단독 서명 | 강사 + 회원 쌍방서명 (MA-312) |
| MA-313 레슨 확인서 | - | PDF 확인서 자동 생성 |
| MA-230 PT 횟수 | PT 잔여 | PT + 골프 레슨권 잔여 |
