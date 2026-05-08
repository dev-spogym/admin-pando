'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Share2, Gift, Plus, ChevronRight } from 'lucide-react';

const referrals = [
  { id: 1, referrer: '김민준', referred: '이서연', date: '2026-04-20', reward: '10,000P', status: '지급완료', product: '3개월 이용권' },
  { id: 2, referrer: '박지훈', referred: '최유리', date: '2026-04-18', reward: '10,000P', status: '지급완료', product: 'PT 10회권' },
  { id: 3, referrer: '김민준', referred: '정현우', date: '2026-04-15', reward: '10,000P', status: '지급대기', product: '6개월 이용권' },
  { id: 4, referrer: '이서연', referred: '강서준', date: '2026-04-10', reward: '10,000P', status: '지급완료', product: '필라테스 월정액' },
  { id: 5, referrer: '최유리', referred: '윤지민', date: '2026-04-05', reward: '10,000P', status: '취소', product: '-' },
];

const initialPrograms = [
  { name: '친구 초대 기본', reward: '10,000P', condition: '초대 회원 첫 결제 시', active: true, used: 42 },
  { name: '5인 초대 보너스', reward: '50,000P', condition: '5명 초대 달성 시 추가 지급', active: true, used: 8 },
];

export default function ReferralPage() {
  const [tab, setTab] = useState<'이력' | '프로그램'>('이력');
  const [programs, setPrograms] = useState(initialPrograms);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProgram, setEditingProgram] = useState<typeof initialPrograms[number] | null>(null);
  const [form, setForm] = useState({ name: '', reward: '', condition: '', active: true });

  const resetForm = () => setForm({ name: '', reward: '', condition: '', active: true });

  const handleSaveProgram = () => {
    if (!form.name.trim() || !form.reward.trim() || !form.condition.trim()) {
      toast.error('프로그램명, 보상, 조건을 입력하세요.');
      return;
    }

    if (editingProgram) {
      setPrograms((prev) => prev.map((item) => (item.name === editingProgram.name ? { ...item, ...form } : item)));
      toast.success('리퍼럴 프로그램을 수정했습니다.');
      setEditingProgram(null);
    } else {
      setPrograms((prev) => [...prev, { ...form, used: 0 }]);
      toast.success('리퍼럴 프로그램을 추가했습니다.');
      setShowCreate(false);
    }
    resetForm();
  };

  return (
    <AppLayout>
      <PageHeader
        title="리퍼럴 프로그램"
        description="회원 추천 이벤트를 관리하고 보상 지급 현황을 확인합니다"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            프로그램 추가
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 달 추천</p>
          <p className="text-2xl font-bold text-gray-900">18건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전환 성공</p>
          <p className="text-2xl font-bold text-green-600">14건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전환율</p>
          <p className="text-2xl font-bold text-blue-600">78%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">지급 포인트</p>
          <p className="text-2xl font-bold text-purple-600">140,000P</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['이력', '프로그램'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '이력' ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {referrals.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-purple-100 rounded-xl">
                  <Share2 className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{r.referrer}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{r.referred}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{r.date} · {r.product}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-purple-600">{r.reward}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  r.status === '지급완료' ? 'bg-green-100 text-green-700' :
                  r.status === '지급대기' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl">
                    <Gift className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.condition}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-purple-600">{p.reward}</p>
                  <p className="text-xs text-gray-400 mt-1">사용 {p.used}건</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? '활성' : '비활성'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProgram(p);
                    setForm({ name: p.name, reward: p.reward, condition: p.condition, active: p.active });
                  }}
                  className="text-xs text-blue-600 hover:underline ml-auto"
                >
                  편집
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreate || editingProgram !== null}
        onClose={() => {
          setShowCreate(false);
          setEditingProgram(null);
          resetForm();
        }}
        title={editingProgram ? '리퍼럴 프로그램 편집' : '리퍼럴 프로그램 추가'}
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => {
              setShowCreate(false);
              setEditingProgram(null);
              resetForm();
            }}>취소</Button>
            <Button onClick={handleSaveProgram}>저장</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="프로그램명" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-md">
            <input value={form.reward} onChange={(e) => setForm((prev) => ({ ...prev, reward: e.target.value }))} placeholder="보상 예: 10,000P" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            <select value={form.active ? '활성' : '비활성'} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.value === '활성' }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option>활성</option>
              <option>비활성</option>
            </select>
          </div>
          <textarea value={form.condition} onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))} placeholder="지급 조건" rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </Modal>
    </AppLayout>
  );
}
