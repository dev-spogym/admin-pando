# SCR-097 온보딩 — 상태: Step2 신규유치

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-097 |
| 상태 코드 | `onboarding-step2-acquisition` |
| 경로 | `/onboarding` |
| 역할 | 슈퍼관리자 / 최고관리자 / 지점장 |
| 우선순위 | P1 |
| 이전 상태 | `02-Step1-프리온보딩` |
| 다음 상태 | `04-Step3-신규안정` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-097 온보딩 — 상태: Step2 신규 유치 (이번달 신규 등록 섹션)

파일: src/app/(admin)/onboarding/page.tsx

신규 유치 데이터 패치:
const { data: newMembersData, count: newMembersCount } = await supabase
  .from('members')
  .select('id, name, registeredAt, status', { count: 'exact' })
  .eq('branchId', branchId)
  .is('deletedAt', null)
  .gte('registeredAt', monthStart)
  .lte('registeredAt', monthEnd)
  .order('registeredAt', { ascending: false });

리드 누락률:
const leakRate = s.newLeadsCount > 0
  ? Math.round(((s.newLeadsCount - s.leadsContactedCount) / s.newLeadsCount) * 100)
  : 0;

신규 유치 섹션 UI:
<h3 className="text-[14px] font-bold text-content mb-sm">신규 유치</h3>
<StatCardGrid cols={3} className="mb-lg">
  <StatCard
    label="이번달 신규 등록"
    value={`${s.newMembersThisMonth}명`}
    icon={<UserPlus size={18} />}
    variant="mint"
  />
  <StatCard
    label="온라인 유입 비중"
    value="집계 중"
    icon={<TrendingUp size={18} />}
  />
  <StatCard
    label="리드 누락률"
    value={`${leakRate}%`}
    icon={<AlertCircle size={18} />}
    variant="peach"
  />
</StatCardGrid>

사용 유틸:
- UserPlus, TrendingUp, AlertCircle from 'lucide-react'
- StatCard, StatCardGrid from '@/components/common/*'
- supabase from '@/lib/supabase'
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `02-Step1-프리온보딩` 섹션 이후 스크롤 시 노출
- 페이지 중단부 두 번째 섹션

### 필수 데이터
| 항목 | 소스 | 설명 |
|------|------|------|
| newMembersThisMonth | members count | 이번달 신규 등록 수 |
| leakRate | (미연락/전체) × 100 | 리드 누락률 |

### 인터랙션 (User Actions)
1. StatCard 클릭 → 별도 드릴다운 없음
2. 스크롤 하단 → `04-Step3-신규안정` 섹션 노출

### 비즈니스 룰
- newMembersThisMonth: monthStart~monthEnd 사이 등록, deletedAt null
- 온라인 유입 비중: "집계 중" 고정 표시 (데이터 미연동)
- 리드 누락률 = (신규리드 - 연락완료) / 신규리드 × 100

### 에지 케이스
- newLeadsCount=0 → leakRate=0% (0 나누기 방지)
- 온라인 유입 데이터 없음 → "집계 중" 텍스트 고정

### 접근성 (A11y)
- "집계 중" StatCard: 데이터 미확정 상태 시각적으로 구분

### 연결 화면
- 이전: `02-Step1-프리온보딩`
- 다음: `04-Step3-신규안정` (스크롤)
