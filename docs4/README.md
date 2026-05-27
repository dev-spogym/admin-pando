# docs4

docs4는 `docs2` 기획서를 개발 범위 기준으로 재배치한 납품용 문서입니다.

## 생성 기준

- 체크리스트: `lastspr/v1checklist.xlsx`
- 시트: `3.CRM (admin)_제로스트_0518논의`
- V1: 4행부터 751행까지
- V2: 753행 이후 및 V1 코드와 직접 매칭되지 않는 보류/기타 섹션
- V1/V2가 같은 섹션에 섞인 경우 표 row, bullet, numbered step, 문단 단위로 분리해 V2 항목을 V1에서 제외했습니다.
- `_공통`은 V1/V2 양쪽에서 참조하는 공통 정책/정의입니다.

## 산출물

- `V1/`: 1차 개발 범위 문서
- `V2/`: 2차 이후 범위 또는 V1 직접 매칭이 없는 문서
- `_공통/`: 공통 권한, 알림, KPI, NFR 등 공유 정의
- `_scope/`: 체크리스트 원본 추출, 섹션 매핑, 검증 리포트

## 요약

- V1 체크리스트 행 수: 748
- V1 고유 코드 수: 741
- V2 원본 체크리스트 행 수: 322
- V2 유효 고유 코드 수: 268
- 동일/상하위 코드 중복으로 V2에서 제외한 코드 수: 17
- 섹션 분류 요약: V1 48, V1_REFERENCED_COPY 2, V1_SHARED_REF 3, V1_SPLIT 176, V1_SUPPORT 68, V1_SUPPORT_SPLIT 9, V2 47, V2_SPLIT 200, V2_SUPPORT 68, V2_SUPPORT_SPLIT 9, V2_UNMAPPED 48

## 사용 방법

1. V1 개발자는 `docs4/V1`과 `docs4/_공통`을 우선 봅니다.
2. 섹션 상단의 `docs4 Scope` 메타 블록에서 엑셀 행과 매칭 근거를 확인합니다.
3. 매칭 근거가 `V1_SUPPORT`, `V2_UNMAPPED`, `V1_SPLIT`, `V2_SPLIT`인 항목은 `_scope/scope_verification_report.md`에서 추가 확인합니다.
