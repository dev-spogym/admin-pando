# SCR-M004 회원상세 — 상태: ACTIVE (정상 이용 중)

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-M004 |
| 상태 코드 | `active` |
| 경로 | `/members/detail?id={id}` |
| 역할 | primary / owner / manager / fc / staff |
| 우선순위 | P0 |
| 다이어그램 | `docs/다이어그램/D02_회원관리/SCR-M004_회원상세/F6_상태별.md` |
| 이전 상태 | `01-로딩중` |
| 다음 상태 | `03-HOLDING` (홀딩 처리 후) |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 'use client' 컴포넌트 작성.
화면: SCR-M004 회원상세 — 상태: ACTIVE (정상 이용 중)

파일: src/app/members/detail/page.tsx

레이아웃: AppLayout > ProfileHeader + StatusBadge + ActionButtons + TabNav + TabContent

컴포넌트 구조:
- ProfileHeader:
  - 프로필 이미지 (w-20 h-20 rounded-full)
  - 이름 + StatusBadge("정상이용중", color="green")
  - 연락처, 이메일, 담당FC
- ActionButtons (권한별 조건부):
  - "수동출석" Button → DLG-M022 (즉시 처리)
  - "회원 수정" Button → /members/edit?id={id}
  - "홀딩 처리" Button → DLG-M003 (status=ACTIVE일 때만)
  - "탈퇴" Button → DLG-M005
  - "삭제" Button → DLG-M002 (primary/owner only)
- TabNav: [회원정보, 이용권, 출석이력, 결제이력, 결제내역, 예약내역, 상세내역, 체성분, 상담메모, 레슨, 신체정보, 종합평가, 상담이력, 운동프로그램, 운동이력]
- TabContent: 현재 탭 렌더링

데이터:
- member: 전체 정보
- contracts: 최신 이용권
- 각 탭별 lazy loading

인터랙션:
- "홀딩 처리" → DLG-M003
- "탈퇴" → DLG-M005
- "수동출석" → DLG-M022
- 탭 전환 → 해당 탭 데이터 fetch

사용 유틸: useAuthStore, supabase, hasPermission, lucide-react, toast
```

## 📝 디스크립션

### 사용 시점
- member.status === 'ACTIVE'

### 필수 데이터
| 테이블 | 조건 |
|--------|------|
| members | id = memberId |
| contracts | member_id = memberId, status 최신 |

### 인터랙션
1. 홀딩 처리 → DLG-M003
2. 탈퇴 → DLG-M005
3. 수동출석 → DLG-M022
4. 회원 수정 → SCR-M003
5. 삭제 → DLG-M002 (primary/owner only)

### 비즈니스 룰
- 홀딩 처리 버튼: ACTIVE 상태에만 표시
- 삭제 버튼: primary/owner만 표시
- fc/staff: 조회 + 수동출석만 가능 (수정/삭제 없음)

### 에지 케이스
- 이용권 만료 임박(7일 이내): 만료 배너 조건부 표시

### 접근성
- StatusBadge `aria-label="회원 상태: 정상 이용 중"`

### 연결 화면
- SCR-M003, DLG-M002~M005, DLG-M022

### 다이어그램 참조
- 엣지: `E_F6_04`
- 상태: `ACT`
