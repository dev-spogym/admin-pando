# Client Docs 전체 TC 세트

## 목적
- `docs/client` 기준으로 회원앱 기획 문서를 요약 없이 TC 단위로 전개한다.
- 화면, 시나리오, 상태전이, 권한, 자동화, 에러, admin 연동, kiosk 연동을 빠짐없이 E2E 이전 검증 대상으로 만든다.

## 전체 커버리지
- 화면: 35
- 화면 흐름 묶음: 7
- 사이트맵: 5
- 권한 매트릭스: 1
- 상태전이: 4
- 시나리오 시퀀스: 10
- 자동화: 3
- 에러 예외: 5
- admin 연동: 10
- kiosk 연동: 6

## 문서 구성
- `01_tc_guide.md`: 상태 코드, 분류 코드, E2E 전환 규칙
- `scr_ma_*_tc.md`: 각 화면별 개별 TC
- `90_flow_bundle_tc.md`: D12 묶음 플로우 다이어그램 TC
- `91_sitemap_tc.md`: 역할별 사이트맵/메뉴 계층 TC
- `92_role_matrix_tc.md`: 역할화면 매트릭스 TC
- `93_state_transition_tc.md`: 예약/이용권/주문/마일리지 상태전이 TC
- `94_scenario_sequence_tc.md`: X01~X10 시퀀스 TC
- `95_automation_tc.md`: 자동화 TC
- `96_error_exception_tc.md`: 에러/복구 TC
- `97_admin_integration_tc.md`: admin 연동 TC
- `98_kiosk_integration_tc.md`: kiosk 연동 TC
- `99_gap_notes.md`: 문서 공백 관리

## 작성 원칙
- 각 화면은 독립 문서로 분리한다.
- 한 화면 안에서도 진입, 구성, 행동, 조건 분기, 상태, 권한, 연동, 예외, 피드백, 횡단 연결까지 분해한다.
- E2E는 이 전체 TC에서 `Ready`와 핵심 플로우를 추린 뒤에만 만든다.
