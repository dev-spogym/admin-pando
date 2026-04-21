# SCR-097 온보딩 — 상태: Step3 신규안정

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-097 |
| 상태 코드 | `onboarding-step3-stable` |
| 경로 | `/onboarding` |
| 역할 | 슈퍼관리자 / 최고관리자 / 지점장 |
| 우선순위 | P1 |
| 이전 상태 | `03-Step2-신규유치` |
| 다음 상태 | `05-이탈위험강조` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-097 온보딩 — 상태: Step3 신규 안정 (온보딩 KPI + 진행률 + 회원 테이블)

파일: src/app/(admin)/onboarding/page.tsx

신규 안정 데이터 패치:
// 최근 30일 신규 회원
const { data: recent30 } = await supabase.from('members')
  .select('id, name, registeredAt, status')
  .eq('branchId', branchId).is('deletedAt', null)
  .gte('registeredAt', day30Ago.toISOString())
  .order('registeredAt', { ascending: false });

// 7일 이내 신규
const { data: recent7 } = await supabase.from('members')
  .select('id').eq('branchId', branchId).is('deletedAt', null)
  .gte('registeredAt', day7Ago.toISOString());

// 출석 횟수 집계 (신규 회원 memberId 기준)
const { data: attData } = await supabase.from('attendance')
  .select('memberId').eq('branchId', branchId)
  .in('memberId', recent30Ids);
// attendanceMap: Record<number, number>

// PT 체험: consultations type='체험'
// GX 참여: lesson_bookings status='ATTENDED'

계산:
const day7Rate = s.day7TotalNew > 0 ? Math.round((s.day7ActiveCount / s.day7TotalNew) * 100) : 0;
const day30Rate = s.day30TotalNew > 0 ? Math.round((s.day30ActiveCount / s.day30TotalNew) * 100) : 0;
const ptTrialRate = s.day30TotalNew > 0 ? Math.round((s.ptTrialCount / s.day30TotalNew) * 100) : 0;
const gxRate = s.day30TotalNew > 0 ? Math.round((s.gxFirstCount / s.day30TotalNew) * 100) : 0;

온보딩 상태 분류:
function onboardStatus(daysSince, visits):
- daysSince <= 7 && visits === 0 → "미방문"
- daysSince <= 7 && visits < 2 → "주의"
- daysSince > 7 && visits < 2 → "위험"
- daysSince > 14 && visits < 4 → "이탈위험"
- else → "정상"

신규 안정 섹션 UI:
<h3 className="text-[14px] font-bold text-content mb-sm">신규 안정 (온보딩)</h3>
<StatCardGrid cols={5} className="mb-lg">
  <StatCard label="7일 이용률" value={`${day7Rate}%`} icon={<Target size={18} />}
    variant={day7Rate >= 40 ? 'mint' : 'peach'} />
  <StatCard label="30일 활동률" value={`${day30Rate}%`} icon={<Target size={18} />}
    variant={day30Rate >= 50 ? 'mint' : 'peach'} />
  <StatCard label="PT 체험 참여율" value={`${ptTrialRate}%`} icon={<CalendarCheck size={18} />} />
  <StatCard label="GX 첫 참여율" value={`${gxRate}%`} icon={<Users size={18} />} />
  <StatCard label="초기 이탈" value={`${s.day30ChurnCount}명`} icon={<AlertCircle size={18} />} variant="peach" />
</StatCardGrid>

온보딩 단계별 진행률 바:
<div className="bg-surface rounded-xl border border-line shadow-sm p-lg mb-lg">
  <p className="text-[12px] text-content-secondary mb-md">최근 30일 신규 회원 기준 ({s.day30TotalNew}명)</p>
  <div className="space-y-md">
    {[
      { label: '가입', count: s.day30TotalNew, rate: 100, color: 'bg-primary' },
      { label: '초기 상담', count: s.leadsContactedCount,
        rate: s.day30TotalNew > 0 ? Math.min(100, Math.round((s.leadsContactedCount/s.day30TotalNew)*100)) : 0,
        color: 'bg-accent' },
      { label: '체성분 측정', count: Math.round(s.day30TotalNew * 0.6), rate: 60, color: 'bg-state-info' },
      { label: '프로그램 배정',
        count: s.ptTrialCount + s.gxFirstCount,
        rate: s.day30TotalNew > 0 ? Math.min(100, Math.round(((s.ptTrialCount+s.gxFirstCount)/s.day30TotalNew)*100)) : 0,
        color: 'bg-state-success' },
      { label: '첫 수업 완료', count: s.day30ActiveCount, rate: day30Rate, color: 'bg-peach' },
    ].map(step => (
      <div key={step.label} className="space-y-xs">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-content">{step.label}</span>
          <span className="text-content-secondary">
            {step.count}명 <span className="font-bold text-content ml-xs">{step.rate}%</span>
          </span>
        </div>
        <div className="h-2 w-full bg-surface-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${step.color}`}
            style={{ width: `${step.rate}%` }} />
        </div>
      </div>
    ))}
  </div>
</div>

DataTable (최근 30일 신규 회원 온보딩 현황):
columns: 이름 / 등록일(slice(0,10)) / 경과일 / 방문횟수(색상: >=4 success, >=2 amber, else error) /
         PT체험(StatusBadge success/'-') / GX참여(StatusBadge success/'-') /
         온보딩상태(StatusBadge: 정상→success, 미방문→info, 주의→warning, 위험/이탈위험→error)

<DataTable
  title="최근 30일 신규 회원 온보딩 현황"
  columns={columns}
  data={newMembers}
  loading={loading}
  emptyMessage="최근 30일 신규 회원이 없습니다."
/>

사용 유틸:
- Target, CalendarCheck, Users, AlertCircle from 'lucide-react'
- DataTable, StatCard, StatCardGrid, StatusBadge from '@/components/common/*'
- cn from '@/lib/utils'
- supabase from '@/lib/supabase'
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `03-Step2-신규유치` 섹션 이후 스크롤
- 온보딩 핵심 KPI 및 신규 회원 개별 현황 표시

### 필수 데이터
| 항목 | 소스 | 설명 |
|------|------|------|
| day7ActiveCount | 7일 이내 신규 중 출석 >=2 | 7일 이용률 분자 |
| day30ActiveCount | 30일 이내 신규 중 출석 >=4 | 30일 활동률 분자 |
| ptTrialCount | consultations type='체험' | PT 체험 참여자 수 |
| gxFirstCount | lesson_bookings ATTENDED | GX 첫 참여자 수 |
| day30ChurnCount | 30~60일 전 신규 중 EXPIRED | 초기 이탈 수 |
| newMembers | recent30 매핑 | 신규 회원 테이블 rows |

### 인터랙션 (User Actions)
1. DataTable 행 클릭 → 별도 상세 없음 (표시 전용)
2. 이탈위험/위험 회원 있을 경우 → `05-이탈위험강조` 섹션 자동 표시

### 비즈니스 룰
- 7일 이용률: 7일 이내 신규 중 출석 2회 이상 비율
- 30일 활동률: 30일 이내 신규 중 출석 4회 이상 비율
- 기준 임계값: day7Rate>=40 mint, day30Rate>=50 mint
- 체성분 측정: 실제 데이터 없어 day30TotalNew×0.6 추정값 사용

### 에지 케이스
- recent30 빈 배열 → DataTable emptyMessage 표시
- 30일 이내 신규 없음 → 진행률 바 0%
- 신규 회원 onboardStatus 결정: 경과일 + 방문횟수 조합

### 접근성 (A11y)
- 진행률 바: `role="progressbar"` `aria-valuenow={rate}` `aria-valuemax="100"`
- DataTable: 온보딩 상태 컬럼에 `aria-label` 포함 StatusBadge

### 연결 화면
- 이전: `03-Step2-신규유치`
- 다음: `05-이탈위험강조` (atRisk 회원 있을 경우 자동 표시)
