# HWANG 화면설계서 Frontmatter 스키마

## 목적

- `docs/HWANG폴더/화면설계서/`의 마스터 파일 형식을 정리한다.
- 원본 스키마를 참고하되, 운영 우선본에 필요한 최소 필드만 사용한다.

## 필수 필드

| 필드 | 설명 |
| --- | --- |
| `id` | 화면 또는 다이얼로그 식별자 |
| `kind` | `screen` 또는 `dialog` |
| `domain` | 도메인명 |
| `title` | 화면명 |
| `priority` | `P0`, `P1`, `P2` |
| `roles` | 접근 가능 역할 |
| `functional` | 핵심 기능 목록 |

## 조건부 필드

| 필드 | 조건 |
| --- | --- |
| `route` | `kind: screen`일 때 사용 |
| `parentRoutes` | `kind: dialog`일 때 사용 |

## 허용 역할

- 관리자 웹
  - `all`
  - `superAdmin`
  - `primary`
  - `owner`
  - `manager`
  - `fc`
  - `staff`
  - `readonly`
- 회원앱
  - `member`
  - `trainer`
  - `golf_trainer`
  - `fc`
  - `staff`

## functional 예시

```yaml
functional:
  - id: F-H201-01
    title: 상태와 만료일 기준 회원 검색
    description: 운영자가 만료예정 회원과 담당자 기준으로 빠르게 목록을 정리한다.
```
