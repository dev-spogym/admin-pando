'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import StatusBadge from "@/components/common/StatusBadge";
import DataTable from "@/components/common/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  UserPlus, Phone, Plus, Edit, Trash2, X, Users, TrendingUp, AlertCircle, Filter, List, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getLeads, createLead, updateLead, deleteLead, getLeadStats,
  type Lead, type LeadSource, type LeadStatus, type CreateLeadInput,
} from "@/api/endpoints/leads";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const LEAD_SOURCES: LeadSource[] = ["간판", "인터넷", "전단지", "추천", "SNS", "카카오톡", "전화문의", "방문", "기타"];
const LEAD_STATUSES: LeadStatus[] = ["신규", "연락완료", "상담예정", "방문완료", "등록완료", "미전환", "보류"];

// 칸반 파이프라인 단계 (5개)
const KANBAN_COLUMNS: { status: LeadStatus; label: string; color: string; headerBg: string }[] = [
  { status: "신규",   label: "신규",    color: "text-blue-600",  headerBg: "bg-blue-50 border-blue-200" },
  { status: "상담예정", label: "상담예약", color: "text-amber-600", headerBg: "bg-amber-50 border-amber-200" },
  { status: "방문완료", label: "상담완료", color: "text-purple-600", headerBg: "bg-purple-50 border-purple-200" },
  { status: "연락완료", label: "등록의향", color: "text-orange-600", headerBg: "bg-orange-50 border-orange-200" },
  { status: "등록완료", label: "등록완료", color: "text-green-600",  headerBg: "bg-green-50 border-green-200" },
];

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
  const branchId = getBranchId();

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
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

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
          <Button variant="ghost" size="sm" icon={<Edit size={13} />} onClick={() => openEdit(row)} title="수정" />
          <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setDeleteId(row.id)} title="삭제" />
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
          <Button variant="primary" icon={<Plus size={14} />} onClick={openAdd}>리드 등록</Button>
        }
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={5} className="mb-lg">
        <StatCard label="전체 리드" value={`${stats.total}건`} icon={<Users size={18} />} />
        <StatCard label="등록 전환" value={`${stats.converted}건`} icon={<UserPlus size={18} />} variant="mint" />
        <StatCard label="전환율" value={`${stats.conversionRate}%`} icon={<TrendingUp size={18} />} variant="peach" />
        <StatCard label="대기 중" value={`${stats.pending}건`} icon={<Phone size={18} />} />
        <StatCard label="미전환율" value={`${stats.missedRate}%`} icon={<AlertCircle size={18} />} />
      </StatCardGrid>

      {/* 상태별 전환율 */}
      {stats.total > 0 && (
        <div className="mb-lg bg-surface rounded-xl border border-line shadow-card p-lg">
          <h3 className="text-[13px] font-bold text-content mb-md">상태별 분포</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
            {LEAD_STATUSES.filter(s => (stats.byStatus[s] ?? 0) > 0).map(s => {
              const cnt = stats.byStatus[s] ?? 0;
              const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
              return (
                <div key={s} className="flex flex-col items-center p-sm bg-surface-secondary rounded-lg border border-line">
                  <span className="text-[11px] text-content-tertiary mb-xs">{s}</span>
                  <span className="text-[18px] font-bold text-content">{cnt}건</span>
                  <span className="text-[11px] text-primary font-semibold">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 필터 + 뷰 토글 */}
      <div className="flex flex-wrap items-center justify-between gap-sm mb-md">
        <div className="flex flex-wrap gap-sm">
          <div className="flex items-center gap-xs">
            <Filter size={14} className="text-content-secondary" />
            <Select
              value={filterStatus}
              onChange={v => setFilterStatus(v as LeadStatus | "전체")}
              options={[
                { value: "전체", label: "전체 상태" },
                ...LEAD_STATUSES.map(s => ({ value: s, label: s })),
              ]}
              className="w-36"
            />
          </div>
          <Select
            value={filterSource}
            onChange={v => setFilterSource(v as LeadSource | "전체")}
            options={[
              { value: "전체", label: "전체 유입경로" },
              ...LEAD_SOURCES.map(s => ({ value: s, label: s })),
            ]}
            className="w-40"
          />
        </div>
        {/* 뷰 모드 토글 */}
        <div className="flex items-center gap-xs border border-line rounded-lg p-[3px] bg-surface">
          <button
            className={cn("flex items-center gap-xs px-sm py-xs rounded text-[12px] font-medium transition-colors", viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-content-secondary hover:text-content")}
            onClick={() => setViewMode("list")}
          >
            <List size={13} /> 목록
          </button>
          <button
            className={cn("flex items-center gap-xs px-sm py-xs rounded text-[12px] font-medium transition-colors", viewMode === "kanban" ? "bg-primary text-white shadow-sm" : "text-content-secondary hover:text-content")}
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid size={13} /> 칸반
          </button>
        </div>
      </div>

      {/* 목록 뷰 */}
      {viewMode === "list" && (
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
      )}

      {/* 칸반 뷰 */}
      {viewMode === "kanban" && (
        <div className="overflow-x-auto pb-md">
          <div className="flex gap-md min-w-[900px]">
            {KANBAN_COLUMNS.map(col => {
              const colLeads = filtered.filter(l => l.status === col.status);
              return (
                <div key={col.status} className="flex-1 min-w-[160px] flex flex-col">
                  {/* 열 헤더 */}
                  <div className={cn("flex items-center justify-between px-md py-sm rounded-t-lg border border-b-0 mb-0", col.headerBg)}>
                    <span className={cn("text-[13px] font-bold", col.color)}>{col.label}</span>
                    <span className={cn("text-[11px] font-semibold px-xs py-[2px] rounded-full bg-white/70 border", col.color, "border-current")}>
                      {colLeads.length}건
                    </span>
                  </div>
                  {/* 카드 목록 */}
                  <div className="flex flex-col gap-xs p-xs bg-surface-secondary border border-line rounded-b-lg min-h-[200px]">
                    {loading ? (
                      <div className="flex items-center justify-center h-20 text-[12px] text-content-secondary">로딩 중...</div>
                    ) : colLeads.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-[12px] text-content-secondary">없음</div>
                    ) : (
                      colLeads.map(lead => (
                        <button
                          key={lead.id}
                          className="w-full text-left bg-surface border border-line rounded-lg p-sm hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => openEdit(lead)}
                        >
                          <p className="text-[13px] font-semibold text-content truncate">{lead.name}</p>
                          <p className="text-[11px] text-content-secondary font-mono mt-[2px]">{lead.phone || "-"}</p>
                          <div className="flex items-center gap-xs mt-xs flex-wrap">
                            <span className="text-[10px] px-xs py-[1px] rounded-full bg-blue-50 text-blue-600 border border-blue-100">{lead.source}</span>
                            {lead.memo && (
                              <span className="text-[10px] text-content-secondary truncate max-w-[80px]">{lead.memo}</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[520px] overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <UserPlus size={16} className="text-primary" />
                {editTarget ? "리드 수정" : "리드 등록"}
              </h2>
              <Button variant="ghost" size="sm" icon={<X size={18} />} onClick={() => setShowModal(false)} />
            </div>
            <div className="p-lg space-y-md">
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">이름 <span className="text-state-error">*</span></label>
                <Input type="text" size="sm" className="flex-1" placeholder="이름" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">연락처</label>
                <Input type="tel" size="sm" className="flex-1" placeholder="010-0000-0000" value={form.phone ?? ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">유입경로 <span className="text-state-error">*</span></label>
                <Select
                  value={form.source}
                  onChange={v => setForm(p => ({ ...p, source: v as LeadSource }))}
                  options={LEAD_SOURCES.map(s => ({ value: s, label: s }))}
                  className="flex-1"
                />
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
                <Input type="text" size="sm" className="flex-1" placeholder="담당자 이름" value={form.assignedFc ?? ""} onChange={e => setForm(p => ({ ...p, assignedFc: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">문의일</label>
                <Input type="date" size="sm" className="flex-1" value={form.inquiryDate ?? ""} onChange={e => setForm(p => ({ ...p, inquiryDate: e.target.value }))} />
              </div>
              <div className="flex items-center gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0">후속 예정일</label>
                <Input type="date" size="sm" className="flex-1" value={form.followUpDate ?? ""} onChange={e => setForm(p => ({ ...p, followUpDate: e.target.value || null }))} />
              </div>
              <div className="flex items-start gap-md">
                <label className="text-[13px] text-content-secondary w-[90px] shrink-0 pt-sm">메모</label>
                <Textarea
                  className="flex-1"
                  rows={3}
                  placeholder="문의 내용, 특이사항 등"
                  value={form.memo ?? ""}
                  onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving}>저장</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={deleteId !== null} title="리드 삭제" description="이 리드를 삭제하시겠습니까?" confirmLabel="삭제" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </AppLayout>
  );
}
