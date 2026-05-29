'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import {
  User,
  Search,
  FileText,
  FileSignature,
  Send,
  Link2,
  CheckCircle2,
  Eye,
  History,
  RefreshCw,
  Briefcase,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import TabNav from '@/components/common/TabNav';
import StatusBadge from '@/components/common/StatusBadge';
import SignaturePad from '@/components/common/SignaturePad';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatKRW } from '@/lib/format';
import { toast } from 'sonner';

/**
 * SCR-075 전자 계약 (MKT-05)
 * - 계약 유형 선택(회원 계약 / 직원 근로계약)
 * - 계약 대상 검색(회원/직원)
 * - 유형별 템플릿 자동 분기
 * - 계약 내용 입력 + 미리보기
 * - 전자 서명(현장 서명 / 원격 서명 링크)
 * - 계약 이력 탭 + 재발송
 * 실제 PDF 변환·서명 링크 발송은 목업입니다.
 */

type ContractCategory = 'member' | 'staff';
type ContractType =
  | '이용권' | 'PT' | '필라테스'           // 회원 계약
  | '정규직 근로' | '강사 위촉' | '프리랜서'; // 직원 근로계약
type SignMode = 'onsite' | 'remote';

const CATEGORY_TYPES: Record<ContractCategory, ContractType[]> = {
  member: ['이용권', 'PT', '필라테스'],
  staff: ['정규직 근로', '강사 위촉', '프리랜서'],
};

// 유형별 템플릿명 (계약 템플릿 분기 MKT-05-03)
const TEMPLATE_NAME: Record<ContractType, string> = {
  '이용권': '회원 이용 계약서',
  'PT': '회원 이용 계약서 (PT)',
  '필라테스': '회원 이용 계약서 (필라테스)',
  '정규직 근로': '근로계약서',
  '강사 위촉': '위촉계약서',
  '프리랜서': '프리랜서 계약서',
};

interface SearchTarget { id: number; name: string; phone: string; sub: string }

const MOCK_MEMBERS: SearchTarget[] = [
  { id: 1, name: '김민준', phone: '010-1234-5678', sub: '이용권 회원' },
  { id: 2, name: '이서연', phone: '010-2345-6789', sub: 'PT 회원' },
  { id: 3, name: '박지호', phone: '010-3456-7890', sub: '신규 상담' },
];
const MOCK_STAFF: SearchTarget[] = [
  { id: 101, name: '정수아', phone: '010-9876-5432', sub: '필라테스 강사' },
  { id: 102, name: '최도윤', phone: '010-8765-4321', sub: '프리랜서 트레이너' },
];

interface ContractHistoryRow {
  id: string;
  date: string;
  category: ContractCategory;
  type: ContractType;
  targetName: string;
  status: '서명 완료' | '원격 서명 대기' | '임시 저장';
}
const MOCK_HISTORY: ContractHistoryRow[] = [
  { id: 'CT-2026-0007', date: '2026-05-20', category: 'member', type: '이용권', targetName: '김민준', status: '서명 완료' },
  { id: 'CT-2026-0006', date: '2026-05-18', category: 'staff', type: '강사 위촉', targetName: '정수아', status: '서명 완료' },
  { id: 'CT-2026-0005', date: '2026-05-15', category: 'member', type: 'PT', targetName: '이서연', status: '원격 서명 대기' },
  { id: 'CT-2026-0004', date: '2026-05-10', category: 'staff', type: '프리랜서', targetName: '최도윤', status: '임시 저장' },
];

const HISTORY_VARIANT: Record<ContractHistoryRow['status'], 'success' | 'warning' | 'default'> = {
  '서명 완료': 'success',
  '원격 서명 대기': 'warning',
  '임시 저장': 'default',
};

export default function ElectronicContract() {
  const [tab, setTab] = useState<'new' | 'history'>('new');

  // 작성 폼 상태
  const [category, setCategory] = useState<ContractCategory>('member');
  const [type, setType] = useState<ContractType>('이용권');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<SearchTarget | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [terms, setTerms] = useState('');
  const [signMode, setSignMode] = useState<SignMode>('onsite');
  const [signed, setSigned] = useState(false);

  const candidates = category === 'member' ? MOCK_MEMBERS : MOCK_STAFF;
  const filtered = useMemo(() => {
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [candidates, search]);

  const onSelectCategory = (c: ContractCategory) => {
    setCategory(c);
    setType(CATEGORY_TYPES[c][0]);
    setTarget(null);
    setSearch('');
  };

  const validate = (): string | null => {
    if (!target) return '계약 대상을 선택해주세요.';
    if (!startDate || !endDate) return '계약 기간을 입력해주세요.';
    if (new Date(startDate) > new Date(endDate)) return '계약 시작일이 종료일보다 늦습니다.';
    if (amount <= 0) return '금액은 0보다 커야 합니다.';
    return null;
  };

  const handleRemoteSend = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    toast.success(`${target?.name}님에게 원격 서명 링크를 발송했습니다. (7일 유효)`);
  };

  const handleSign = (_dataUrl: string) => {
    setSigned(true);
    toast.success('서명이 입력되었습니다.');
  };

  const handleComplete = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (signMode === 'onsite' && !signed) { toast.error('서명이 필요합니다.'); return; }
    toast.success('계약이 체결되어 이력에 저장되었습니다. (PDF 변환 목업)');
    setTab('history');
  };

  const handleResend = (row: ContractHistoryRow) => {
    toast.success(`${row.targetName}님(${row.id})에게 계약서를 재발송했습니다.`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="전자 계약"
        description="회원 이용 계약 및 직원 근로계약을 전자 방식으로 작성하고 서명까지 완료합니다."
      />

      <TabNav
        tabs={[
          { key: 'new', label: '계약 작성', icon: FileSignature },
          { key: 'history', label: '계약 이력', icon: History },
        ]}
        activeTab={tab}
        onTabChange={(k) => setTab(k as 'new' | 'history')}
        className="mb-xl"
      />

      {tab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
          {/* 좌측: 입력 */}
          <div className="space-y-xl">
            {/* 1. 계약 유형 선택 (MKT-05-01) */}
            <section className="bg-surface rounded-xl border border-line shadow-card p-lg">
              <h3 className="text-Body-1 font-bold text-content mb-md flex items-center gap-xs"><FileText size={16} className="text-primary" />계약 유형</h3>
              <div className="grid grid-cols-2 gap-sm mb-md">
                {([
                  { key: 'member' as const, label: '회원 계약', icon: <User size={14} /> },
                  { key: 'staff' as const, label: '직원 근로계약', icon: <Briefcase size={14} /> },
                ]).map((c) => (
                  <button
                    key={c.key}
                    className={cn('flex items-center justify-center gap-xs rounded-button border py-sm text-Body-2 transition-all',
                      category === c.key ? 'border-primary bg-primary-light text-primary font-bold' : 'border-line text-content-secondary hover:bg-surface-secondary')}
                    onClick={() => onSelectCategory(c.key)}
                  >
                    {c.icon}{c.label}
                  </button>
                ))}
              </div>
              <Select
                label="세부 유형"
                value={type}
                onChange={(v) => setType(v as ContractType)}
                options={CATEGORY_TYPES[category].map((t) => ({ value: t, label: t }))}
              />
              <p className="mt-sm text-Label text-content-secondary">
                템플릿: <span className="font-semibold text-content">{TEMPLATE_NAME[type]}</span> (자동 로드)
              </p>
            </section>

            {/* 2. 계약 대상 검색 (MKT-05-02) */}
            <section className="bg-surface rounded-xl border border-line shadow-card p-lg">
              <h3 className="text-Body-1 font-bold text-content mb-md flex items-center gap-xs"><Search size={16} className="text-primary" />계약 대상</h3>
              <Input
                placeholder={category === 'member' ? '회원 이름·연락처 검색' : '직원 이름·연락처 검색'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-sm max-h-[160px] overflow-y-auto space-y-xs">
                {filtered.length === 0 ? (
                  <p className="py-md text-center text-Label text-content-secondary">검색 결과 없음</p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.id}
                      className={cn('w-full flex items-center justify-between rounded-lg border px-md py-sm text-left transition-colors',
                        target?.id === c.id ? 'border-primary bg-primary-light' : 'border-line hover:bg-surface-secondary')}
                      onClick={() => setTarget(c)}
                    >
                      <div>
                        <p className="text-Body-2 font-semibold text-content">{c.name}</p>
                        <p className="text-Label text-content-secondary">{c.phone} · {c.sub}</p>
                      </div>
                      {target?.id === c.id && <CheckCircle2 size={16} className="text-primary" />}
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* 3. 계약 내용 입력 (MKT-05-04) */}
            <section className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-md">
              <h3 className="text-Body-1 font-bold text-content flex items-center gap-xs"><FileText size={16} className="text-primary" />계약 내용</h3>
              <div className="grid grid-cols-2 gap-md">
                <Input label="계약 시작일" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input label="계약 종료일" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Input
                label={category === 'member' ? '이용 금액 (원)' : '계약 금액 / 수수료 (원)'}
                type="number"
                min={0}
                value={String(amount)}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <Textarea label="특약 / 비고" rows={3} placeholder="결제 조건, 이용 서비스, 특약 사항 등" value={terms} onChange={(e) => setTerms(e.target.value)} />
            </section>

            {/* 4. 전자 서명 (MKT-05-06) */}
            <section className="bg-surface rounded-xl border border-line shadow-card p-lg space-y-md">
              <h3 className="text-Body-1 font-bold text-content flex items-center gap-xs"><FileSignature size={16} className="text-primary" />전자 서명</h3>
              <div className="grid grid-cols-2 gap-sm">
                {([
                  { key: 'onsite' as const, label: '현장 서명', icon: <FileSignature size={14} /> },
                  { key: 'remote' as const, label: '원격 서명 링크', icon: <Link2 size={14} /> },
                ]).map((m) => (
                  <button
                    key={m.key}
                    className={cn('flex items-center justify-center gap-xs rounded-button border py-sm text-Body-2 transition-all',
                      signMode === m.key ? 'border-accent bg-accent-light text-accent font-bold' : 'border-line text-content-secondary hover:bg-surface-secondary')}
                    onClick={() => { setSignMode(m.key); setSigned(false); }}
                  >
                    {m.icon}{m.label}
                  </button>
                ))}
              </div>

              {signMode === 'onsite' ? (
                <div>
                  <SignaturePad onSign={handleSign} height={160} />
                  {signed && <p className="mt-xs text-Label text-state-success flex items-center gap-xs"><CheckCircle2 size={13} />서명 입력 완료</p>}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line p-lg text-center">
                  <p className="text-Body-2 text-content-secondary mb-sm">회원/직원에게 서명 링크를 SMS·카카오톡으로 전송합니다. (7일 유효)</p>
                  <Button variant="outline" size="sm" icon={<Send size={14} />} onClick={handleRemoteSend}>원격 서명 링크 발송</Button>
                </div>
              )}
            </section>

            <div className="flex justify-end gap-sm">
              <Button variant="outline" onClick={() => toast.success('임시 저장되었습니다. (24시간 보관)')}>임시 저장</Button>
              <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={handleComplete}>계약 체결</Button>
            </div>
          </div>

          {/* 우측: 계약서 미리보기 (MKT-05-05) */}
          <div className="lg:sticky lg:top-4 self-start">
            <section className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
              <div className="px-lg py-md border-b border-line flex items-center gap-xs">
                <Eye size={16} className="text-primary" />
                <h3 className="text-Body-1 font-bold text-content">계약서 미리보기</h3>
              </div>
              <div className="p-lg">
                <div className="rounded-lg border border-line bg-surface-secondary/30 p-lg min-h-[520px] text-content">
                  <h2 className="text-center text-Heading-2 font-bold mb-lg">{TEMPLATE_NAME[type]}</h2>
                  <dl className="space-y-sm text-Body-2">
                    <Row label="계약 유형" value={`${category === 'member' ? '회원 계약' : '직원 근로계약'} / ${type}`} />
                    <Row label="계약 대상" value={target ? `${target.name} (${target.phone})` : '미지정'} />
                    <Row label="계약 기간" value={startDate && endDate ? `${startDate} ~ ${endDate}` : '미입력'} />
                    <Row label="금액" value={amount > 0 ? formatKRW(amount) : '미입력'} />
                  </dl>
                  <div className="mt-lg border-t border-line pt-md">
                    <p className="text-Label text-content-secondary mb-xs">특약 / 비고</p>
                    <p className="text-Body-2 whitespace-pre-wrap min-h-[60px]">{terms || '—'}</p>
                  </div>
                  <div className="mt-xl flex items-end justify-between">
                    <span className="text-Label text-content-secondary">
                      {signMode === 'onsite' ? (signed ? '서명 완료' : '서명 대기') : '원격 서명 대기'}
                    </span>
                    <div className="text-right">
                      <p className="text-Label text-content-secondary mb-xs">서명</p>
                      <div className={cn('w-32 h-12 rounded border flex items-center justify-center text-Label',
                        signed ? 'border-accent text-accent' : 'border-dashed border-line text-content-secondary')}>
                        {signed ? '(서명됨)' : '미서명'}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-sm text-[11px] text-content-secondary">외부 공유 시 워터마크가 적용되며 다운로드는 추적됩니다.</p>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* 계약 이력 탭 (MKT-05-07) */}
      {tab === 'history' && (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-lg py-md border-b border-line"><h3 className="text-Body-1 font-bold text-content">계약 이력</h3></div>
          {MOCK_HISTORY.length === 0 ? (
            <div className="py-2xl text-center text-Body-2 text-content-secondary">완료된 계약이 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary/50 text-content-secondary text-Label">
                <tr>
                  <th className="px-lg py-sm text-left font-medium">계약 번호</th>
                  <th className="px-lg py-sm text-left font-medium">체결일</th>
                  <th className="px-lg py-sm text-left font-medium">유형</th>
                  <th className="px-lg py-sm text-left font-medium">대상</th>
                  <th className="px-lg py-sm text-center font-medium">상태</th>
                  <th className="px-lg py-sm text-center font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HISTORY.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-lg py-sm font-mono text-[12px] text-content">{row.id}</td>
                    <td className="px-lg py-sm font-mono text-[12px] text-content">{row.date}</td>
                    <td className="px-lg py-sm text-content">{row.category === 'member' ? '회원' : '직원'} · {row.type}</td>
                    <td className="px-lg py-sm text-content">{row.targetName}</td>
                    <td className="px-lg py-sm text-center"><StatusBadge variant={HISTORY_VARIANT[row.status]} dot>{row.status}</StatusBadge></td>
                    <td className="px-lg py-sm text-center">
                      <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => handleResend(row)} title="재발송" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-md">
      <dt className="text-content-secondary shrink-0">{label}</dt>
      <dd className="font-medium text-content text-right">{value}</dd>
    </div>
  );
}
