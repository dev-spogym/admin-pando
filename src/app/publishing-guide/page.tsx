'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  LayoutDashboard,
  Layers3,
  Palette,
  Search,
  Sparkles,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import TabNav from '@/components/common/TabNav';
import SearchFilter, { type FilterOption } from '@/components/common/SearchFilter';
import DataTable from '@/components/common/DataTable';
import FormSection from '@/components/common/FormSection';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import StatusBadge from '@/components/common/StatusBadge';

type GuideTab = 'overview' | 'list' | 'form';

const GUIDE_TABS = [
  { key: 'overview', label: '공통 프레임', icon: LayoutDashboard },
  { key: 'list', label: '목록 화면 패턴', icon: Layers3 },
  { key: 'form', label: '폼 화면 패턴', icon: Palette },
];

const FILTERS: FilterOption[] = [
  {
    key: 'role',
    label: '역할',
    type: 'select',
    options: [
      { value: 'all', label: '전체' },
      { value: 'owner', label: '센터장' },
      { value: 'manager', label: '매니저' },
      { value: 'staff', label: '스태프' },
    ],
  },
  {
    key: 'status',
    label: '상태',
    type: 'multiSelect',
    options: [
      { value: 'ready', label: '개발 준비' },
      { value: 'working', label: '진행중' },
      { value: 'review', label: '리뷰중' },
    ],
  },
  { key: 'updatedAt', label: '업데이트일', type: 'dateRange' },
];

const TABLE_ROWS = [
  {
    screen: '회원 목록',
    owner: '회원관리',
    role: 'owner',
    status: 'ready',
    route: '/members',
    updatedAt: '2026-04-26',
  },
  {
    screen: '매출 현황',
    owner: '매출관리',
    role: 'manager',
    status: 'working',
    route: '/sales',
    updatedAt: '2026-04-26',
  },
  {
    screen: '센터 설정',
    owner: '설정관리',
    role: 'owner',
    status: 'review',
    route: '/settings',
    updatedAt: '2026-04-25',
  },
  {
    screen: '수업 관리',
    owner: '수업관리',
    role: 'staff',
    status: 'ready',
    route: '/lessons',
    updatedAt: '2026-04-24',
  },
];

function getStatusVariant(status: string) {
  if (status === 'ready') return 'mint' as const;
  if (status === 'working') return 'peach' as const;
  if (status === 'review') return 'info' as const;
  return 'default' as const;
}

export default function PublishingGuidePage() {
  const [activeTab, setActiveTab] = useState<GuideTab>('overview');
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({
    role: 'all',
    status: [],
  });
  const [formState, setFormState] = useState({
    screenName: '회원 상세',
    owner: '회원관리',
    priority: 'P1',
    notes: '상태 배지, 액션 버튼, 빈 상태 문구를 공통 톤으로 유지합니다.',
  });

  const filteredRows = useMemo(() => {
    return TABLE_ROWS.filter((row) => {
      const matchesSearch =
        !searchValue ||
        row.screen.includes(searchValue) ||
        row.owner.includes(searchValue) ||
        row.route.includes(searchValue);
      const roleFilter = String(filters.role ?? 'all');
      const matchesRole = roleFilter === 'all' || row.role === roleFilter;
      const statusFilter = Array.isArray(filters.status) ? filters.status : [];
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(row.status);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [filters.role, filters.status, searchValue]);

  const columns = useMemo(
    () => [
      { key: 'screen', header: '화면명', width: 160 },
      { key: 'owner', header: '도메인', width: 120 },
      {
        key: 'status',
        header: '상태',
        width: 120,
        align: 'center' as const,
        render: (value: string) => (
          <StatusBadge variant={getStatusVariant(value)}>
            {value === 'ready' ? '개발 준비' : value === 'working' ? '진행중' : '리뷰중'}
          </StatusBadge>
        ),
      },
      {
        key: 'route',
        header: '라우트',
        width: 150,
        render: (value: string) => (
          <span className="font-mono text-[12px] text-content-secondary">{value}</span>
        ),
      },
      {
        key: 'updatedAt',
        header: '기준일',
        width: 120,
        align: 'right' as const,
      },
    ],
    []
  );

  return (
    <AppLayout>
      <PageHeader
        title="퍼블리싱 가이드"
        description="개발자가 모든 화면을 같은 레이아웃, 같은 컴포넌트, 같은 상태 표현 규칙으로 구현할 수 있도록 만든 공통 기준 화면입니다."
        actions={
          <>
            <Button variant="outline" size="sm" icon={<Search size={14} />} onClick={() => setActiveTab('list')}>
              목록 패턴 보기
            </Button>
            <Button variant="primary" size="sm" icon={<Sparkles size={14} />} onClick={() => setActiveTab('form')}>
              폼 패턴 보기
            </Button>
          </>
        }
      >
        <StatCardGrid cols={4}>
          <StatCard label="공통 레이아웃" value="1세트" icon={<LayoutDashboard />} description="앱 프레임, 헤더, 사이드바 통일" />
          <StatCard label="공통 패턴" value="3개" icon={<Layers3 />} variant="mint" description="대시보드, 목록, 폼 기준" />
          <StatCard label="주요 공통 컴포넌트" value="8종" icon={<Palette />} variant="peach" description="헤더, 카드, 탭, 필터, 테이블 등" />
          <StatCard label="개발 기준" value="재사용 우선" icon={<CheckCircle2 />} description="페이지마다 새 UI를 만들지 않음" />
        </StatCardGrid>
      </PageHeader>

      <div className="space-y-lg">
        <Card padding="lg">
          <div className="grid gap-md lg:grid-cols-3">
            <div className="app-panel-muted rounded-[20px] p-lg">
              <p className="mb-sm text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Rule 01</p>
              <h3 className="mb-xs text-[16px] font-bold text-content">프레임 고정</h3>
              <p className="text-[13px] leading-6 text-content-secondary">모든 화면은 동일한 헤더, 동일한 사이드바, 동일한 페이지 헤더 구조를 유지합니다.</p>
            </div>
            <div className="app-panel-muted rounded-[20px] p-lg">
              <p className="mb-sm text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Rule 02</p>
              <h3 className="mb-xs text-[16px] font-bold text-content">목록 패턴 재사용</h3>
              <p className="text-[13px] leading-6 text-content-secondary">탭, 검색필터, 상태 배지, 데이터 테이블은 같은 조합과 간격으로 반복 사용합니다.</p>
            </div>
            <div className="app-panel-muted rounded-[20px] p-lg">
              <p className="mb-sm text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Rule 03</p>
              <h3 className="mb-xs text-[16px] font-bold text-content">상태 표현 통일</h3>
              <p className="text-[13px] leading-6 text-content-secondary">배지 색상, 액션 버튼 톤, 빈 상태 문구, 섹션 카드 모양을 화면마다 바꾸지 않습니다.</p>
            </div>
          </div>
        </Card>

        <TabNav tabs={GUIDE_TABS} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as GuideTab)} />

        {activeTab === 'overview' && (
          <div className="grid gap-lg xl:grid-cols-[1.2fr_0.8fr]">
            <Card padding="lg">
              <div className="space-y-md">
                <div>
                  <p className="mb-sm text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Recommended Stack</p>
                  <h3 className="text-[18px] font-bold text-content">페이지 제작 순서</h3>
                </div>
                <div className="grid gap-sm">
                  {[
                    'AppLayout으로 화면 프레임을 고정합니다.',
                    'PageHeader에서 제목, 설명, 주요 액션만 배치합니다.',
                    '상단 요약은 StatCardGrid와 StatCard로만 구성합니다.',
                    '목록 화면은 SearchFilter + TabNav + DataTable 조합을 우선 사용합니다.',
                    '입력 화면은 FormSection으로 영역을 나누고 Input/Select/Textarea를 재사용합니다.',
                  ].map((item) => (
                    <div key={item} className="app-panel-muted flex items-center gap-sm rounded-2xl px-md py-md">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-light text-primary">
                        <CheckCircle2 size={14} />
                      </span>
                      <span className="text-[13px] text-content-secondary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="space-y-md">
                <div>
                  <p className="mb-sm text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Reusable Tone</p>
                  <h3 className="text-[18px] font-bold text-content">상태/액션 샘플</h3>
                </div>
                <div className="flex flex-wrap gap-sm">
                  <StatusBadge variant="mint">개발 준비</StatusBadge>
                  <StatusBadge variant="peach">진행중</StatusBadge>
                  <StatusBadge variant="info">리뷰중</StatusBadge>
                  <StatusBadge variant="success">완료</StatusBadge>
                </div>
                <div className="flex flex-wrap gap-sm">
                  <Button size="sm">주요 액션</Button>
                  <Button size="sm" variant="outline">보조 액션</Button>
                  <Button size="sm" variant="secondary">서브 액션</Button>
                  <Button size="sm" variant="ghost">텍스트 액션</Button>
                </div>
                <div className="app-panel-muted rounded-[20px] p-lg">
                  <p className="text-[13px] leading-6 text-content-secondary">
                    이 페이지는 디자인 샘플이 아니라 실제 구현 화면에서 재사용해야 하는 공통 UI 원칙을 모은 기준 화면입니다.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'list' && (
          <Card padding="lg">
            <div className="space-y-md">
              <SearchFilter
                searchPlaceholder="화면명, 도메인, 라우트 검색..."
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                filters={FILTERS}
                filterValues={filters}
                onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                onReset={() => {
                  setSearchValue('');
                  setFilters({ role: 'all', status: [] });
                }}
              />

              <DataTable
                title="목록 화면 기준 샘플"
                columns={columns}
                data={filteredRows}
                emptyMessage="조건에 맞는 샘플 화면이 없습니다."
                pagination={{ page: 1, pageSize: 10, total: filteredRows.length }}
              />
            </div>
          </Card>
        )}

        {activeTab === 'form' && (
          <div className="space-y-lg">
            <FormSection
              title="기본 입력 섹션"
              description="새 화면을 만들 때는 입력 필드를 카드처럼 개별로 꾸미지 말고, 섹션 구조와 필드 컴포넌트를 그대로 재사용합니다."
              columns={2}
            >
              <Input
                label="화면명"
                value={formState.screenName}
                onChange={(e) => setFormState((prev) => ({ ...prev, screenName: e.target.value }))}
              />
              <Select
                label="도메인"
                value={formState.owner}
                onChange={(value) => setFormState((prev) => ({ ...prev, owner: value }))}
                options={[
                  { value: '회원관리', label: '회원관리' },
                  { value: '매출관리', label: '매출관리' },
                  { value: '설정관리', label: '설정관리' },
                ]}
              />
              <Select
                label="우선순위"
                value={formState.priority}
                onChange={(value) => setFormState((prev) => ({ ...prev, priority: value }))}
                options={[
                  { value: 'P0', label: 'P0' },
                  { value: 'P1', label: 'P1' },
                  { value: 'P2', label: 'P2' },
                ]}
              />
              <div className="app-panel-muted flex items-center rounded-[20px] px-md">
                <div className="space-y-xs py-md">
                  <p className="text-[12px] font-semibold text-content-secondary">권장 액션 구성</p>
                  <div className="flex flex-wrap gap-sm">
                    <StatusBadge variant="default">저장</StatusBadge>
                    <StatusBadge variant="default">취소</StatusBadge>
                    <StatusBadge variant="default">삭제</StatusBadge>
                  </div>
                </div>
              </div>
              <div className="col-span-full">
                <Textarea
                  label="구현 메모"
                  rows={5}
                  value={formState.notes}
                  onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </FormSection>

            <FormSection
              title="개발자 체크 규칙"
              description="실제 페이지를 추가할 때 아래 항목을 기준으로 화면 완성도를 점검합니다."
              columns={1}
            >
              <div className="grid gap-sm">
                {[
                  '빈 상태, 로딩 상태, 에러 상태 문구를 함께 준비합니다.',
                  '상태 배지는 StatusBadge를 사용하고 임의의 색상을 만들지 않습니다.',
                  '액션 버튼 우선순위는 Primary 1개, 나머지는 Outline/Ghost로 정리합니다.',
                  '탭과 필터는 상단 한 덩어리로 두고 페이지 중간에 흩어놓지 않습니다.',
                ].map((item) => (
                  <div key={item} className="app-panel-muted rounded-[18px] px-md py-md text-[13px] text-content-secondary">
                    {item}
                  </div>
                ))}
              </div>
            </FormSection>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
