'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import ChartCard from '@/components/common/ChartCard';
import TabNav from '@/components/common/TabNav';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import { EmptyState } from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import {
  Send, ThumbsUp, ThumbsDown, Minus, Smile, TrendingUp, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SCR-H1005 NPS 설문 (슈퍼관리자/Owner 전용 — 권한은 permissions.ts에서 bypass 처리)
 * NPS 점수·추이·응답 분포·응답 목록과 설문 발송 관리. 기간/점수범위 필터, 키워드 태그 제공.
 */

interface NpsResponse {
  member: string;
  score: number;
  category: '추천' | '중립' | '비추천';
  comment: string;
  date: string;
  branch: string;
}

// 분기별 NPS 추이 (선 차트용)
const TREND = [
  { period: '25 Q3', nps: 28, responses: 612 },
  { period: '25 Q4', nps: 35, responses: 704 },
  { period: '26 Q1', nps: 41, responses: 781 },
  { period: '26 Q2', nps: 48, responses: 842 },
];

const ALL_RESPONSES: NpsResponse[] = [
  { member: '김민준', score: 9, category: '추천', comment: '직원분들이 너무 친절하고 시설이 깔끔해서 친구에게 추천했어요.', date: '2026-04-26', branch: '강남점' },
  { member: '이서연', score: 10, category: '추천', comment: 'PT 프로그램이 정말 효과적입니다. 6개월 만에 목표를 달성했어요!', date: '2026-04-25', branch: '강남점' },
  { member: '박지훈', score: 6, category: '비추천', comment: '시설은 좋은데 주차가 불편합니다.', date: '2026-04-25', branch: '목동점' },
  { member: '최유리', score: 3, category: '비추천', comment: '샤워실 온수가 자주 끊겨서 불편합니다. 개선이 필요합니다.', date: '2026-04-24', branch: '목동점' },
  { member: '정현우', score: 8, category: '중립', comment: '전반적으로 만족합니다. 가격 대비 좋은 서비스입니다.', date: '2026-04-24', branch: '송파점' },
  { member: '한소희', score: 10, category: '추천', comment: '그룹 수업이 다양해서 질리지 않아요. 강사님들도 전문적입니다.', date: '2026-04-23', branch: '강남점' },
  { member: '오태양', score: 7, category: '중립', comment: '운동 기구는 만족스럽지만 락커가 부족할 때가 있어요.', date: '2026-04-23', branch: '분당점' },
  { member: '윤다은', score: 5, category: '비추천', comment: '예약이 자꾸 밀려서 원하는 시간에 수업을 못 들어요.', date: '2026-04-22', branch: '마포점' },
];

// 지점별 NPS 비교용 집계
function branchNps(rows: NpsResponse[]) {
  const map = new Map<string, NpsResponse[]>();
  for (const r of rows) {
    const arr = map.get(r.branch) ?? [];
    arr.push(r);
    map.set(r.branch, arr);
  }
  return Array.from(map.entries())
    .map(([branch, list]) => {
      const p = list.filter((r) => r.score >= 9).length;
      const d = list.filter((r) => r.score <= 6).length;
      return { branch, count: list.length, nps: list.length ? Math.round(((p - d) / list.length) * 100) : 0 };
    })
    .sort((a, b) => b.nps - a.nps);
}

// 자유 의견 키워드 (간이 빈도) — 10건 미만이면 미노출
const KEYWORDS = [
  { word: '시설', count: 4 },
  { word: '친절', count: 3 },
  { word: '주차', count: 2 },
  { word: '예약', count: 2 },
  { word: 'PT', count: 2 },
];

const PERIOD_OPTIONS = [
  { value: 'q2', label: '26년 2분기' },
  { value: 'q1', label: '26년 1분기' },
  { value: 'q4', label: '25년 4분기' },
  { value: 'empty', label: '25년 1분기 (응답 없음)' },
];

type FilterKey = 'all' | 'promoter' | 'neutral' | 'detractor';

export default function NpsPage() {
  const [tab, setTab] = useState<'결과' | '설문발송'>('결과');
  const [period, setPeriod] = useState('q2');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [channel, setChannel] = useState<'SMS' | '카카오' | '앱 푸시'>('SMS');
  const [target, setTarget] = useState('전체 활성 회원');
  const [cycle, setCycle] = useState('quarter');
  const [campaigns, setCampaigns] = useState([
    { id: 'CMP-001', sentAt: '2026-04-26 14:00', target: '전체 활성 회원', channel: 'SMS', recipients: 842, status: '발송 완료' },
    { id: 'CMP-002', sentAt: '2026-04-12 10:30', target: '신규 가입 30일 회원', channel: '카카오', recipients: 124, status: '응답 수집 중' },
  ]);

  // 선택 기간에 응답 없음 케이스
  const noResponses = period === 'empty';
  const responses = noResponses ? [] : ALL_RESPONSES;
  const surveySent = campaigns.length > 0;

  const promoters = responses.filter((r) => r.score >= 9).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const neutral = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
  const nps = responses.length ? Math.round(((promoters - detractors) / responses.length) * 100) : 0;
  const prevNps = 41; // 전기간(26 Q1) 대비
  const npsDiff = nps - prevNps;

  // 0~10 점수별 분포
  const scoreDist = useMemo(() => {
    const arr = Array.from({ length: 11 }, (_, n) => ({ score: n, count: 0 }));
    for (const r of responses) arr[r.score].count += 1;
    return arr;
  }, [responses]);
  const maxScoreCount = Math.max(1, ...scoreDist.map((s) => s.count));

  const branches = useMemo(() => branchNps(responses), [responses]);

  const filtered = useMemo(() => {
    if (filter === 'promoter') return responses.filter((r) => r.score >= 9);
    if (filter === 'neutral') return responses.filter((r) => r.score >= 7 && r.score <= 8);
    if (filter === 'detractor') return responses.filter((r) => r.score <= 6);
    return responses;
  }, [responses, filter]);

  const categoryColor: Record<string, string> = {
    추천: 'bg-green-100 text-green-700',
    중립: 'bg-gray-100 text-gray-600',
    비추천: 'bg-red-100 text-red-700',
  };

  const recipientMap: Record<string, number> = {
    '전체 활성 회원': 842,
    '이번 달 수업 참여 회원': 316,
    '신규 가입 30일 회원': 124,
  };

  const handleSendSurvey = () => {
    const recipients = recipientMap[target] ?? 0;
    if (recipients === 0) {
      toast.error('발송 대상 회원이 없습니다. 발송 조건을 확인해주세요.');
      return;
    }
    const newCampaign = {
      id: `CMP-${String(campaigns.length + 1).padStart(3, '0')}`,
      sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      target,
      channel,
      recipients,
      status: '응답 수집 중',
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    setTab('결과');
    toast.success(`${channel} 채널로 NPS 설문을 발송했습니다.`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="NPS 설문"
        description="회원 순추천지수(NPS)를 측정하고 부정 피드백을 빠르게 식별합니다"
        actions={
          <div className="flex items-center gap-sm">
            <div className="w-[180px]">
              <Select options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
            </div>
            <Button size="sm" icon={<Send size={14} />} onClick={() => setTab('설문발송')}>
              설문 발송
            </Button>
          </div>
        }
      />

      {/* NPS 요약 */}
      {!noResponses && (
        <StatCardGrid cols={4} className="mb-lg">
          <div
            className={cn(
              'rounded-[22px] border-2 p-lg text-center flex flex-col justify-center',
              nps >= 50 ? 'bg-green-50 border-green-300' : nps >= 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'
            )}
          >
            <p className="text-[12px] text-content-secondary mb-xs">NPS 점수</p>
            <p className={cn('text-4xl font-black tabular-nums', nps >= 50 ? 'text-green-600' : nps >= 0 ? 'text-blue-600' : 'text-red-600')}>{nps}</p>
            <p className="text-[11px] text-content-tertiary mt-xs">
              {nps >= 50 ? '우수' : nps >= 0 ? '양호' : '개선 필요'} · 전기간 {npsDiff >= 0 ? '+' : ''}{npsDiff}
            </p>
          </div>
          <StatCard label="추천 (9~10)" value={`${promoters}명`} icon={<ThumbsUp size={18} />} variant="mint" description={`전체의 ${responses.length ? Math.round((promoters / responses.length) * 100) : 0}%`} />
          <StatCard label="중립 (7~8)" value={`${neutral}명`} icon={<Minus size={18} />} description={`전체의 ${responses.length ? Math.round((neutral / responses.length) * 100) : 0}%`} />
          <StatCard label="비추천 (0~6)" value={`${detractors}명`} icon={<ThumbsDown size={18} />} variant="peach" description={`전체의 ${responses.length ? Math.round((detractors / responses.length) * 100) : 0}%`} />
        </StatCardGrid>
      )}

      <TabNav
        tabs={[{ key: '결과', label: '결과' }, { key: '설문발송', label: '설문 발송' }]}
        activeTab={tab === '결과' ? '결과' : '설문발송'}
        onTabChange={(k) => setTab(k === '결과' ? '결과' : '설문발송')}
        className="mb-md"
      />

      {tab === '결과' ? (
        !surveySent ? (
          <ChartCard title="NPS 결과">
            <EmptyState
              icon={Inbox}
              title="발송 이력이 없습니다"
              description="설문을 설정하고 발송하면 결과가 여기에 표시됩니다."
              action={{ label: '설문 발송하기', onClick: () => setTab('설문발송') }}
            />
          </ChartCard>
        ) : noResponses ? (
          <ChartCard title="NPS 결과">
            <EmptyState
              icon={Smile}
              title="선택한 기간에 응답이 없습니다"
              description="상단의 기간을 조정해 다른 분기 결과를 확인해보세요."
            />
          </ChartCard>
        ) : (
          <div className="space-y-lg">
            {/* NPS 추이 + 응답 분포 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
              <ChartCard title="NPS 추이" description="분기별 NPS 점수 및 응답자 수">
                <div className="flex items-end gap-md h-[180px] pt-md">
                  {TREND.map((t) => {
                    const maxNps = Math.max(...TREND.map((x) => x.nps), 1);
                    return (
                      <div key={t.period} className="flex-1 flex flex-col items-center justify-end gap-xs">
                        <span className="text-[12px] font-bold text-primary tabular-nums">{t.nps}</span>
                        <div className="w-full rounded-t bg-gradient-to-t from-primary to-primary/60 transition-all" style={{ height: `${(t.nps / maxNps) * 120}px` }} />
                        <span className="text-[11px] text-content-secondary">{t.period}</span>
                        <span className="text-[10px] text-content-tertiary">{t.responses}명</span>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              <ChartCard title="응답 분포" description="0~10 점수별 응답 수">
                <div className="flex items-end gap-[3px] h-[180px] pt-md">
                  {scoreDist.map((s) => (
                    <div key={s.score} className="flex-1 flex flex-col items-center justify-end gap-xs">
                      <span className="text-[10px] text-content-tertiary tabular-nums">{s.count || ''}</span>
                      <div
                        className={cn(
                          'w-full rounded-t transition-all',
                          s.score >= 9 ? 'bg-state-success' : s.score >= 7 ? 'bg-slate-300' : 'bg-state-error'
                        )}
                        style={{ height: `${(s.count / maxScoreCount) * 130}px`, minHeight: s.count ? '4px' : '0' }}
                      />
                      <span className="text-[10px] text-content-secondary tabular-nums">{s.score}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* 지점별 NPS 비교 */}
            <ChartCard title="지점별 NPS 비교">
              <div className="space-y-sm pt-sm">
                {branches.map((b) => (
                  <div key={b.branch} className="flex items-center gap-md">
                    <div className="w-[72px] text-[13px] text-content text-right shrink-0">{b.branch}</div>
                    <div className="flex-1 h-7 bg-surface-secondary rounded relative overflow-hidden">
                      <div
                        className={cn('h-full transition-all', b.nps >= 50 ? 'bg-state-success' : b.nps >= 0 ? 'bg-primary' : 'bg-state-error')}
                        style={{ width: `${Math.min(100, Math.max(4, (b.nps + 100) / 2))}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-sm text-[12px] font-semibold text-content">
                        NPS {b.nps} · {b.count}건
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* 자유 의견 키워드 (응답 10건 미만이면 미노출) */}
            {responses.length >= 10 && (
              <ChartCard title="자유 의견 키워드">
                <div className="flex flex-wrap gap-sm pt-sm">
                  {KEYWORDS.map((k) => (
                    <span key={k.word} className="rounded-full bg-primary-light px-3 py-1 text-[13px] text-primary font-medium">
                      #{k.word} <span className="text-content-tertiary">{k.count}</span>
                    </span>
                  ))}
                </div>
              </ChartCard>
            )}

            {/* 발송 이력 */}
            <div className="rounded-xl border border-line bg-surface">
              <div className="border-b border-line px-lg py-md">
                <h3 className="text-[14px] font-bold text-content">최근 발송 이력</h3>
              </div>
              <div className="divide-y divide-line">
                {campaigns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-lg py-md">
                    <div>
                      <p className="text-[13px] font-semibold text-content">{c.target}</p>
                      <p className="mt-xs text-[12px] text-content-secondary">{c.sentAt} · {c.channel} · {c.recipients}명</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-1 text-[12px] font-medium', c.status === '발송 완료' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 응답 목록 + 점수범위 필터 */}
            <div>
              <div className="flex items-center justify-between mb-sm">
                <h3 className="text-[14px] font-bold text-content">응답 목록</h3>
                <TabNav
                  tabs={[
                    { key: 'all', label: '전체', count: responses.length },
                    { key: 'promoter', label: '추천', count: promoters },
                    { key: 'neutral', label: '중립', count: neutral },
                    { key: 'detractor', label: '비추천', count: detractors },
                  ]}
                  activeTab={filter}
                  onTabChange={(k) => setFilter(k as FilterKey)}
                />
              </div>
              {filtered.length === 0 ? (
                <ChartCard title="">
                  <EmptyState icon={Smile} title="해당 분류의 응답이 없습니다" />
                </ChartCard>
              ) : (
                <div className="bg-surface rounded-xl border border-line divide-y divide-line">
                  {filtered.map((r, i) => (
                    <div key={i} className="px-lg py-md">
                      <div className="flex items-start gap-md">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shrink-0', r.score >= 9 ? 'bg-green-100 text-green-700' : r.score >= 7 ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700')}>
                          {r.score}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-content">{r.member}</span>
                            <span className={cn('text-[12px] px-2 py-0.5 rounded-full font-medium', categoryColor[r.category])}>{r.category}</span>
                            <span className="text-[12px] text-content-tertiary">{r.branch}</span>
                            <span className="text-[12px] text-content-tertiary ml-auto">{r.date}</span>
                          </div>
                          <p className="text-[13px] text-content-secondary bg-surface-secondary rounded-lg px-3 py-2 mt-sm">{r.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="bg-surface rounded-xl border border-line p-lg max-w-lg space-y-md">
          <Select label="설문 발송 주기" options={[{ value: 'month', label: '월 1회' }, { value: 'quarter', label: '분기 1회' }]} value={cycle} onChange={setCycle} />
          <div>
            <label className="block text-[13px] font-medium text-content mb-xs">설문 대상</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-3 py-2.5 border border-line rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary">
              <option>전체 활성 회원</option>
              <option>이번 달 수업 참여 회원</option>
              <option>신규 가입 30일 회원</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-content mb-xs">발송 채널</label>
            <div className="flex gap-sm">
              {(['SMS', '카카오', '앱 푸시'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setChannel(item)}
                  className={cn('flex-1 py-2 text-[13px] font-medium rounded-lg', channel === item ? 'border-2 border-primary text-primary' : 'border border-line text-content-secondary hover:bg-surface-secondary')}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-surface-secondary rounded-xl p-lg border border-line">
            <p className="text-[12px] font-medium text-content-secondary mb-sm">설문 미리보기</p>
            <p className="text-[13px] text-content">안녕하세요! 저희 센터를 친구·가족에게 추천할 의향이 얼마나 되시나요?</p>
            <div className="flex gap-1 mt-md">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} className="flex-1 h-8 bg-surface border border-line rounded text-[12px] flex items-center justify-center text-content-secondary">{n}</div>
              ))}
            </div>
            <div className="flex justify-between text-[12px] text-content-tertiary mt-xs">
              <span>전혀 추천하지 않음</span>
              <span>적극 추천</span>
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary-light/40 px-lg py-md text-[12px] text-primary">
            발송 예상 대상: {recipientMap[target] ?? 0}명 · {cycle === 'month' ? '월 1회' : '분기 1회'} 주기
          </div>
          <Button fullWidth icon={<Send size={14} />} onClick={handleSendSurvey}>
            설문 발송
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
