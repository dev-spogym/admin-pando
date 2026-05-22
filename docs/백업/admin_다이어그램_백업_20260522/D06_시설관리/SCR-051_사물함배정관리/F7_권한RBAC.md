---
title: 사물함 배정 관리 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-051
dependencies: []
actors: [primary, owner, manager, fc, staff, front, trainer, readonly]
lastUpdated: 2026-05-22
---

# F7 권한(RBAC) 분기 플로우 — SCR-051 사물함 배정 관리

## 다이어그램

```mermaid
flowchart LR
    USER([사용자]) --> RoleCheck{역할}

    RoleCheck --> P[슈퍼관리자]
    RoleCheck --> O[센터장]
    RoleCheck --> M[매니저]
    RoleCheck --> FC[FC]
    RoleCheck --> S[스태프/프론트]
    RoleCheck --> T[트레이너]
    RoleCheck --> R[readonly]

    P & O --> Full[전체 기능\n배정/해제/락커추가/동기화/엑셀]
    M --> Manager[배정/해제/동기화\n락커추가/엑셀 제외]
    FC & S --> AssignOnly[배정/해제\n락커추가/동기화/엑셀 제외]
    T & R --> ReadOnly[조회만\n배정/해제/수정 버튼 숨김]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef limited fill:#FFF8E1,stroke:#F9A825,color:#5D4037
    classDef readOnly fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class Full success
    class Manager,AssignOnly limited
    class ReadOnly readOnly
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then |
|-------|------|-------|------|------|
| TC-051-005 | negative | trainer | 배정하기 버튼 클릭 | 버튼 숨김, 조회만 가능 |
| TC-051-006 | positive | fc/staff/front | 배정/해제 처리 | 성공, 락커추가·동기화·엑셀 버튼 숨김 |
