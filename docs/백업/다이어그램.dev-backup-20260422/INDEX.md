# FitGenie CRM 다이어그램 마스터 인덱스

> **QA/TC 원천 SSoT**. 모든 화면/모달/상태/자동화/에러를 유저플로우 관점의 Mermaid 다이어그램으로 집적.
> **기준 계획서**: `../다이어그램_작성계획.md` v2.0

---

## 🗺️ 전체 구조

| 섹션 | 목적 | 문서 |
|------|------|------|
| [00 사이트맵](00_사이트맵/README.md) | IA/네비게이션 | N1~N6 |
| [10 권한매트릭스](10_권한매트릭스/README.md) | RBAC 6역할 | R1~R8 |
| [20 상태전이도](20_상태전이도/) | 엔티티 상태 | S1~S16 |
| [30 시나리오 시퀀스](30_시나리오_시퀀스/README.md) | 크로스도메인 | X01~X30 |
| [40 자동화 크론](40_자동화_크론/README.md) | 시스템 자동 | A01~A12 |
| [50 에러 예외](50_에러_예외/README.md) | 에러코드 | E01~E20 |
| [60 데이터흐름](60_데이터흐름/README.md) | ER/파이프라인 | DF01~DF10 |
| [D01 공통](D01_공통/README.md) | 로그인/대시보드/알림 | SCR-100~109 |
| [D02 회원관리](D02_회원관리/README.md) | 회원 + 15탭 + DLG30 | SCR-M001~M010 |
| [D03 매출관리](D03_매출관리/README.md) | 매출/POS/환불 | SCR-S001~S012 |
| [D04 수업관리](D04_수업관리/README.md) | 캘린더/수업/PT | SCR-C001~C015 |
| [D05 상품관리](D05_상품관리/README.md) | 상품/할인/재고 | SCR-P001~P008 |
| [D06 시설관리](D06_시설관리/README.md) | 락커/운동복 | SCR-050~055 |
| [D07 직원관리](D07_직원관리/README.md) | 직원/근태/급여 | SCR-060~065 |
| [D08 마케팅](D08_마케팅/README.md) | 리드/메시지/쿠폰 | SCR-070~075 |
| [D09 설정관리](D09_설정관리/README.md) | 센터/권한/IoT | SCR-080~086 |
| [D10 본사관리](D10_본사관리/README.md) | 본사/지점/KPI | SCR-090~099 |
| [D11 통합운영](D11_통합운영/README.md) | IoT/헬스/키오스크 | SCR-I001~I007 |
| [99 TC 매핑](99_TC_매핑/README.md) | 트레이서빌리티 | CSV + 검증 |

---

## 📐 SCR 표준 9종 세트

각 SCR은 아래 9개 파일을 보유:

| ID | 다이어그램 | 기본 TC 타입 |
|----|-----------|:----:|
| F1 | 진입 플로우 | positive |
| F2 | 메인 인터랙션 | positive + negative + exception |
| F3 | 버튼/액션 매핑 | positive |
| F4 | 필터/검색/정렬/페이지 | boundary |
| F5 | 모달 트리거 트리 | positive |
| F6 | 상태별 화면 | boundary/negative |
| F7 | 권한(RBAC) 분기 | 6개 역할 × negative |
| F8 | 에러/예외/복구 | negative + exception |
| F9 | 토스트/피드백 | positive |

## 📐 DLG 표준 3종 세트

| ID | 다이어그램 |
|----|-----------|
| M1 | 모달 생명주기 |
| M2 | 필드 검증 |
| M3 | 결과 분기 (API 응답별) |

---

## 🔗 TC 매핑

```
엣지 ID: E_{출발}_{도착}_{번호}
TC  ID: TC-{도메인}-{번호}[-NEG/-EXC/-BND]
```

- 매트릭스: [99_TC_매핑/TC_트레이서빌리티_매트릭스.csv](99_TC_매핑/TC_트레이서빌리티_매트릭스.csv)
- 검증 스크립트: [scripts/diagram/](../../scripts/diagram/)

## 🏃 자동 검증 명령

```bash
# 모든 엣지 추출 → CSV 자동 채움 (TC ID 플레이스홀더)
node scripts/diagram/auto-fill-tc-matrix.cjs

# TC 매핑 커버리지 검증 (목표 ≥ 95%)
node scripts/diagram/verify-diagram-tc-mapping.cjs

# 화면설계서 ↔ 다이어그램 SCR/DLG 일관성
node scripts/diagram/verify-scr-dlg-consistency.cjs

# SCR 9종/DLG 3종 채움률
node scripts/diagram/diagram-coverage.cjs
```

## 📊 현재 진행 상태 (2026-04-20)

| 지표 | 현재값 | 목표 |
|------|:----:|:----:|
| 파일 수 | 270+ | 900~1,000 |
| 엣지 총수 | 2,671 | - |
| TC 매핑 커버리지 | 93.49% | ≥ 95% |
| SCR/DLG 일관성 | 100% (0건 불일치) | 100% |
| SCR 9종 채움률 | 19.6% | 100% |
| DLG 3종 채움률 | 0% (진행 예정) | 100% |

---

## 🎯 사용 가이드

### 신규 기능 설계 시
1. `INDEX.md` → 해당 도메인 선택
2. `SCR-xxx/F1~F9` 템플릿으로 9종 다이어그램 작성
3. 엣지 ID 부여 후 `auto-fill-tc-matrix.cjs` 실행
4. `verify-*` 스크립트로 검증

### QA TC 작성 시
1. 해당 SCR의 `F2_메인.md`, `F7_권한.md`, `F8_에러.md`에서 엣지 전수 추출
2. `TC_트레이서빌리티_매트릭스.csv`에서 edgeId로 TC ID 확인
3. TC 문서 작성 시 `traceId = edgeId` 기재 → 역추적 가능
4. 엣지 라벨 = TC의 Given/When/Then 초안

### 개발 완료 시
1. 화면설계서와 다이어그램 동시 업데이트
2. `verify-scr-dlg-consistency.cjs` 실행
3. 변경된 엣지는 CSV에서 수동 TC 재매핑
