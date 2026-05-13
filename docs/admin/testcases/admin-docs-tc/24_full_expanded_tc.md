# 전체 확장 TC 요약

## 목적
- docs/admin/testcases/admin-docs-tc 기준 기본 TC를 실제 실행 단위까지 5배 확장한 상세 TC 세트를 생성한다.
- 클라이언트 인수검수, SQA, 운영 시뮬레이션, 권한/예외/후속 반영 검증에 바로 사용할 수 있는 대량 TC를 산출한다.

## 생성 결과
- 기본 TC 행 수: 2307
- 확장 TC 행 수: 11535
- 생성 규칙: 기본 TC 1건당 상세 실행 TC 5건(D01~D05) 확장
- 산출 파일:
  - docs/admin/testcases/admin-docs-tc/_generated/full_expanded_tc.csv
  - docs/admin/testcases/admin-docs-tc/_generated/full_expanded_tc.json

## 확장 규칙
- FLW: happy path, 연속 처리, 재진입, stale context, 후속 반영
- UI: 기본 렌더, 긴 데이터, 반응형, 비활성, 피드백
- LINK: 대표 CTA, 보조 동선, 복귀, 만료 컨텍스트, 다중 실행
- DATA: 정상값, 경계값, 중복/충돌, 영속성, downstream 반영
- STA: loading, empty, active, inactive, transition
- RBAC: 허용, 읽기전용, 거절, 범위 차이, 추적성
- ERR: validation, API 실패, timeout, 동시성 충돌, recovery
- CUST: 정상, 필수값, 분기, 후속 반영, 감사 로그

## 문서별 기본 TC 상위 현황
- `12_d02_member_tc.md`: 275 base TC
- `14_d04_class_tc.md`: 240 base TC
- `15_d05_product_tc.md`: 222 base TC
- `18_d08_marketing_tc.md`: 213 base TC
- `13_d03_sales_tc.md`: 212 base TC
- `16_d06_facility_tc.md`: 204 base TC
- `19_d09_settings_tc.md`: 198 base TC
- `20_d10_hq_tc.md`: 171 base TC
- `11_d01_common_tc.md`: 120 base TC
- `90_scenario_sequence_tc.md`: 105 base TC
