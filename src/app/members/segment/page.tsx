'use client';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Filter, Plus, Zap, ChevronRight, Tag, RefreshCw, Send } from 'lucide-react';
import { usePageSeed } from '@/hooks';
import type { MemberSegmentSeedPayload } from '@/lib/publishingPageSeed';

const FALLBACK_SEGMENTS: MemberSegmentSeedPayload = {
  segments: [
    { id: 1, name: '만료 임박 회원', desc: '30일 이내 이용권 만료 예정', count: 23, color: 'text-red-600 bg-red-50 border-red-200', auto: true },
    { id: 2, name: '장기 미방문', desc: '30일 이상 방문 없는 회원', count: 45, color: 'text-orange-600 bg-orange-50 border-orange-200', auto: true },
    { id: 3, name: '신규 가입 (30일)', desc: '최근 30일 이내 등록 회원', count: 18, color: 'text-blue-600 bg-blue-50 border-blue-200', auto: true },
    { id: 4, name: 'PT 미구매 회원', desc: 'PT 이용권 미보유 활성 회원', count: 134, color: 'text-purple-600 bg-purple-50 border-purple-200', auto: true },
    { id: 5, name: '생일 회원 (이번달)', desc: '이번 달 생일인 회원', count: 12, color: 'text-pink-600 bg-pink-50 border-pink-200', auto: true },
  ],
};

const segmentMembers: Record<string, Array<{ name: string; note: string }>> = {
  '만료 임박 회원': [{ name: '김민준', note: '만료 D-7 · 재등록 상담 필요' }, { name: '박지훈', note: '만료 D-3 · 락커 동시 만료' }],
  '장기 미방문': [{ name: '최유리', note: '34일 미방문 · 휴면 전환 직전' }, { name: '한도윤', note: '48일 미방문 · 담당 FC 지정' }],
  '신규 가입 (30일)': [{ name: '오지민', note: '가입 12일차 · 첫 PT 미진행' }, { name: '문서준', note: '가입 21일차 · 앱 미설치' }],
};

export default function SegmentPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSegmentName, setSelectedSegmentName] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [segmentsState, setSegmentsState] = useState(FALLBACK_SEGMENTS.segments);
  const [form, setForm] = useState({ name: '', desc: '', condition: '활성 회원', count: 24 });
  const [messageBody, setMessageBody] = useState('');
  const { loading, error, branchId, snapshotDate, reload } = usePageSeed<MemberSegmentSeedPayload>(
    '/members/segment',
    FALLBACK_SEGMENTS,
  );

  const segments = segmentsState;
  const selectedMembers = useMemo(() => segmentMembers[selectedSegmentName ?? ''] ?? [], [selectedSegmentName]);

  const handleCreateSegment = () => {
    if (!form.name.trim() || !form.desc.trim()) {
      toast.error('세그먼트 이름과 설명을 입력하세요.');
      return;
    }
    setSegmentsState((prev) => [
      {
        id: prev.length + 1,
        name: form.name.trim(),
        desc: `${form.desc.trim()} · ${form.condition}`,
        count: form.count,
        color: 'text-sky-600 bg-sky-50 border-sky-200',
        auto: false,
      },
      ...prev,
    ]);
    setShowCreate(false);
    setForm({ name: '', desc: '', condition: '활성 회원', count: 24 });
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

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
          {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
        </div>

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
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="새 세그먼트 만들기"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={handleCreateSegment}>저장</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="예: 6개월 이상 장기회원" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <input value={form.desc} onChange={(e) => setForm((prev) => ({ ...prev, desc: e.target.value }))} placeholder="예: 장기 결제 고객" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-md">
            <select value={form.condition} onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option>활성 회원</option>
              <option>만료 임박</option>
              <option>장기 미방문</option>
              <option>PT 미구매</option>
            </select>
            <input type="number" min={1} value={form.count} onChange={(e) => setForm((prev) => ({ ...prev, count: Number(e.target.value) || 1 }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
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
