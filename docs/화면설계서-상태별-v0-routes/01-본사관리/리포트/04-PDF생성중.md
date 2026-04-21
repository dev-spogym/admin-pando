# SCR-098 리포트 — 상태: 리포트 생성 중

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-098 |
| 상태 코드 | `reports-generating` |
| 경로 | `/reports` |
| 역할 | 슈퍼관리자 / 최고관리자 / 지점장 |
| 우선순위 | P1 |
| 이전 상태 | `02-기본-리포트목록` (리포트 생성 모달에서 "생성" 클릭) |
| 다음 상태 | `02-기본-리포트목록` (생성 완료 또는 실패) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-098 리포트 — 상태: 커스텀 리포트 생성 중 (status='GENERATING')

파일: src/app/(admin)/reports/page.tsx

GenerateModal 컴포넌트:
function GenerateModal({ onClose, onGenerate }: GenerateModalProps) {
  const [type, setType] = useState<ReportType>('MONTHLY');
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) { toast.error('시작일이 종료일보다 클 수 없습니다.'); return; }
    onGenerate(type, startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-xl border border-line bg-surface shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-[15px] font-semibold text-content">리포트 생성</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 리포트 유형 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-1.5">리포트 유형</label>
            <div className="relative">
              <select value={type} onChange={e => setType(e.target.value as ReportType)}
                className="w-full appearance-none px-3 py-2 text-[13px] border border-line rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="DAILY">일간 리포트</option>
                <option value="WEEKLY">주간 리포트</option>
                <option value="MONTHLY">월간 리포트</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" />
            </div>
          </div>
          {/* 기간 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-1.5">시작일</label>
              <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-line rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-1.5">종료일</label>
              <input type="date" value={endDate} min={startDate} max={today} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-line rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[13px] font-medium text-content-secondary border border-line rounded-lg hover:bg-surface-tertiary">취소</button>
            <button type="submit" className="flex-1 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90">생성</button>
          </div>
        </form>
      </div>
    </div>
  );
}

handleGenerate (모달 "생성" 후 실행):
const handleGenerate = async (type: ReportType, startDate: string, endDate: string) => {
  const tempId = `custom-${type.toLowerCase()}-${startDate}`;
  // 1. GENERATING 상태 임시 리포트 즉시 목록 상단 추가
  const tempReport: Report = {
    id: tempId, type, periodLabel: `${startDate} ~ ${endDate}`,
    startDate, endDate, generatedAt: new Date().toISOString(),
    status: 'GENERATING',
    kpi: { totalRevenue: 0, totalMembers: 0, newMembers: 0, totalAttendance: 0, avgDailyAttendance: 0 },
    branchId, branchName,
  };
  setReports(prev => [tempReport, ...prev]);
  toast.info('리포트를 생성하고 있습니다...');

  // 2. fetchReportKpi 비동기 실행
  try {
    const kpi = await fetchReportKpi(branchId, startDate, endDate);
    setReports(prev => prev.map(r => r.id === tempId ? { ...r, status: 'READY', kpi } : r));
    toast.success('리포트가 생성되었습니다.');
  } catch {
    setReports(prev => prev.map(r => r.id === tempId ? { ...r, status: 'FAILED' } : r));
    toast.error('리포트 생성에 실패했습니다.');
  }
};

DataTable에서 GENERATING 행 표시:
// 총 매출 컬럼: <span className="text-content-tertiary">생성중...</span>
// 신규 회원 / 출석: '-'
// actions "보기"/"발송" 버튼: disabled=true, opacity-40

사용 유틸:
- X, ChevronDown from 'lucide-react'
- toast from 'sonner'
- supabase from '@/lib/supabase'
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- PageHeader "리포트 생성" → GenerateModal 열기
- GenerateModal "생성" 제출 → handleGenerate() 실행

### 필수 데이터
| 항목 | 설명 |
|------|------|
| type | DAILY / WEEKLY / MONTHLY |
| startDate | 시작일 (기본: 이번달 1일) |
| endDate | 종료일 (기본: 오늘) |
| tempReport | GENERATING 상태 임시 리포트 |

### 인터랙션 (User Actions)
1. GenerateModal "취소" / X → setShowGenerateModal(false)
2. GenerateModal "생성" → handleGenerate() → GENERATING 행 즉시 추가 → fetchReportKpi
3. fetchReportKpi 완료 → READY 전환 + toast.success
4. fetchReportKpi 실패 → FAILED 전환 + toast.error

### 비즈니스 룰
- 낙관적 업데이트: GENERATING 임시 행을 목록 최상단에 즉시 추가
- startDate > endDate → toast.error + 제출 차단
- startDate max: endDate / endDate max: today (미래 불가)
- GENERATING 행: "보기"/"발송" 버튼 disabled

### 에지 케이스
- fetchReportKpi 네트워크 실패 → FAILED 상태 → 행 유지 (삭제 안 함)
- 동일 기간 중복 생성 → 별도 tempId로 구분

### 접근성 (A11y)
- GenerateModal: `role="dialog"` `aria-modal="true"` `aria-labelledby="generate-modal-title"`
- date input: `aria-label="시작일"` / `aria-label="종료일"`

### 연결 화면
- 이전: `02-기본-리포트목록`
- 다음: `02-기본-리포트목록` (생성 완료 또는 취소)
