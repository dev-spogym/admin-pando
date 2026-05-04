# N4. staff (스태프) 사이트맵

> 스태프 모드. 직원 로그인 → 스태프 선택 진입. 회원 조회 / 수동 출석 위주.

```mermaid
graph TD
    Login[MA-001 로그인] --> SelectStaff[직원 로그인 → 스태프 선택]
    SelectStaff --> Home[MA-500 스태프 홈]

    Home --> Search[MA-510 회원 조회]
    Home --> Manual[MA-520 수동 출석 처리]
    Home --> Schedule[MA-530 수업 일정 조회]
    Home --> Notify[MA-551 알림]
    Home --> Settings[MA-552 설정]

    Search --> Detail[MA-511 회원 상세 - 읽기 전용]
```

## 스태프 권한 제약

| 화면 | 동작 | 권한 |
|---|---|---|
| MA-510 / MA-511 회원 조회 | 조회만 | 읽기 전용 (수정 / 삭제 불가) |
| MA-520 수동 출석 | 회원 검색 → 수동 출석 처리 | 읽기 + 출석 기록 추가 |
| MA-530 수업 일정 | 전체 수업 조회 | 읽기 전용 |

## 스태프 이용 시나리오

```mermaid
sequenceDiagram
    participant Staff as 스태프
    participant App as 스태프 앱
    participant Member as 회원

    Note over Staff,Member: QR 오류 시 수동 출석
    Member->>Staff: QR이 안 돼요
    Staff->>App: MA-510 → 회원 검색 (이름/번호)
    App-->>Staff: 회원 정보 + 이용권 상태
    Staff->>App: MA-520 → 수동 출석 처리
    App-->>Member: 출석 완료
```
