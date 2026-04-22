# D04_수업관리 — 도메인 인덱스

> **도메인**: 수업관리 (Class Management)
> **화면설계서**: `docs/화면설계서/수업관리`
> ****: 2026-04-20

---

## SCR 목록 (15종 × 9세트 = 135파일)

| SCR ID | 화면명 | 디렉토리 | 비고 |
|--------|--------|----------|------|
| SCR-C001 | 수업/캘린더 | SCR-C001_수업캘린더/ | FullCalendar, 드래그앤드롭 |
| SCR-C002 | 수업 관리 | SCR-C002_수업관리/ | CRUD + 수업기록 |
| SCR-C003 | 시간표 일괄 등록 | SCR-C003_시간표일괄등록/ | 반복수업 일괄생성 |
| SCR-C004 | 그룹수업 템플릿 관리 | SCR-C004_그룹수업템플릿/ | 템플릿 CRUD |
| SCR-C005 | 그룹수업 현황 | SCR-C005_그룹수업현황/ | 출석률/트렌드 차트 |
| SCR-C006 | 강사 근무 현황 | SCR-C006_강사근무현황/ | 강사 카드 그리드 |
| SCR-C007 | 횟수 관리 | SCR-C007_횟수관리/ | 수강권 세션 차감 |
| SCR-C008 | 페널티 관리 | SCR-C008_페널티관리/ | 노쇼/지각 페널티 |
| SCR-C009 | 일정 요청 처리 | SCR-C009_일정요청처리/ | 승인/거절/대안제시 |
| SCR-C010 | 운동 프로그램 관리 | SCR-C010_운동프로그램관리/ | 운동구성 CRUD |
| SCR-C011 | 유효 수업 목록 | SCR-C011_유효수업목록/ | 카드 그리드 |
| SCR-C012 | 대기열 관리 🆕 | SCR-C012_대기열관리/ | 자동/수동 배정 |
| SCR-C013 | 수업 평가/피드백 🆕 | SCR-C013_수업평가피드백/ | 만족도 분석 |
| SCR-C014 | 출석 QR 체크인 🆕 | SCR-C014_출석QR체크인/ | QR 생성/스캔 |
| SCR-C015 | 수업 녹화 관리 🆕 | SCR-C015_수업녹화관리/ | 영상 업로드/공개 |

---

## DLG 목록 (16종 × 3세트 = 48파일)

| DLG ID | 모달명 | 디렉토리 | 트리거 SCR |
|--------|--------|----------|-----------|
| DLG-C001 | 수업 등록/수정 (캘린더) | DLG/DLG-C001_수업등록수정_캘린더/ | SCR-C001 |
| DLG-C002 | 일정 상세 | DLG/DLG-C002_일정상세/ | SCR-C001 |
| DLG-C003 | 수업 등록/수정 (관리) | DLG/DLG-C003_수업등록수정_관리/ | SCR-C002 |
| DLG-C004 | 일괄 변경 | DLG/DLG-C004_일괄변경/ | SCR-C002 |
| DLG-C005 | 수업 기록 상세 | DLG/DLG-C005_수업기록상세/ | SCR-C002 |
| DLG-C006 | 서명 | DLG/DLG-C006_서명/ | DLG-C005 |
| DLG-C007 | 노쇼/취소 정책 | DLG/DLG-C007_노쇼취소정책/ | SCR-C002 |
| DLG-C008 | 일괄 생성 확인 | DLG/DLG-C008_일괄생성확인/ | SCR-C003 |
| DLG-C009 | 템플릿 등록/수정 | DLG/DLG-C009_템플릿등록수정/ | SCR-C004 |
| DLG-C010 | 강사 상세 | DLG/DLG-C010_강사상세/ | SCR-C006 |
| DLG-C011 | 세션 상세 | DLG/DLG-C011_세션상세/ | SCR-C007 |
| DLG-C012 | 횟수 조정 | DLG/DLG-C012_횟수조정/ | SCR-C007 |
| DLG-C013 | 차감 이력 | DLG/DLG-C013_차감이력/ | SCR-C007 |
| DLG-C014 | 페널티 등록 | DLG/DLG-C014_페널티등록/ | SCR-C008 |
| DLG-C015 | 자동 페널티 정책 | DLG/DLG-C015_자동페널티정책/ | SCR-C008 |
| DLG-C016 | 대안 일정 제시 | DLG/DLG-C016_대안일정제시/ | SCR-C009 |

---

## 수업 상태 (S5 LessonStatus)

| 상태 | label | 연결 |
|------|-------|------|
| scheduled | 예정 | `docs/다이어그램/20_상태전이도/20-05_LessonStatus` |
| in_progress | 진행중 | - |
| completed | 완료 | 서명(DLG-C006) 연결 |
| no_show | 노쇼 | 자동페널티(A05) 연결 |
| cancelled | 취소 | 페널티정책(DLG-C007) 연결 |

---

## 자동화 참조

| 자동화 ID | 설명 | 연결 SCR/DLG |
|-----------|------|-------------|
| A05 | 자동 페널티 발생 (이벤트 기반) | SCR-C008, DLG-C015 |
| A03 | 이용권 자동 만료 | SCR-C007 |

---

## classDef 공통 (전 파일 동일)

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
