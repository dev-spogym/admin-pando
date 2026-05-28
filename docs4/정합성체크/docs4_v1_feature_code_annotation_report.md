# docs4 V1 feature code annotation report

- Scope: `lastspr/v1checklist.xlsx` rows 4-751, F-column planning codes.
- Excluded: blank F values, INF/DB/API/DOC, and backend-like broad codes.
- Rule: no new IDs were created; only existing planning codes were surfaced.
- Body rule: inline annotation was applied only inside the UI composition section when the label matched a child code under the section linked-feature parent.
- Policy rule: detailed feature-code reference tables were appended at EOF so existing line anchors do not drift.
- Policy anchors are resolved inside each linked-feature body section; cross-section mentions are not used as the primary reference.

## Summary

- Valid planning codes: 644
- Parent codes: 71
- Connected body-scope codes: 621
- Unconnected valid codes kept out of docs: 23
- Policy reference tables: 9 domains / 621 rows
- Policy empty mapping notes: 2 domains (`D06-시설관리`, `D11-통합운영`)

## Policy Tables

- `V1/D01-공통/운영정책.md`: 9 rows
- `V1/D02-회원관리/운영정책.md`: 78 rows
- `V1/D03-매출관리/운영정책.md`: 106 rows
- `V1/D04-수업관리/운영정책.md`: 120 rows
- `V1/D05-상품관리/운영정책.md`: 29 rows
- `V1/D07-직원관리/운영정책.md`: 76 rows
- `V1/D08-마케팅/운영정책.md`: 66 rows
- `V1/D09-설정관리/운영정책.md`: 55 rows
- `V1/D10-본사관리/운영정책.md`: 82 rows

## Body Code Visibility By Domain

- `D01-공통`: 5 codes visible in body
- `D02-회원관리`: 30 codes visible in body
- `D03-매출관리`: 45 codes visible in body
- `D04-수업관리`: 58 codes visible in body
- `D05-상품관리`: 4 codes visible in body
- `D07-직원관리`: 27 codes visible in body
- `D08-마케팅`: 29 codes visible in body
- `D09-설정관리`: 11 codes visible in body
- `D10-본사관리`: 10 codes visible in body

## Unconnected Existing Planning Codes

These codes exist in the F column but were not added because no matching docs4/V1 body linked-feature parent was found.

| row | code | feature | category |
|---:|---|---|---|
| 95 | DASH-01 | 본사 대시보드 (지점 운영 종합 현황) | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 86 | DASH-01-01 | 핵심 지표 카드 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 87 | DASH-01-02 | 분포 차트 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 88 | DASH-01-03 | 추이 차트 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 89 | DASH-01-04 | 주의 대상 위젯 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 90 | DASH-01-05 | 최근 활동 로그 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 91 | DASH-01-06 | 상단 액션 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 92 | DASH-01-07 | 회원 상세 진입 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 96 | HQ-01 | 슈퍼 대시보드 (전 지점 통합 KPI) | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 97 | HQ-01-01 | 전사 통합 KPI | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 98 | HQ-01-02 | 지점별 현황 카드 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 99 | HQ-01-03 | 히스토리 로그 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 100 | HQ-01-04 | 지점 전환 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 101 | HQ-01-05 | 권한 검증 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 102 | HQ-01-06 | 새로고침 | 4. 관리자·본사 대시보드 (DASH & HQ) |
| 557 | HQ-05 | 온보딩 대시보드 (신규 회원 정착 추적) | 13. 본사관리 (HQ) |
| 558 | HQ-05-01 | 프리-온보딩 KPI | 13. 본사관리 (HQ) |
| 559 | HQ-05-02 | 신규 유치 KPI | 13. 본사관리 (HQ) |
| 560 | HQ-05-03 | 신규 안정 KPI | 13. 본사관리 (HQ) |
| 561 | HQ-05-04 | 상담/가입 경로 | 13. 본사관리 (HQ) |
| 562 | HQ-05-05 | 단계 진행률 | 13. 본사관리 (HQ) |
| 563 | HQ-05-06 | 신규 회원 목록 | 13. 본사관리 (HQ) |
| 564 | HQ-05-07 | 이탈 위험 섹션 | 13. 본사관리 (HQ) |
