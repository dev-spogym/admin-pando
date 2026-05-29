'use client';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Filter, Plus, Zap, ChevronRight, Tag, RefreshCw, Send } from 'lucide-react';
import { usePageSeed } from '@/hooks';
import type { MemberSegmentSeedPayload } from '@/lib/publishingPageSeed';

// ─── SCR-M010 세그먼트 관리 (MBR-EXT-04) ──────────────────────────────────────
// docs4/V1/D02-회원관리/회원관리.md ## SCR-M010
// 기능형 목업: 세그먼트 카드 목록(자동/커스텀) → 생성 → 미리보기 → 메시지 발송
// 자동 세그먼트는 수정·삭제 버튼을 제공하지 않는다(시스템 정의).

// ── 조건 빌더 정의 (docs4 MBR-EXT-04-03) ──
interface SegmentCondition {
  field: string;
  operator: string;
  value: string;
}

/** 조건 빌더에서 선택 가능한 필드 (docs4 SCR-M010 조건 항목) */
const CONDITION_FIELDS: { value: string; label: string; options?: string[] }[] = [
  { value: 'status', label: '회원 상태', options: ['활성', '만료', '예정', '임박', '홀딩', '미등록', '탈퇴'] },
  { value: 'suspended', label: '정지 플래그', options: ['정지 포함', '정지 제외'] },
  { value: 'lastVisit', label: '최근 방문일(일)' },
  { value: 'expiry', label: '이용권 만료일(D-)' },
  { value: 'firstPayment', label: '첫 결제일로부터(일)' },
  { value: 'gender', label: '성별', options: ['남성', '여성'] },
  { value: 'ageGroup', label: '연령대', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
  { value: 'memberType', label: '회원구분', options: ['일반', '기명법인', '무기명법인'] },
  { value: 'inquiryType', label: '문의 유형', options: ['방문(WI)', '전화문의(TI)', '체험', '일일입장'] },
  { value: 'referral', label: '가입경로', options: ['간판', '블로그', '인스타', '당근', '지역카페', '현수막', '전단지', '회원소개', '기타'] },
  { value: 'paymentAmount', label: '누적 결제 금액(원)' },
];

const CONDITION_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gte', label: '이상' },
  { value: 'lte', label: '이하' },
];

// docs4 SCR-M010 자동 7종 (신규/만료후미등록/이탈위험/만료임박/관심필요/충성/활발)
const FALLBACK_SEGMENTS: MemberSegmentSeedPayload = {
  segments: [
    { id: 1, name: '신규', desc: '첫 정상 결제 완료일로부터 30일 이내', count: 18, color: 'text-blue-600 bg-blue-50 border-blue-200', auto: true },
    { id: 2, name: '만료후미등록', desc: '마지막 이용권 만료일 +60일 경과, 재등록 결제 없음', count: 31, color: 'text-rose-600 bg-rose-50 border-rose-200', auto: true },
    { id: 3, name: '이탈위험', desc: '활성 회원이 최근 30일 이상 방문/출석 없음', count: 45, color: 'text-red-600 bg-red-50 border-red-200', auto: true },
    { id: 4, name: '만료임박', desc: '본사/지점 만료 알림 step 대상 회원', count: 23, color: 'text-orange-600 bg-orange-50 border-orange-200', auto: true },
    { id: 5, name: '관심필요', desc: '최근 90일 이내 종합평가·상담 기록 없음', count: 52, color: 'text-amber-600 bg-amber-50 border-amber-200', auto: true },
    { id: 6, name: '충성', desc: '누적 결제 기간 12개월 이상 + 골드 이상 등급', count: 67, color: 'text-purple-600 bg-purple-50 border-purple-200', auto: true },
    { id: 7, name: '활발', desc: '최근 30일 이내 방문/출석 8회 이상', count: 134, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', auto: true },
  ],
};

const segmentMembers: Record<string, Array<{ name: string; note: string }>> = {
  '신규': [{ name: '오지민', note: '첫 결제 12일차 · 첫 PT 미진행' }, { name: '문서준', note: '첫 결제 21일차 · 앱 미설치' }],
  '이탈위험': [{ name: '최유리', note: '34일 미방문 · 휴면 전환 직전' }, { name: '한도윤', note: '48일 미방문 · 담당 FC 지정' }],
  '만료임박': [{ name: '김민준', note: '만료 step 대상 · 재등록 상담 필요' }, { name: '박지훈', note: '만료 step 대상 · 락커 동시 만료' }],
};

export default function SegmentPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSegmentName, setSelectedSegmentName] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [segmentsState, setSegmentsState] = useState(FALLBACK_SEGMENTS.segments);
  const [form, setForm] = useState({ name: '', desc: '', count: 24 });
  const [messageBody, setMessageBody] = useState('');

  // 조건 빌더 (docs4 MBR-EXT-04-03): AND/OR 조합 + 최대 3개 조건
  const [joinOp, setJoinOp] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<SegmentCondition[]>([
    { field: 'status', operator: 'eq', value: '활성' },
  ]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const { loading, error, branchId, snapshotDate, reload } = usePageSeed<MemberSegmentSeedPayload>(
    '/members/segment',
    FALLBACK_SEGMENTS,
  );

  const segments = segmentsState;
  const selectedMembers = useMemo(() => segmentMembers[selectedSegmentName ?? ''] ?? [], [selectedSegmentName]);

  /** 조건을 사람이 읽을 수 있는 요약 문자열로 변환 */
  const summarizeConditions = (conds: SegmentCondition[], op: 'AND' | 'OR'): string => {
    const fieldLabel = (f: string) => CONDITION_FIELDS.find((c) => c.value === f)?.label ?? f;
    const opLabel = (o: string) => CONDITION_OPERATORS.find((c) => c.value === o)?.label ?? o;
    const joiner = op === 'AND' ? ' 그리고 ' : ' 또는 ';
    return conds
      .filter((c) => c.value.trim() !== '')
      .map((c) => `${fieldLabel(c.field)} ${opLabel(c.operator)} ${c.value}`)
      .join(joiner);
  };

  const handleAddCondition = () => {
    if (conditions.length >= 3) {
      toast.error('최대 3단계까지 가능합니다.');
      return;
    }
    setConditions((prev) => [...prev, { field: 'lastVisit', operator: 'gte', value: '' }]);
  };

  const handlePreview = () => {
    const filled = conditions.filter((c) => c.value.trim() !== '');
    if (filled.length === 0) {
      toast.error('조건을 1개 이상 입력하세요.');
      return;
    }
    // 실제 회원 조회는 백엔드 범위이므로 조건 기반 의사 난수로 미리보기 수를 추정(목업)
    const base = joinOp === 'AND' ? 12 : 48;
    setPreviewCount(base * filled.length + (filled.length % 3) * 7);
  };

  const resetCreateForm = () => {
    setForm({ name: '', desc: '', count: 24 });
    setJoinOp('AND');
    setConditions([{ field: 'status', operator: 'eq', value: '활성' }]);
    setPreviewCount(null);
  };

  const handleCreateSegment = () => {
    if (!form.name.trim()) {
      toast.error('세그먼트 이름을 입력하세요.');
      return;
    }
    if (form.name.trim().length > 30) {
      toast.error('세그먼트 이름은 30자 이내로 입력하세요.');
      return;
    }
    if (segments.some((s) => s.name === form.name.trim())) {
      toast.error('동일 이름이 이미 있어요.');
      return;
    }
    const conditionSummary = summarizeConditions(conditions, joinOp);
    if (!conditionSummary) {
      toast.error('조건을 1개 이상 입력하세요.');
      return;
    }
    if (previewCount === null) {
      toast.warning('미리보기로 회원 수를 확인하지 않았습니다. 그대로 저장합니다.');
    }
    setSegmentsState((prev) => [
      {
        id: prev.length + 1,
        name: form.name.trim(),
        desc: form.desc.trim() ? `${form.desc.trim()} · ${conditionSummary}` : conditionSummary,
        count: previewCount ?? form.count,
        color: 'text-sky-600 bg-sky-50 border-sky-200',
        auto: false,
      },
      ...prev,
    ]);
    setShowCreate(false);
    resetCreateForm();
    toast.success('세그먼트를 생성했습니다.');
  };

  const handleSendMessage = () => {
    if (!messageTarget || !messageBody.trim()) {
      toast.error('메시지 내용을 입력하세요.');
      return;
    }
    toast.success(`${messageTarget} 세그먼트에 메시지를 발송했습니다.`);
    setMessageTarget(null);
    setMessageBody('');
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <PageHeader
          title="세그먼트 관리"
          description="회원 그룹을 만들어 타겟 마케팅에 활용합니다"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
                onClick={() => void reload(true)}
              >
                seed 갱신
              </Button>
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                세그먼트 생성
              </Button>
            </div>
          }
        />

        {/* 세그먼트 요약 (자동/커스텀/총 대상) */}
        <StatCardGrid cols={3}>
          <StatCard label="자동 세그먼트" value={segments.filter((s) => s.auto).length} icon={<Zap size={20} />} />
          <StatCard label="커스텀 세그먼트" value={segments.filter((s) => !s.auto).length} icon={<Tag size={20} />} variant="mint" />
          <StatCard label="대상 회원 합계" value={segments.reduce((acc, s) => acc + s.count, 0)} icon={<Filter size={20} />} variant="peach" />
        </StatCardGrid>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
          {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
        </div>

        {/* 4축 상태: 로딩 / 빈 / 정상 */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface-secondary/60" />
            ))}
          </div>
        ) : segments.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="세그먼트가 없습니다"
            description="조건을 조합해 타겟 회원 그룹을 만들고 메시지 발송·혜택 적용 액션을 연결하세요."
            action={{ label: '세그먼트 생성', onClick: () => setShowCreate(true) }}
          />
        ) : (
        <div className="space-y-3">
          {segments.map((seg) => (
            <div key={seg.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl border ${seg.color}`}>
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{seg.name}</p>
                    {seg.auto && (
                      <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        <Zap className="w-3 h-3" /> 자동
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{seg.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-base font-bold text-gray-800">{seg.count}명</p>
                  <div className="flex gap-1.5 mt-1 justify-end">
                    <button type="button" onClick={() => setMessageTarget(seg.name)} className="text-xs text-blue-600 hover:underline">메시지 발송</button>
                    <span className="text-gray-300">·</span>
                    <button type="button" onClick={() => setSelectedSegmentName(seg.name)} className="text-xs text-gray-500 hover:underline">보기</button>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm(); }}
        title="새 세그먼트 만들기"
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-sm">
            <Button variant="outline" size="sm" onClick={handlePreview}>미리보기</Button>
            <div className="flex gap-sm">
              <Button variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>취소</Button>
              <Button onClick={handleCreateSegment}>저장</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-md">
          <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="세그먼트 이름 (최대 30자)" maxLength={30} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <input value={form.desc} onChange={(e) => setForm((prev) => ({ ...prev, desc: e.target.value }))} placeholder="설명 (선택)" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />

          {/* 조건 빌더 (MBR-EXT-04-03): AND/OR 조합, 최대 3개 */}
          <div className="rounded-xl border border-line bg-surface-secondary/40 p-md">
            <div className="mb-sm flex items-center justify-between">
              <p className="text-xs font-semibold text-content-secondary">조건 빌더</p>
              <div className="flex overflow-hidden rounded-lg border border-line">
                {(['AND', 'OR'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setJoinOp(op)}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${joinOp === op ? 'bg-blue-600 text-white' : 'bg-white text-content-secondary'}`}
                  >
                    {op === 'AND' ? '모두 충족 (AND)' : '하나라도 충족 (OR)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-sm">
              {conditions.map((cond, idx) => {
                const fieldDef = CONDITION_FIELDS.find((f) => f.value === cond.field);
                return (
                  <div key={idx} className="flex items-center gap-sm">
                    {idx > 0 && (
                      <span className="w-10 shrink-0 text-center text-[11px] font-bold text-blue-600">{joinOp}</span>
                    )}
                    {idx === 0 && <span className="w-10 shrink-0" />}
                    <select
                      value={cond.field}
                      onChange={(e) => {
                        const nextField = e.target.value;
                        const nextDef = CONDITION_FIELDS.find((f) => f.value === nextField);
                        setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, field: nextField, value: nextDef?.options?.[0] ?? '' } : c));
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    >
                      {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, operator: e.target.value } : c))}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    >
                      {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {fieldDef?.options ? (
                      <select
                        value={cond.value}
                        onChange={(e) => setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, value: e.target.value } : c))}
                        className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      >
                        {fieldDef.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        value={cond.value}
                        onChange={(e) => setConditions((prev) => prev.map((c, i) => i === idx ? { ...c, value: e.target.value } : c))}
                        placeholder="값"
                        className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setConditions((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={conditions.length === 1}
                      className="shrink-0 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-30"
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddCondition}
              className="mt-sm flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> 조건 추가 (최대 3개)
            </button>

            {previewCount !== null && (
              <div className="mt-sm rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                미리보기: 현재 조건에 약 <span className="font-bold">{previewCount}명</span>이 해당합니다. (예상치)
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={selectedSegmentName !== null}
        onClose={() => setSelectedSegmentName(null)}
        title={selectedSegmentName ? `${selectedSegmentName} 회원` : '세그먼트 회원'}
        size="lg"
        footer={<div className="flex justify-end"><Button variant="outline" onClick={() => setSelectedSegmentName(null)}>닫기</Button></div>}
      >
        <div className="space-y-sm">
          {selectedMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-md py-lg text-sm text-content-secondary">샘플 회원 목록이 아직 없습니다.</div>
          ) : (
            selectedMembers.map((member) => (
              <div key={member.name} className="rounded-xl border border-line px-md py-md">
                <p className="text-sm font-semibold text-content">{member.name}</p>
                <p className="mt-xs text-xs text-content-secondary">{member.note}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={messageTarget !== null}
        onClose={() => setMessageTarget(null)}
        title={messageTarget ? `${messageTarget} 메시지 발송` : '메시지 발송'}
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setMessageTarget(null)}>취소</Button>
            <Button icon={<Send className="w-4 h-4" />} onClick={handleSendMessage}>발송</Button>
          </div>
        }
      >
        <textarea
          rows={5}
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          placeholder="세그먼트 공지 내용을 입력하세요."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
      </Modal>
    </AppLayout>
  );
}
