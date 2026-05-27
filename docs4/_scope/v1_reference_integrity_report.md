# docs4/V1 참조·정의 집합 무결성 검증 리포트

## 기준

- 대상: `docs4/V1/**/*.md`
- 원본 화면 기준: `docs/admin/화면설계서/**/00-*.md` frontmatter `id`, `feature_codes`
- 원본 기능 기준: `docs/admin/기능명세서/**/00-*.md` 및 `docs4/_scope/v1_checklist_rows_4_751.csv`
- 검증 범위: 화면/다이얼로그 참조 존재 여부, V1 섹션의 연결 기능과 원본 `feature_codes` 비교, `N종/N개` 정의 집합의 항목 명시 여부와 원본 개수 drift

## 요약

- ERROR: 0
- WARN: 17
- 전체 이슈: 17

## 폴더별 이슈 수

| 폴더 | 이슈 수 |
|---|---:|
| `D02-회원관리` | 1 |
| `D03-매출관리` | 2 |
| `D05-상품관리` | 1 |
| `D07-직원관리` | 1 |
| `D08-마케팅` | 3 |
| `D09-설정관리` | 1 |
| `D10-본사관리` | 8 |

## 1. 화면참조 무결성

- 발견 없음

## 2. 화면-기능 연결 집합

- 발견 없음

## 3. 정의 집합 드리프트 후보

| 심각도 | 유형 | 위치 | 참조 | 내용 |
|---|---|---|---|---|
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D02-회원관리\회원관리.md:402` SCR-M004 회원 상세 | `SCR-M004` | 원본 화면에는 `탭` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 15개 탭, 15개 탭 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D03-매출관리\매출관리.md:270` SCR-S004 매출 통계 | `SCR-S004` | 원본 화면에는 `분류` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 5종 으로 분류 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D03-매출관리\매출관리.md:817` SCR-S009 할부결제 관리 | `SCR-S009` | 원본 화면에는 `탭` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 4개 탭 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D05-상품관리\상품관리.md:45` SCR-P001 상품 관리 | `SCR-P001` | 원본 화면에는 `분류` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 6개 분류 선택 시 2단계 세부종목은 아래 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D07-직원관리\직원관리.md:386` SCR-063 직원 근태 관리 | `SCR-063` | 원본 화면에는 `배지` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 6종 상태 배지, 4종 배지 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D08-마케팅\마케팅.md:505` SCR-073 쿠폰 관리 | `SCR-073` | 원본 화면에는 `카드` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 4종 지표 카드 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D08-마케팅\마케팅.md:937` SCR-078 SMS/카카오 대량 발송 | `SCR-078` | 원본 화면에는 `채널` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 4종 채널 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D08-마케팅\마케팅.md:937` SCR-078 SMS/카카오 대량 발송 | `SCR-078` | 원본 화면에는 `알림` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 4종 알림톡 |
| WARN | `SET_COUNT_ITEM_MISMATCH` | `D09-설정관리\설정관리.md:1484` DLG-081-006 역할 변경 영향 분석 | `2종 카드` | 표기된 개수는 2개이나 추출된 항목은 4개입니다: 배정 직원 수 / 담당 회원 합계 / 권한 차이 / 재배정 필요 여부 |
| WARN | `SET_COUNT_ITEM_MISMATCH` | `D10-본사관리\본사관리.md:90` SCR-092 지점 관리 | `9개 컬럼` | 표기된 개수는 9개이나 추출된 항목은 1개입니다: 차트 막대 |
| WARN | `SOURCE_SET_COUNT_DRIFT` | `D10-본사관리\본사관리.md:292` SCR-095 KPI 센터 | `SCR-095` | 원본 `지표` 집합 개수=[3, 4], docs4 `지표` 집합 개수=[4]. 같은 화면 정의 집합과 다르게 읽힙니다. |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D10-본사관리\본사관리.md:637` SCR-H1004 예측 분석 | `SCR-H1004` | 원본 화면에는 `항목` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 3개 항목을 최대 |
| WARN | `SET_COUNT_ITEM_MISMATCH` | `D10-본사관리\본사관리.md:1379` SCR-094 KPI 대시보드 | `4종 의 강습세션` | 표기된 개수는 4개이나 추출된 항목은 3개입니다: 공식 원천은 수업 / 출석 / 일정 원장에 저장된 강습 세션 유형입니다 |
| WARN | `SET_COUNT_WITHOUT_ITEMS` | `D10-본사관리\본사관리.md:1387` SCR-094 KPI 대시보드 | `4종 유형과 동일한 PT/GX/골프/기타` | 집합 개수는 있으나 같은 줄 또는 직후 표/목록에서 구성 항목을 명확히 추출하지 못했습니다. |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D10-본사관리\본사관리.md:1270` SCR-094 KPI 대시보드 | `SCR-094` | 원본 화면에는 `지표` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 4종 세부 지표 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D10-본사관리\본사관리.md:1270` SCR-094 KPI 대시보드 | `SCR-094` | 원본 화면에는 `분류` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 5종 으로 고정 분류 |
| WARN | `SOURCE_SET_NOT_REFLECTED` | `D10-본사관리\본사관리.md:1447` SCR-H1001 자동화 정책 라이브러리 | `SCR-H1001` | 원본 화면에는 `유형` 집합 정의가 있으나 docs4 섹션에서 같은 유형 집합 표현을 찾지 못했습니다: 3개 정책 유형 |

## 산출물

- `docs4/_scope/v1_reference_issues.csv`
- `docs4/_scope/v1_feature_link_issues.csv`
- `docs4/_scope/v1_definition_set_issues.csv`
