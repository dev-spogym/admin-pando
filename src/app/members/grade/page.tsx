'use client';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Star, Users, Settings, ChevronRight, Plus, Trash2 } from 'lucide-react';

// ─── SCR-M009 등급 관리 (MBR-EXT-03) ──────────────────────────────────────────
// docs4/V1+V2/D02-회원관리/회원관리.md ## SCR-M009
// 기능형 목업: 등급 목록 + 등급별 회원수 요약 → 기준 설정(방문 임계값) → 혜택(마일리지 적립률·할인율) → 갱신 주기

interface GradeItem {
  name: string;
  color: string;
  count: number;
  minVisit: number;
  mileageRate: number; // 마일리지 적립률 % (MBR-EXT-03-03)
  discountRate: number; // 이용권 할인율 %
  benefits: string[];
}

// docs4 SCR-M009 기준 등급 체계: 브론즈·실버·골드·플래티넘·다이아몬드
const INITIAL_GRADES: GradeItem[] = [
  { name: '다이아몬드', color: 'bg-sky-100 text-sky-700 border-sky-200', count: 12, minVisit: 200, mileageRate: 5, discountRate: 15, benefits: ['전용 라커', '무료 PT 2회/월', '생일 혜택'] },
  { name: '플래티넘', color: 'bg-purple-100 text-purple-700 border-purple-200', count: 48, minVisit: 100, mileageRate: 3, discountRate: 10, benefits: ['우선 예약', '10% 할인', '생일 혜택'] },
  { name: '골드', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', count: 127, minVisit: 50, mileageRate: 2, discountRate: 5, benefits: ['5% 할인', '생일 혜택'] },
  { name: '실버', color: 'bg-gray-100 text-gray-600 border-gray-200', count: 234, minVisit: 20, mileageRate: 1, discountRate: 0, benefits: ['생일 혜택'] },
  { name: '브론즈', color: 'bg-orange-50 text-orange-600 border-orange-200', count: 456, minVisit: 0, mileageRate: 0.5, discountRate: 0, benefits: ['기본 서비스'] },
];

const gradeMembers: Record<string, Array<{ name: string; visits: number; contract: string }>> = {
  다이아몬드: [{ name: '김민준', visits: 244, contract: '프리미엄 PT 12개월' }, { name: '정서윤', visits: 228, contract: '골프+PT 패키지' }],
  플래티넘: [{ name: '이서연', visits: 164, contract: 'PT 24회' }, { name: '박현우', visits: 121, contract: '헬스 12개월' }],
  골드: [{ name: '최유리', visits: 88, contract: '헬스 6개월' }, { name: '장도윤', visits: 71, contract: '요가 48회' }],
  실버: [{ name: '한지민', visits: 36, contract: '필라테스 24회' }, { name: '오지훈', visits: 24, contract: '헬스 3개월' }],
  브론즈: [{ name: '문서아', visits: 8, contract: '체험권' }, { name: '임민재', visits: 3, contract: '헬스 1개월' }],
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
    // 예외처리: 음수 입력 차단
    const hasNegative = grades.some((grade) => (criteriaDraft[grade.name] ?? grade.minVisit) < 0);
    if (hasNegative) {
      toast.error('0 이상 입력해주세요.');
      return;
    }
    // 예외처리: 임계값 역전 (상위 등급이 하위보다 작으면 차단)
    // grades 배열은 상위→하위 순서이므로 위 등급의 기준이 아래 등급보다 커야 한다.
    for (let i = 0; i < grades.length - 1; i++) {
      const upper = criteriaDraft[grades[i].name] ?? grades[i].minVisit;
      const lower = criteriaDraft[grades[i + 1].name] ?? grades[i + 1].minVisit;
      if (upper <= lower) {
        toast.error(`상위 등급(${grades[i].name})은 하위 등급(${grades[i + 1].name})보다 기준이 커야 합니다.`);
        return;
      }
    }
    setGrades((prev) => prev.map((grade) => ({ ...grade, minVisit: criteriaDraft[grade.name] ?? grade.minVisit })));
    setIsCriteriaOpen(false);
    toast.success('저장되었습니다.');
  };

  const handleSaveBenefits = () => {
    if (!editingGrade) return;
    // 예외처리: 마일리지 적립률 10% 초과 / 할인율 100% 초과 / 음수 차단
    if (editingGrade.mileageRate < 0 || editingGrade.discountRate < 0) {
      toast.error('0 이상 입력해주세요.');
      return;
    }
    if (editingGrade.mileageRate > 10) {
      toast.error('마일리지 적립률은 10% 이하로 입력해주세요.');
      return;
    }
    if (editingGrade.discountRate > 100) {
      toast.error('할인율은 100% 이하로 입력해주세요.');
      return;
    }
    setGrades((prev) => prev.map((grade) => (grade.name === editingGrade.name ? editingGrade : grade)));
    setEditingGrade(null);
    setNewBenefit('');
    toast.success('저장되었습니다.');
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

        {/* 등급별 회원 현황 요약 (MBR-EXT-03-05) */}
        <StatCardGrid cols={3}>
          <StatCard label="등급 수" value={grades.length} icon={<Star size={20} />} />
          <StatCard label="전체 등급 회원" value={grades.reduce((acc, g) => acc + g.count, 0)} icon={<Users size={20} />} variant="mint" />
          <StatCard label="갱신 주기" value={refreshCycle} icon={<Settings size={20} />} variant="peach" />
        </StatCardGrid>

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
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">마일리지 적립 {grade.mileageRate}%</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">이용권 할인 {grade.discountRate}%</span>
                  </div>
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
            {/* 등급별 혜택 설정 (MBR-EXT-03-03): 마일리지 적립률·할인율 */}
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="text-xs font-semibold text-content-secondary">마일리지 적립률 (%)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={editingGrade.mileageRate}
                  onChange={(event) => setEditingGrade({ ...editingGrade, mileageRate: Number(event.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-content-tertiary">최대 10%까지 입력 가능</p>
              </div>
              <div className="space-y-xs">
                <label className="text-xs font-semibold text-content-secondary">이용권 할인율 (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editingGrade.discountRate}
                  onChange={(event) => setEditingGrade({ ...editingGrade, discountRate: Number(event.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-content-tertiary">최대 100%까지 입력 가능</p>
              </div>
            </div>
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
