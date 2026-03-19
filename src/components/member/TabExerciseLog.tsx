// 운동 이력 탭 — 날짜별 그룹핑 + 추가 모달
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  getExerciseLogs,
  createExerciseLog,
  deleteExerciseLog,
  type ExerciseLog,
} from "@/api/endpoints/exerciseLogs";

interface Props {
  memberId: number;
}

const EMPTY_FORM = {
  logDate: new Date().toISOString().split("T")[0],
  exerciseName: "",
  sets: "",
  reps: "",
  weightKg: "",
  durationMin: "",
  distanceKm: "",
  memo: "",
};

export default function TabExerciseLog({ memberId }: Props) {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getExerciseLogs(memberId);
      setLogs(data);
      setLoading(false);
    };
    load();
  }, [memberId]);

  const handleSave = async () => {
    if (!form.logDate) { toast.error("날짜를 입력하세요."); return; }
    if (!form.exerciseName.trim()) { toast.error("운동명을 입력하세요."); return; }
    setSaving(true);
    try {
      const created = await createExerciseLog({
        memberId,
        logDate: form.logDate,
        exerciseName: form.exerciseName.trim(),
        sets: form.sets ? Number(form.sets) : null,
        reps: form.reps ? Number(form.reps) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        durationMin: form.durationMin ? Number(form.durationMin) : null,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
        memo: form.memo || null,
      });
      setLogs(prev => [created, ...prev]);
      toast.success("운동 이력이 저장되었습니다.");
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
    } catch (e: unknown) {
      toast.error(`저장 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteExerciseLog(deleteId);
      setLogs(prev => prev.filter(l => l.id !== deleteId));
      toast.success("삭제되었습니다.");
    } catch (e: unknown) {
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setDeleteId(null);
    }
  };

  // 날짜별 그룹핑
  const grouped = logs.reduce<Record<string, ExerciseLog[]>>((acc, log) => {
    const date = log.logDate.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // 통계
  const totalSessions = sortedDates.length;
  const totalLogs = logs.length;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthSessions = sortedDates.filter(d => d.startsWith(thisMonth)).length;

  if (loading) {
    return <div className="flex items-center justify-center py-xl text-content-secondary text-[13px]">로딩 중...</div>;
  }

  return (
    <div className="space-y-lg">
      {/* 통계 */}
      <div className="grid grid-cols-3 gap-md">
        <StatCard label="전체 운동일" value={`${totalSessions}일`} icon={<Dumbbell size={18} />} variant="default" />
        <StatCard label="이번 달 운동일" value={`${thisMonthSessions}일`} icon={<Dumbbell size={18} />} variant="mint" />
        <StatCard label="전체 운동 횟수" value={`${totalLogs}회`} icon={<Dumbbell size={18} />} variant="peach" />
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-content">운동 이력</h3>
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          onClick={() => setShowModal(true)}
        >
          <Plus size={14} />
          운동 추가
        </button>
      </div>

      {/* 날짜별 그룹 목록 */}
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-xxl text-content-secondary">
          <Dumbbell size={40} className="mb-sm opacity-20" />
          <p className="text-[13px]">운동 이력이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-md">
          {sortedDates.map(date => (
            <div key={date} className="bg-surface rounded-xl border border-line overflow-hidden">
              {/* 날짜 헤더 */}
              <div className="px-lg py-sm bg-surface-secondary/50 border-b border-line flex items-center gap-sm">
                <Dumbbell size={14} className="text-primary" />
                <span className="text-[13px] font-bold text-content">{date}</span>
                <span className="text-[11px] text-content-secondary">({grouped[date].length}종목)</span>
              </div>
              {/* 운동 항목 */}
              <div className="divide-y divide-line">
                {grouped[date].map(log => (
                  <div key={log.id} className="flex items-center justify-between px-lg py-sm hover:bg-surface-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-content">{log.exerciseName}</p>
                      <div className="flex items-center gap-md mt-xs flex-wrap">
                        {log.sets != null && <span className="text-[11px] text-content-secondary">{log.sets}세트</span>}
                        {log.reps != null && <span className="text-[11px] text-content-secondary">{log.reps}회</span>}
                        {log.weightKg != null && <span className="text-[11px] text-content-secondary">{log.weightKg}kg</span>}
                        {log.durationMin != null && <span className="text-[11px] text-content-secondary">{log.durationMin}분</span>}
                        {log.distanceKm != null && <span className="text-[11px] text-content-secondary">{log.distanceKm}km</span>}
                        {log.memo && <span className="text-[11px] text-content-secondary italic truncate max-w-[160px]">{log.memo}</span>}
                      </div>
                    </div>
                    <button
                      className="p-xs rounded hover:bg-red-50 text-content-secondary hover:text-state-error transition-colors shrink-0 ml-md"
                      onClick={() => setDeleteId(log.id)}
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 운동 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[480px] overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <Dumbbell size={16} className="text-primary" />
                운동 이력 추가
              </h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {/* 날짜 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0">날짜 <span className="text-state-error">*</span></label>
                <input type="date" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.logDate} onChange={e => setForm(p => ({ ...p, logDate: e.target.value }))} />
              </div>
              {/* 운동명 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0">운동명 <span className="text-state-error">*</span></label>
                <input type="text" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" placeholder="예: 스쿼트, 런닝, 수영" value={form.exerciseName} onChange={e => setForm(p => ({ ...p, exerciseName: e.target.value }))} />
              </div>
              {/* 세트/횟수 */}
              <div className="grid grid-cols-2 gap-md">
                {[
                  { key: "sets", label: "세트", unit: "세트" },
                  { key: "reps", label: "횟수", unit: "회" },
                  { key: "weightKg", label: "무게", unit: "kg" },
                  { key: "durationMin", label: "시간", unit: "분" },
                  { key: "distanceKm", label: "거리", unit: "km" },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-xs">
                    <label className="text-[12px] text-content-secondary w-[44px] shrink-0">{f.label}</label>
                    <input type="number" step="0.1" min="0" className="flex-1 px-sm py-xs rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    <span className="text-[11px] text-content-secondary w-8 shrink-0">{f.unit}</span>
                  </div>
                ))}
              </div>
              {/* 메모 */}
              <div className="flex items-start gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0 pt-sm">메모</label>
                <textarea className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} placeholder="특이사항 메모" value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-lg py-sm border border-line text-content-secondary rounded-button text-[13px] hover:bg-surface-secondary transition-colors" onClick={() => setShowModal(false)}>취소</button>
              <button className={cn("px-lg py-sm bg-primary text-white rounded-button text-[13px] font-bold hover:bg-primary-dark transition-colors shadow-sm", saving && "opacity-60 cursor-not-allowed")} onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="운동 이력 삭제"
        description="이 운동 이력을 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
