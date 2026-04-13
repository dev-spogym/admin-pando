'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Shirt, Plus, Search, Download, RefreshCw, QrCode, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import TabNav from "@/components/common/TabNav";
import Modal from "@/components/ui/Modal";
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

// ─── 타입 ──────────────────────────────────────────────────────────────────

interface ClothingItem {
  id: number;
  number: string;      // 운동복 번호
  qrCode?: string;     // QR 코드 (자동 생성)
  size: string;        // S/M/L/XL/XXL
  type: string;        // 상의/하의/세트
  status: string;      // AVAILABLE/RENTED/WASHING/DAMAGED
  memberId?: number;
  memberName?: string;
  rentedAt?: string;
  returnDue?: string;
  memo?: string;
}

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'AVAILABLE', label: '대기' },
  { key: 'RENTED', label: '대여중' },
  { key: 'WASHING', label: '세탁중' },
  { key: 'DAMAGED', label: '파손' },
];

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];
const TYPE_OPTIONS = [
  { value: 'TOP', label: '상의' },
  { value: 'BOTTOM', label: '하의' },
  { value: 'SET', label: '세트' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  AVAILABLE: { label: '대기', variant: 'success' },
  RENTED: { label: '대여중', variant: 'warning' },
  WASHING: { label: '세탁중', variant: 'default' },
  DAMAGED: { label: '파손', variant: 'error' },
};

function getBranchId() {
  if (typeof window === 'undefined') return '1'; return localStorage.getItem('branchId') || '1';
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function ClothingManagement() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ number: '', size: 'M', type: 'SET', memo: '' });

  // QR 스캔 모달
  const [showQrScan, setShowQrScan] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrResult, setQrResult] = useState<ClothingItem | null>(null);

  // 회원 검색 (QR 대여 처리용)
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<{ id: number; name: string; phone?: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null);

  // QR 코드로 운동복 검색 + 상태 토글 (대여/반납)
  const handleQrLookup = async () => {
    if (!qrInput.trim()) { toast.error('QR 코드를 입력하세요.'); return; }
    const { data, error } = await supabase
      .from('clothing')
      .select('*')
      .eq('branchId', getBranchId())
      .or(`qrCode.eq.${qrInput.trim()},number.eq.${qrInput.trim()}`)
      .limit(1);
    if (error || !data || data.length === 0) {
      toast.error('해당 QR 코드의 운동복을 찾을 수 없습니다.');
      setQrResult(null);
      return;
    }
    setQrResult(data[0] as ClothingItem);
    // 새 조회 시 회원 검색 초기화
    setShowMemberSearch(false);
    setMemberQuery('');
    setMemberResults([]);
    setSelectedMember(null);
  };

  // QR 스캔으로 빠른 반납
  const handleQrReturn = async () => {
    if (!qrResult) return;
    await handleStatusChange(qrResult.id, 'AVAILABLE');
    setQrResult(null);
    setQrInput('');
    toast.success(`${qrResult.number}번 운동복이 반납되었습니다.`);
  };

  // 회원 검색 (대여 처리용)
  const handleMemberSearch = async (query: string) => {
    setMemberQuery(query);
    setSelectedMember(null);
    if (!query.trim()) { setMemberResults([]); return; }
    const { data } = await supabase
      .from('members')
      .select('id, name, phone')
      .eq('branchId', getBranchId())
      .ilike('name', `%${query.trim()}%`)
      .limit(10);
    setMemberResults((data ?? []) as { id: number; name: string; phone?: string }[]);
  };

  // 대여 확정
  const handleRentConfirm = async () => {
    if (!qrResult || !selectedMember) return;
    const { error } = await supabase.from('clothing').update({
      status: 'RENTED',
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      rentedAt: new Date().toISOString().slice(0, 10),
    }).eq('id', qrResult.id);
    if (error) { toast.error('대여 처리에 실패했습니다.'); return; }
    toast.success(`${selectedMember.name}님에게 대여되었습니다.`);
    setQrResult(null);
    setQrInput('');
    setShowMemberSearch(false);
    setMemberQuery('');
    setMemberResults([]);
    setSelectedMember(null);
    fetchItems();
  };

  // ─── 데이터 조회 ──────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('clothing')
        .select('*')
        .eq('branchId', getBranchId())
        .order('number');

      const { data, error } = await query;
      if (error) throw error;
      setItems((data ?? []) as ClothingItem[]);
    } catch (err) {
      console.error('[ClothingManagement] 조회 실패:', err);
      // clothing 테이블이 없으면 빈 목록 표시
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ─── 필터링 ───────────────────────────────────────────────────────────────

  const filtered = items.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (search && !item.number.includes(search) && !item.memberName?.includes(search)) return false;
    return true;
  });

  // ─── 통계 ─────────────────────────────────────────────────────────────────

  const stats = {
    total: items.length,
    available: items.filter(i => i.status === 'AVAILABLE').length,
    rented: items.filter(i => i.status === 'RENTED').length,
    washing: items.filter(i => i.status === 'WASHING').length,
  };

  // ─── 운동복 등록 ──────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.number.trim()) {
      toast.error('운동복 번호를 입력하세요.');
      return;
    }
    try {
      const { error } = await supabase.from('clothing').insert({
        branchId: Number(getBranchId()),
        number: addForm.number.trim(),
        size: addForm.size,
        type: addForm.type,
        status: 'AVAILABLE',
        memo: addForm.memo || null,
      });
      if (error) throw error;
      toast.success('운동복이 등록되었습니다.');
      setShowAddModal(false);
      setAddForm({ number: '', size: 'M', type: 'SET', memo: '' });
      fetchItems();
    } catch (err) {
      console.error('[ClothingManagement] 등록 실패:', err);
      toast.error('운동복 등록에 실패했습니다.');
    }
  };

  // ─── 상태 변경 ────────────────────────────────────────────────────────────

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'AVAILABLE') {
        updates.memberId = null;
        updates.memberName = null;
        updates.rentedAt = null;
        updates.returnDue = null;
      }
      const { error } = await supabase.from('clothing').update(updates).eq('id', id);
      if (error) throw error;
      toast.success(`상태가 "${STATUS_MAP[newStatus]?.label}"(으)로 변경되었습니다.`);
      fetchItems();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // ─── 엑셀 다운로드 ────────────────────────────────────────────────────────

  const handleExcel = () => {
    const excelColumns = [
      { key: '번호', header: '번호' },
      { key: '사이즈', header: '사이즈' },
      { key: '타입', header: '타입' },
      { key: '상태', header: '상태' },
      { key: '대여회원', header: '대여회원' },
      { key: '대여일', header: '대여일' },
      { key: '반납예정', header: '반납예정' },
      { key: '메모', header: '메모' },
    ];
    exportToExcel(
      filtered.map(i => ({
        번호: i.number,
        사이즈: i.size,
        타입: TYPE_OPTIONS.find(t => t.value === i.type)?.label ?? i.type,
        상태: STATUS_MAP[i.status]?.label ?? i.status,
        대여회원: i.memberName ?? '-',
        대여일: i.rentedAt ?? '-',
        반납예정: i.returnDue ?? '-',
        메모: i.memo ?? '',
      })),
      excelColumns,
      { filename: '운동복_목록' }
    );
  };

  // ─── 테이블 컬럼 ──────────────────────────────────────────────────────────

  const columns = [
    { key: 'number', header: '번호', width: 80 },
    { key: 'size', header: '사이즈', width: 80 },
    {
      key: 'type', header: '타입', width: 80,
      render: (v: string) => TYPE_OPTIONS.find(t => t.value === v)?.label ?? v,
    },
    {
      key: 'status', header: '상태', width: 100,
      render: (v: string) => {
        const info = STATUS_MAP[v] ?? { label: v, variant: 'default' as const };
        return <StatusBadge variant={info.variant} label={info.label} />;
      },
    },
    { key: 'memberName', header: '대여 회원', render: (v: string) => v || '-' },
    { key: 'rentedAt', header: '대여일', width: 120, render: (v: string) => v ? v.slice(0, 10) : '-' },
    { key: 'returnDue', header: '반납예정', width: 120, render: (v: string) => v ? v.slice(0, 10) : '-' },
    { key: 'memo', header: '메모', render: (v: string) => v || '-' },
    {
      key: 'actions', header: '액션', width: 180, align: 'right' as const,
      render: (_: unknown, row: ClothingItem) => (
        <div className="flex gap-xs">
          {row.status === 'RENTED' && (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-green-50 text-green-700 hover:bg-green-100"
              onClick={() => handleStatusChange(row.id, 'AVAILABLE')}
            >
              반납
            </button>
          )}
          {row.status === 'AVAILABLE' && (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={() => handleStatusChange(row.id, 'WASHING')}
            >
              세탁
            </button>
          )}
          {row.status === 'WASHING' && (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-green-50 text-green-700 hover:bg-green-100"
              onClick={() => handleStatusChange(row.id, 'AVAILABLE')}
            >
              세탁완료
            </button>
          )}
          {row.status !== 'DAMAGED' && (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-red-50 text-red-600 hover:bg-red-100"
              onClick={() => handleStatusChange(row.id, 'DAMAGED')}
            >
              파손
            </button>
          )}
          {row.status === 'DAMAGED' && (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-green-50 text-green-700 hover:bg-green-100"
              onClick={() => handleStatusChange(row.id, 'AVAILABLE')}
            >
              복구
            </button>
          )}
        </div>
      ),
    },
  ];

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <PageHeader
        title="운동복 관리"
        description="운동복 재고와 대여 현황을 관리합니다."
        actions={
          <div className="flex gap-sm">
            <button
              className="bg-surface text-content-secondary border border-line px-md py-[6px] rounded-lg flex items-center gap-xs text-[13px] font-medium hover:bg-surface-tertiary"
              onClick={() => setShowQrScan(true)}
            >
              <ScanLine size={14} /> QR 스캔
            </button>
            <button
              className="bg-surface text-content-secondary border border-line px-md py-[6px] rounded-lg flex items-center gap-xs text-[13px] font-medium hover:bg-surface-tertiary"
              onClick={handleExcel}
            >
              <Download size={14} /> 엑셀
            </button>
            <button
              className="bg-primary text-white px-md py-[6px] rounded-lg flex items-center gap-xs text-[13px] font-medium hover:bg-primary-dark"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={14} /> 운동복 등록
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="전체" value={`${stats.total}벌`} icon={<Shirt />} />
        <StatCard label="대기" value={`${stats.available}벌`} icon={<Shirt />} variant="mint" />
        <StatCard label="대여중" value={`${stats.rented}벌`} icon={<Shirt />} variant="peach" />
        <StatCard label="세탁중" value={`${stats.washing}벌`} icon={<RefreshCw />} />
      </StatCardGrid>

      {/* 상태 탭 */}
      <TabNav
        tabs={STATUS_TABS.map(t => ({
          ...t,
          label: `${t.label} ${t.key === 'all' ? items.length : items.filter(i => i.status === t.key).length}`,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 검색 */}
      <div className="my-md">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-line bg-surface-secondary text-[13px] focus:border-primary outline-none"
            placeholder="번호, 회원명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 테이블 */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="운동복 데이터가 없습니다."
      />

      {/* 등록 모달 */}
      <Modal isOpen={showAddModal} title="운동복 등록" onClose={() => setShowAddModal(false)}>
          <div className="space-y-md">
            <div>
              <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">번호 *</label>
              <input
                className="w-full h-[40px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary outline-none"
                placeholder="예: 001"
                value={addForm.number}
                onChange={e => setAddForm({ ...addForm, number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">사이즈</label>
                <select
                  className="w-full h-[40px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary outline-none"
                  value={addForm.size}
                  onChange={e => setAddForm({ ...addForm, size: e.target.value })}
                >
                  {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">타입</label>
                <select
                  className="w-full h-[40px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary outline-none"
                  value={addForm.type}
                  onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                >
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">메모</label>
              <textarea
                className="w-full h-20 px-md py-sm bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary outline-none resize-none"
                placeholder="특이사항 입력"
                value={addForm.memo}
                onChange={e => setAddForm({ ...addForm, memo: e.target.value })}
              />
            </div>
            <div className="flex gap-sm pt-sm">
              <button
                className="flex-1 h-[40px] rounded-lg border border-line text-[13px] font-medium text-content-secondary hover:bg-surface-secondary"
                onClick={() => setShowAddModal(false)}
              >
                취소
              </button>
              <button
                className="flex-1 h-[40px] rounded-lg bg-primary text-[13px] font-semibold text-white hover:bg-primary-dark"
                onClick={handleAdd}
              >
                등록
              </button>
            </div>
          </div>
        </Modal>

        {/* QR 스캔 모달 — 운동복 QR 코드/번호로 빠른 대여/반납 */}
        <Modal
          isOpen={showQrScan}
          onClose={() => { setShowQrScan(false); setQrInput(''); setQrResult(null); }}
          title="QR 코드 스캔 — 빠른 대여/반납"
          size="md"
          footer={
            <button
              className="px-md py-[6px] border border-line rounded-lg text-[13px] text-content-secondary hover:bg-surface-tertiary"
              onClick={() => { setShowQrScan(false); setQrInput(''); setQrResult(null); }}
            >
              닫기
            </button>
          }
        >
          <div className="space-y-md">
            {/* QR 입력 */}
            <div className="flex gap-sm">
              <div className="relative flex-1">
                <QrCode size={14} className="absolute left-sm top-1/2 -translate-y-1/2 text-content-tertiary" />
                <input
                  type="text"
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQrLookup()}
                  placeholder="QR 코드 또는 운동복 번호 입력"
                  className="w-full pl-8 pr-sm py-[7px] border border-line rounded-lg text-[13px] bg-surface focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <button
                onClick={handleQrLookup}
                className="px-md py-[7px] bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary-dark"
              >
                조회
              </button>
            </div>

            {/* 조회 결과 */}
            {qrResult && (
              <div className="p-md bg-surface-secondary rounded-xl border border-line space-y-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-bold text-content">{qrResult.number}번</p>
                    <p className="text-[12px] text-content-secondary">
                      {TYPE_OPTIONS.find(t => t.value === qrResult.type)?.label} · {qrResult.size}
                    </p>
                  </div>
                  <span className={`text-[12px] font-semibold px-sm py-xs rounded-full ${
                    qrResult.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                    qrResult.status === 'RENTED' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {STATUS_MAP[qrResult.status]?.label ?? qrResult.status}
                  </span>
                </div>

                {qrResult.memberName && (
                  <p className="text-[12px] text-content-secondary">
                    대여 회원: <strong className="text-content">{qrResult.memberName}</strong>
                    {qrResult.rentedAt && ` (${qrResult.rentedAt})`}
                  </p>
                )}

                <div className="flex gap-sm pt-xs">
                  {qrResult.status === 'RENTED' && (
                    <button
                      onClick={handleQrReturn}
                      className="flex-1 flex items-center justify-center gap-xs px-md py-sm bg-green-600 text-white rounded-lg text-[13px] font-medium hover:bg-green-700"
                    >
                      <RefreshCw size={14} /> 반납 처리
                    </button>
                  )}
                  {qrResult.status === 'AVAILABLE' && (
                    <button
                      onClick={() => setShowMemberSearch(v => !v)}
                      className="flex-1 flex items-center justify-center gap-xs px-md py-sm bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary-dark"
                    >
                      <Shirt size={14} /> 대여 처리
                    </button>
                  )}
                  {qrResult.status === 'RENTED' && (
                    <button
                      onClick={async () => {
                        await handleStatusChange(qrResult.id, 'WASHING');
                        setQrResult(null);
                        setQrInput('');
                        toast.success('세탁 처리되었습니다.');
                      }}
                      className="flex-1 flex items-center justify-center gap-xs px-md py-sm border border-line text-content-secondary rounded-lg text-[13px] font-medium hover:bg-surface-tertiary"
                    >
                      세탁 전환
                    </button>
                  )}
                </div>

                {/* 회원 검색 영역 */}
                {showMemberSearch && qrResult.status === 'AVAILABLE' && (
                  <div className="pt-sm space-y-xs">
                    <p className="text-[12px] font-medium text-content-secondary">대여할 회원 검색</p>
                    <input
                      type="text"
                      value={memberQuery}
                      onChange={e => handleMemberSearch(e.target.value)}
                      placeholder="회원명 입력..."
                      className="w-full px-sm py-[7px] border border-line rounded-lg text-[13px] bg-surface focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    {memberResults.length > 0 && !selectedMember && (
                      <ul className="border border-line rounded-lg overflow-hidden">
                        {memberResults.map(m => (
                          <li
                            key={m.id}
                            onClick={() => { setSelectedMember(m); setMemberResults([]); setMemberQuery(m.name); }}
                            className="px-sm py-[7px] text-[13px] hover:bg-surface-secondary cursor-pointer border-b border-line last:border-b-0"
                          >
                            {m.name}
                            {m.phone && <span className="ml-sm text-[11px] text-content-tertiary">{m.phone}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedMember && (
                      <button
                        onClick={handleRentConfirm}
                        className="w-full py-sm bg-primary text-white rounded-lg text-[13px] font-semibold hover:bg-primary-dark"
                      >
                        {selectedMember.name}님에게 대여 확정
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-sm bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[11px] text-blue-600">
                키오스크에서 QR 코드를 스캔하면 자동으로 대여/반납이 처리됩니다.
                운동복 등록 시 QR 코드가 자동 생성됩니다.
              </p>
            </div>
          </div>
        </Modal>
    </AppLayout>
  );
}
