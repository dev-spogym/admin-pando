# FitGenie CRM — 유저플로우 다이어그램 인덱스

> **목적**: 화면설계서 기반 유저플로우 Mermaid 다이어그램의 SSoT (TC/QA 원천)
> **기준 계획서**: `../다이어그램_작성계획.md` v2.0
> **마지막 업데이트**: 2026-04-20

---

## 📂 구조

```
다이어그램/
├─ 00_사이트맵/              # IA / 네비게이션 (N1~N6)
├─ 10_권한매트릭스/          # RBAC 6역할 (R1~R8)
├─ 20_상태전이도/            # 엔티티 상태 (S1~S16)
├─ 30_시나리오_시퀀스/        # 크로스도메인 (X01~X30)
├─ 40_자동화_크론/            # 시스템 자동 프로세스 (A1~A12)
├─ 50_에러_예외/              # 에러코드별 플로우 (E01~E20+)
├─ 60_데이터흐름/             # erDiagram + pipeline
├─ 99_TC_매핑/                # TC 트레이서빌리티
├─ D01_공통/ ~ D11_통합운영/   # 도메인별 SCR 9종 × DLG 3종 세트
```

---

## 🎨 Mermaid 컨벤션

### 노드 ID 규칙
| 접두사 | 용도 |
|--------|------|
| `SCR_` | 화면 (예: `SCR_M001`) |
| `DLG_` | 모달/다이얼로그 (예: `DLG_M006`) |
| `STATE_` | 상태 노드 (예: `STATE_ACTIVE`) |
| `ACTION_` | 시스템 액션 (예: `ACTION_SAVE`) |
| `EXT_` | 외부 시스템 (예: `EXT_PG`) |
| `TOAST_` | 토스트 결과 (예: `TOAST_OK`) |

### 엣지 ID 규칙 (TC 매핑 필수)
```
E_{출발노드}_{도착노드}_{일련번호}
예: E_SCR_M001_SCR_M002_01
```

### 스타일 클래스 (전 파일 공통)
```
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

### 다이어그램 파일 메타 헤더 (필수)
```markdown
---
diagramId: F2_SCR-M002
title: 회원 등록 메인 인터랙션
type: flowchart
scope: SCR-M002
dependencies: [DLG-M006, DLG-M027]
actors: [manager, staff]
tcMappings: [TC-M002-01, TC-M002-02]
lastUpdated: 2026-04-20
---
```

---

## 📋 SCR 표준 9종 세트 (F1~F9)

| ID | 이름 | 목적 |
|----|------|------|
| F1 | 진입 플로우 | 어디서 진입 가능한지 |
| F2 | 메인 인터랙션 | 정상 시나리오 Happy Path |
| F3 | 버튼/액션 매핑 | 모든 버튼 노드화 |
| F4 | 필터/검색/정렬 | 쿼리 조작 |
| F5 | 모달 트리거 트리 | SCR→DLG→하위 DLG |
| F6 | 상태별 화면 | 로딩/빈/에러/권한없음 |
| F7 | 권한(RBAC) 분기 | 6개 역할별 |
| F8 | 에러/예외/복구 | 에러코드별 |
| F9 | 토스트/피드백 | 성공/경고/에러/정보 |

## 📋 DLG 표준 3종 세트 (M1~M3)

| ID | 이름 | 목적 |
|----|------|------|
| M1 | 모달 생명주기 | 트리거→열림→입력→검증→저장/취소→닫힘 |
| M2 | 필드 검증 | 필수/형식/중복/범위 |
| M3 | 결과 분기 | API 응답별 토스트/부모 갱신 |

---

## 🔗 TC 매핑

- 모든 엣지는 `E_xxx` ID 필수
- 99_TC_매핑/TC_트레이서빌리티_매트릭스.csv 에서 엣지↔TC 매핑
- 목표 커버리지 ≥ 95%

---

## ✅ 누락 금지 체크리스트 (SCR당)

- [ ] 진입 출처 5종 이상
- [ ] 권한 검증 6역할
- [ ] 모든 버튼/모달 트리거
- [ ] 필터/검색/정렬/페이지네이션
- [ ] 상태 분기 (로딩/빈/에러/권한없음/오프라인)
- [ ] 에러코드 분기
- [ ] 토스트 4종
- [ ] 키보드 단축키
- [ ] 이탈 경로 (뒤로/로그아웃/세션만료)
- [ ] 🆕 미구현 점선 표기
- [ ] 엣지 ID 전부 부여
- [ ] 성공/검증실패/시스템에러 3갈래 분기
