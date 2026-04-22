---
title: 상품 등록/수정 레거시 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P002
dependencies: []
actors: [primary, owner, manager, trainer, front]
lastUpdated: 2026-04-20
---

# F7 권한(RBAC) 분기 플로우 — SCR-P002 상품 등록/수정 레거시

## 다이어그램

```mermaid
flowchart LR
    USER([사용자]) --> RoleCheck{역할 확인}

    RoleCheck -->|": primary"|P[슈퍼관리자\n전체 접근]
    RoleCheck -->|": owner"|O[센터장\n전체 접근]
    RoleCheck -->|": manager"|M[매니저\n전체 접근]
    RoleCheck -->|": trainer"|T[트레이너\n접근 불가\n상품 목록으로 리다이렉트]
    RoleCheck -->|": front"|F[프론트\n접근 불가\n상품 목록으로 리다이렉트]

    P & O & M --> FullAccess[전체 폼 접근\n저장/삭제 가능]
    T & F --> Redirect[SCR-P001 리다이렉트]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class FullAccess success
    class Redirect rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then | |-------|------|-------|------|------| | TC-P002-F7-01 | positive | manager 로그인 | 진입 | 전체 폼 접근 가능 | | TC-P002-F7-02 | negative | trainer 로그인 | 진입 | 상품 목록으로 리다이렉트 |
