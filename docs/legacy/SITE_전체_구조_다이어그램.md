# SITE 전체 구조 다이어그램

## 1. 전체 사이트맵

```mermaid
flowchart TB
    ROOT["FitGenie CRM"]

    ROOT --> AUTH["인증"]
    ROOT --> HQ["본사 관리"]
    ROOT --> DASH["지점 대시보드"]
    ROOT --> MEMBER["회원"]
    ROOT --> CLASS["수업/캘린더"]
    ROOT --> SALES["매출"]
    ROOT --> PRODUCT["상품"]
    ROOT --> FACILITY["시설"]
    ROOT --> PAYROLL["급여"]
    ROOT --> MSG["메시지/쿠폰"]
    ROOT --> SETTINGS["설정"]
    ROOT --> NOTICE["공지사항"]

    AUTH --> LOGIN["/login"]
    AUTH --> FORBIDDEN["/forbidden"]
    AUTH --> NOTFOUND["/*"]

    HQ --> SUPER_DASH["/super-dashboard"]
    HQ --> BRANCHES["/branches"]
    HQ --> BRANCH_REPORT["/branch-report"]
    HQ --> AUDIT["/audit-log"]
    HQ --> SUBSCRIPTION_HQ["/subscription"]

    DASH --> DASH_MAIN["/"]

    MEMBER --> MEMBERS["/members"]
    MEMBER --> MEMBER_DETAIL["/members/detail"]
    MEMBER --> MEMBER_NEW["/members/new"]
    MEMBER --> MEMBER_EDIT["/members/edit"]
    MEMBER --> MEMBER_TRANSFER["/members/transfer"]
    MEMBER --> BODY["/body-composition"]
    MEMBER --> ATTEND["/attendance"]
    MEMBER --> MILEAGE["/mileage"]
    MEMBER --> CONTRACT["/contracts/new"]

    CLASS --> CALENDAR["/calendar"]
    CLASS --> SCHEDULE_REQ["/schedule-requests"]
    CLASS --> LESSONS["/lessons"]
    CLASS --> LESSON_COUNTS["/lesson-counts"]
    CLASS --> PENALTIES["/penalties"]
    CLASS --> VALID_LESSONS["/valid-lessons"]
    CLASS --> CLASS_TEMPLATE["/class-templates"]
    CLASS --> CLASS_SCHEDULE["/class-schedule"]
    CLASS --> CLASS_STATS["/class-stats"]
    CLASS --> INSTRUCTOR["/instructor-status"]

    SALES --> SALES_MAIN["/sales"]
    SALES --> SALES_STATS["/sales/stats"]
    SALES --> SALES_STAT_MGMT["/sales/statistics-management"]
    SALES --> DEFERRED["/deferred-revenue"]
    SALES --> POS["/pos"]
    SALES --> POS_PAY["/pos/payment"]
    SALES --> REFUNDS["/refunds"]
    SALES --> UNPAID["/unpaid"]

    PRODUCT --> PRODUCTS["/products"]
    PRODUCT --> PRODUCT_NEW["/products/new"]
    PRODUCT --> PRODUCT_EDIT["/products/edit"]

    FACILITY --> LOCKER["/locker"]
    FACILITY --> LOCKER_MGMT["/locker/management"]
    FACILITY --> RFID["/rfid"]
    FACILITY --> ROOMS["/rooms"]
    FACILITY --> GOLF["/golf-bays"]
    FACILITY --> CLOTHING["/clothing"]

    PAYROLL --> STAFF["/staff"]
    PAYROLL --> STAFF_NEW["/staff/new"]
    PAYROLL --> STAFF_EDIT["/staff/edit"]
    PAYROLL --> STAFF_RESIGN["/staff/resignation"]
    PAYROLL --> STAFF_ATT["/staff-attendance"]
    PAYROLL --> PAYROLL_MAIN["/payroll"]
    PAYROLL --> PAYROLL_STATEMENT["/payroll/statements"]

    MSG --> MESSAGE["/message"]
    MSG --> AUTO_ALARM["/message/auto-alarm"]
    MSG --> COUPON["/message/coupon"]

    SETTINGS --> SETTINGS_MAIN["/settings"]
    SETTINGS --> PERMISSION["/settings/permissions"]
    SETTINGS --> KIOSK["/settings/kiosk"]
    SETTINGS --> IOT["/settings/iot"]
    SETTINGS --> DISCOUNT["/discount-settings"]
    SETTINGS --> EXERCISE["/exercise-programs"]
    SETTINGS --> SUBSCRIPTION["/subscription"]

    NOTICE --> NOTICES["/notices"]
```

## 2. 메뉴 그룹 구조

```mermaid
flowchart LR
    APP["AppSidebar"]

    APP --> HQM["본사 관리"]
    APP --> DASHM["대시보드"]
    APP --> MEMBERM["회원"]
    APP --> CLASSM["수업/캘린더"]
    APP --> SALESM["매출"]
    APP --> PRODUCTM["상품"]
    APP --> FACILITYM["시설"]
    APP --> PAYROLLM["급여"]
    APP --> MSGM["메시지/쿠폰"]
    APP --> SETTINGSM["설정"]
    APP --> NOTICEM["공지사항"]

    HQM --> HQM1["통합 대시보드"]
    HQM --> HQM2["지점 관리"]
    HQM --> HQM3["지점 비교 리포트"]
    HQM --> HQM4["전체 직원 관리"]
    HQM --> HQM5["감사 로그"]
    HQM --> HQM6["구독 관리"]

    MEMBERM --> MEMBERM1["회원 목록"]
    MEMBERM --> MEMBERM2["출석 관리"]
    MEMBERM --> MEMBERM3["마일리지 관리"]
    MEMBERM --> MEMBERM4["전자계약"]

    CLASSM --> CLASSM1["캘린더"]
    CLASSM --> CLASSM2["일정 요청"]
    CLASSM --> CLASSM3["수업 관리"]
    CLASSM --> CLASSM4["횟수 관리"]
    CLASSM --> CLASSM5["페널티 관리"]
    CLASSM --> CLASSM6["유효 수업 목록"]
    CLASSM --> CLASSM7["수업 템플릿"]
    CLASSM --> CLASSM8["시간표 등록"]
    CLASSM --> CLASSM9["수업 현황"]
    CLASSM --> CLASSM10["강사 현황"]

    SALESM --> SALESM1["매출 현황"]
    SALESM --> SALESM2["매출 통계"]
    SALESM --> SALESM3["통계 관리"]
    SALESM --> SALESM4["선수익금"]
    SALESM --> SALESM5["POS 결제"]
    SALESM --> SALESM6["현장 판매"]
    SALESM --> SALESM7["환불 관리"]
    SALESM --> SALESM8["미수금 관리"]

    FACILITYM --> FACILITYM1["락커 관리"]
    FACILITYM --> FACILITYM2["사물함 관리"]
    FACILITYM --> FACILITYM3["밴드/카드"]
    FACILITYM --> FACILITYM4["운동룸"]
    FACILITYM --> FACILITYM5["골프 타석"]
    FACILITYM --> FACILITYM6["운동복"]

    PAYROLLM --> PAYROLLM1["직원 관리"]
    PAYROLLM --> PAYROLLM2["직원 근태"]
    PAYROLLM --> PAYROLLM3["급여 관리"]
    PAYROLLM --> PAYROLLM4["급여 명세서"]

    MSGM --> MSGM1["메시지 발송"]
    MSGM --> MSGM2["자동 알림"]
    MSGM --> MSGM3["쿠폰 관리"]

    SETTINGSM --> SETTINGSM1["센터 설정"]
    SETTINGSM --> SETTINGSM2["할인 설정"]
    SETTINGSM --> SETTINGSM3["운동 프로그램"]
    SETTINGSM --> SETTINGSM4["권한 설정"]
    SETTINGSM --> SETTINGSM5["키오스크"]
    SETTINGSM --> SETTINGSM6["출입문/IoT"]
    SETTINGSM --> SETTINGSM7["구독 관리"]
    SETTINGSM --> SETTINGSM8["지점 관리"]
```

## 3. 사용자 역할별 진입 구조

```mermaid
flowchart TB
    USER["사용자"]
    USER --> LOGIN["로그인"]

    LOGIN --> SUPER["슈퍼관리자"]
    LOGIN --> OWNER["센터장"]
    LOGIN --> MANAGER["매니저"]
    LOGIN --> FC["FC"]
    LOGIN --> STAFF["스태프"]
    LOGIN --> READONLY["조회전용"]

    SUPER --> SUPER1["본사 관리 + 전체 메뉴"]
    OWNER --> OWNER1["지점 운영 + 설정 + 직원 + 급여"]
    MANAGER --> MANAGER1["회원 + 매출 + 상품 + 메시지"]
    FC --> FC1["회원 + 수업/캘린더 + 체성분"]
    STAFF --> STAFF1["대시보드 + 출석 + POS + 시설"]
    READONLY --> READONLY1["조회 전용"]
```

## 4. 권한별 접근 다이어그램

```mermaid
flowchart LR
    subgraph Roles["Roles"]
        R1["슈퍼관리자"]
        R2["센터장"]
        R3["매니저"]
        R4["FC"]
        R5["스태프"]
        R6["조회전용"]
    end

    subgraph Menus["Main Menus"]
        M1["본사 관리"]
        M2["대시보드"]
        M3["회원"]
        M4["수업/캘린더"]
        M5["매출"]
        M6["상품"]
        M7["시설"]
        M8["급여"]
        M9["메시지/쿠폰"]
        M10["설정"]
        M11["공지사항"]
    end

    R1 --> M1
    R1 --> M2
    R1 --> M3
    R1 --> M4
    R1 --> M5
    R1 --> M6
    R1 --> M7
    R1 --> M8
    R1 --> M9
    R1 --> M10
    R1 --> M11

    R2 --> M2
    R2 --> M3
    R2 --> M4
    R2 --> M5
    R2 --> M6
    R2 --> M7
    R2 --> M8
    R2 --> M9
    R2 --> M10
    R2 --> M11

    R3 --> M2
    R3 --> M3
    R3 --> M4
    R3 --> M5
    R3 --> M6
    R3 --> M7
    R3 --> M9
    R3 --> M11

    R4 --> M2
    R4 --> M3
    R4 --> M4
    R4 --> M8
    R4 --> M11

    R5 --> M2
    R5 --> M3
    R5 --> M5
    R5 --> M6
    R5 --> M7
    R5 --> M8
    R5 --> M11

    R6 --> M8
    R6 --> M11
```

## 5. 메인 업무 흐름

```mermaid
flowchart TB
    A["로그인"] --> B["대시보드"]
    B --> C["회원 확보"]
    B --> D["출석/수업 운영"]
    B --> E["매출/결제"]
    B --> F["직원/급여"]
    B --> G["메시지/자동알림"]
    B --> H["설정/권한"]

    C --> C1["회원 등록"]
    C1 --> C2["회원 상세"]
    C2 --> C3["계약 생성"]
    C3 --> C4["마일리지/이력 관리"]

    D --> D1["출석 처리"]
    D --> D2["캘린더 운영"]
    D --> D3["수업 편성"]
    D --> D4["강사 현황"]

    E --> E1["POS"]
    E --> E2["매출 조회"]
    E --> E3["매출 통계"]
    E --> E4["환불"]
    E --> E5["미수금"]

    F --> F1["직원 관리"]
    F --> F2["근태"]
    F --> F3["급여"]
    F --> F4["급여 명세서"]

    G --> G1["메시지 발송"]
    G --> G2["자동 알림"]
    G --> G3["쿠폰"]

    H --> H1["센터 설정"]
    H --> H2["권한 설정"]
    H --> H3["키오스크"]
    H --> H4["IoT"]
    H --> H5["지점 관리"]
```

## 6. 회원 중심 플로우

```mermaid
flowchart LR
    M0["회원 목록"] --> M1["회원 등록"]
    M0 --> M2["회원 상세"]
    M2 --> M3["프로필"]
    M2 --> M4["이용권"]
    M2 --> M5["출석"]
    M2 --> M6["결제"]
    M2 --> M7["체성분"]
    M2 --> M8["상담/메모"]
    M2 --> M9["운동기록"]
    M2 --> M10["평가"]
    M2 --> M11["운동프로그램"]
    M2 --> M12["예약"]
    M2 --> M13["이력"]
    M2 --> M14["수정"]
    M2 --> M15["이적"]
    M2 --> M16["계약"]
```

## 7. 수업/강사 운영 플로우

```mermaid
flowchart LR
    C0["캘린더"] --> C1["일정 요청"]
    C0 --> C2["수업 관리"]
    C0 --> C3["횟수 관리"]
    C0 --> C4["페널티 관리"]
    C0 --> C5["유효 수업 목록"]
    C0 --> C6["수업 템플릿"]
    C0 --> C7["시간표 등록"]
    C0 --> C8["수업 현황"]
    C0 --> C9["강사 현황"]

    C6 --> C7
    C7 --> C2
    C2 --> C8
    C2 --> C9
```

## 8. 매출 운영 플로우

```mermaid
flowchart LR
    S0["상품 관리"] --> S1["POS"]
    S1 --> S2["POS 결제"]
    S2 --> S3["매출 조회"]
    S3 --> S4["매출 통계"]
    S3 --> S5["통계 관리"]
    S3 --> S6["선수익금"]
    S3 --> S7["환불 관리"]
    S3 --> S8["미수금 관리"]
```

## 9. 시설/운영 플로우

```mermaid
flowchart LR
    F0["시설"] --> F1["락커"]
    F0 --> F2["사물함 관리"]
    F0 --> F3["RFID"]
    F0 --> F4["운동룸"]
    F0 --> F5["골프 타석"]
    F0 --> F6["운동복"]

    F1 --> F2
    F3 --> F1
    F4 --> C0["캘린더/수업"]
```

## 10. 본사/지점 운영 분기

```mermaid
flowchart TB
    CORE["FitGenie CRM"]
    CORE --> HQ["본사 운영"]
    CORE --> BRANCH["지점 운영"]

    HQ --> HQ1["통합 대시보드"]
    HQ --> HQ2["지점 관리"]
    HQ --> HQ3["지점 비교 리포트"]
    HQ --> HQ4["감사 로그"]
    HQ --> HQ5["구독 관리"]

    BRANCH --> B1["지점 대시보드"]
    BRANCH --> B2["회원 운영"]
    BRANCH --> B3["수업 운영"]
    BRANCH --> B4["매출 운영"]
    BRANCH --> B5["시설 운영"]
    BRANCH --> B6["직원/급여"]
    BRANCH --> B7["메시지/알림"]
    BRANCH --> B8["설정"]
```

## 11. 기획 관점 모듈 맵

```mermaid
flowchart TB
    PLAN["기획 기준 모듈"]

    PLAN --> IA["IA / 메뉴 구조"]
    PLAN --> SCREEN["화면 구조"]
    PLAN --> FLOW["업무 플로우"]
    PLAN --> ROLE["권한 체계"]
    PLAN --> KPI["대시보드 / KPI"]
    PLAN --> DATA["데이터 모델"]
    PLAN --> INTEGRATION["키오스크 / IoT / 알림"]

    IA --> SCREEN
    SCREEN --> FLOW
    ROLE --> SCREEN
    DATA --> FLOW
    DATA --> KPI
    INTEGRATION --> FLOW
    KPI --> HQKPI["본사 KPI"]
    KPI --> BRANCHKPI["지점 KPI"]
    KPI --> STAFFKPI["직원 KPI"]
```

