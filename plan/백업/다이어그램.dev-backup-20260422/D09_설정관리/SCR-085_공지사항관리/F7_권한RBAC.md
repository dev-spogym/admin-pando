---
diagramId: F7_SCR-085
title: SCR-085 공지사항 관리 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-085
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
tcMappings: [TC-085-NEG-001]
lastUpdated: 2026-04-20
---

## 다이어그램

```mermaid
flowchart LR
    User([접근 시도\n/notices])
    User -->|E_F7_085_01| RoleCheck{역할 확인}

    RoleCheck -->|"E_F7_085_02: primary"| P[최고관리자\n전체 접근+CRUD+알림발송]
    RoleCheck -->|"E_F7_085_03: owner"| O[센터장\n전체 접근+CRUD+알림발송]
    RoleCheck -->|"E_F7_085_04: manager"| M[매니저\n전체 접근+CRUD]
    RoleCheck -->|"E_F7_085_05: fc"| FC[FC\n조회만 가능]
    RoleCheck -->|"E_F7_085_06: staff"| S[스태프\n조회만 가능]
    RoleCheck -->|"E_F7_085_07: readonly"| RO[조회전용\n조회만 가능]

    P & O & M -->|E_F7_085_08| WriteActions[등록/수정/삭제/고정 가능]
    P & O -->|E_F7_085_09| NotifAction[알림 발송 가능\nX15 연결]
    FC & S & RO -->|E_F7_085_10| ReadActions[조회만 가능\n버튼 숨김]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class WriteActions,NotifAction screen
    class ReadActions rbacBlocked
    class RoleCheck system
```

## 역할별 접근 매트릭스
| 역할 | 접근 | 조회 | 등록 | 수정 | 삭제 | 알림발송 |
|------|:---:|:---:|:---:|:---:|:---:|:------:|
| primary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| fc | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| staff | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| readonly | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

## TC 후보
- TC-085-NEG-001: staff → /notices → 등록/수정/삭제 버튼 미표시
