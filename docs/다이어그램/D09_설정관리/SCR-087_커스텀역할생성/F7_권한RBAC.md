---
diagramId: F7_SCR-087
title: SCR-087 커스텀 역할 생성 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-087
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
tcMappings: [TC-087-NEG-001]
lastUpdated: 2026-04-20
---

## 다이어그램

```mermaid
flowchart LR
    User([접근 시도\n/settings/roles])
    User -->|E_F7_087_01| RoleCheck{역할 확인}

    RoleCheck -->|E_F7_087_02: primary| P[최고관리자\n전체 접근+CRUD]
    RoleCheck -->|E_F7_087_03: owner| O[센터장\n전체 접근+CRUD]
    RoleCheck -->|E_F7_087_04: manager 이하| Blocked[접근 차단\n403 리다이렉트]

    P & O -->|E_F7_087_05| FullAccess[역할 조회+생성+수정+삭제]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef newFeature fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C,stroke-dasharray:4 2
    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class FullAccess newFeature
    class Blocked error
    class RoleCheck system
```

## 역할별 접근 매트릭스
| 역할 | 접근 | 조회 | 생성 | 수정 | 삭제 |
|------|:---:|:---:|:---:|:---:|:---:|
| primary | ✅ | ✅ | ✅ | ✅ | ✅ |
| owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ❌ | ❌ | ❌ | ❌ | ❌ |
| fc | ❌ | ❌ | ❌ | ❌ | ❌ |
| staff | ❌ | ❌ | ❌ | ❌ | ❌ |
| readonly | ❌ | ❌ | ❌ | ❌ | ❌ |

## TC 후보
- TC-087-NEG-001: manager → /settings/roles → 403 접근 차단
