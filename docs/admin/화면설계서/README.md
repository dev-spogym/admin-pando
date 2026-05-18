# FitGenie 관리자 화면설계서

## 역할

`docs/admin/화면설계서`는 관리자 CRM 화면/다이얼로그 상세 스펙의 정본입니다. 기능 설명은 `feature_codes`로 `docs/admin/기능명세서`의 기능 코드 문서와 연결하고, Mermaid 플로우는 `diagrams` 배열로 `docs/admin/다이어그램` 문서를 연결합니다.

## 현재 구조

```text
docs/admin/화면설계서/
└── D0X-도메인/
    └── SCR|DLG-식별자-이름/
        ├── 00-기본화면.md
        └── 01~99-*.md
```

## 작성 규칙

- `00-기본화면.md`는 마스터 문서이며 frontmatter가 필수입니다.
- 상태 파일은 마스터를 상속하고 변경점만 적습니다.
- 기능 연결은 `feature_codes`를 사용합니다.
- 다이어그램을 연결할 때는 repo root 기준 `docs/admin/다이어그램/...` 경로를 `diagrams` 배열에 등록합니다.

## 검증

```bash
pnpm docs:check
node scripts/validate-mermaid.mjs
```

`pnpm docs:check`는 frontmatter, 기능코드 참조, 앱 route와 문서 매핑을 검증합니다.
