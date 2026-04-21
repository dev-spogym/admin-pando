# SCR-097 온보딩 — 상태: Step1 프리온보딩

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-097 |
| 상태 코드 | `onboarding-step1-pre` |
| 경로 | `/onboarding` |
| 역할 | 슈퍼관리자 / 최고관리자 / 지점장 |
| 우선순위 | P1 |
| 이전 상태 | `01-로딩` |
| 다음 상태 | `03-Step2-신규유치` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-097 온보딩 — 상태: Step1 프리-온보딩 (리드 퍼널 섹션)

파일: src/app/(admin)/onboarding/page.tsx

OnboardingStats 인터페이스:
interface OnboardingStats {
  // 프리-온보딩
  newLeadsCount: number;       // 신규 리드 (이번달)
  leadsContactedCount: number; // 연락 완료
  leadsVisitedCount: number;   // 방문 완료
  leadsConvertedCount: number; // 등록 전환
  // 신규 유치
  newMembersThisMonth: number;
  // 신규 안정
  day7ActiveCount: number; day7TotalNew: number;
  day30ActiveCount: number; day30TotalNew: number; day30ChurnCount: number;
  ptTrialCount: number; gxFirstCount: number;
}

리드 데이터 패치:
const { data: leadsData } = await supabase
  .from('leads').select('id, status')
  .eq('branchId', branchId).gte('createdAt', monthStart);

const leads = leadsData ?? [];
const newLeadsCount = leads.length;
const leadsContactedCount = leads.filter(l => l.status !== '신규').length;
const leadsVisitedCount = leads.filter(l => ['방문완료','등록완료'].includes(l.status)).length;
const leadsConvertedCount = leads.filter(l => l.status === '등록완료').length;

leadConvRate = newLeadsCount > 0 ? Math.round((leadsConvertedCount / newLeadsCount) * 100) : 0;

프리-온보딩 섹션 UI:
<h3 className="text-[14px] font-bold text-content mb-sm mt-md">프리-온보딩 (리드 퍼널)</h3>
<StatCardGrid cols={5} className="mb-lg">
  <StatCard label="신규 리드" value={`${s.newLeadsCount}건`} icon={<UserPlus size={18} />} />
  <StatCard label="연락 완료" value={`${s.leadsContactedCount}건`} icon={<Clock size={18} />} />
  <StatCard label="방문 완료" value={`${s.leadsVisitedCount}건`} icon={<CalendarCheck size={18} />} variant="mint" />
  <StatCard label="등록 전환" value={`${s.leadsConvertedCount}건`} icon={<UserCheck size={18} />} variant="peach" />
  <StatCard label="리드 전환율" value={`${leadConvRate}%`} icon={<Target size={18} />} />
</StatCardGrid>

사용 유틸:
- UserPlus, Clock, CalendarCheck, UserCheck, Target from 'lucide-react'
- StatCard, StatCardGrid from '@/components/common/*'
- supabase from '@/lib/supabase'
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `01-로딩` 완료 후 leadsData 수신
- 페이지 최상단 첫 번째 섹션으로 항상 표시

### 필수 데이터
| 항목 | 소스 | 설명 |
|------|------|------|
| newLeadsCount | leads.length | 이번달 신규 리드 수 |
| leadsContactedCount | status !== '신규' | 연락 완료 수 |
| leadsVisitedCount | status in ['방문완료','등록완료'] | 방문 완료 수 |
| leadsConvertedCount | status === '등록완료' | 등록 전환 수 |
| leadConvRate | leadsConvertedCount/newLeadsCount×100 | 전환율 % |

### 인터랙션 (User Actions)
1. StatCard 클릭 → 별도 드릴다운 없음 (표시 전용)
2. 스크롤 하단 → `03-Step2-신규유치` 섹션 노출

### 비즈니스 룰
- 리드 상태 분류: '신규' → 미연락, '방문완료'/'등록완료' → 방문 완료
- leadConvRate: 0으로 나누기 방지 (newLeadsCount=0 시 0% 반환)
- 기간: 이번달 monthStart 이후 생성된 리드만

### 에지 케이스
- leads 테이블 없음 / 쿼리 실패 → 모든 카드 0건 표시
- newLeadsCount=0 → leadConvRate=0%

### 접근성 (A11y)
- StatCard cols={5}: 반응형 레이아웃으로 데스크탑 5열

### 연결 화면
- 이전: `01-로딩`
- 다음: `03-Step2-신규유치` (스크롤)
