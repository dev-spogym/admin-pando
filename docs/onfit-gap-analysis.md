# OnFit vs 스포짐 CRM - GAP 분석

> 분석일: 2026-03-18
> 대상: OnFit (admin.onfitgym.com) 판교역점 vs pando-beta (스포짐 CRM)

---

## 1. 전체 메뉴 구조 비교

### OnFit 메뉴
```
상단바: 공지사항, 회원검색, 회원등록, 지점선택
좌측:
├── 회원 (4)
│   ├── 회원 관리 (2탭: 회원조회/상품별 회원조회)
│   ├── 방문 이력
│   ├── 전자 계약 (5단계 위자드)
│   └── 일일 입장 판매 등록
├── 일정 (2)
│   ├── 일정 (일별/주별 캘린더)
│   └── 일정 요청 처리
├── 수업 (8)
│   ├── 그룹수업 관리
│   ├── 그룹수업템플릿 관리
│   ├── 룸 좌석 배치 정보
│   ├── 그룹수업 시간표 등록
│   ├── 세션 관리
│   ├── 1:1 회원 수업현황
│   ├── 그룹수업현황
│   └── 강사 근무 현황
├── 매출 (3)
│   ├── 매출 통계
│   ├── 매출관리
│   └── 선수익금 조회
├── 시설 (8)
│   ├── 모바일앱
│   ├── 배너 관리
│   ├── 일일 사물함
│   ├── 개인 사물함
│   ├── 골프 사물함
│   ├── 밴드/카드
│   ├── 타석 관리
│   └── 운동룸 관리
└── 설정 (7)
    ├── 상품 관리
    ├── 할인 설정
    ├── 직원 관리
    ├── 직원근태관리
    ├── 운동 프로그램 관리
    ├── 권한 관리
    └── 센터 설정
```

### 스포짐 CRM 메뉴 (현재)
```
좌측:
├── 대시보드
├── 회원 (4)
│   ├── 회원 목록
│   ├── 출석 관리
│   ├── 마일리지 관리
│   └── 전자계약
├── 수업/캘린더 (4)
│   ├── 캘린더
│   ├── 수업 관리
│   ├── 횟수 관리
│   └── 페널티 관리
├── 매출 (6)
│   ├── 매출 현황
│   ├── 매출 통계
│   ├── POS 결제
│   ├── 현장 판매
│   ├── 환불 관리
│   └── 미수금 관리
├── 상품 (1)
│   └── 상품 관리
├── 시설 (5)
│   ├── 락커 관리
│   ├── 사물함 관리
│   ├── 밴드/카드
│   ├── 운동룸
│   └── 운동복
├── 급여 (2)
│   ├── 급여 관리
│   └── 급여 명세서
├── 메시지/쿠폰 (3)
│   ├── 메시지 발송
│   ├── 자동 알림
│   └── 쿠폰 관리
└── 설정 (7)
    ├── 센터 설정
    ├── 직원 관리
    ├── 권한 설정
    ├── 키오스크
    ├── 출입문/IoT
    ├── 구독 관리
    └── 지점 관리
```

---

## 2. 기능별 GAP 분석

### 범례
- **O** = 있음 (구현 완료)
- **P** = 부분 구현
- **X** = 없음 (미구현)
- **N/A** = 해당 없음

---

### 2.1 회원 관리

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| 회원 목록 조회 | O | O | - | - |
| **상품별 회원조회** (2탭 분리) | O | X | 상품별 필터링 탭 추가 필요 | **높음** |
| 회원구분 필터 (유효/만료/정지/대기) | O | P | 대기 상태 추가 필요 | 중간 |
| **관심회원** 마킹/필터 | O | X | 관심회원 즐겨찾기 기능 추가 | **높음** |
| **미방문 N일 초과** 필터 | O | X | 미방문 회원 필터 추가 | **높음** |
| 회사명 필터 | O | X | 법인회원 회사명 필터 추가 | 낮음 |
| **회원구분** (일반/기명법인/무기명법인) | O | X | 법인회원 유형 추가 | **높음** |
| 별칭 필드 | O | X | 별칭 필드 추가 | 낮음 |
| **유입경로** 추적 | O | X | 유입경로 드롭다운 추가 | **높음** |
| 담당 트레이너/FC 이중 배정 | O | P | FC 역할 분리 필요 | 중간 |
| 회원 검색 (전화번호 뒷4자리) | O | P | 뒷4자리 검색 개선 | 중간 |
| **계열센터 포함** 검색 | O | X | 타지점 회원 검색 | 중간 |
| 프로필 사진 편집 | O | O | - | - |
| 메모 (5000자) | O | O | - | - |
| 엑셀 다운로드 | O | O | - | - |

### 2.2 회원 상세

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| 회원 기본 정보 | O | O | - | - |
| D+N일 만료일 표시 | O | X | 만료 D-day 표시 추가 | 중간 |
| 계약 정보 탭 | O | O (결제이력) | - | - |
| **신체정보** 탭 | O | X | 신체정보(키/몸무게 등) 탭 추가 | **높음** |
| 체성분 정보 탭 | O | O | - | - |
| **종합평가** 탭 | O | X | 회원 종합평가 기능 추가 | **높음** |
| **설문** 탭 | O | X | 설문조사 기능 추가 | 중간 |
| **운동 프로그램** 탭 | O | X | 회원별 운동 프로그램 배정 | **높음** |
| **운동 이력** 탭 | O | X | 운동 수행 이력 기록 | **높음** |
| **온핏 분석** (AI 분석) 탭 | O | X | 회원 데이터 분석 기능 | 낮음 |
| **상담 이력** 탭 | O | X | 상담 기록/이력 관리 | **높음** |
| **예약이력** 탭 | O | X | 예약 이력 조회 탭 추가 | **높음** |
| 일일 사물함 할당/이력 | O | P | 회원 상세에서 직접 할당 | 중간 |
| **출입 NFC 카드 등록** | O | O (밴드/카드) | - | - |
| **지문 등록** (수업 출석) | O | X | 생체인증 출석 | 낮음 |
| 회원권/옵션 내역 | O | O | - | - |
| 방문이력/방문등록 바로가기 | O | P | 상세에서 직접 방문등록 | 중간 |
| 메인센터 변경 | O | O (이관) | - | - |

### 2.3 방문/출석 관리

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| 날짜별 방문 이력 조회 | O | O | - | - |
| **재실 여부** 표시 | O | X | 현재 재실중 회원 표시 | **높음** |
| **입장/퇴장 시간** | O | P | 퇴장 시간 기록 추가 | **높음** |
| **방문 회차** 표시 | O | X | 당일 방문 회차 카운트 | 중간 |
| **실시간 입장 팝업** | O | X | 입장 시 실시간 팝업 알림 | **높음** |
| **일중복입장** 상태 표시 | O | X | 중복입장 감지/표시 | 중간 |
| 만료일 D-day 표시 | O | X | 방문 목록에 D-day 표시 | 중간 |
| 락카번호 표시 | O | X | 방문 시 락카번호 연동 | 중간 |
| 리스트형 뷰 전환 | O | O | - | - |

### 2.4 전자 계약

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| **5단계 위자드** | O | P (ContractWizard) | 위자드 단계 보강 필요 | **높음** |
| 회원정보 입력 | O | O | - | - |
| **상품 선택** 단계 | O | X | 계약 시 상품 선택 UI | **높음** |
| **약관 동의** 단계 | O | X | 약관동의 관리 기능 | **높음** |
| **결제** 단계 | O | P | 계약 내 결제 연동 | **높음** |
| **계약서 확인/출력** | O | P | 계약서 PDF 생성/출력 | **높음** |
| 기존 회원 선택 | O | O | - | - |
| 전화번호 중복확인 | O | O | - | - |
| 전자 서명 | O | O (SignaturePad) | - | - |

### 2.5 일일 입장 판매

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| **일일 입장 판매 등록** | O | X | 비회원 일일 이용권 판매 | 중간 |

### 2.6 일정 관리

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| 주간/일간 캘린더 | O | O | - | - |
| **일정 유형 색상 구분** | O | P | 방문/OT/상담/체성분/수업 색상 구분 | **높음** |
| **일정 대상** (회원/비회원/직원) | O | X | 비회원/직원 일정 등록 | **높음** |
| **일정 분류** (상담/OT 등) | O | X | 일정 카테고리 분류 | **높음** |
| **미승인 일정** 카운트/처리 | O | X | 일정 승인 워크플로 | **높음** |
| **일정 요청 처리** 페이지 | O | X | 회원 요청 일정 승인/거절 | **높음** |
| 담당자 필터 | O | P | - | - |
| 장소 필터 | O | X | 장소별 필터 추가 | 중간 |
| 처리상태 필터 | O | X | 상태별 필터 추가 | 중간 |

### 2.7 수업 관리

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| 수업 CRUD | O | O | - | - |
| **그룹수업템플릿** 관리 | O | X | 수업 템플릿 사전 등록 | **높음** |
| **룸 좌석 배치** 정보 | O | X | 룸별 좌석 레이아웃 | 중간 |
| **그룹수업 시간표** 등록 | O | X | 반복 시간표 일괄 등록 | **높음** |
| **세션 관리** | O | P | 세션 단위 관리 강화 | **높음** |
| **1:1 회원 수업현황** | O | P (횟수관리) | 1:1 수업 전용 현황 뷰 | 중간 |
| **그룹수업현황** 통계 | O | X | 그룹수업 출석률/통계 | **높음** |
| **강사 근무 현황** | O | X | 강사별 근무 시간/수업 현황 | **높음** |
| 수업 등록: 예약방식 (현장/모바일) | O | X | 예약 채널 설정 | 중간 |
| 수업 등록: 예약공개방식 | O | X | 공개/비공개 설정 | 낮음 |
| **스케줄 일괄 변경** | O | X | 다중 수업 일괄 수정 | **높음** |
| 수업 정원 관리 (현재/최대) | O | P | 정원 표시 개선 | 중간 |

### 2.8 매출 관리

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| 매출 현황 | O | O | - | - |
| 매출 통계 | O | O | - | - |
| **매출 유형 세분화** | O | P | 신규/재등록/휴면/종목추가/업그레이드 구분 | **높음** |
| **직군별 매출** | O | X | 직군별 매출 탭 추가 | **높음** |
| **담당자별 매출** | O | X | 담당자별 매출 탭 추가 | **높음** |
| **상품별 매출 요약** | O | P | 상품별 매출 탭 보강 | 중간 |
| **상품별 상세 요약** | O | X | 개별 상품 상세 매출 | 중간 |
| **결제수단별 매출** | O | O | - | - |
| 일간/월간/연간 전환 | O | O | - | - |
| **선수익금 조회** | O | X | 선수익금(미래 매출 인식) 관리 | **높음** |
| **수수료** 항목 | O | X | 수수료 관리 | 중간 |
| 항목설정 (컬럼 커스텀) | O | X | 매출 테이블 컬럼 설정 | 낮음 |
| 환불 관리 | O | O | - | - |
| 미수금 관리 | O | O | - | - |
| POS 결제 | N/A | O | 스포짐만의 강점 | - |

### 2.9 시설 관리

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| **일일 사물함** | O | O (락커관리) | - | - |
| **개인 사물함** | O | O (사물함관리) | - | - |
| **골프 사물함** | O | N/A | 골프 특화 (해당없음) | - |
| 밴드/카드 관리 | O | O | - | - |
| **타석 관리** | O | X | 타석(골프) 관리 | 낮음 |
| 운동룸 관리 | O | O (로컬상태) | Supabase 연동 필요 | 중간 |
| **모바일앱** 관리 | O | X | 모바일앱 연동/관리 | **높음** |
| **배너 관리** | O | X | 앱/키오스크 배너 관리 | 중간 |
| 운동복 관리 | N/A | O | 스포짐만의 강점 | - |

### 2.10 설정

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| 상품 관리 | O | O | - | - |
| **상품분류 관리** (카테고리 CRUD) | O | P | 상품 카테고리 관리 UI 추가 | **높음** |
| 상품: 세션/수업방식/차감방식 | O | P | 상품 세부 속성 추가 | **높음** |
| 상품: 기간정지제한/일사용횟수 | O | X | 기간정지/일사용 제한 설정 | **높음** |
| **할인 설정** | O | X | 할인 정책 관리 페이지 | **높음** |
| 직원 관리 | O | O | - | - |
| **직원근태관리** | O | X | 직원 출퇴근/근태 관리 | **높음** |
| **운동 프로그램 관리** | O | X | 운동 프로그램 템플릿 관리 | **높음** |
| 권한 관리 | O | O | - | - |
| 센터 설정 | O | O | - | - |

### 2.11 공통/글로벌 기능

| 기능 | OnFit | 스포짐 | GAP | 우선순위 |
|-----|-------|--------|-----|---------|
| **공지사항** | O | X | 공지사항 관리 페이지 | **높음** |
| **헤더 회원검색** (전역) | O | P | 글로벌 회원 빠른 검색 개선 | **높음** |
| **헤더 회원등록** (전역) | O | X | 어디서든 회원등록 바로가기 | 중간 |
| **지점 선택** 드롭다운 | O | O | - | - |

---

## 3. 스포짐만의 강점 (OnFit에 없는 기능)

| 기능 | 설명 |
|-----|------|
| POS 결제 시스템 | 현장 POS 결제, 카드/현금/이체 |
| 현장 판매 (추가 상품) | 부가 상품 즉시 판매 |
| 급여 관리/명세서 | 직원 급여 계산, 명세서 출력 |
| 페널티 관리 | 지각/무단결석 페널티 |
| 마일리지 관리 | 마일리지 적립/사용 |
| 쿠폰 관리 | 쿠폰 발급/사용 |
| SMS/메시지 발송 | 회원 대상 메시지 |
| 자동 알림 | 만료/체크인 자동 알림 |
| 감사 로그 | 전체 CRUD 감사 추적 |
| 회원 이관 | 타지점 이관 (keep/refund/exhaust) |
| RBAC 6단계 | 세밀한 역할 기반 권한 |
| 슈퍼관리자 본사 관리 | 통합 대시보드, 지점 비교 |
| 운동복 관리 | 운동복 재고/대여 |
| 구독/라이선스 관리 | SaaS 구독 관리 |

---

## 4. 우선순위별 구현 계획

### Phase 1 - 핵심 GAP (높음 우선순위) — 즉시 구현

#### A. 회원 강화
1. **관심회원 마킹** — 회원 목록에 즐겨찾기 ★ 기능
2. **미방문 N일 초과 필터** — 회원 목록 검색 조건 추가
3. **유입경로** — 회원 등록/수정 시 유입경로 드롭다운
4. **회원구분** (일반/기명법인/무기명법인) 추가
5. **상품별 회원조회** 탭 추가

#### B. 회원 상세 탭 확장
6. **신체정보** 탭 (키, 몸무게, 혈압 등)
7. **종합평가** 탭 (트레이너 평가)
8. **상담 이력** 탭
9. **운동 프로그램** 탭 (회원별 프로그램 배정)
10. **운동 이력** 탭
11. **예약이력** 탭

#### C. 방문/출석 강화
12. **재실 여부** 표시 (현재 센터에 있는 회원)
13. **입장/퇴장 시간** 기록
14. **실시간 입장 팝업** 알림

#### D. 일정 관리 강화
15. **일정 유형 색상** 구분 (방문/OT/상담/체성분/수업)
16. **일정 대상** 확장 (비회원/직원)
17. **일정 분류** (상담/OT 등 카테고리)
18. **미승인 일정** 처리 워크플로
19. **일정 요청 처리** 페이지

#### E. 수업 관리 강화
20. **그룹수업 템플릿** 관리
21. **그룹수업 시간표** 일괄 등록
22. **세션 관리** 강화
23. **그룹수업현황** 통계 페이지
24. **강사 근무 현황** 페이지
25. **스케줄 일괄 변경** 기능

#### F. 매출 강화
26. **매출 유형 세분화** (신규/재등록/휴면/종목추가/업그레이드)
27. **직군별/담당자별 매출** 탭
28. **선수익금 조회** 페이지

#### G. 설정 강화
29. **상품분류 관리** UI (카테고리 CRUD)
30. **상품 속성 확장** (세션/차감방식/기간정지제한/일사용횟수)
31. **할인 설정** 페이지
32. **직원근태관리** 페이지
33. **운동 프로그램 관리** 페이지

#### H. 전자계약 강화
34. **5단계 위자드** 완성 (상품선택/약관동의/결제/계약서확인)

#### I. 공통
35. **공지사항** 관리 페이지
36. **헤더 회원 빠른 검색** 개선

### Phase 2 - 보완 GAP (중간 우선순위) — 다음 스프린트

37. 설문 기능
38. 일일 입장 판매 등록 (비회원)
39. 배너 관리
40. 룸 좌석 배치 정보
41. 1:1 회원 수업 전용 현황 뷰
42. 장소/처리상태 필터
43. 수업 예약방식 설정 (현장/모바일)
44. 수수료 관리
45. 모바일앱 관리 연동

### Phase 3 - 추가 기능 (낮은 우선순위)

46. 온핏 분석 (AI 기반)
47. 지문 인증 출석
48. 타석 관리 (골프 특화)
49. 매출 테이블 컬럼 커스텀 설정
50. 별칭 필드
51. 수업 예약공개 방식

---

## 5. DB 스키마 변경 필요 사항

### 회원 테이블 (members)
```sql
ALTER TABLE members ADD COLUMN nickname VARCHAR(50);          -- 별칭
ALTER TABLE members ADD COLUMN member_type VARCHAR(20) DEFAULT 'individual'; -- 일반/기명법인/무기명법인
ALTER TABLE members ADD COLUMN referral_source VARCHAR(50);   -- 유입경로
ALTER TABLE members ADD COLUMN company_name VARCHAR(100);     -- 회사명 (이미 있을 수 있음)
ALTER TABLE members ADD COLUMN is_favorite BOOLEAN DEFAULT false; -- 관심회원
ALTER TABLE members ADD COLUMN last_visit_at TIMESTAMPTZ;     -- 최근 방문일
```

### 신체정보 테이블 (member_body_info) — 신규
```sql
CREATE TABLE member_body_info (
  id SERIAL PRIMARY KEY,
  member_id INT REFERENCES members(id),
  height DECIMAL(5,1),          -- 키 (cm)
  weight DECIMAL(5,1),          -- 몸무게 (kg)
  blood_pressure VARCHAR(20),   -- 혈압
  measured_at TIMESTAMPTZ,
  notes TEXT,
  branch_id INT
);
```

### 상담 이력 테이블 (consultations) — 신규
```sql
CREATE TABLE consultations (
  id SERIAL PRIMARY KEY,
  member_id INT REFERENCES members(id),
  staff_id INT REFERENCES staff(id),
  type VARCHAR(20),             -- 상담/OT/체험 등
  content TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20),           -- 예정/완료/취소
  branch_id INT
);
```

### 운동 프로그램 테이블 (exercise_programs) — 신규
```sql
CREATE TABLE exercise_programs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  category VARCHAR(50),
  branch_id INT
);

CREATE TABLE member_exercise_programs (
  id SERIAL PRIMARY KEY,
  member_id INT REFERENCES members(id),
  program_id INT REFERENCES exercise_programs(id),
  assigned_by INT REFERENCES staff(id),
  assigned_at TIMESTAMPTZ,
  status VARCHAR(20)
);
```

### 운동 이력 테이블 (exercise_logs) — 신규
```sql
CREATE TABLE exercise_logs (
  id SERIAL PRIMARY KEY,
  member_id INT REFERENCES members(id),
  program_id INT,
  exercise_name VARCHAR(100),
  sets INT,
  reps INT,
  weight DECIMAL(5,1),
  duration INT,                 -- 분
  logged_at TIMESTAMPTZ,
  branch_id INT
);
```

### 일정 확장 (schedules)
```sql
ALTER TABLE schedules ADD COLUMN target_type VARCHAR(20) DEFAULT 'member'; -- member/non_member/staff
ALTER TABLE schedules ADD COLUMN category VARCHAR(30);       -- 상담/OT/체성분/방문 등
ALTER TABLE schedules ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved'; -- pending/approved/rejected
```

### 수업 템플릿 테이블 (class_templates) — 신규
```sql
CREATE TABLE class_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  type VARCHAR(50),             -- 수업 유형
  default_capacity INT,
  default_duration INT,         -- 분
  description TEXT,
  branch_id INT
);
```

### 직원 근태 테이블 (staff_attendance) — 신규
```sql
CREATE TABLE staff_attendance (
  id SERIAL PRIMARY KEY,
  staff_id INT REFERENCES staff(id),
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status VARCHAR(20),           -- 정상/지각/조퇴/결근
  branch_id INT
);
```

### 할인 설정 테이블 (discount_policies) — 신규
```sql
CREATE TABLE discount_policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  type VARCHAR(20),             -- percentage/fixed
  value DECIMAL(10,2),
  min_period INT,               -- 최소 계약 기간
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  branch_id INT
);
```

### 선수익금 (deferred_revenue) — 신규
```sql
CREATE TABLE deferred_revenue (
  id SERIAL PRIMARY KEY,
  sale_id INT,
  member_id INT,
  total_amount DECIMAL(12,0),
  recognized_amount DECIMAL(12,0),
  remaining_amount DECIMAL(12,0),
  start_date DATE,
  end_date DATE,
  branch_id INT
);
```

### 공지사항 (notices) — 신규
```sql
CREATE TABLE notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  content TEXT,
  author_id INT REFERENCES staff(id),
  is_pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  branch_id INT
);
```

### 상품 테이블 확장 (products)
```sql
ALTER TABLE products ADD COLUMN session_count INT;            -- 세션 수
ALTER TABLE products ADD COLUMN class_type VARCHAR(30);       -- 수업방식
ALTER TABLE products ADD COLUMN deduction_type VARCHAR(30);   -- 차감방식
ALTER TABLE products ADD COLUMN suspend_limit INT;            -- 기간정지제한 (일)
ALTER TABLE products ADD COLUMN daily_use_limit INT;          -- 일사용횟수
ALTER TABLE products ADD COLUMN category_id INT;              -- 상품분류 FK
```

### 상품 분류 테이블 (product_categories) — 신규
```sql
CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  sort_order INT,
  is_active BOOLEAN DEFAULT true,
  branch_id INT
);
```

---

## 6. 예상 작업량

| Phase | 항목 수 | 예상 공수 |
|-------|--------|---------|
| Phase 1 (핵심) | 36개 | 약 15-20일 |
| Phase 2 (보완) | 9개 | 약 5-7일 |
| Phase 3 (추가) | 6개 | 약 3-5일 |
| **총계** | **51개** | **약 23-32일** |

---

## 7. 결론

OnFit 대비 스포짐 CRM의 주요 GAP은 다음 영역에 집중됩니다:

1. **회원 상세 정보 깊이** — 11개 탭 vs 3개 탭 (신체정보, 종합평가, 상담이력, 운동프로그램, 운동이력, 예약이력 부재)
2. **수업 관리 고도화** — 템플릿, 시간표, 세션, 현황 통계, 강사 근무 관리
3. **일정 관리 워크플로** — 일정 유형 분류, 승인 프로세스, 요청 처리
4. **매출 분석 다각화** — 직군별/담당자별/상품별 다차원 분석, 선수익금
5. **설정 세밀화** — 할인정책, 근태관리, 운동프로그램, 상품분류 관리

반면 스포짐 CRM만의 강점(POS, 급여, 페널티, 마일리지, 쿠폰, 메시지, 감사로그, 멀티테넌트)은 유지하면서 OnFit의 깊이 있는 기능을 추가하는 방향으로 개발하면 됩니다.
