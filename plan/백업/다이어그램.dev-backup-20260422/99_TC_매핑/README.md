# TC 트레이서빌리티 매트릭스

> **목적**: 다이어그램의 모든 엣지를 TC ID와 매핑하여 **QA 커버리지 ≥ 95%** 달성
> **기준 계획서**: `../../다이어그램_작성계획.md` 섹션 7

---

## 📋 파일 구성

| 파일 | 용도 |
|------|------|
| `TC_트레이서빌리티_매트릭스.csv` | 엣지ID ↔ TC ID 1:N 매핑 |
| `TC_커버리지_리포트.md` | 도메인별 커버리지 집계 |
| `검증리포트.md` | 자동 검증 스크립트 결과 |

---

## 📐 CSV 스키마

```csv
edgeId,diagramId,fromNode,toNode,label,actor,tcId,tcType,priority,automated,notes
```

| 컬럼 | 의미 | 예시 |
|------|------|------|
| edgeId | 엣지 고유 ID | E_SCR_M002_DLG_M006_01 |
| diagramId | 다이어그램 ID | F2_SCR-M002 |
| fromNode | 출발 노드 ID | SCR_M002 |
| toNode | 도착 노드 ID | DLG_M006 |
| label | 엣지 라벨 (사용자 액션) | "저장 클릭 [중복 감지]" |
| actor | 수행 주체 | manager / system / PG |
| tcId | 매핑된 TC ID | TC-M002-05 |
| tcType | positive / negative / boundary / exception | negative |
| priority | P0 / P1 / P2 / P3 | P0 |
| automated | Y / N (자동화 가능 여부) | Y |
| notes | 비고 | "PG 모킹 필요" |

---

## 🔢 TC ID 규칙

```
TC-{도메인}{SCR번호}-{일련번호}[{-타입접미사}]
예:
  TC-M002-01        기본 positive
  TC-M002-02-NEG    negative
  TC-M002-03-BND    boundary
  TC-M002-04-EXC    exception
  TC-S001-010       매출 현황 10번
```

---

## 📊 커버리지 공식

```
엣지 커버리지 = (매핑된 고유 엣지 수 / 전체 엣지 수) × 100
TC 커버리지  = (매핑된 고유 TC 수 / 도출된 TC 수) × 100
자동화율     = (automated=Y 엣지 / 전체 매핑 엣지) × 100

목표:
  엣지 커버리지 ≥ 95%
  TC 커버리지  ≥ 95%
  자동화율     ≥ 70%
```

---

## 🔧 자동 검증 스크립트

| 스크립트 | 위치 | 기능 |
|----------|------|------|
| verify-diagram-tc-mapping.cjs | /scripts/diagram/ | 엣지 ID 추출 + CSV 대조 |
| verify-scr-dlg-consistency.cjs | /scripts/diagram/ | SCR/DLG ID 화면설계서 교차 대조 |
| diagram-coverage.cjs | /scripts/diagram/ | 9종 세트 채움률 |

실행:
```bash
node scripts/diagram/verify-diagram-tc-mapping.cjs
node scripts/diagram/verify-scr-dlg-consistency.cjs
node scripts/diagram/diagram-coverage.cjs
```

---

## ✅ 검증 체크리스트

- [ ] 모든 다이어그램 파일 최상단 YAML 헤더 존재
- [ ] 모든 엣지에 E_xxx ID 부여
- [ ] 엣지 커버리지 ≥ 95%
- [ ] 네거티브 엣지 비율 ≥ 30%
- [ ] 6개 RBAC 역할 모두 엣지에 등장
- [ ] 🆕 미구현 엣지는 tcType에 명시
