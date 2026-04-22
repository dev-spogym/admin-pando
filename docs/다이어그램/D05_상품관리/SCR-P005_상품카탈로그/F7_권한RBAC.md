---
title: 상품 카탈로그 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P005
dependencies: []
actors: [primary, owner, manager, trainer, front]
lastUpdated: 2026-04-20
---

# F7 권한(RBAC) 분기 플로우 — SCR-P005 상품 카탈로그 🆕

## 다이어그램

```mermaid
flowchart LR
    USER([사용자]) --> RoleCheck{역할}

    RoleCheck --> P[슈퍼관리자]
    RoleCheck --> O[센터장]
    RoleCheck --> M[매니저]
    RoleCheck --> T[트레이너]
    RoleCheck --> F[프론트]

    P & O & M --> Full[전체 기능\n편집/공개설정/설정변경 가능]
    T & F --> ReadOnly[조회만\n편집 버튼 숨김\n배지 토글 비활성]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class Full success
    class ReadOnly rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then | |-------|------|-------|------|------| | TC-P005-F7-01 | positive | manager | 카탈로그 진입 | 편집/공개 설정 가능 | | TC-P005-F7-02 | positive | front | 카탈로그 진입 | 조회만, 편집 불가 |
