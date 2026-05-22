---
title: 밴드/카드 관리 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-052
dependencies: []
actors: [primary, owner, manager, fc, staff, front, trainer, readonly]
lastUpdated: 2026-05-22
---

# F7 권한(RBAC) 분기 플로우 — SCR-052 밴드/카드 관리

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

    P & O & M --> Full[전체 기능\n등록/수정/분실처리/삭제]
    FC & S --> IssueOnly[등록/분실처리\n삭제 제외]
    T & R --> ReadOnly[목록 조회만\n변경 버튼 숨김]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warning fill:#FFF8E1,stroke:#F9A825,color:#F57F17
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class Full success
    class IssueOnly warning
    class ReadOnly rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then |
|-------|------|-------|------|------|
| TC-052-F7-001 | positive | trainer | SCR-052 진입 | 목록 조회만 가능, 등록/수정/분실/삭제 버튼 숨김 |
