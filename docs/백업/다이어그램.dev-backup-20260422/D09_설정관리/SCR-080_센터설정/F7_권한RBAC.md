---
diagramId: F7_SCR-080
title: SCR-080 센터 설정 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-080
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
tcMappings: [TC-080-NEG-001]
lastUpdated: 2026-04-20
---

## 목적
SCR-080에 대한 6개 역할별 접근 및 액션 가능 범위를 정의한다. 설정 도메인은 primary/owner 중심.

## 다이어그램

```mermaid
flowchart LR
    User([사용자 접근 시도\n/settings])

    User -->|E_F7_080_01| RoleCheck{역할 확인}

    RoleCheck -->|"E_F7_080_02: primary"| Primary[최고관리자\n전체 접근 + 전체 수정\n역할 수정 불가 제외]
    RoleCheck -->|"E_F7_080_03: owner"| Owner[센터장\n전체 접근 + 전체 수정]
    RoleCheck -->|"E_F7_080_04: manager"| Manager_Blocked[매니저\n접근 불가\n권한없음 토스트]
    RoleCheck -->|"E_F7_080_05: fc"| FC_Blocked[FC\n접근 불가]
    RoleCheck -->|"E_F7_080_06: staff"| Staff_Blocked[스태프\n접근 불가]
    RoleCheck -->|"E_F7_080_07: readonly"| RO_Blocked[조회전용\n접근 불가]

    Primary -->|E_F7_080_08| P_Basic[기본정보 탭\n조회+수정]
    Primary -->|E_F7_080_09| P_Notif[알림설정 탭\n조회+수정]
    Primary -->|E_F7_080_10| P_Theme[테마설정 탭\n조회+수정]
    Primary -->|E_F7_080_11| P_Supply[물품관리 탭\n조회+수정]
    Primary -->|E_F7_080_12| P_Save[저장하기 버튼\n활성]

    Owner -->|E_F7_080_13| O_Basic[기본정보 탭\n조회+수정]
    Owner -->|E_F7_080_14| O_Notif[알림설정 탭\n조회+수정]
    Owner -->|E_F7_080_15| O_Theme[테마설정 탭\n조회+수정]
    Owner -->|E_F7_080_16| O_Supply[물품관리 탭\n조회+수정]
    Owner -->|E_F7_080_17| O_Save[저장하기 버튼\n활성]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class P_Basic,P_Notif,P_Theme,P_Supply,P_Save,O_Basic,O_Notif,O_Theme,O_Supply,O_Save screen
    class Manager_Blocked,FC_Blocked,Staff_Blocked,RO_Blocked rbacBlocked
    class RoleCheck system
```

## 엣지 설명
| 역할 | 접근 | 조회 | 수정 | 저장 |
|------|:---:|:---:|:---:|:---:|
| primary | ✅ | ✅ | ✅ | ✅ |
| owner | ✅ | ✅ | ✅ | ✅ |
| manager | ❌ | ❌ | ❌ | ❌ |
| fc | ❌ | ❌ | ❌ | ❌ |
| staff | ❌ | ❌ | ❌ | ❌ |
| readonly | ❌ | ❌ | ❌ | ❌ |

## TC 후보
- TC-080-NEG-001: manager 로그인 → /settings 접근 → 권한없음 토스트
- TC-080-NEG-005: readonly 로그인 → /settings URL 직접 입력 → 차단
