// 상담 이력 탭 — 일시/유형/담당자/내용/상태
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  getConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  type Consultation,
  type ConsultationType,
  type ConsultationStatus,
} from "@/api/endpoints/consultations";

interface Props {
  memberId: number;
}

const CONSULTATION_TYPES: ConsultationType[] = ["상담", "OT", "체험", "재등록상담"];
const CONSULTATION_STATUSES: ConsultationStatus[] = ["예정", "완료", "취소", "노쇼"];

// 상태 배지 색상
function statusVariant(status: ConsultationStatus): "success" | "info" | "default" | "error" {
  const map: Record<ConsultationStatus, "success" | "info" | "default" | "error"> = {
    예정: "info",
    완료: "success",
    취소: "default",
    노쇼: "error",
  };
  return map[status] ?? "default";
}

const EMPTY_FORM = {
  consultedAt: new Date().toISOString().slice(0, 16),
  type: "상담" as ConsultationType,
  staffName: "",
  content: "",
  status: "완료" as ConsultationStatus,
};

export default function TabConsultation({ memberId }: Props) {
  const [records, setRecords] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Consultation | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getConsultations(memberId);
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

  const openEdit = (rec: Consultation) => {
    setEditTarget(rec);
    setForm({
      consultedAt: rec.consultedAt.slice(0, 16),
      type: rec.type,
      staffName: rec.staffName ?? "",
      content: rec.content ?? "",
      status: rec.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.consultedAt) { toast.error("상담 일시를 입력하세요."); return; }
    setSaving(true);
    try {
      const payload = {
        memberId,
        consultedAt: form.consultedAt,
        type: form.type,
        staffName: form.staffName || null,
        content: form.content || null,
        status: form.status,
      };
      if (editTarget) {
        await updateConsultation(editTarget.id, payload);
        setRecords(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...payload } : r));
        toast.success("상담 이력이 수정되었습니다.");
      } else {
        const created = await createConsultation(payload);
        setRecords(prev => [created, ...prev]);
        toast.success("상담 이력이 저장되었습니다.");
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
      await deleteConsultation(deleteId);
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      toast.success("삭제되었습니다.");
    } catch (e: unknown) {
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setDeleteId(null);
    }
  };

  // 통계
  const totalCount = records.length;
  const completedCount = records.filter(r => r.status === "완료").length;
  const noShowCount = records.filter(r => r.status === "노쇼").length;

  const columns = [
    { key: "consultedAt", header: "일시", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 16).replace("T", " ") : "-"}</span> },
    { key: "type", header: "유형", render: (v: string) => <StatusBadge variant="info">{v}</StatusBadge> },
    { key: "staffName", header: "담당자", render: (v: string | null) => <span className="text-[13px]">{v || "-"}</span> },
    { key: "content", header: "내용", render: (v: string | null) => <span className="text-[12px] text-content truncate max-w-[200px] block">{v || "-"}</span> },
    { key: "status", header: "상태", align: "center" as const, render: (v: ConsultationStatus) => <StatusBadge variant={statusVariant(v)} dot>{v}</StatusBadge> },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: (_: unknown, row: Consultation) => (
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
      {/* 통계 */}
      <div className="grid grid-cols-3 gap-md">
        <StatCard label="전체 상담" value={`${totalCount}건`} icon={<MessageSquare size={18} />} variant="default" />
        <StatCard label="완료" value={`${completedCount}건`} icon={<MessageSquare size={18} />} variant="mint" />
        <StatCard label="노쇼" value={`${noShowCount}건`} icon={<MessageSquare size={18} />} variant="peach" />
      </div>

      {/* 테이블 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-content">상담 이력</h3>
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          onClick={openAdd}
        >
          <Plus size={14} />
          상담 추가
        </button>
      </div>

      <DataTable columns={columns} data={records} emptyMessage="상담 이력이 없습니다." />

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[480px] overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <MessageSquare size={16} className="text-primary" />
                {editTarget ? "상담 이력 수정" : "상담 이력 추가"}
              </h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {/* 일시 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">일시 <span className="text-state-error">*</span></label>
                <input type="datetime-local" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.consultedAt} onChange={e => setForm(p => ({ ...p, consultedAt: e.target.value }))} />
              </div>
              {/* 유형 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">유형 <span className="text-state-error">*</span></label>
                <select className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ConsultationType }))}>
                  {CONSULTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* 담당자 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">담당자</label>
                <input type="text" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" placeholder="담당자 이름" value={form.staffName} onChange={e => setForm(p => ({ ...p, staffName: e.target.value }))} />
              </div>
              {/* 상태 */}
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">상태 <span className="text-state-error">*</span></label>
                <div className="flex gap-sm flex-wrap flex-1">
                  {CONSULTATION_STATUSES.map(s => (
                    <button
                      key={s}
                      className={cn(
                        "px-md py-xs rounded-full text-[12px] font-medium border transition-all",
                        form.status === s
                          ? "border-transparent text-white bg-primary"
                          : "border-line text-content-secondary hover:border-primary/40"
                      )}
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* 내용 */}
              <div className="flex items-start gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0 pt-sm">내용</label>
                <textarea className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} placeholder="상담 내용을 입력하세요" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
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
        title="상담 이력 삭제"
        description="이 상담 이력을 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
