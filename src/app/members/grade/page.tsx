'use client';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Star, Users, Settings, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface GradeItem {
  name: string;
  color: string;
  count: number;
  minVisit: number;
  benefits: string[];
}

const INITIAL_GRADES: GradeItem[] = [
  { name: 'VVIP', color: 'bg-purple-100 text-purple-700 border-purple-200', count: 12, minVisit: 200, benefits: ['전용 라커', '무료 PT 2회/월', '생일 혜택'] },
  { name: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200', count: 48, minVisit: 100, benefits: ['우선 예약', '10% 할인', '생일 혜택'] },
  { name: 'GOLD', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', count: 127, minVisit: 50, benefits: ['5% 할인', '생일 혜택'] },
  { name: 'SILVER', color: 'bg-gray-100 text-gray-600 border-gray-200', count: 234, minVisit: 20, benefits: ['생일 혜택'] },
  { name: 'BRONZE', color: 'bg-orange-50 text-orange-600 border-orange-200', count: 456, minVisit: 0, benefits: ['기본 서비스'] },
];

const gradeMembers: Record<string, Array<{ name: string; visits: number; contract: string }>> = {
  VVIP: [{ name: '김민준', visits: 244, contract: 'VIP PT 12개월' }, { name: '정서윤', visits: 228, contract: '골프+PT 패키지' }],
  VIP: [{ name: '이서연', visits: 164, contract: 'PT 24회' }, { name: '박현우', visits: 121, contract: '헬스 12개월' }],
  GOLD: [{ name: '최유리', visits: 88, contract: '헬스 6개월' }, { name: '장도윤', visits: 71, contract: '요가 48회' }],
  SILVER: [{ name: '한지민', visits: 36, contract: '필라테스 24회' }, { name: '오지훈', visits: 24, contract: '헬스 3개월' }],
  BRONZE: [{ name: '문서아', visits: 8, contract: '체험권' }, { name: '임민재', visits: 3, contract: '헬스 1개월' }],
};

export default function GradeManagePage() {
  const [grades, setGrades] = useState(INITIAL_GRADES);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeItem | null>(null);
  const [viewingMembersGrade, setViewingMembersGrade] = useState<GradeItem | null>(null);
  const [refreshCycle, setRefreshCycle] = useState('월간');
  const [newBenefit, setNewBenefit] = useState('');
  const [criteriaDraft, setCriteriaDraft] = useState<Record<string, number>>(
    Object.fromEntries(INITIAL_GRADES.map((grade) => [grade.name, grade.minVisit]))
  );

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.name === selected) ?? null,
    [grades, selected]
  );

  const handleSaveCriteria = () => {
    setGrades((prev) => prev.map((grade) => ({ ...grade, minVisit: criteriaDraft[grade.name] ?? grade.minVisit })));
    setIsCriteriaOpen(false);
    toast.success(`등급 기준과 갱신 주기(${refreshCycle})를 저장했습니다.`);
  };

  const handleSaveBenefits = () => {
    if (!editingGrade) return;
    setGrades((prev) => prev.map((grade) => (grade.name === editingGrade.name ? editingGrade : grade)));
    setEditingGrade(null);
    setNewBenefit('');
    toast.success(`${editingGrade.name} 혜택을 저장했습니다.`);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <PageHeader
          title="등급 관리"
          description="회원 등급 기준과 혜택을 설정합니다"
          actions={
            <Button variant="outline" size="sm" icon={<Settings className="w-4 h-4" />} onClick={() => setIsCriteriaOpen(true)}>
              등급 기준 설정
            </Button>
          }
        />

        <div className="space-y-3">
          {grades.map((grade) => (
            <div
              key={grade.name}
              onClick={() => setSelected(selected === grade.name ? null : grade.name)}
              className={`bg-white rounded-xl border cursor-pointer transition-all ${selected === grade.name ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${grade.color}`}>{grade.name}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">방문 {grade.minVisit}회 이상</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">{grade.count}명</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selected === grade.name ? 'rotate-90' : ''}`} />
              </div>
              {selected === grade.name && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">혜택</p>
                  <div className="flex flex-wrap gap-2">
                    {grade.benefits.map((benefit) => (
                      <span key={benefit} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{benefit}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={(event) => { event.stopPropagation(); setEditingGrade({ ...grade }); }} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">혜택 편집</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setViewingMembersGrade(grade); }} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">해당 회원 보기</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isCriteriaOpen}
        onClose={() => setIsCriteriaOpen(false)}
        title="등급 기준 설정"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setIsCriteriaOpen(false)}>닫기</Button>
            <Button onClick={handleSaveCriteria}>저장</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
            <p className="text-xs text-content-secondary">등급 갱신 주기</p>
            <div className="mt-sm flex gap-sm">
              {['월간', '분기', '연간'].map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setRefreshCycle(cycle)}
                  className={`rounded-lg px-3 py-2 text-sm ${refreshCycle === cycle ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-sm">
            {grades.map((grade) => (
              <div key={grade.name} className="flex items-center justify-between rounded-xl border border-line p-md">
                <div>
                  <p className="text-sm font-semibold text-content">{grade.name}</p>
                  <p className="text-xs text-content-secondary">누적 방문 횟수 기준</p>
                </div>
                <div className="flex items-center gap-sm">
                  <input
                    type="number"
                    min={0}
                    value={criteriaDraft[grade.name] ?? grade.minVisit}
                    onChange={(event) => setCriteriaDraft((prev) => ({ ...prev, [grade.name]: Number(event.target.value) || 0 }))}
                    className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-gray-500">회</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editingGrade !== null}
        onClose={() => {
          setEditingGrade(null);
          setNewBenefit('');
        }}
        title={editingGrade ? `${editingGrade.name} 혜택 편집` : '혜택 편집'}
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => {
              setEditingGrade(null);
              setNewBenefit('');
            }}>취소</Button>
            <Button onClick={handleSaveBenefits}>저장</Button>
          </div>
        }
      >
        {editingGrade && (
          <div className="space-y-md">
            <div className="flex gap-sm">
              <input
                type="text"
                value={newBenefit}
                onChange={(event) => setNewBenefit(event.target.value)}
                placeholder="새 혜택 입력"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
              <Button
                variant="outline"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  if (!newBenefit.trim()) return;
                  setEditingGrade({ ...editingGrade, benefits: [...editingGrade.benefits, newBenefit.trim()] });
                  setNewBenefit('');
                }}
              >
                추가
              </Button>
            </div>
            <div className="space-y-sm">
              {editingGrade.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center justify-between rounded-xl border border-line bg-surface-secondary/50 px-md py-sm">
                  <span className="text-sm text-content">{benefit}</span>
                  <button
                    type="button"
                    onClick={() => setEditingGrade({ ...editingGrade, benefits: editingGrade.benefits.filter((item) => item !== benefit) })}
                    className="rounded-md p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={viewingMembersGrade !== null}
        onClose={() => setViewingMembersGrade(null)}
        title={viewingMembersGrade ? `${viewingMembersGrade.name} 회원 목록` : '회원 목록'}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewingMembersGrade(null)}>닫기</Button>
          </div>
        }
      >
        {viewingMembersGrade && (
          <div className="space-y-sm">
            {(gradeMembers[viewingMembersGrade.name] ?? []).map((member) => (
              <div key={member.name} className="rounded-xl border border-line p-md">
                <p className="text-sm font-semibold text-content">{member.name}</p>
                <p className="mt-xs text-xs text-content-secondary">누적 방문 {member.visits}회 · 이용권 {member.contract}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
