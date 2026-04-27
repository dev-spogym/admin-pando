---
title: SCR-083 IoT/출입 관리 — 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-083
dependencies: []
actors: [primary, owner, manager, fc, staff, readonly]
lastUpdated: 2026-04-20
---

## 다이어그램

```mermaid
flowchart LR
    User([접근 시도\n])
    User --> RoleCheck{역할 확인}

    RoleCheck -->|": primary"|P[최고관리자\n전체 접근+수정+장비제어]
    RoleCheck -->|": owner"|O[센터장\n전체 접근+수정+장비제어]
    RoleCheck -->|": manager 이하"|Blocked[접근 차단\n권한없음]

    P & O --> GateMgmt[게이트 장비 추가/삭제]
    P & O --> PolicyEdit[출입 정책 Toggle 편집]
    P & O --> GateTest[게이트 테스트\n열기/닫기]
    P & O --> CCTVMgmt[CCTV 설정 편집]
    P & O --> EnvThreshold[환경 임계값 설정]
    P & O --> LogView[출입 이력 조회]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class GateMgmt,PolicyEdit,GateTest,CCTVMgmt,EnvThreshold,LogView screen
    class Blocked rbacBlocked
    class RoleCheck system
```

## TC 후보
- TC-083-NEG-001: manager → → 접근 차단
