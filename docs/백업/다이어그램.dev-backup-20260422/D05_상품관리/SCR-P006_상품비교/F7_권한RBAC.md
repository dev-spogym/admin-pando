---
diagramId: F7_SCR-P006
title: 상품 비교 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P006
dependencies: []
actors: [primary, owner, manager, trainer, front]
tcMappings: [TC-P006-F7-01, TC-P006-F7-02]
lastUpdated: 2026-04-20
---

# F7 권한(RBAC) 분기 플로우 — SCR-P006 상품 비교 🆕

## 다이어그램

```mermaid
flowchart LR
    USER([사용자]) --> RoleCheck{역할}

    RoleCheck -->|E_F7_P_01| P[슈퍼관리자]
    RoleCheck -->|E_F7_O_01| O[센터장]
    RoleCheck -->|E_F7_M_01| M[매니저]
    RoleCheck -->|E_F7_T_01| T[트레이너]
    RoleCheck -->|E_F7_F_01| F[프론트]

    P & O & M --> Full[전체 기능\n바로 구매 / 내보내기 / 비교 초기화 가능]
    T & F --> ReadOnly[조회 전용\n바로 구매 버튼 숨김\n내보내기 비활성]

    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class Full success
    class ReadOnly rbacBlocked
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then |
|-------|------|-------|------|------|
| TC-P006-F7-01 | positive | manager | 비교 화면 진입 | 바로 구매/내보내기 모두 가능 |
| TC-P006-F7-02 | positive | front | 비교 화면 진입 | 바로 구매 버튼 숨김, 조회 전용 |
