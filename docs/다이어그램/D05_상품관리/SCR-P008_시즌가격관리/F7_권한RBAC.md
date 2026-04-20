---
diagramId: F7_SCR-P008
title: 시즌 가격 관리 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P008
dependencies: []
actors: [primary, owner, manager, trainer, front]
tcMappings: [TC-P008-F7-01, TC-P008-F7-02]
lastUpdated: 2026-04-20
---

# F7 권한(RBAC) 분기 플로우 — SCR-P008 시즌 가격 관리 🆕

## 다이어그램

```mermaid
flowchart LR
    USER([사용자]) --> RoleCheck{역할}

    RoleCheck -->|E_F7_P_01| P[슈퍼관리자]
    RoleCheck -->|E_F7_O_01| O[센터장]
    RoleCheck -->|E_F7_M_01| M[매니저]
    RoleCheck -->|E_F7_T_01| T[트레이너]
    RoleCheck -->|E_F7_F_01| F[프론트]

    P & O & M --> Full[전체 기능\n등록/수정/삭제/활성화 가능]
    T & F --> Blocked[접근 차단\n403 리다이렉트]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class Full success
    class Blocked rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then |
|-------|------|-------|------|------|
| TC-P008-F7-01 | positive | manager | 시즌 가격 관리 진입 | 등록/수정/삭제 모두 가능 |
| TC-P008-F7-02 | negative | front | 시즌 가격 관리 메뉴 클릭 | 접근 차단, 403 리다이렉트 |
