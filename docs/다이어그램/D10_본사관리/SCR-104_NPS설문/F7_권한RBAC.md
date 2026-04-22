---
title: SCR-104 NPS 설문 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-104
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
lastUpdated: 2026-04-20
---

## 다이어그램

```mermaid
flowchart LR
    User([접근 시도\n])
    User --> RoleCheck{역할 확인}

    RoleCheck -->|": primary"|P[최고관리자\n전체 지점 NPS + 설문 발송]
    RoleCheck -->|": owner"|O[센터장\n본인 지점 NPS + 설문 발송]
    RoleCheck -->|": manager"|Staff[403 접근 차단\n권한 없음 토스트]
    RoleCheck -->|": readonly"|RO[읽기 전용\n설문 발송 버튼 숨김]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef newFeature fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C,stroke-dasharray:4 2
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class P,O newFeature
    class RO rbacBlocked
    class Staff error
    class RoleCheck system
```

## 역할별 접근 매트릭스
| 역할 | 접근 | 전체 지점 | 설문 발송 | 내보내기 |
|------|:---:|:--------:|:--------:|:-------:|
| primary | ✅ | ✅ | ✅ | ✅ |
| owner | ✅ | 본인 지점만 | ✅ | ✅ |
| manager | ❌ | ❌ | ❌ | ❌ |
| fc | ❌ | ❌ | ❌ | ❌ |
| staff | ❌ | ❌ | ❌ | ❌ |
| readonly | ✅ | 본인 지점만 | ❌ | ❌ |

## TC 후보
- TC-104-NEG-001: manager 접근 시도 → 403 접근 차단
