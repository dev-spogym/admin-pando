---
title: SCR-H1001 자동화 정책 라이브러리 — 권한(RBAC)
type: flowchart
scope: SCR-H1001
dependencies: [HQ-09]
actors: [superAdmin, primary, owner, manager]
lastUpdated: 2026-05-08
---

## 다이어그램

```mermaid
flowchart TD
    Entry([SCR-H1001 접근]) --> Role{역할}
    Role -->|": superAdmin/primary"|Allow[접근 허용]
    Role -->|": owner/manager 이하"|Block[접근 차단]
```

## TC 후보
- TC-H1001-F7-001: superAdmin/primary만 접근 가능하다.

