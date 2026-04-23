# AGENTS.md — CRM-Pando 협업 가이드

> 이 파일은 **코덱스(기획자)** 와 **클로드코드(개발자)** 모두가 참조하는 프로젝트 편집 가이드입니다.
> 글로벌 규칙(언어/용어 등)은 `~/.claude/CLAUDE.md` 에 있고, **이 파일은 프로젝트 고유 규칙**만 담습니다.

---

## 1. 프로젝트 개요

**FitGenie CRM** — 피트니스 센터 관리자용 Next.js 15 CRM.
- Stack: Next.js 15 App Router + TypeScript + Tailwind + Supabase
- 자매 앱: `client-pando` (회원앱 · 모바일)

---

## 2. 문서 구조와 진실 소스 (중요)

세 개의 docs 디렉토리가 있고 **역할이 다릅니다**. 혼동하면 drift 발생.

| 디렉토리 | 역할 | 편집 여부 |
|----------|------|-----------|
| **`docs/화면설계서/`** | **정본.** 화면/다이얼로그 단위 상세 스펙 (마스터 + 상태별 델타) | ✅ **여기만 수기 편집** |
| `docs/기능명세서/` | 도메인별 기능 개요. Cmd+/ 오버레이 데이터 | ⚠️ **자동 생성 예정** (현 과도기: 수기 OK) |
| `docs/다이어그램/` | Mermaid 플로우/시퀀스. 다이어그램 라우터에서 시각화 | ✅ 수기 편집 OK, 단 마스터의 `diagrams` 배열에 등록 필수 |

### 2.1 왜 이렇게?
- 같은 기획을 세 곳에 수기로 적으면 반드시 싱크가 깨집니다.
- 화면설계서가 가장 상세(상태·컴포넌트·룰·에지케이스·바이브코딩 프롬프트)하므로 정본.
- 기능명세서는 화면설계서의 **부분집합 요약** → 자동 생성 가능.
- 다이어그램은 화면설계서와 **직교(다른 정보 차원)** → 수기 유지하되 링크 무결성만 CI가 검증.

### 2.2 편집 흐름
```
기획 변경
  ↓
docs/화면설계서/{도메인}/{화면}/00-기본화면.md  (frontmatter + 본문 수정)
  ↓                                          ↓
상태 변경 시                             새 플로우 시
01-기본.md 수정                          docs/다이어그램/ 추가
  ↓                                          ↓ (등록)
[CI] sync-docs.ts                       frontmatter.diagrams 에 경로 추가
  ↓
docs/기능명세서/*.md  자동 재생성
  ↓
Cmd+/ 오버레이에 즉시 반영
```

---

## 3. 화면설계서 규칙

### 3.1 폴더 구조
```
docs/화면설계서/
└── {D0X-도메인}/               # 예: D02-회원관리
    ├── {SCR|DLG}-{ID}-{이름}/   # 예: SCR-201-회원목록, DLG-M011_상담등록
    │   ├── 00-기본화면.md       # 마스터 (YAML frontmatter 필수)
    │   ├── 01-*.md              # 상태별 델타
    │   ├── 02-*.md
    │   └── _체크리스트.md
    └── _체크리스트.md
```

### 3.2 Frontmatter 스키마
**`docs/화면설계서/_FRONTMATTER_SCHEMA.md` 를 먼저 읽으세요.**

`00-기본화면.md` 최상단에 YAML frontmatter 필수:
```yaml
---
id: SCR-100                # SCR/DLG + ID
kind: screen               # screen | dialog
domain: D01-공통
title: 로그인
route: /login              # SCR만 (DLG는 parentRoutes)
priority: P0
roles: [all]
functional:
  - id: F-100-01
    title: 이메일 로그인
    description: ...
diagrams:
  - docs/다이어그램/...
---
```

### 3.3 상속 규칙
- `00-기본화면.md` 가 마스터 (레이아웃·토큰·컴포넌트·데이터·권한·접근성 기본값)
- `01~99-*.md` 는 마스터를 상속하고 **변경점(델타)만** 기술
- 상태별 파일에서 frontmatter는 선택(state 라벨만)

---

## 4. 기능명세서 규칙 (과도기)

- **현재**: 도메인당 1 파일 (`docs/기능명세서/회원관리.md` 등). 수기 편집 허용.
- **목표 (곧)**: 화면설계서 frontmatter로부터 `scripts/sync-docs.ts` 로 자동 생성. 수기 편집 금지.
- 전환 완료 시 각 파일 상단에 `<!-- AUTO-GENERATED — DO NOT EDIT -->` 마커 추가.

⚠️ 과도기에도 화면설계서와 내용이 충돌하면 **화면설계서가 우선**.

---

## 5. 다이어그램 규칙

- Mermaid `.md` 파일. `docs/다이어그램/{D0X_도메인}/{SCR|DLG-ID}/{F1~F9|M1~M3}_*.md` 구조.
- F1~F9 = SCR용 플로우 (진입/메인/버튼/상태/에러 등), M1~M3 = DLG용 (생명주기/필드검증/결과분기).
- 신규/변경 시 반드시 해당 화면의 `00-기본화면.md` frontmatter `diagrams:` 배열에 경로 추가.
- **CI가 경로 존재 여부 검증** — 없는 파일을 참조하면 빌드 실패.

---

## 6. Cmd+/ 오버레이

관리자 화면에서 `Cmd+/` (Mac) 또는 `Ctrl+/` (Win) 누르면 우측 50% 패널이 열리며, 현재 라우트의 기획 내용이 표시됩니다.

- 트리거: `src/components/layout/AppLayout.tsx`
- 매핑: `src/lib/designDocMap.ts` + `src/app/api/design-doc/route.ts`
- **소스(목표 구조)**: 화면설계서 마스터 frontmatter + 기능명세서(도메인 개요, 자동 생성)

신규 라우트를 추가할 때는 매핑도 같이 추가해야 Cmd+/에서 볼 수 있습니다. (장기적으로 매핑도 frontmatter로부터 자동 생성 예정)

---

## 7. 코덱스 / 클로드코드 공통 주의사항

### 7.1 언어
- 대화·커밋 메시지·한국어 자연어 문서: **한국어**
- 기술 용어(API, DB, JWT, CRUD, frontmatter 등): **영문 그대로**
- 코드 식별자: **영문**

### 7.2 파일 수정 범위
- **화면설계서 편집은 화면 1개 = 폴더 1개 단위**. 다른 폴더 건드리지 말 것.
- 일관된 frontmatter 양식을 유지할 것 (스키마 참조).
- 상태 파일 추가 시 `_체크리스트.md` 에 항목 추가 권장.

### 7.3 커밋 단위
- **화면 단위 원자 커밋** 권장: 한 화면 단위로 묶어서 커밋.
- 여러 화면을 동시에 건드려야 한다면 본사 공통 변경(예: 에러코드 정의 추가) 커밋 하나로 묶기.

### 7.4 동시 편집 충돌 방지
- 두 사람이 **같은 화면**을 동시에 편집하기 전에 서로 확인.
- 다른 화면이면 충돌 거의 없음 (파일 단위 분리 구조).

---

## 8. 빌드/검증 명령 (구축 중)

```bash
# 추후 추가 예정
bun run dev                           # 개발 서버
bun run build                         # 프로덕션 빌드
bun run scripts/sync-docs.ts --check  # frontmatter 검증 + drift 감지 (dry-run)
bun run scripts/sync-docs.ts --write  # 기능명세서 재생성 (main 브랜치에서만)
```

---

## 9. 관련 문서

- `docs/화면설계서/_FRONTMATTER_SCHEMA.md` — frontmatter 엄격 스펙
- `docs/화면설계서/README.md` — 화면설계서 개요·총계·포맷 가이드
- `docs/에러코드정의서.md` — 전역 에러코드 목록
- `docs/KPI_정의서.md` — KPI 체계
- `docs/시스템_모듈_정의서.md` — 시스템 모듈 6종 구조
