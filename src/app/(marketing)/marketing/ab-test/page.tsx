'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { FlaskConical, Plus, Trash2, Trophy } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type AbVariant = { name: string; sent: number; open: number; click: number };
type AbTest = {
  id: number;
  name: string;
  status: '진행' | '완료';
  variantA: AbVariant;
  variantB: AbVariant;
  winner: 'A' | 'B' | null;
  startDate: string;
  endDate: string;
};

const getBranchId = () => {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem('branchId') || '1');
};

export default function AbTestPage() {
  const [showNew, setShowNew] = useState(false);
  const [tests, setTests] = useState<AbTest[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AbTest | null>(null);
  const [newForm, setNewForm] = useState({
    name: '',
    variantA: '',
    variantB: '',
    startDate: '',
    endDate: '',
  });

  const loadTests = useCallback(async () => {
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('branchId', getBranchId())
      .order('createdAt', { ascending: false });
    if (error) {
      toast.error(`A/B 테스트를 불러오지 못했습니다: ${error.message}`);
      return;
    }
    setTests((data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      variantA: row.variantA,
      variantB: row.variantB,
      winner: row.winner ?? null,
      startDate: row.startDate,
      endDate: row.endDate,
    })));
  }, []);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  const resetForm = () => setNewForm({ name: '', variantA: '', variantB: '', startDate: '', endDate: '' });

  const handleCreate = async () => {
    if (!newForm.name.trim()) { toast.error('테스트 이름을 입력하세요.'); return; }
    if (!newForm.variantA.trim() || !newForm.variantB.trim()) { toast.error('A안과 B안 메시지를 입력하세요.'); return; }
    if (!newForm.startDate || !newForm.endDate) { toast.error('테스트 기간을 입력하세요.'); return; }
    if (newForm.startDate > newForm.endDate) { toast.error('시작일은 종료일보다 빠를 수 없습니다.'); return; }

    const { error } = await supabase
      .from('ab_tests')
      .insert({
        branchId: getBranchId(),
        name: newForm.name.trim(),
        status: '진행',
        variantA: { name: `A안: ${newForm.variantA.trim()}`, sent: 0, open: 0, click: 0 },
        variantB: { name: `B안: ${newForm.variantB.trim()}`, sent: 0, open: 0, click: 0 },
        winner: null,
        startDate: newForm.startDate,
        endDate: newForm.endDate,
      });
    if (error) {
      toast.error(`A/B 테스트 저장 실패: ${error.message}`);
      return;
    }
    await loadTests();
    resetForm();
    setShowNew(false);
    toast.success('A/B 테스트가 V2/후속 항목으로 저장되었습니다.');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('ab_tests')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('branchId', getBranchId());
    if (error) {
      toast.error(`A/B 테스트 삭제 실패: ${error.message}`);
      return;
    }
    await loadTests();
    setDeleteTarget(null);
    toast.success('A/B 테스트를 삭제했습니다.');
  };

  return (
    <AppLayout>
      <PageHeader title="A/B 테스트" description="두 가지 메시지 안을 비교해 더 효과적인 방식을 찾습니다" actions={
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
          <Plus className="w-4 h-4" /> V2/후속 테스트 생성
        </button>
      } />

      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">V2/후속</span>
          <p className="text-sm font-medium text-red-700">
            A/B 테스트는 V1 확정 범위가 아닙니다. 퍼블리싱 비교용으로 화면을 유지하며 자동 분배, 승리안 채택, 캠페인 자동 전환은 후속 확정 후 연동합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-500 mb-1">진행 중 테스트</p>
          <p className="text-2xl font-bold text-red-700">{tests.filter((t) => t.status === '진행').length}개</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-xs text-red-500 mb-1">완료된 테스트</p>
          <p className="text-2xl font-bold text-gray-900">{tests.filter((t) => t.status === '완료').length}개</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-xs text-red-500 mb-1">평균 성과 향상</p>
          <p className="text-2xl font-bold text-red-600">+23%</p>
        </div>
      </div>

      <div className="space-y-4">
        {tests.length === 0 && (
          <div className="rounded-xl border border-red-100 bg-white p-10 text-center text-sm text-gray-500">
            등록된 A/B 테스트가 없습니다. 후속 확정 시 생성해 비교 지표를 누적합니다.
          </div>
        )}
        {tests.map(test => {
          const aOpenRate = Math.round((test.variantA.open / test.variantA.sent) * 100);
          const bOpenRate = Math.round((test.variantB.open / test.variantB.sent) * 100);
          const aClickRate = Math.round((test.variantA.click / test.variantA.sent) * 100);
          const bClickRate = Math.round((test.variantB.click / test.variantB.sent) * 100);

          return (
            <div key={test.id} className="bg-white rounded-xl border border-red-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 rounded-xl">
                    <FlaskConical className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{test.name}</p>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">V2/후속</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{test.startDate} ~ {test.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${test.status === '진행' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{test.status}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(test)}
                    className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[test.variantA, test.variantB].map((v, i) => {
                  const isWinner = test.winner === (i === 0 ? 'A' : 'B');
                  const openRate = i === 0 ? aOpenRate : bOpenRate;
                  const clickRate = i === 0 ? aClickRate : bClickRate;
                  return (
                    <div key={i} className={`rounded-xl p-4 border-2 ${isWinner ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === 0 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{i === 0 ? 'A' : 'B'}</span>
                        <span className="text-xs font-medium text-gray-700">{v.name}</span>
                        {isWinner && <Trophy className="w-3.5 h-3.5 text-amber-500 ml-auto" />}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">발송</p>
                          <p className="text-sm font-bold text-gray-800">{v.sent}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">오픈율</p>
                          <p className="text-sm font-bold text-red-600">{openRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">클릭율</p>
                          <p className="text-sm font-bold text-purple-600">{clickRate}%</p>
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

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">A/B 테스트 생성</h2>
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">V2/후속</span>
            </div>
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              생성 모달은 퍼블리싱 비교용입니다. 저장, 자동 분배, 승리안 채택은 후속 확정 후 연동합니다.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">테스트 이름</label>
              <input
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="테스트 이름"
                value={newForm.name}
                onChange={(e) => setNewForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">A안 메시지</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A안 메시지 내용"
                value={newForm.variantA}
                onChange={(e) => setNewForm((prev) => ({ ...prev, variantA: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">B안 메시지</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="B안 메시지 내용"
                value={newForm.variantB}
                onChange={(e) => setNewForm((prev) => ({ ...prev, variantB: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newForm.startDate}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newForm.endDate}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowNew(false); resetForm(); }} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg">취소</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg">V2/후속 저장</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="A/B 테스트 삭제"
        description={`"${deleteTarget?.name}" 테스트를 삭제하시겠습니까? 테스트 실적도 함께 삭제됩니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
