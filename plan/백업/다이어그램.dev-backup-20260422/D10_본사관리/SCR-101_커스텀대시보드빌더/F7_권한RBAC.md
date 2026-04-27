---
diagramId: F7_SCR-101
title: SCR-101 커스텀 대시보드 빌더 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-101
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
tcMappings: [TC-101-NEG-001]
lastUpdated: 2026-04-20
---

## 다이어그램

```mermaid
flowchart LR
    User([접근 시도\n/dashboard/builder])
    User -->|E_F7_101_01| RoleCheck{역할 확인}

    RoleCheck -->|"E_F7_101_02: primary"| P[최고관리자\n전체 위젯 + 저장]
    RoleCheck -->|"E_F7_101_03: owner"| O[센터장\n전체 위젯 + 저장]
    RoleCheck -->|"E_F7_101_04: manager"| M[매니저\n허용된 위젯 + 저장]
    RoleCheck -->|"E_F7_101_05: fc"| FC[FC\n허용된 위젯 + 저장]
    RoleCheck -->|"E_F7_101_06: staff"| S[스태프\n허용된 위젯 + 저장]
    RoleCheck -->|"E_F7_101_07: readonly"| RO[조회전용\n저장 버튼 숨김]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef newFeature fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C,stroke-dasharray:4 2
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class P,O,M,FC,S newFeature
    class RO rbacBlocked
    class RoleCheck system
```

## 역할별 접근 매트릭스
| 역할 | 접근 | 위젯 추가 | 레이아웃 저장 | 전체 위젯 접근 |
|------|:---:|:--------:|:-----------:|:------------:|
| primary | ✅ | ✅ | ✅ | ✅ |
| owner | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | 일부 |
| fc | ✅ | ✅ | ✅ | 일부 |
| staff | ✅ | ✅ | ✅ | 일부 |
| readonly | ✅ | ❌ | ❌ | ❌ |

## TC 후보
- TC-101-NEG-001: readonly → 저장 버튼 미표시
