import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  UserPlus, Phone, Search, Plus, Edit, Trash2, X, Users, TrendingUp, AlertCircle, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getLeads, createLead, updateLead, deleteLead, getLeadStats,
  type Lead, type LeadSource, type LeadStatus, type CreateLeadInput,
} from "@/api/endpoints/leads";

const LEAD_SOURCES: LeadSource[] = ["간판", "인터넷", "전단지", "추천", "SNS", "카카오톡", "전화문의", "방문", "기타"];
const LEAD_STATUSES: LeadStatus[] = ["신규", "연락완료", "상담예정", "방문완료", "등록완료", "미전환", "보류"];

function statusVariant(status: LeadStatus): "success" | "info" | "default" | "error" | "warning" {
  const map: Record<LeadStatus, "success" | "info" | "default" | "error" | "warning"> = {
    "신규": "info",
    "연락완료": "default",
    "상담예정": "warning",
    "방문완료": "info",
    "등록완료": "success",
    "미전환": "error",
    "보류": "default",
  };
  return map[status] ?? "default";
}

const EMPTY_FORM: Omit<CreateLeadInput, "branchId"> = {
  name: "",
  phone: "",
  source: "전화문의",
  status: "신규",
  assignedFc: "",
  memo: "",
  inquiryDate: new Date().toISOString().slice(0, 10),
  followUpDate: null,
};

export default function LeadManagement() {
  const branchId = Number(localStorage.getItem("branchId")) || 1;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, converted: 0, conversionRate: 0, pending: 0, missedRate: 0, byStatus: {} as Record<string, number>, bySource: {} as Record<string, number> });

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "전체">("전체");
  const [filterSource, setFilterSource] = useState<LeadSource | "전체">("전체");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [data, s] = await Promise.all([getLeads(branchId), getLeadStats(branchId)]);
    setLeads(data);
    setStats(s);
    setLoading(false);
  }, [branchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = leads;
    if (filterStatus !== "전체") list = list.filter(l => l.status === filterStatus);
    if (filterSource !== "전체") list = list.filter(l => l.source === filterSource);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      list = list.filter(l => l.name.toLowerCase().includes(q) || (l.phone ?? "").includes(q) || (l.assignedFc ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [leads, filterStatus, filterSource, searchValue]);

  const openAdd = () => { setEditTarget(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (lead: Lead) => {
    setEditTarget(lead);
    setForm({
      name: lead.name,
      phone: lead.phone ?? "",
      source: lead.source,
      status: lead.status,
      assignedFc: lead.assignedFc ?? "",
      memo: lead.memo ?? "",
      inquiryDate: lead.inquiryDate?.slice(0, 10) ?? "",
      followUpDate: lead.followUpDate?.slice(0, 10) ?? null,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("이름을 입력하세요."); return; }
    setSaving(true);
    try {
      const payload: CreateLeadInput = { branchId, ...form, phone: form.phone || null, assignedFc: form.assignedFc || null, memo: form.memo || null };
      if (editTarget) {
        await updateLead(editTarget.id, payload);
        toast.success("리드가 수정되었습니다.");
      } else {
        await createLead(payload);
        toast.success("리드가 등록되었습니다.");
      }
      setShowModal(false);
      fetchData();
    } catch (e: unknown) {
      toast.error(`저장 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteLead(deleteId);
      toast.success("삭제되었습니다.");
      fetchData();
    } catch (e: unknown) {
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally { setDeleteId(null); }
  };

  const columns = [
    { key: "inquiryDate", header: "문의일", width: 100, render: (v: string) => <span className="font-mono text-[12px]">{v?.slice(0, 10) ?? "-"}</span> },
    { key: "name", header: "이름", render: (v: string) => <span className="font-medium text-content">{v}</span> },
    { key: "phone", header: "연락처", render: (v: string | null) => <span className="text-[12px] font-mono">{v || "-"}</span> },
    { key: "source", header: "유입경로", render: (v: string) => <StatusBadge variant="info">{v}</StatusBadge> },
    { key: "status", header: "상태", align: "center" as const, render: (v: LeadStatus) => <StatusBadge variant={statusVariant(v)} dot>{v}</StatusBadge> },
    { key: "assignedFc", header: "담당 FC", render: (v: string | null) => <span className="text-[13px]">{v || "-"}</span> },
    { key: "followUpDate", header: "후속일", width: 100, render: (v: string | null) => <span className="text-[12px] font-mono">{v?.slice(0, 10) ?? "-"}</span> },
    { key: "memo", header: "메모", render: (v: string | null) => <span className="text-[12px] text-content-secondary truncate max-w-[160px] block">{v || "-"}</span> },
    {
      key: "actions", header: "관리", align: "center" as const,
      render: (_: unknown, row: Lead) => (
        <div className="flex items-center justify-center gap-xs">
          <button className="p-xs rounded hover:bg-surface-secondary text-content-secondary hover:text-content transition-colors" onClick={() => openEdit(row)} title="수정"><Edit size={13} /></button>
          <button className="p-xs rounded hover:bg-red-50 text-content-secondary hover:text-state-error transition-colors" onClick={() => setDeleteId(row.id)} title="삭제"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="리드 관리"
        description="잠재 고객(문의/상담) 파이프라인을 관리합니다."
        actions={
          <button className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm" onClick={openAdd}>
            <Plus size={14} /> 리드 등록
          </button>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-md mb-lg">
        <StatCard label="전체 리드" value={`${stats.total}건`} icon={<Users size={18} />} />
        <StatCard label="등록 전환" value={`${stats.converted}건`} icon={<UserPlus size={18} />} variant="mint" />
        <StatCard label="전환율" value={`${stats.conversionRate}%`} icon={<TrendingUp size={18} />} variant="peach" />
        <StatCard label="대기 중" value={`${stats.pending}건`} icon={<Phone size={18} />} />
        <StatCard label="미전환율" value={`${stats.missedRate}%`} icon={<AlertCircle size={18} />} />
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-sm mb-md">
        <div className="flex items-center gap-xs">
          <Filter size={14} className="text-content-secondary" />
          <select className="px-sm py-xs rounded border border-line bg-surface text-[12px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value as LeadStatus | "전체")}>
            <option value="전체">전체 상태</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <select className="px-sm py-xs rounded border border-line bg-surface text-[12px]" value={filterSource} onChange={e => setFilterSource(e.target.value as LeadSource | "전체")}>
          <option value="전체">전체 유입경로</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <DataTable
        title="리드 목록"
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="등록된 리드가 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="이름, 연락처, 담당자 검색..."
      />

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[520px] overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <UserPlus size={16} className="text-primary" />
                {editTarget ? "리드 수정" : "리드 등록"}
              </h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="p-lg space-y-md">
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">이름 <span className="text-state-error">*</span></label>
                <input type="text" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" placeholder="이름" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">연락처</label>
                <input type="tel" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" placeholder="010-0000-0000" value={form.phone ?? ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">유입경로 <span className="text-state-error">*</span></label>
                <select className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value as LeadSource }))}>
                  {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">상태</label>
                <div className="flex gap-xs flex-wrap flex-1">
                  {LEAD_STATUSES.map(s => (
                    <button key={s} className={cn("px-sm py-xs rounded-full text-[11px] font-medium border transition-all", form.status === s ? "border-transparent text-white bg-primary" : "border-line text-content-secondary hover:border-primary/40")} onClick={() => setForm(p => ({ ...p, status: s }))}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">담당 FC</label>
                <input type="text" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" placeholder="담당자 이름" value={form.assignedFc ?? ""} onChange={e => setForm(p => ({ ...p, assignedFc: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">문의일</label>
                <input type="date" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.inquiryDate ?? ""} onChange={e => setForm(p => ({ ...p, inquiryDate: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">후속 예정일</label>
                <input type="date" className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30" value={form.followUpDate ?? ""} onChange={e => setForm(p => ({ ...p, followUpDate: e.target.value || null }))} />
              </div>
              <div className="flex items-start gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0 pt-sm">메모</label>
                <textarea className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[13px] outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} placeholder="문의 내용, 특이사항 등" value={form.memo ?? ""} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} />
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

      <ConfirmDialog open={deleteId !== null} title="리드 삭제" description="이 리드를 삭제하시겠습니까?" confirmLabel="삭제" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </AppLayout>
  );
}
