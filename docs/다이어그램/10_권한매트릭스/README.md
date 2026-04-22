---
title: FitGenie CRM RBAC 권한매트릭스 인덱스
type: index
lastUpdated: 2026-04-20
---

# 10_권한매트릭스 — 인덱스

> **목적**: FitGenie CRM 6개 역할 × 67개 라우트 RBAC 권한 다이어그램 모음
> **기준**: `공통` 2.2 메뉴 접근 매트릭스 + `설정관리` SCR-081

---

## RBAC 역할 정의 (6종)

| 코드 | 역할키 | 한글명 | 설명 | 수정 가능 |
|------|--------|--------|------|:---:|
| R1 | `` | 슈퍼관리자 | 본사 운영 총괄, 전 지점 접근 | ✗ |
| R2 | `primary` | 최고관리자 | 지점 내 최상위 권한 | ✗ |
| R3 | `owner` | 센터장 | 지점 경영/매출 관리 | ● |
| R4 | `manager` | 매니저 | 운영 전반 관리 | ● |
| R5 | `fc` | FC/피트니스코치 | 상담/결제/수업 | ● |
| R6 | `staff` | 스태프 | 기본 조회/출석 확인 | ● |
| R7 | `readonly` | 조회전용 | 읽기 전용 전체 | ● |

> 참고: `readonly`는 설정관리 SCR-081에 명시된 7번째 시스템 역할.
> 공통 메뉴 접근 매트릭스는 R1~R6 기준이며, readonly는 전 메뉴 조회만 허용.

---

## 파일 목록

| 파일 | 다이어그램 ID | 내용 |
|------|-------------|------|
| [R1_역할화면_매트릭스](R1_역할화면_매트릭스) | RBAC_R1 | 역할 × 화면 전체 접근 매트릭스 |
| [R2_primary_journey](R2_primary_journey) | RBAC_R2 | primary(최고관리자) journey |
| [R3_owner_journey](R3_owner_journey) | RBAC_R3 | owner(센터장) journey |
| [R4_manager_journey](R4_manager_journey) | RBAC_R4 | manager(매니저) journey |
| [R5_fc_journey](R5_fc_journey) | RBAC_R5 | fc(피트니스코치) journey |
| [R6_staff_journey](R6_staff_journey) | RBAC_R6 | staff(스태프) journey |
| [R7_readonly_journey](R7_readonly_journey) | RBAC_R7 | readonly(조회전용) journey |
| [R8_권한위계](R8_권한위계) | RBAC_R8 | 역할 간 권한 위계 |

---

## 접근 표기 범례

| 기호 | 의미 |
|------|------|
| `●` | 전체 접근 (CRUD) |
| `○` | 조회만 (Read Only) |
| `—` | 접근 불가 |

---

## Mermaid 스타일 클래스 (전 파일 공통)

```
classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
classDef modal fill:#FFF3E0,stroke:#F57C00,color:#E65100
classDef newFeature fill:#F3E5F5,stroke:#9C27B0,stroke-dasharray:5 5
classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef warning fill:#FFF8E1,stroke:#F9A825,color:#F57F17
classDef info fill:#E0F7FA,stroke:#00838F
classDef system fill:#EDE7F6,stroke:#5E35B2
classDef external fill:#ECEFF1,stroke:#455A64,stroke-dasharray:3 3
classDef cron fill:#E0F2F1,stroke:#00695C
classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
```
