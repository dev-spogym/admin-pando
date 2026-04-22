---
title: SCR-089 데이터 백업/복원 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-089
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
lastUpdated: 2026-04-20
---

## 다이어그램

```mermaid
flowchart LR
    User([접근 시도\n])
    User --> RoleCheck{역할 확인}

    RoleCheck -->|": primary"|P[최고관리자\n전체 접근+백업+복원+설정]
    RoleCheck -->|": owner"|O[센터장\n전체 접근+백업+복원+설정]
    RoleCheck -->|": manager 이하"|Blocked[접근 차단\n403 리다이렉트]

    P & O --> FullAccess[백업 조회+수동백업+복원+설정변경]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef newFeature fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C,stroke-dasharray:4 2
    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class FullAccess newFeature
    class Blocked error
    class RoleCheck system
```

## 역할별 접근 매트릭스
| 역할 | 접근 | 조회 | 수동백업 | 복원 | 설정변경 | |------|:---:|:---:|:-------:|:---:|:-------:| | primary | ✅ | ✅ | ✅ | ✅ | ✅ | | owner | ✅ | ✅ | ✅ | ✅ | ✅ | | manager | ❌ | ❌ | ❌ | ❌ | ❌ | | fc | ❌ | ❌ | ❌ | ❌ | ❌ | | staff | ❌ | ❌ | ❌ | ❌ | ❌ | | readonly | ❌ | ❌ | ❌ | ❌ | ❌ |

## TC 후보
- TC-089-NEG-001: manager → → 403 접근 차단
