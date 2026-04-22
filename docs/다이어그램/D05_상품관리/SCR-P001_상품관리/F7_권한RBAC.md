---
title: 상품 관리 권한(RBAC) 분기 플로우
type: flowchart
scope: SCR-P001
dependencies: []
actors: [primary, owner, manager, trainer, front, readonly]
lastUpdated: 2026-04-20
---

# F7 권한(RBAC) 분기 플로우 — SCR-P001 상품 관리

## 목적
6개 역할별 접근 범위 및 허용/차단 액션을 정의한다.

## 다이어그램

```mermaid
flowchart LR
    USER([사용자 로그인]) --> RoleCheck{역할 확인}

    RoleCheck --> PRIMARY[슈퍼관리자/primary]
    RoleCheck --> OWNER[센터장/owner]
    RoleCheck --> MGR[매니저/manager]
    RoleCheck --> TRAINER[트레이너/trainer]
    RoleCheck --> FRONT[프론트/front]
    RoleCheck --> READONLY[읽기전용/readonly]

    PRIMARY --> P_FULL[전체 접근\n상품 등록/수정/삭제\n전지점 배포 가능\]
    OWNER --> O_FULL[전체 접근\n상품 등록/수정/삭제\]
    MGR --> M_FULL[전체 접근\n상품 등록/수정/삭제\]
    TRAINER --> T_READ[조회만 가능\\n+상품 등록 버튼 숨김\n전지점 배포 버튼 숨김\n패널 저장/삭제 버튼 숨김]
    FRONT --> F_READ[조회만 가능\\n+상품 등록 버튼 숨김]
    READONLY --> R_BLOCK[접근 차단\n권한없음 토스트]

    classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
    classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef system fill:#EDE7F6,stroke:#5E35B2
    class P_FULL,O_FULL,M_FULL success
    class T_READ,F_READ rbacBlocked
    class R_BLOCK error
    class RoleCheck system
```

## TC 후보

| TC ID | 타입 | Given | When | Then | |-------|------|-------|------|------| | TC-P001-F7-01 | positive | 슈퍼관리자 로그인 | 상품 관리 진입 | 전지점 배포 버튼 노출, 전체 기능 사용 가능 | | TC-P001-F7-02 | positive | trainer 로그인 | 상품 관리 진입 | +상품 등록 버튼 없음, 조회만 가능 | | TC-P001-F7-03 | positive | front 로그인 | 상품 관리 진입 | 조회만 가능, 수정 불가 | | TC-P001-F7-04 | negative | readonly 역할 | 상품 관리 진입 시도 | 접근 차단, 권한없음 토스트 |
