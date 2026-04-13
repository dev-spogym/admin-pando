// 신체정보 탭 — 측정일/키/몸무게/혈압/심박수 + 몸무게 추이 차트
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, X, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import StatCard from "@/components/common/StatCard";
import DataTable from "@/components/common/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getMemberBodyInfos,
  createMemberBodyInfo,
  updateMemberBodyInfo,
  deleteMemberBodyInfo,
  type MemberBodyInfo,
} from "@/api/endpoints/bodyInfo";

interface Props {
  memberId: number;
}

// 몸무게 SVG 라인 차트
function WeightLineChart({ records }: { records: MemberBodyInfo[] }) {
  const withWeight = [...records].filter(r => r.weight != null).reverse().slice(0, 10);
  if (withWeight.length < 2) return null;

  const W = 520, H = 160, PAD = 36;
  const vals = withWeight.map(r => Number(r.weight));
  const min = Math.min(...vals) * 0.97;
  const max = Math.max(...vals) * 1.03;
  const xStep = (W - PAD * 2) / (withWeight.length - 1);

  const pts = withWeight.map((r, i) => ({
    x: PAD + i * xStep,
    y: H - PAD - ((Number(r.weight) - min) / (max - min || 1)) * (H - PAD * 2),
    val: Number(r.weight),
    date: r.measuredAt.slice(0, 10),
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="bg-surface rounded-xl border border-line p-lg">
      <h4 className="text-[13px] font-semibold text-content mb-md">몸무게 추이 (최근 10회)</h4>
      <div className="overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="min-w-[300px]">
          {[0, 0.5, 1].map(r => (
            <line key={r} x1={PAD} y1={PAD + r * (H - PAD * 2)} x2={W - PAD} y2={PAD + r * (H - PAD * 2)} stroke="#E2E8F0" strokeWidth="1" />
          ))}
          {withWeight.map((r, i) => (
            <text key={i} x={PAD + i * xStep} y={H - 6} textAnchor="middle" fontSize="9" fill="#94A3B8">
              {r.measuredAt.slice(5, 10)}
            </text>
          ))}
          <path d={pathD} fill="none" stroke="#FF7F6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#FF7F6E" stroke="#fff" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#FF7F6E" fontWeight="600">{p.val}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  measuredAt: new Date().toISOString().split("T")[0],
  height: "",
  weight: "",
  bloodPressureSystolic: "",
  bloodPressureDiastolic: "",
  heartRate: "",
  memo: "",
};

export default function TabBodyInfo({ memberId }: Props) {
  const [records, setRecords] = useState<MemberBodyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberBodyInfo | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getMemberBodyInfos(memberId);
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

  const openEdit = (rec: MemberBodyInfo) => {
    setEditTarget(rec);
    setForm({
      measuredAt: rec.measuredAt.slice(0, 10),
      height: rec.height != null ? String(rec.height) : "",
      weight: rec.weight != null ? String(rec.weight) : "",
      bloodPressureSystolic: rec.bloodPressureSystolic != null ? String(rec.bloodPressureSystolic) : "",
      bloodPressureDiastolic: rec.bloodPressureDiastolic != null ? String(rec.bloodPressureDiastolic) : "",
      heartRate: rec.heartRate != null ? String(rec.heartRate) : "",
      memo: rec.memo ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.measuredAt) { toast.error("측정일을 입력하세요."); return; }
    setSaving(true);
    try {
      const payload = {
        memberId,
        measuredAt: form.measuredAt,
        height: form.height ? Number(form.height) : null,
        weight: form.weight ? Number(form.weight) : null,
        bloodPressureSystolic: form.bloodPressureSystolic ? Number(form.bloodPressureSystolic) : null,
        bloodPressureDiastolic: form.bloodPressureDiastolic ? Number(form.bloodPressureDiastolic) : null,
        heartRate: form.heartRate ? Number(form.heartRate) : null,
        memo: form.memo || null,
      };
      if (editTarget) {
        await updateMemberBodyInfo(editTarget.id, payload);
        setRecords(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...payload } : r));
        toast.success("신체정보가 수정되었습니다.");
      } else {
        const created = await createMemberBodyInfo(payload);
        setRecords(prev => [created, ...prev]);
        toast.success("신체정보가 저장되었습니다.");
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
      await deleteMemberBodyInfo(deleteId);
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      toast.success("삭제되었습니다.");
    } catch (e: unknown) {
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setDeleteId(null);
    }
  };

  const latest = records[0];

  const columns = [
    { key: "measuredAt", header: "측정일", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span> },
    { key: "height", header: "키(cm)", align: "right" as const, render: (v: number | null) => <span>{v != null ? v : "-"}</span> },
    { key: "weight", header: "몸무게(kg)", align: "right" as const, render: (v: number | null) => <span className="font-semibold text-content">{v != null ? v : "-"}</span> },
    {
      key: "bloodPressureSystolic",
      header: "혈압(mmHg)",
      align: "center" as const,
      render: (_: unknown, row: MemberBodyInfo) =>
        row.bloodPressureSystolic != null && row.bloodPressureDiastolic != null
          ? <span>{row.bloodPressureSystolic}/{row.bloodPressureDiastolic}</span>
          : <span className="text-content-secondary">-</span>,
    },
    { key: "heartRate", header: "심박수(bpm)", align: "right" as const, render: (v: number | null) => <span>{v != null ? v : "-"}</span> },
    { key: "memo", header: "메모", render: (v: string | null) => <span className="text-[12px] text-content-secondary truncate max-w-[120px] block">{v || "-"}</span> },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: (_: unknown, row: MemberBodyInfo) => (
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
      {/* 통계 카드 */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <StatCard label="몸무게" value={latest.weight != null ? `${latest.weight} kg` : "-"} icon={<Activity size={18} />} variant="default" />
          <StatCard label="키" value={latest.height != null ? `${latest.height} cm` : "-"} icon={<Activity size={18} />} variant="mint" />
          <StatCard
            label="혈압"
            value={latest.bloodPressureSystolic != null ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}` : "-"}
            icon={<Activity size={18} />}
            variant="peach"
          />
          <StatCard label="심박수" value={latest.heartRate != null ? `${latest.heartRate} bpm` : "-"} icon={<Activity size={18} />} variant="default" />
        </div>
      )}

      {/* 몸무게 추이 차트 */}
      <WeightLineChart records={records} />

      {/* 테이블 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-content">신체정보 기록</h3>
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          onClick={openAdd}
        >
          <Plus size={14} />
          측정 추가
        </button>
      </div>

      <DataTable columns={columns} data={records} emptyMessage="신체정보 기록이 없습니다." />

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[480px] overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-[15px] font-bold text-content">{editTarget ? "신체정보 수정" : "신체정보 추가"}</h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {[
                { key: "measuredAt", label: "측정일", type: "date", required: true },
                { key: "height", label: "키", type: "number", unit: "cm" },
                { key: "weight", label: "몸무게", type: "number", unit: "kg" },
                { key: "bloodPressureSystolic", label: "수축기 혈압", type: "number", unit: "mmHg" },
                { key: "bloodPressureDiastolic", label: "이완기 혈압", type: "number", unit: "mmHg" },
                { key: "heartRate", label: "심박수", type: "number", unit: "bpm" },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-md">
                  <label className="text-[13px] text-content-secondary w-[120px] shrink-0">
                    {f.label}{f.required && <span className="text-state-error ml-xs">*</span>}
                  </label>
                  <div className="flex items-center gap-xs flex-1">
                    <input
                      type={f.type}
                      step="0.1"
                      className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                    {f.unit && <span className="text-[12px] text-content-secondary w-10 shrink-0">{f.unit}</span>}
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-md">
                <label className="text-[13px] text-content-secondary w-[120px] shrink-0 pt-sm">메모</label>
                <textarea
                  className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={2}
                  value={form.memo}
                  onChange={e => setForm(prev => ({ ...prev, memo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-lg py-sm border border-line text-content-secondary rounded-button text-[13px] hover:bg-surface-secondary transition-colors" onClick={() => setShowModal(false)}>
                취소
              </button>
              <button
                className={cn("px-lg py-sm bg-primary text-white rounded-button text-[13px] font-bold hover:bg-primary-dark transition-colors shadow-sm", saving && "opacity-60 cursor-not-allowed")}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="신체정보 삭제"
        description="이 신체정보 기록을 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
