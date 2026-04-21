# SCR-062 직원퇴사처리 — 상태: Step 1 (직원 선택)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-062 |
| 상태 코드 | `step1-staff-select` |
| 경로 | `/staff/resignation` |
| 역할 | primary / owner / manager |
| 우선순위 | P0 |
| 이전 상태 | `01-로딩` 완료 |
| 다음 상태 | FC 직원 선택 → `03-Step2`, 비FC 선택 → `04-Step3` |

## 🧩 바이브코딩 프롬프트

```
Next.js 14 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-062 직원 퇴사 처리 — 상태: Step 1 (직원 선택)

파일: src/app/staff/resignation/page.tsx

조건: isLoadingStaff=false, activeStaffList 로드 완료

Step 1 UI:
- 섹션 제목: "퇴사할 직원을 선택하세요"
- Select 컴포넌트:
    options: activeStaffList.map(s => ({ value: s.id, label: `${s.name} (${s.department} / ${s.position})` }))
    placeholder: "직원을 선택하세요"
    onChange: setSelectedStaffId

- 선택 카드 (선택 시 표시):
  {selectedStaff && (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-semibold">
          {selectedStaff.name[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">{selectedStaff.name}</p>
          <p className="text-sm text-gray-500">{selectedStaff.department} · {selectedStaff.position}</p>
          <StatusBadge status={selectedStaff.role} />
        </div>
      </div>
    </div>
  )}

퇴사일, 사유 입력:
- 퇴사일* (date input, 기본값: 오늘)
- 퇴사 사유* (textarea, placeholder="퇴사 사유를 입력하세요 (최소 10자)")
- 퇴직금 지급 여부 (checkbox)

하단 버튼:
- 취소: moveToPage('/staff')
- 다음: disabled={!selectedStaffId || !resignDate || reason.length < 10}
  클릭 시: selectedStaff.role === 'FC' → setStep(2), 그 외 → setStep(3)

선택 없음 상태: 선택 카드 숨김, "다음" disabled

사용 컴포넌트:
- AppLayout, PageHeader, Select, Button, StatusBadge
- useAuthStore, supabase
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `isLoadingStaff === false && activeStaffList.length >= 0`

### Step 분기 조건
| 선택 직원 역할 | 다음 Step |
|----------------|-----------|
| FC | Step 2 (담당 회원 이관) → Step 3 → Step 4 |
| OWNER / MANAGER / STAFF | Step 3 (스케줄 확인) → Step 4 |

### 필수 입력
| 필드 | 필수 | 검증 |
|------|------|------|
| 직원 선택 | 필수 | Select 선택 |
| 퇴사일 | 필수 | 오늘 이후 날짜 |
| 퇴사 사유 | 필수 | 10자 이상 |
| 퇴직금 지급 | 선택 | checkbox |

### 비즈니스 룰
- 이미 RESIGNED 직원은 목록에서 제외
- 퇴사일: 오늘 ~ 최대 3개월 후까지 선택 가능

### 에지 케이스
- activeStaffList 비어있음: "현재 퇴사 처리할 직원이 없습니다" 메시지
- 동일 직원 중복 선택 방지 (단일 Select)

### 접근성 (A11y)
- Select `aria-label="퇴사 처리할 직원 선택"`
- 선택 카드 `aria-live="polite"`

### 연결 화면
- 이전: `01-로딩`
- 다음: `03-Step2` (FC) / `04-Step3` (비FC)
