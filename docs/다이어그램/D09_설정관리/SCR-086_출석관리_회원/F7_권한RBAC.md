---
diagramId: F7_SCR-086
title: SCR-086 출석 관리 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-086
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
tcMappings: [TC-086-NEG-001]
lastUpdated: 2026-04-20
---

## 다이어그램

```mermaid
flowchart LR
    User([접근 시도\n/attendance])
    User -->|E_F7_086_01| RoleCheck{역할 확인}

    RoleCheck -->|E_F7_086_02: primary| P[최고관리자\n조회+수동체크인/아웃+엑셀]
    RoleCheck -->|E_F7_086_03: owner| O[센터장\n조회+수동체크인/아웃+엑셀]
    RoleCheck -->|E_F7_086_04: manager| M[매니저\n조회+수동체크인/아웃+엑셀]
    RoleCheck -->|E_F7_086_05: fc| FC[FC\n조회+수동체크인/아웃]
    RoleCheck -->|E_F7_086_06: staff| S[스태프\n조회+수동체크인/아웃]
    RoleCheck -->|E_F7_086_07: readonly| RO[조회전용\n조회만 가능]

    P & O & M -->|E_F7_086_08| FullAccess[조회+수동처리+엑셀 내보내기]
    FC & S -->|E_F7_086_09| OperAccess[조회+수동체크인/아웃\n엑셀 버튼 숨김]
    RO -->|E_F7_086_10| ReadAccess[조회만 가능\n수동처리 버튼 숨김]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class FullAccess,OperAccess screen
    class ReadAccess rbacBlocked
    class RoleCheck system
```

## 역할별 접근 매트릭스
| 역할 | 접근 | 조회 | 수동체크인 | 수동체크아웃 | 엑셀내보내기 |
|------|:---:|:---:|:--------:|:-----------:|:-----------:|
| primary | ✅ | ✅ | ✅ | ✅ | ✅ |
| owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| fc | ✅ | ✅ | ✅ | ✅ | ❌ |
| staff | ✅ | ✅ | ✅ | ✅ | ❌ |
| readonly | ✅ | ✅ | ❌ | ❌ | ❌ |

## TC 후보
- TC-086-NEG-001: readonly → /attendance → 수동처리 버튼 미표시
