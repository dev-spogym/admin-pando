# 관리자 화면설계서 Frontmatter 스키마

## 적용 범위

- 대상: `docs/admin/화면설계서/**/00-기본화면.md`
- 검증: `scripts/sync-docs.ts`, `scripts/check-feature-codes.ts`
- Cmd+/ 오버레이: `src/app/api/design-doc/route.ts`

## 필수 필드

| 필드 | 설명 |
| --- | --- |
| `id` | 화면 또는 다이얼로그 식별자. 폴더 prefix와 일치해야 한다. |
| `kind` | `screen` 또는 `dialog` |
| `domain` | 상위 도메인 폴더명. 예: `D02-회원관리` |
| `title` | 화면/다이얼로그명 |
| `feature_codes` | 연결 기능명세서 ID 배열. `docs/admin/기능명세서/**/00-기본기능.md`의 `id`와 일치해야 한다. |

## 조건부 필드

| 필드 | 조건 |
| --- | --- |
| `route` | `kind: screen`일 때 사용. 실제 앱 route 또는 공통 화면 설명을 적는다. |
| `parentRoutes` | `kind: dialog`일 때 권장. 다이얼로그가 호출되는 route 배열이다. |
| `diagrams` | 연결 Mermaid 문서가 있을 때 사용. repo root 기준 `docs/admin/다이어그램/...` 경로를 적는다. |

## 권장 필드

| 필드 | 설명 |
| --- | --- |
| `priority` | `P0`, `P1`, `P2` |
| `roles` | 접근 가능 역할 배열 |
| `platforms` | `desktop`, `tablet`, `mobile` 등 화면 대상 |

## 예시

```yaml
---
id: SCR-100
kind: screen
domain: D01-공통
title: 로그인
route: /login
priority: P0
roles: [all]
feature_codes: [MFN-SCR-100]
diagrams:
  - docs/admin/다이어그램/D01_공통/SCR-100_로그인/F1_진입.md
---
```

## 기능명세서 연결 규칙

- `feature_codes`의 각 값은 기능명세서 frontmatter `id`와 정확히 일치해야 한다.
- 기능명세서의 `linked_screen` 또는 `linked_dialogs`는 다시 해당 화면/다이얼로그를 가리켜야 한다.
- 같은 기능명세서 `id`는 전체 `docs/admin/기능명세서`에서 중복될 수 없다.
