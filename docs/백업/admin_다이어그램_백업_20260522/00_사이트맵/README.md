---
title: FitGenie CRM 사이트맵 인덱스
type: index
lastUpdated: 2026-04-20
---

# 00_사이트맵 — 인덱스

> **목적**: FitGenie CRM 전체 67개 라우트의 IA/사이트맵 다이어그램 모음
> **기준**: `공통` 1.1 전체 라우트 맵 (67개) + Next App Router 실제 파일 구조

---

## 파일 목록

| 파일 | 다이어그램 ID | 내용 |
|------|-------------|------|
| [N1_전체_사이트맵](N1_전체_사이트맵) | SITEMAP_N1 | 전체 67개 라우트 — 11개 도메인 subgraph |
| [N2_도메인별_사이트맵](N2_도메인별_사이트맵) | SITEMAP_N2 | 도메인 11개 각각 독립 다이어그램 |
| [N3_사이드바_계층트리](N3_사이드바_계층트리) | SITEMAP_N3 | 사이드바 메뉴 계층 트리 |
| [N4_URL패턴맵](N4_URL패턴맵) | SITEMAP_N4 | 파라미터화된 URL 패턴 |
| [N5_브레드크럼_계층](N5_브레드크럼_계층) | SITEMAP_N5 | 각 화면 브레드크럼 경로 |
| [N6_에러_복귀경로](N6_에러_복귀경로) | SITEMAP_N6 | 404/500/403 복귀 경로 |
| [N7_회원앱_기존프로젝트_연계맵](N7_회원앱_기존프로젝트_연계맵) | SITEMAP_N7 | 회원앱과 기존 CRM 모듈 간 연계 구조 |

---

## 도메인 구성 (11개)

| 도메인 | 라우트 수 | 대표 SCR | 설명 |
|--------|---------|---------|------|
| D01 공통/인증/대시보드 | 2 | SCR-100, SCR-090 | 로그인, 지점 대시보드 |
| D10 본사관리 | 9 | SCR-091~099 | 슈퍼대시보드, 지점관리, KPI 등 |
| D02 회원관리 | 5 | SCR-010~015 | 회원 CRUD, 체성분 |
| D04 수업관리 | 9 | SCR-020~029 | 캘린더, 수업, 시간표 등 |
| D03 매출관리 | 6+2 | SCR-030~037 | 매출, POS, 환불, 미수금 |
| D05 상품관리 | 4 | SCR-040~043 | 상품 CRUD, 할인설정 |
| D06 시설관리 | 6 | SCR-050~055 | 락커, RFID, 운동룸 등 |
| D07 직원관리 | 5+2 | SCR-060~065 | 직원, 급여 |
| D08 마케팅 | 6 | SCR-070~075 | 리드, 메시지, 쿠폰 등 |
| D09 설정관리 | 4 | SCR-080~083 | 센터설정, 권한, 키오스크, IoT |
| D11 기타 | 9 | SCR-084~086, 기타 | 구독, 공지, 출석, 에러 등 |

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
