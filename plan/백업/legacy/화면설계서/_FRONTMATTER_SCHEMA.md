# 화면설계서 Frontmatter 스키마 (v1)

> **이 문서는 `docs/화면설계서/` 의 모든 마스터 파일(`00-기본화면.md`)이 준수해야 하는 YAML frontmatter 규격을 정의합니다.**
>
> 이 스키마는 **코덱스(기획자)** 와 **클로드코드(개발자)** 양측 모두가 동일하게 파싱·작성할 수 있도록 엄격히 규격화되었습니다.
>
> 빌드 스크립트(`scripts/sync-docs.ts`, 추후 구축)는 이 frontmatter를 스캔해서 `docs/기능명세서/` 와 Cmd+/ 오버레이 데이터를 자동 생성합니다. **본문은 사람이 읽는 명세로 자유롭게 작성**하되, frontmatter는 스키마를 벗어나면 CI가 실패합니다.

---

## 1. 적용 범위

| 파일 | Frontmatter |
|------|-------------|
| `{화면폴더}/00-기본화면.md` (마스터) | **필수** (full schema) |
| `{화면폴더}/01~99-*.md` (상태별) | **선택** (state 라벨만) |
| `_체크리스트.md` | 불필요 |
| `README.md` | 불필요 |

---

## 2. 마스터 파일 스키마 (`00-기본화면.md`)

### 2.1 예시 (SCR)

```yaml
---
id: SCR-100
kind: screen
domain: D01-공통
title: 로그인
route: /login
filePath: src/app/(auth)/login/page.tsx
component: Login
priority: P0
roles: [all]
platforms: [desktop, tablet, mobile]
functional:
  - id: F-100-01
    title: 이메일 로그인
    description: 이메일과 비밀번호 조합으로 기본 인증 수행
  - id: F-100-02
    title: 2FA 인증
    description: 2FA 활성 계정은 OTP 6자리 추가 입력 필요
  - id: F-100-03
    title: 역할별 진입 라우팅
    description: 인증 성공 후 역할(superAdmin/owner/manager/fc/trainer/staff/front)에 따라 전용 대시보드로 분기
  - id: F-100-04
    title: 계정 잠금/점검 안내
    description: 연속 실패/서비스 점검 등 예외 상황을 명확한 카피로 노출
diagrams:
  - docs/다이어그램/D01_공통/SCR-100_로그인/F1_진입.md
  - docs/다이어그램/D01_공통/SCR-100_로그인/F2_메인.md
  - docs/다이어그램/D01_공통/SCR-100_로그인/F6_상태별.md
  - docs/다이어그램/D01_공통/SCR-100_로그인/F8_에러.md
errorCodes: [E401001, E401002, E423001, E500001, E503001]
---
```

### 2.2 예시 (DLG — 글로벌)

```yaml
---
id: DLG-000
kind: dialog
domain: D01-공통
title: 세션만료
parentRoutes: ["*"]   # 전역 다이얼로그는 "*" 사용. 특정 화면에서만 뜨면 해당 라우트 배열
filePath: src/components/dialogs/SessionExpiredDialog.tsx
component: SessionExpiredDialog
priority: P0
roles: [all]
platforms: [desktop, tablet, mobile]
functional:
  - id: F-D000-01
    title: 세션 만료 강제 안내
    description: 401(E401002) 또는 TTL 경과 시 자동 오픈, ESC/배경/X 모두 차단
  - id: F-D000-02
    title: 재로그인 유도
    description: "재로그인" 버튼 클릭 시 세션 클리어 후 /login?redirect=... 로 이동
diagrams:
  - docs/다이어그램/D01_공통/DLG/DLG-000_세션만료/M1_생명주기.md
  - docs/다이어그램/D01_공통/DLG/DLG-000_세션만료/M3_결과분기.md
errorCodes: [E401002, E401003]
---
```

### 2.3 예시 (DLG — 특정 화면의 모달)

```yaml
---
id: DLG-M011
kind: dialog
domain: D02-회원관리
title: 상담등록
parentRoutes: [/members, /members/detail]
filePath: src/components/members/ConsultationCreateDialog.tsx
component: ConsultationCreateDialog
priority: P1
roles: [owner, manager, fc]
platforms: [desktop, tablet]
functional:
  - id: F-DM011-01
    title: 상담 기본 정보 입력
    description: 상담 유형/일시/채널/담당자/메모 입력
  - id: F-DM011-02
    title: 리드 자동 연결
    description: 회원번호 또는 전화번호 입력 시 기존 리드와 자동 매칭
diagrams:
  - docs/다이어그램/D02_회원관리/DLG-M011_상담등록/M2_필드검증.md
---
```

---

## 3. 필드 명세

### 3.1 필수 필드

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | string | `^(SCR|DLG)-[A-Z]?[0-9]+(-[0-9]+)?$` | 화면/다이얼로그 고유 식별자 (폴더명에서 추출한 ID와 동일) |
| `kind` | enum | `screen` \| `dialog` | SCR은 `screen`, DLG는 `dialog` |
| `domain` | string | `^D[0-9]{2}-.+$` | 도메인 폴더명과 정확히 일치 |
| `title` | string | 한국어 | 화면/다이얼로그 한국어명 (폴더명 뒷부분과 일치) |
| `priority` | enum | `P0` \| `P1` \| `P2` | 출시 우선순위 |
| `roles` | array\<string\> | 비어있지 않음 | `all`, `superAdmin`, `primary`, `owner`, `manager`, `fc`, `trainer`, `staff`, `front`, `readonly` 중 선택 |
| `functional` | array\<object\> | 최소 1개 | Cmd+/ 기능명세 탭에 노출되는 기능 목록 |

### 3.2 조건부 필수

| 필드 | 언제 필수 | 설명 |
|------|----------|------|
| `route` | `kind: screen` 일 때 | Next.js 라우트 경로 (예: `/members`, `/members/new`) |
| `parentRoutes` | `kind: dialog` 일 때 | 이 다이얼로그가 뜨는 라우트 배열. 전역이면 `["*"]` |

### 3.3 선택 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `filePath` | string | 코드 파일 경로 (Next 페이지 or 컴포넌트) |
| `component` | string | 컴포넌트명 |
| `platforms` | array\<enum\> | `desktop`/`tablet`/`mobile`. 생략 시 `[desktop]` |
| `diagrams` | array\<string\> | 연결 다이어그램 경로 (drift CI가 존재 검증) |
| `errorCodes` | array\<string\> | 이 화면에서 발생 가능한 에러코드 (에러코드정의서 참조) |
| `i18n` | array\<string\> | 지원 로케일 (기본: `[ko-KR]`) |
| `tags` | array\<string\> | 자유 태그 (예: `[보안, 인증, 글로벌]`) |

### 3.4 `functional` 항목 스키마

```yaml
functional:
  - id: F-{id-숫자부}-{NN}    # 예: F-100-01, F-D000-03, F-DM011-02
    title: 기능 한 줄 요약
    description: 2~3문장 내외 상세 설명 (Cmd+/ 패널에 그대로 노출됨)
```

- `id` 패턴: `^F-[A-Z0-9]+-[0-9]{2}$`
  - 화면 ID가 `SCR-100` → `F-100-01`, `F-100-02` ...
  - 다이얼로그 ID가 `DLG-000` → `F-D000-01` ...
  - 다이얼로그 ID가 `DLG-M011` → `F-DM011-01` ...
- `description`은 **사용자 관점의 기능 설명**이지, 구현 디테일이 아님. 구현 상세는 본문 섹션에서 기술.

---

## 4. 상태별 파일 스키마 (`01~99-*.md`)

**선택** 필드. 파일명에서 라벨이 자명하면 생략 가능.

```yaml
---
state: 제출중          # Cmd+/ 패널 상태 서브탭 라벨
visibility: visible    # visible | hidden (hidden이면 Cmd+/에서 제외)
---
```

| 필드 | 기본값 | 설명 |
|------|--------|------|
| `state` | 파일명에서 자동 추출 | `02-제출중.md` → `제출중`. 수동 지정 시 override |
| `visibility` | `visible` | `hidden`으로 설정하면 Cmd+/ 오버레이에서 제외 (WIP 상태 숨김용) |

---

## 5. 편집 규칙 (코덱스 + 클로드코드 공통)

### 5.1 정본 원칙
- **이 파일들(`docs/화면설계서/`)이 기획의 유일한 진실 소스입니다.**
- `docs/기능명세서/` 는 이 frontmatter로부터 **자동 생성**됩니다 (CI). 직접 편집 금지.
- `docs/다이어그램/` 는 수기 편집 OK이나, 마스터 파일의 `diagrams` 배열에 반드시 등록할 것.

### 5.2 편집 순서
1. 기획 변경 → 해당 화면 `00-기본화면.md` 의 frontmatter 수정 (+ 본문 수정)
2. 상태 추가/변경 → 해당 상태 파일 수정 (`01-기본.md` 등)
3. 새 화면 추가 → `{D0X-도메인}/{SCR|DLG}-{ID}-{이름}/` 폴더 생성 + `00-기본화면.md` + 최소 1개 상태 파일 작성
4. 라우트 매핑이 필요한 신규 화면은 `src/lib/designDocMap.ts` + `src/app/api/design-doc/route.ts` 에 등록 (향후 자동화 예정)

### 5.3 검증
- 로컬에서 `bun run scripts/sync-docs.ts --check` (추후 구축) 실행으로 frontmatter 유효성 확인
- CI가 PR 시 자동 검증 — 실패하면 머지 불가

### 5.4 충돌 최소화
- 화면 1개 = 폴더 1개 = 편집 단위. 두 사람이 다른 화면을 편집하면 merge conflict 없음.
- 같은 화면을 동시에 편집할 때만 주의.

---

## 6. 버전 이력
- **v1 (2026-04-23)**: 초안. functional / diagrams / errorCodes 중심.
- v2 (예정): `components`, `apiEndpoints`, `permissions` 확장.
