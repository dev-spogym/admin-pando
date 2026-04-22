---
title: 상품 상세 패널 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P003
dependencies: []
actors: [primary, owner, manager, trainer, front]
lastUpdated: 2026-04-20
---

# F7 권한(RBAC) 분기 플로우 — SCR-P003 상품 상세 패널

## 다이어그램

```mermaid
flowchart LR
    OPEN([패널 오픈]) --> RoleCheck{역할 확인}

    RoleCheck -->|": primary"|P[슈퍼관리자\n전체 기능]
    RoleCheck -->|": owner"|O[센터장\n전체 기능]
    RoleCheck -->|": manager"|M[매니저\n전체 기능]
    RoleCheck -->|": trainer"|T[트레이너\n조회만]
    RoleCheck -->|": front"|F[프론트\n조회만]

    P & O & M --> FullAccess[저장 버튼 표시\n상품삭제 버튼 표시\n가격이력 버튼 표시\n기존 상품 복사 버튼 표시\n모든 필드 편집 가능]

    T & F --> ReadAccess[저장 버튼 숨김\n상품삭제 버튼 숨김\n가격이력 버튼 숨김\n폼 필드 표시만]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class FullAccess success
    class ReadAccess rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then | |-------|------|-------|------|------| | TC-P003-F7-01 | positive | manager | 패널 오픈 | 저장/삭제/가격이력 버튼 모두 표시 | | TC-P003-F7-02 | positive | trainer | 패널 오픈 | 저장/삭제/가격이력 버튼 숨김 |
