---
diagramId: README_D01
title: D01 공통/인증/대시보드 다이어그램 인덱스
lastUpdated: 2026-04-20
---

# D01 공통/인증/대시보드 — 다이어그램 인덱스

> **도메인**: D01 공통
> **화면설계서**: `docs/화면설계서/공통.md`
> **lastUpdated**: 2026-04-20

---

## 개요

전체 시스템에 공통 적용되는 인증(로그인/2FA/세션), 대시보드, 사이드바 네비게이션, 글로벌 검색, 알림 센터, 프로필/계정, 비밀번호 재설정, 화면설계서 오버레이, 에러 페이지, 로그아웃 화면을 다룬다.

---

## SCR 목록

| SCR ID | 화면명 | 접근 경로 | 다이어그램 수 |
|--------|--------|-----------|:---:|
| SCR-100 | 로그인 | `/login` | 9 |
| SCR-101 | 대시보드 통합 | `/` | 9 |
| SCR-102 | 사이드바/네비게이션 | (공통 레이아웃) | 9 |
| SCR-103 | 글로벌 검색 | (글로벌 컴포넌트) | 9 |
| SCR-104 | 알림 센터 | (글로벌 컴포넌트) | 9 |
| SCR-105 | 프로필/계정 | (드롭다운/모달) | 9 |
| SCR-106 | 비밀번호 재설정 | `/login` (인라인) | 9 |
| SCR-107 | 화면설계서 오버레이 | (uiStore 토글) | 9 |
| SCR-108 | 에러 페이지 | `/forbidden`, `/not-found` | 9 |
| SCR-109 | 로그아웃 | (세션 종료) | 9 |

**SCR 소계**: 10 × 9 = **90개 다이어그램**

---

## DLG 목록

| DLG ID | 모달명 | 트리거 SCR | 다이어그램 수 |
|--------|--------|-----------|:---:|
| DLG-000 | 세션 만료 | 전체 화면 | 3 |
| DLG-001 | 로그아웃 확인 | SCR-109 | 3 |
| DLG-002 | 이탈 경고 (미저장) | DLG-COM-003 | 3 |
| DLG-003 | 삭제 확인 | DLG-COM-001 | 3 |
| DLG-004 | 저장 확인 | DLG-COM-002 | 3 |

**DLG 소계**: 5 × 3 = **15개 다이어그램**

---

## 도메인 특이사항

- **로그인 2FA**: X29 시퀀스 참조 (사용자 → 인증서버 → 세션 생성 → 대시보드)
- **세션 타임아웃**: DLG-000 세션 만료 모달 → 재로그인
- **알림 센터 push**: X30 시퀀스 참조 (알림 클릭 → 해당 화면 이동 → 읽음 처리)
- **글로벌 검색**: 회원/수업/결제 통합 검색
- **화면설계서 오버레이**: 📋 버튼 → uiStore.showDesignOverlay 토글
- **에러 페이지**: 404(ERR-002)/500/403(ERR-001) 각각 별도 분기 + 복귀 경로
- **대시보드 위젯 클릭** → 해당 화면 이동 플로우 포함
- **감사 로그**: LOGIN/LOGOUT/BRANCH_SWITCH 자동 기록

---

## classDef 공통

```mermaid
classDef screen       fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
classDef modal        fill:#FFF3E0,stroke:#F57C00,color:#E65100
classDef newFeature   fill:#F3E5F5,stroke:#9C27B0,stroke-dasharray:5 5
classDef error        fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef success      fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef warning      fill:#FFF8E1,stroke:#F9A825,color:#F57F17
classDef info         fill:#E0F7FA,stroke:#00838F
classDef system       fill:#EDE7F6,stroke:#5E35B2
classDef external     fill:#ECEFF1,stroke:#455A64,stroke-dasharray:3 3
classDef cron         fill:#E0F2F1,stroke:#00695C
classDef rbacBlocked  fill:#F5F5F5,stroke:#9E9E9E,color:#616161
```
