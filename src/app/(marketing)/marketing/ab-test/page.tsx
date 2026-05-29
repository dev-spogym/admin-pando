'use client';
export const dynamic = 'force-dynamic';

// SCR-079 A/B 테스트 (docs4/V2/D08-마케팅/마케팅.md ## SCR-079, V1 제외 / V2 이관)
// 호스트 다이얼로그: DLG-079-001 A/B 테스트 등록 / DLG-079-002 삭제 확인
// 명세 기준: 등록·자동 분배·우수안 채택은 "고객사 확인 후 개발 진행" — 저장 비활성 + 안내.
//            변형 비교·결과(오픈율/클릭율/승리안)는 목업으로 표시. 로딩/빈/오류 상태 포함.

import React, { useState } from 'react';
import { FlaskConical, Plus, Trophy, RefreshCw, Info, BarChart3 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import FormModal from '@/components/common/FormModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { MOCK_AB_TESTS, type AbTest } from '@/mocks/marketing';

type LoadState = 'loading' | 'error' | 'ready';

export default function AbTestPage() {
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [tests] = useState<AbTest[]>(MOCK_AB_TESTS);
  const [createOpen, setCreateOpen] = useState(false);

  const active = tests.filter((t) => t.status === '진행').length;
  const done = tests.filter((t) => t.status === '완료').length;

  return (
    <AppLayout>
      <PageHeader
        title="A/B 테스트"
        description="두 가지 메시지 안(A·B)을 비교해 더 효과적인 방식을 찾습니다. (V2 후속 범위)"
        actions={
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loadState === 'loading' ? 'animate-spin' : ''} />}
              onClick={() => { setLoadState('loading'); setTimeout(() => setLoadState('ready'), 500); }}>
              새로고침
            </Button>
            <Button type="button" variant="primary" size="md" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              테스트 생성
            </Button>
          </div>
        }
      />

      {/* V2 이관 안내 배너 (등록·자동실행은 고객사 확인 후 개발) */}
      <div className="mb-lg flex items-start gap-sm rounded-2xl border border-blue-200 bg-blue-50 px-lg py-md text-[13px] text-state-info">
        <Info size={16} className="mt-[2px] shrink-0" />
        <span>A/B 테스트 등록·자동 분배·우수안 자동 채택은 고객사 확인 후 개발 진행하는 V2 후속 범위입니다. 현재 화면은 변형 비교·결과를 목업으로 제공합니다.</span>
      </div>

      {loadState === 'error' && (
        <div className="mb-lg flex items-center justify-between rounded-2xl border border-state-error/40 bg-red-50 px-lg py-md text-[13px] text-state-error">
          <span>테스트 정보를 불러오지 못했습니다. 다시 시도해주세요.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setLoadState('ready')}>재시도</Button>
        </div>
      )}

      <StatCardGrid cols={3} className="mb-lg">
        <StatCard label="진행 중 테스트" value={`${active}개`} icon={<FlaskConical />} variant={active > 0 ? 'mint' : undefined} />
        <StatCard label="완료된 테스트" value={`${done}개`} icon={<BarChart3 />} />
        <StatCard label="평균 성과 향상" value="+23%" icon={<Trophy />} variant="peach" />
      </StatCardGrid>

      {loadState === 'loading' ? (
        <div className="space-y-md">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white">
          <EmptyState icon={FlaskConical} title="등록된 A/B 테스트가 없습니다"
            description="A/B 테스트 등록은 V2 후속 범위로 고객사 확인 후 제공됩니다. 확정 전까지는 비교 결과 목업만 표시됩니다." />
        </div>
      ) : (
        <div className="space-y-md">
          {tests.map((test) => {
            const variants = [
              { key: 'A' as const, v: test.variantA },
              { key: 'B' as const, v: test.variantB },
            ];
            return (
              <div key={test.id} className="rounded-2xl border border-line bg-white p-lg">
                <div className="mb-md flex items-start justify-between gap-md">
                  <div className="flex items-center gap-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <FlaskConical size={18} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-content">{test.name}</p>
                      <p className="mt-xs text-[12px] text-content-secondary">{test.startDate} ~ {test.endDate}</p>
                    </div>
                  </div>
                  <StatusBadge variant={test.status === '진행' ? 'success' : 'default'} dot>
                    {test.status === '진행' ? '진행 중' : '완료'}
                  </StatusBadge>
                </div>

                {/* 변형 비교 */}
                <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                  {variants.map(({ key, v }) => {
                    const openRate = v.sent > 0 ? Math.round((v.open / v.sent) * 100) : 0;
                    const clickRate = v.sent > 0 ? Math.round((v.click / v.sent) * 100) : 0;
                    const isWinner = test.winner === key;
                    return (
                      <div key={key} className={cn('rounded-xl border-2 p-4',
                        isWinner ? 'border-state-success/50 bg-emerald-50/60' : 'border-line bg-surface-secondary/40')}>
                        <div className="mb-3 flex items-center gap-sm">
                          <StatusBadge variant={key === 'A' ? 'info' : 'peach'}>{key}</StatusBadge>
                          <span className="text-[12px] font-medium text-content">{v.name}</span>
                          {isWinner && <Trophy size={14} className="ml-auto text-amber-500" />}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[11px] text-content-tertiary">발송</p>
                            <p className="text-[14px] font-bold tabular-nums text-content">{v.sent}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-content-tertiary">오픈율</p>
                            <p className="text-[14px] font-bold tabular-nums text-state-info">{openRate}%</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-content-tertiary">클릭율</p>
                            <p className="text-[14px] font-bold tabular-nums text-primary">{clickRate}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DLG-079-001 A/B 테스트 등록 — 저장 비활성 (고객사 확인 후 개발) */}
      <FormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="A/B 테스트 등록"
        size="lg"
        submitLabel="저장 (고객사 확인 후)"
        onSubmit={(e) => e.preventDefault()}
        extraActions={
          <span className="mr-auto text-[12px] text-amber-600">고객사 확인 후 개발 진행 — 저장 비활성</span>
        }
      >
        <div className="mb-sm flex items-start gap-sm rounded-xl border border-blue-200 bg-blue-50 px-md py-sm text-[12px] text-state-info">
          <Info size={14} className="mt-[2px] shrink-0" />
          <span>등록·대상 분배·자동 실행은 V2 후속 범위입니다. 입력값은 미리보기 용도이며 현재 저장되지 않습니다.</span>
        </div>
        <Input label="테스트 이름" placeholder="예: 재등록 유도 메시지 최적화" disabled />
        <Textarea label="A안 메시지" rows={2} placeholder="A안 메시지 내용" disabled />
        <Textarea label="B안 메시지" rows={2} placeholder="B안 메시지 내용" disabled />
      </FormModal>
    </AppLayout>
  );
}
