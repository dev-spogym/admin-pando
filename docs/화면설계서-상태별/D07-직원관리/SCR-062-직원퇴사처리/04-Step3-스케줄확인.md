# SCR-062 직원퇴사처리 — 상태: Step 3 (스케줄 확인)

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-062 |
| 상태 코드 | `step3-schedule-check` |
| 경로 | `/staff/resignation` |
| 역할 | primary / owner / manager |
| 우선순위 | P0 |
| 이전 상태 | `03-Step2` (FC) 또는 `02-Step1` (비FC) |
| 다음 상태 | `05-Step4` (최종 확인) |

## 🧩 바이브코딩 프롬프트

```
Next.js 14 App Router + TypeScript + Tailwind CSS 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-062 직원 퇴사 처리 — 상태: Step 3 (스케줄 확인)

파일: src/app/staff/resignation/page.tsx (step === 3)

잔여 스케줄 fetch:
  const { data: schedules } = await supabase
    .from('staff_attendance')
    .select('id, date, start_time, end_time, type, note')
    .eq('staff_id', selectedStaffId)
    .gte('date', resignDate)
    .order('date')

Step 3 UI:
- 섹션 제목: "퇴사일 이후 잔여 스케줄을 확인하세요"
- 퇴사일 이후 배정된 근무/수업 스케줄 목록 표시

스케줄 목록 테이블:
  컬럼: 날짜 / 시작-종료 시간 / 유형 / 비고 / 처리
  각 행 처리 Select: ["유지", "취소", "다른 직원에게 이관"]

스케줄 없는 경우:
  <div className="flex flex-col items-center py-12 text-center">
    <p className="text-sm text-gray-500">퇴사일 이후 잔여 스케줄이 없습니다.</p>
    <p className="text-xs text-gray-400 mt-1">바로 다음 단계로 진행할 수 있습니다.</p>
  </div>

하단 버튼:
- 이전: setStep(selectedStaff.role === 'FC' ? 2 : 1)
- 다음: setStep(4)

처리 정책 저장:
  scheduleActions: Record<string, 'keep' | 'cancel' | 'transfer'>
  기본값: 'cancel' (퇴사 후 스케줄은 기본 취소)

사용 컴포넌트:
- AppLayout, PageHeader, DataTable, Select, Button
- supabase
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- FC 직원: Step 2 완료 후
- 비FC 직원: Step 1 완료 후 직접 진입

### 필수 데이터
| 테이블 | 조건 |
|--------|------|
| `staff_attendance` | `staff_id = selectedStaffId`, `date >= resignDate` |

### 인터랙션 (User Actions)
1. 각 스케줄 행 처리 방식 선택 (유지/취소/이관)
2. "이관" 선택 시: 대상 직원 Select 추가 표시
3. "다음" 클릭 → Step 4

### 비즈니스 룰
- 퇴사일 이전 스케줄: 표시하지 않음 (정상 처리)
- 기본 처리: "취소" (퇴사자 스케줄 자동 취소)
- 이관 대상: 동일 역할 또는 상위 역할 직원만

### 에지 케이스
- 스케줄 없음: 바로 "다음" 활성화
- 이관 대상 직원 없음: "취소" 강제 처리

### 접근성 (A11y)
- 스케줄 테이블 `summary="퇴사일 이후 잔여 스케줄 목록"`

### 연결 화면
- 이전: `03-Step2` (FC) / `02-Step1` (비FC)
- 다음: `05-Step4`
