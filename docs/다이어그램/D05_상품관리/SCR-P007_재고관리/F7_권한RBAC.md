---
title: 재고 관리 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P007
dependencies: []
actors: [primary, owner, manager, trainer, front]
lastUpdated: 2026-04-20
---

# F7 권한(RBAC) 분기 플로우 — SCR-P007 재고 관리 🆕

## 다이어그램

```mermaid
flowchart LR
    USER([사용자]) --> RoleCheck{역할}

    RoleCheck --> P[슈퍼관리자]
    RoleCheck --> O[센터장]
    RoleCheck --> M[매니저]
    RoleCheck --> T[트레이너]
    RoleCheck --> F[프론트]

    P & O & M --> Full[전체 기능\n조정/차감/복구/일괄업로드 가능]
    T & F --> Blocked[접근 차단\n403 리다이렉트]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class Full success
    class Blocked rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then | |-------|------|-------|------|------| | TC-P007-F7-01 | positive | manager | 재고 관리 진입 | 전체 기능 접근 가능 | | TC-P007-F7-02 | negative | trainer | 재고 관리 메뉴 클릭 | 접근 차단, error 토스트 |
