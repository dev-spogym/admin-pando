---
title: 시즌 가격 관리 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P008
dependencies: []
actors: [primary, owner, manager, trainer, front, readonly]
lastUpdated: 2026-05-22
---

# F7 권한(RBAC) 분기 플로우 — SCR-P008 시즌 가격 관리 🆕

## 다이어그램

```mermaid
flowchart LR
    USER([사용자]) --> RoleCheck{역할}

    RoleCheck --> P[슈퍼관리자]
    RoleCheck --> O[센터장]
    RoleCheck --> M[매니저]
    RoleCheck --> T[트레이너]
    RoleCheck --> F[프론트]
    RoleCheck --> R[readonly]

    P & O --> Full[전체 기능\n등록/수정/삭제/활성화 가능]
    M --> ManagerAccess[등록/수정/활성화 가능\n삭제 버튼 숨김]
    T & F --> ReadOnly[시즌 특가 목록 조회만\n등록/수정/삭제/활성화 버튼 숨김]
    R --> Blocked[접근 차단\n403 리다이렉트]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class Full success
    class ManagerAccess system
    class ReadOnly rbacBlocked
    class Blocked rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then |
|-------|------|-------|------|------|
| TC-P008-F7-01 | positive | manager | 시즌 가격 관리 진입 | 등록/수정 가능, 삭제 버튼 숨김 |
| TC-P008-F7-02 | positive | front | 시즌 가격 관리 진입 | 시즌 특가 목록 조회만 가능, 등록/수정/삭제/활성화 버튼 숨김 |
