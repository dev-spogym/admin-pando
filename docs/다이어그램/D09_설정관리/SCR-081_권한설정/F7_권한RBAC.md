---
title: SCR-081 권한 설정 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-081
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
lastUpdated: 2026-04-20
---

## 목적
SCR-081 접근 및 역할별 편집 가능 범위를 정의한다. primary만 모든 역할 권한 편집 가능.

## 다이어그램

```mermaid
flowchart LR
    User([사용자 접근\n])

    User --> RoleCheck{역할 확인}

    RoleCheck -->|": primary"|Primary[최고관리자\n전체 접근\n자신 역할 매트릭스 수정 불가]
    RoleCheck -->|": owner"|Owner[센터장\n접근 가능\n자신 이하 역할만 편집]
    RoleCheck -->|": manager 이하"|Blocked[접근 차단\n권한없음 메시지]

    Primary --> P_View[모든 역할 조회]
    Primary --> P_Edit[owner~readonly 편집]
    Primary --> P_Create[역할 생성/삭제]
    Primary --> P_PrimaryLock[primary 매트릭스\n수정 불가 고정]

    Owner --> O_View[모든 역할 조회]
    Owner --> O_Edit[manager~readonly 편집]
    Owner --> O_NoCreate[역할 생성/삭제\n제한적]

    subgraph 편집 불가 역할
        Manager_R[manager]
        FC_R[fc]
        Staff_R[staff]
        RO_R[readonly]
    end

    Blocked --> Manager_R
    Blocked --> FC_R
    Blocked --> Staff_R
    Blocked --> RO_R

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class P_View,P_Edit,P_Create,O_View,O_Edit screen
    class Blocked,P_PrimaryLock,O_NoCreate,Manager_R,FC_R,Staff_R,RO_R rbacBlocked
    class RoleCheck system
```

## 역할별 접근 매트릭스
| 역할 | 접근 | 조회 | 역할 편집 | 역할 생성/삭제 | |------|:---:|:---:|:--------:|:------------:| | primary | ✅ | ✅ | owner~readonly | ✅ | | owner | ✅ | ✅ | manager~readonly | 제한 | | manager | ❌ | ❌ | ❌ | ❌ | | fc | ❌ | ❌ | ❌ | ❌ | | staff | ❌ | ❌ | ❌ | ❌ | | readonly | ❌ | ❌ | ❌ | ❌ |

## TC 후보
- TC-081-002: 최고관리자(primary) 선택 시 매트릭스 수정 불가
- TC-081-012: 시스템 역할 삭제 옵션 미표시
