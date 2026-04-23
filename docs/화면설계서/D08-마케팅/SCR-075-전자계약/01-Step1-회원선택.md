# SCR-075 전자계약 — 상태: Step 1 회원 선택

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-075 |
| 상태 코드 | `step1-member-select` |
| 경로 | `/contracts/new` |
| 역할 | owner, manager, fc |
| 우선순위 | P0 |
| 이전 상태 | 진입 (권한 확인 통과) |
| 다음 상태 | `02-Step2-상품선택` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 CRM 데스크톱 페이지를 작성하라.
화면: SCR-075 전자계약 — Step 1: 회원 선택

파일: src/app/(marketing)/contracts/new/page.tsx

레이아웃:
- AppLayout + PageHeader("전자 계약 작성")
- max-w-3xl mx-auto px-6 py-6

5단계 Stepper (상단):
<div className="flex items-center justify-between mb-8">
  {steps.map((step, i) => (
    <div key={i} className="flex items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
        ${i === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
        {i + 1}
      </div>
      <span className={`ml-2 text-sm ${i === 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
        {step.label}
      </span>
      {i < 4 && <ChevronRight className="mx-3 text-gray-300 w-4 h-4" />}
    </div>
  ))}
</div>
steps: ['회원 선택', '상품 선택', '계약 조건', '약관 동의', '서명']

Step 1 컨텐츠 (bg-white rounded-xl border p-6):
- 제목: "계약할 회원을 선택하세요" (text-lg font-semibold mb-4)
- SearchInput: 이름/연락처로 회원 검색 (실시간 필터)
- 회원 목록 (최대 5건 표시):
  각 행: flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer
  · 아바타 (w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center)
  · 이름 (font-medium) + 연락처 (text-sm text-gray-500)
  · 선택 시: border-2 border-blue-500 bg-blue-50
- 선택된 회원: 하단 "선택된 회원: {name}" 칩

하단 버튼:
- "다음" Button variant=primary disabled={!selectedMember} onClick={goToStep2}

데이터:
- supabase.from('members').select('id, name, phone').ilike('name', `%${search}%`)

사용 컴포넌트:
- AppLayout, PageHeader, Button
- useAuthStore, supabase
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `/contracts/new` 진입 후 권한 확인(owner/manager/fc) 통과

### 필수 데이터
| 블록 | 테이블 | 조건 |
|------|--------|------|
| 회원 목록 | `members` | branchId = ?, 검색 필터 |

### 인터랙션 (User Actions)
1. 검색 입력 → 실시간 회원 필터
2. 회원 클릭 → 선택 (selectedMember 상태)
3. "다음" → Step 2로 이동

### 비즈니스 룰
- 회원 미선택 시 "다음" 버튼 비활성
- 기존 계약 있는 회원도 선택 가능 (재계약)

### 에지 케이스
- 검색 결과 없음: "검색 결과가 없습니다" 인라인 표시

### 연결 화면
- 이전: 진입
- 다음: `02-Step2-상품선택`
