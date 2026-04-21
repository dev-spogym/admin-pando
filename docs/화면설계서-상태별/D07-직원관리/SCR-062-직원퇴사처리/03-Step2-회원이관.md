# SCR-062 직원퇴사처리 — 상태: Step 2 (담당 회원 이관)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-062 |
| 상태 코드 | `step2-member-transfer` |
| 경로 | `/staff/resignation` |
| 역할 | primary / owner / manager |
| 우선순위 | P0 |
| 이전 상태 | `02-Step1` (FC 직원 선택) |
| 다음 상태 | 이관 설정 완료 → `04-Step3` |

## 🧩 바이브코딩 프롬프트

```
Next.js 14 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-062 직원 퇴사 처리 — 상태: Step 2 (담당 회원 이관, FC 전용)

파일: src/app/staff/resignation/page.tsx (step === 2)

조건: selectedStaff.role === 'FC'

담당 회원 목록 fetch:
  const { data: assignedMembers } = await supabase
    .from('members')
    .select('id, name, phone, contract_type')
    .eq('assigned_fc_id', selectedStaffId)
    .eq('status', 'ACTIVE')

Step 2 UI:
- 섹션 제목: "{selectedStaff.name} FC의 담당 회원을 다른 FC에게 이관하세요"
- 담당 회원 DataTable:
  컬럼: 이름 / 연락처 / 이용권 종류 / 이관할 FC (Select)

이관 FC Select (각 행):
  options: otherFCList (selectedStaffId 제외한 활성 FC 목록)
  placeholder: "이관할 FC 선택"
  기본값: null (미선택 = 이관 없음 / 센터 공용)

전체 이관 옵션:
  <div className="mb-4">
    <label>전체 일괄 이관할 FC</label>
    <Select
      options={otherFCList}
      onChange={(fcId) => setBulkTransferFcId(fcId)}
      placeholder="선택 시 전체 회원 일괄 이관"
    />
  </div>

담당 회원 없는 경우:
  <p className="text-center text-sm text-gray-500 py-8">
    담당 회원이 없습니다. 바로 다음 단계로 진행하세요.
  </p>

하단 버튼:
- 이전: setStep(1)
- 다음: setStep(3) (모든 회원 이관 FC 선택 완료 또는 담당 없음)

검증: 담당 회원 있는 경우, 미이관 회원 존재 시 경고 토스트 + 진행 허용 (강제 미이관 가능)

사용 컴포넌트:
- AppLayout, PageHeader, DataTable, Select, Button
- supabase, toast
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step 1에서 FC 역할 직원 선택 후 "다음" 클릭
- `selectedStaff.role === 'FC'`

### 필수 데이터
| 테이블 | 조건 | 목적 |
|--------|------|------|
| `members` | `assigned_fc_id = selectedStaffId` | 담당 회원 목록 |
| `staff` | `role='FC'`, `id != selectedStaffId`, `status='ACTIVE'` | 이관 대상 FC |

### 인터랙션 (User Actions)
1. 전체 일괄 이관 FC 선택 → 전체 행의 이관 FC 자동 설정
2. 개별 행 이관 FC 변경 → 해당 회원만 변경
3. "다음" 클릭 → 미이관 회원 있으면 경고 후 진행 허용

### 비즈니스 룰
- 이관 FC 미선택 회원: 센터 공용(unassigned) 처리
- 퇴사 완료 후 해당 회원의 `assigned_fc_id` → 이관 FC id로 일괄 업데이트
- 이관 대상 FC 없음 (센터에 FC 1명뿐): 경고 메시지 표시

### 에지 케이스
- 담당 회원 100명 초과: 페이지네이션 또는 가상 스크롤
- 이관 FC가 동일인인 경우: 방지 (본인 제외)

### 접근성 (A11y)
- DataTable `role="grid"` + 각 셀 Select `aria-label="{회원명} 이관 FC 선택"`

### 연결 화면
- 이전: `02-Step1`
- 다음: `04-Step3`
