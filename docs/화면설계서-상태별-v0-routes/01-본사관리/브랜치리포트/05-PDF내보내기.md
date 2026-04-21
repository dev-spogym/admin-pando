# SCR-093 브랜치리포트 — 상태: PDF/엑셀 내보내기

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-093 |
| 상태 코드 | `branch-report-export` |
| 경로 | `/branch-report` |
| 역할 | 슈퍼관리자 / 최고관리자 |
| 우선순위 | P2 |
| 이전 상태 | `02-기본-차트` |
| 다음 상태 | `02-기본-차트` (다운로드 완료) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-093 브랜치리포트 — 상태: 엑셀 내보내기 (handleDownloadExcel 실행)

파일: src/app/(admin)/branch-report/page.tsx

엑셀 다운로드 핸들러:
const handleDownloadExcel = () => {
  const exportColumns = [
    { key: 'name', header: '지점명' },
    { key: 'totalMembers', header: '총회원' },
    { key: 'newMembers', header: '신규가입' },
    { key: 'activeMembers', header: '활성회원' },
    { key: 'expiredMembers', header: '만료회원' },
    { key: 'totalSales', header: '총매출(원)' },
    { key: 'avgSales', header: '객단가(원)' },
    { key: 'attendanceRate', header: '출석률' },
  ];
  const label = monthOptions.find(m => m.value === selectedMonth)?.label ?? selectedMonth;
  exportToExcel(sortedStats as unknown as Record<string, unknown>[], exportColumns, {
    filename: `지점비교리포트_${label}`,
  });
  toast.success(`${sortedStats.length}개 지점 엑셀 다운로드 완료`);
};

엑셀 버튼:
<button
  className="flex items-center gap-xs px-md py-sm bg-primary text-white hover:opacity-90 transition-all rounded-button text-Label font-semibold"
  onClick={handleDownloadExcel}
  disabled={isLoading || branchStats.length === 0}
>
  <Download size={15} />
  엑셀 다운로드
</button>

DataTable 내장 다운로드:
<DataTable
  title={`지점별 상세 비교 (${selectedLabel})`}
  columns={tableColumns}
  data={sortedStats}
  onDownloadExcel={handleDownloadExcel}
/>
// DataTable의 onDownloadExcel prop → 테이블 우상단 다운로드 버튼에 연결

다운로드 데이터:
- sortedStats (현재 정렬 순서 그대로)
- 숫자 컬럼: 포맷 없이 순수 숫자 (엑셀 내 계산 가능하도록)
- 출석률: 문자열 그대로 ('12.3%')

감사 로그 자동 기록 (권장):
// 엑셀 다운로드 시 EXPORT 액션 기록
await supabase.from('audit_logs').insert({
  action: 'EXPORT',
  targetType: 'branch-report',
  detail: { month: selectedMonth, count: sortedStats.length },
  branchId: getBranchId(),
});

사용 유틸:
- exportToExcel from '@/lib/exportExcel'
- toast from 'sonner'
- Download from 'lucide-react'
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- PageHeader의 "엑셀 다운로드" 버튼 클릭
- DataTable의 내장 다운로드 버튼 클릭

### 필수 데이터
- sortedStats: 현재 정렬된 BranchStat[]
- selectedLabel: 선택 월 한글 레이블
- exportColumns: 컬럼 매핑 정의

### 인터랙션 (User Actions)
1. "엑셀 다운로드" 버튼 클릭 → exportToExcel() 실행 → 파일 다운로드
2. toast.success(`${N}개 지점 엑셀 다운로드 완료`)

### 비즈니스 룰
- 다운로드 대상: sortedStats (현재 정렬 순서)
- 파일명: `지점비교리포트_{YYYY년 N월}.xlsx`
- disabled 조건: isLoading=true 또는 branchStats.length=0
- 감사 로그: EXPORT 액션 기록 권장

### 에지 케이스
- branchStats.length=0 → 버튼 disabled (빈 파일 방지)
- 대용량 데이터(지점 50개 이상) → 동기 처리이므로 UI 블로킹 가능 → 향후 비동기 처리 검토

### 접근성 (A11y)
- 다운로드 버튼: `aria-label="지점 비교 리포트 엑셀 다운로드"`
- disabled 상태: `aria-disabled="true"`

### 연결 화면
- 이전: `02-기본-차트`
- 다음: `02-기본-차트` (다운로드 후 화면 유지)
