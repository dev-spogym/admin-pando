# SCR-062 직원퇴사처리 — 상태: Step 4 (최종 확인 및 제출)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-062 |
| 상태 코드 | `step4-summary` |
| 경로 | `/staff/resignation` |
| 역할 | primary / owner / manager |
| 우선순위 | P0 |
| 이전 상태 | `04-Step3` 완료 |
| 다음 상태 | 제출 중 → `06-제출중`, 성공 → `07-완료` |

## 🧩 바이브코딩 프롬프트

```
Next.js 14 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-062 직원 퇴사 처리 — 상태: Step 4 (최종 확인, 읽기 전용 요약)

파일: src/app/staff/resignation/page.tsx (step === 4)

Step 4 UI — 읽기 전용 요약:
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">퇴사 처리 최종 확인</h3>

    [직원 정보 섹션]
    <SummaryCard title="대상 직원">
      {selectedStaff.name} · {selectedStaff.department} · {selectedStaff.position}
    </SummaryCard>

    [퇴사 정보 섹션]
    <SummaryCard title="퇴사 정보">
      퇴사일: {resignDate}
      사유: {reason}
      퇴직금: {severancePay ? '지급' : '미지급'}
    </SummaryCard>

    [회원 이관 요약 — FC만]
    {selectedStaff.role === 'FC' && (
      <SummaryCard title="회원 이관">
        이관 완료: {transferredCount}명 / 미이관: {unassignedCount}명
      </SummaryCard>
    )}

    [스케줄 처리 요약]
    <SummaryCard title="스케줄 처리">
      취소: {cancelCount}건 / 이관: {transferCount}건 / 유지: {keepCount}건
    </SummaryCard>

    [경고 배너]
    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4" role="alert">
      <p className="text-sm font-medium text-yellow-800">
        퇴사 처리 후 되돌릴 수 없습니다. 내용을 다시 확인해주세요.
      </p>
    </div>

    [모든 필드 읽기 전용 — 수정 불가]
  </div>

하단 버튼:
- 이전: setStep(3)
- 퇴사 처리 확정: variant="danger", onClick: handleSubmit (isSubmitting=true → API 호출)

handleSubmit:
  setIsSubmitting(true)
  try {
    await supabase.from('staff').update({
      staff_status: 'RESIGNED',
      resign_date: resignDate,
      resign_reason: reason,
    }).eq('id', selectedStaffId)
    // 회원 이관 처리
    // 스케줄 처리
    toast.success('퇴사 처리가 완료되었습니다.')
    moveToPage('/staff')
  } catch (err) {
    toast.error('퇴사 처리에 실패했습니다.')
    setIsSubmitting(false)
  }
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Step 3 완료 후 "다음" 클릭

### 필수 표시 항목
| 섹션 | 내용 |
|------|------|
| 대상 직원 | 이름, 부서, 직책, 역할 |
| 퇴사 정보 | 퇴사일, 사유, 퇴직금 여부 |
| 회원 이관 | FC인 경우만 표시 |
| 스케줄 처리 | 취소/이관/유지 건수 요약 |

### 인터랙션 (User Actions)
1. "이전" → Step 3 복귀
2. "퇴사 처리 확정" → `isSubmitting=true` → API 호출

### 비즈니스 룰
- Step 4는 읽기 전용 (수정 불가, 이전 버튼으로만 수정)
- 퇴사 처리 시 `staff_status = 'RESIGNED'` 업데이트
- 회원 `assigned_fc_id` 이관 처리 동시 수행
- 스케줄 취소: `staff_attendance` 해당 레코드 삭제 또는 cancelled 플래그

### 에지 케이스
- 제출 중 네트워크 끊김: catch → toast.error + isSubmitting=false
- 부분 처리 성공 (직원 상태 변경 성공, 회원 이관 실패): 트랜잭션 처리 권장

### 접근성 (A11y)
- 경고 배너 `role="alert"`
- "퇴사 처리 확정" 버튼 `aria-label="퇴사 처리를 최종 확정합니다"`

### 연결 화면
- 이전: `04-Step3`
- 다음: `06-제출중` → `07-완료`
