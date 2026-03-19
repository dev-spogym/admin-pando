// 종합평가 탭 — 카테고리별 점수(1~10) 평가 이력
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  getMemberEvaluations,
  createMemberEvaluation,
  updateMemberEvaluation,
  deleteMemberEvaluation,
  type MemberEvaluation,
  type EvaluationCategory,
} from "@/api/endpoints/evaluations";

interface Props {
  memberId: number;
}

const CATEGORIES: EvaluationCategory[] = ["체력", "자세", "유연성", "근력", "목표달성"];

// 점수 색상
function scoreColor(score: number): string {
  if (score >= 9) return "text-state-success font-bold";
  if (score >= 7) return "text-accent font-semibold";
  if (score >= 5) return "text-state-warning font-semibold";
  return "text-state-error font-semibold";
}

// 카테고리 배지 색상
function categoryVariant(cat: string): "success" | "info" | "warning" | "error" | "default" {
  const map: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
    체력: "success",
    자세: "info",
    유연성: "default",
    근력: "warning",
    목표달성: "error",
  };
  return map[cat] ?? "default";
}

const EMPTY_FORM = {
  evaluatedAt: new Date().toISOString().split("T")[0],
  category: "체력" as EvaluationCategory,
  score: "7",
  content: "",
  evaluatorName: "",
};

export default function TabEvaluation({ memberId }: Props) {
  const [records, setRecords] = useState<MemberEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberEvaluation | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getMemberEvaluations(memberId);
      setRecords(data);
      setLoading(false);
    };
    load();
  }, [memberId]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (rec: MemberEvaluation) => {
    setEditTarget(rec);
    setForm({
      evaluatedAt: rec.evaluatedAt.slice(0, 10),
      category: rec.category,
      score: String(rec.score),
      content: rec.content ?? "",
      evaluatorName: rec.evaluatorName ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const score = Number(form.score);
    if (!form.evaluatedAt) { toast.error("평가일을 입력하세요."); return; }
    if (isNaN(score) || score < 1 || score > 10) { toast.error("점수는 1~10 사이로 입력하세요."); return; }
    setSaving(true);
    try {
      const payload = {
        memberId,
        evaluatedAt: form.evaluatedAt,
        category: form.category,
        score,
        content: form.content || null,
        evaluatorName: form.evaluatorName || null,
      };
      if (editTarget) {
        await updateMemberEvaluation(editTarget.id, payload);
        setRecords(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...payload } : r));
        toast.success("종합평가가 수정되었습니다.");
      } else {
        const created = await createMemberEvaluation(payload);
        setRecords(prev => [created, ...prev]);
        toast.success("종합평가가 저장되었습니다.");
      }
      setShowModal(false);
    } catch (e: unknown) {
      toast.error(`저장 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteMemberEvaluation(deleteId);
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      toast.success("삭제되었습니다.");
    } catch (e: unknown) {
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setDeleteId(null);
    }
  };

  // 카테고리별 최근 평균 점수
  const avgByCategory = CATEGORIES.map(cat => {
    const catRecs = records.filter(r => r.category === cat);
    const avg = catRecs.length > 0 ? (catRecs.reduce((a, r) => a + r.score, 0) / catRecs.length).toFixed(1) : null;
    return { cat, avg, count: catRecs.length };
  });

  const columns = [
    { key: "evaluatedAt", header: "평가일", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span> },
    { key: "category", header: "카테고리", render: (v: string) => <StatusBadge variant={categoryVariant(v)}>{v}</StatusBadge> },
    { key: "score", header: "점수", align: "center" as const, render: (v: number) => <span className={cn("text-[14px]", scoreColor(v))}>{v} / 10</span> },
    { key: "content", header: "평가 내용", render: (v: string | null) => <span className="text-[12px] text-content truncate max-w-[200px] block">{v || "-"}</span> },
    { key: "evaluatorName", header: "평가자", render: (v: string | null) => <span className="text-[12px] text-content-secondary">{v || "-"}</span> },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: (_: unknown, row: MemberEvaluation) => (
        <div className="flex items-center justify-center gap-xs">
          <button className="p-xs rounded hover:bg-surface-secondary text-content-secondary hover:text-content transition-colors" onClick={() => openEdit(row)} title="수정">
            <Edit size={13} />
          </button>
          <button className="p-xs rounded hover:bg-red-50 text-content-secondary hover:text-state-error transition-colors" onClick={() => setDeleteId(row.id)} title="삭제">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-xl text-content-secondary text-[13px]">로딩 중...</div>;
  }

  return (
    <div className="space-y-lg">
      {/* 카테고리별 평균 점수 카드 */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-md">
          {avgByCategory.map(({ cat, avg, count }) => (
            <div key={cat} className="bg-surface rounded-xl border border-line p-md text-center">
              <p className="text-[11px] text-content-secondary mb-xs">{cat}</p>
              <p className={cn("text-[20px]", avg ? scoreColor(Number(avg)) : "text-content-secondary")}>{avg ?? "-"}</p>
              <p className="text-[10px] text-content-secondary mt-xs">{count}회 평가</p>
            </div>
          ))}
        </div>
      )}

      {/* 테이블 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-content">종합평가 이력</h3>
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          onClick={openAdd}
        >
          <Plus size={14} />
          평가 추가
        </button>
      </div>

      <DataTable columns={columns} data={records} emptyMessage="종합평가 기록이 없습니다." />

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[480px] overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <Star size={16} className="text-primary" />
                {editTarget ? "종합평가 수정" : "종합평가 추가"}
              </h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {/* 평가일 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0">평가일 <span className="text-state-error">*</span></label>
                <input type="date" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.evaluatedAt} onChange={e => setForm(p => ({ ...p, evaluatedAt: e.target.value }))} />
              </div>
              {/* 카테고리 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0">카테고리 <span className="text-state-error">*</span></label>
                <select className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as EvaluationCategory }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* 점수 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0">점수 (1~10) <span className="text-state-error">*</span></label>
                <div className="flex items-center gap-sm flex-1">
                  <input type="range" min="1" max="10" step="1" className="flex-1" value={form.score} onChange={e => setForm(p => ({ ...p, score: e.target.value }))} />
                  <span className={cn("text-[18px] font-bold w-8 text-center", scoreColor(Number(form.score)))}>{form.score}</span>
                </div>
              </div>
              {/* 평가자 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0">평가자</label>
                <input type="text" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" placeholder="평가자 이름" value={form.evaluatorName} onChange={e => setForm(p => ({ ...p, evaluatorName: e.target.value }))} />
              </div>
              {/* 평가 내용 */}
              <div className="flex items-start gap-md">
                <label className="text-[13px] text-content-secondary w-[100px] shrink-0 pt-sm">평가 내용</label>
                <textarea className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} placeholder="평가 내용을 입력하세요" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
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
        title="종합평가 삭제"
        description="이 종합평가 기록을 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
