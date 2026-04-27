# SCR-M005 회원이관 — 상태: 회원 없음 (null)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M005 |
| 상태 코드 | `null-member` |
| 경로 | `/members/transfer?id={id}` |
| 역할 | primary / owner |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M005_회원이관/F6_상태별화면.md` |
| 이전 상태 | `01-회원정보로딩` |
| 다음 상태 | SCR-M001 (자동 이동) |

## 🧩 바이브코딩 프롬프트
```
if (!member) return null + router.push('/members')
toast.error("존재하지 않는 회원입니다.")
```

## 📝 디스크립션
- member=null → 즉시 /members 이동
- 다이어그램: `E_STATE_MEMBER_NULL_01` → `UI_NULL`
