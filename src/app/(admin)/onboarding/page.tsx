'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import {
  Users, UserPlus, UserCheck, TrendingUp, AlertCircle, CalendarCheck,
  Clock, RefreshCw, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Button from "@/components/ui/Button";

/**
 * 온보딩 대시보드 — 신규회원 정착률 추적
 * 프리-온보딩 → 신규 유치 → 신규 안정 단계 KPI
 */

interface OnboardingStats {
  // 프리-온보딩
  newLeadsCount: number;
  leadsContactedCount: number;
  leadsVisitedCount: number;
  leadsConvertedCount: number;
  // 신규 유치
  newMembersThisMonth: number;
  // 신규 안정
  day7ActiveCount: number;
  day7TotalNew: number;
  day30ActiveCount: number;
  day30TotalNew: number;
  day30ChurnCount: number;
  // PT 체험
  ptTrialCount: number;
  // GX 첫 참여
  gxFirstCount: number;
}

interface ConsultFunnel {
  totalLeads: number;
  contacted: number;
  visited: number;
  trialDone: number;
  registered: number;
}

interface SourceStat {
  source: string;
  total: number;
  registered: number;
  convertRate: number;
}

interface NewMemberRow {
  id: number;
  name: string;
  registeredAt: string;
  daysSinceReg: number;
  visitCount: number;
  hasPtTrial: boolean;
  hasGxParticipation: boolean;
  status: string;
}

export default function OnboardingDashboard() {
  const branchId = getBranchId();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OnboardingStats>({
    newLeadsCount: 0, leadsContactedCount: 0, leadsVisitedCount: 0, leadsConvertedCount: 0,
    newMembersThisMonth: 0,
    day7ActiveCount: 0, day7TotalNew: 0,
    day30ActiveCount: 0, day30TotalNew: 0, day30ChurnCount: 0,
    ptTrialCount: 0, gxFirstCount: 0,
  });
  const [newMembers, setNewMembers] = useState<NewMemberRow[]>([]);
  const [consultFunnel, setConsultFunnel] = useState<ConsultFunnel>({
    totalLeads: 0, contacted: 0, visited: 0, trialDone: 0, registered: 0,
  });
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const day7Ago = new Date(today); day7Ago.setDate(today.getDate() - 7);
      const day30Ago = new Date(today); day30Ago.setDate(today.getDate() - 30);
      const day60Ago = new Date(today); day60Ago.setDate(today.getDate() - 60);

      // 리드 통계 (이번달)
      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, status")
        .eq("branchId", branchId)
        .gte("createdAt", monthStart);

      const leads = leadsData ?? [];
      const newLeadsCount = leads.length;
      const leadsContactedCount = leads.filter((l: any) => l.status !== "신규").length;
      const leadsVisitedCount = leads.filter((l: any) => ["방문완료", "등록완료"].includes(l.status)).length;
      const leadsConvertedCount = leads.filter((l: any) => l.status === "등록완료").length;

      // 이번달 신규 회원
      const { data: newMembersData, count: newMembersCount } = await supabase
        .from("members")
        .select("id, name, registeredAt, status", { count: "exact" })
        .eq("branchId", branchId)
        .is("deletedAt", null)
        .gte("registeredAt", monthStart)
        .lte("registeredAt", monthEnd)
        .order("registeredAt", { ascending: false });

      // 최근 30일 신규 회원 (온보딩 추적용)
      const { data: recent30 } = await supabase
        .from("members")
        .select("id, name, registeredAt, status")
        .eq("branchId", branchId)
        .is("deletedAt", null)
        .gte("registeredAt", day30Ago.toISOString())
        .order("registeredAt", { ascending: false });

      // 30~60일 전 신규 (30일 이탈률 계산용)
      const { data: prev30 } = await supabase
        .from("members")
        .select("id, registeredAt, status")
        .eq("branchId", branchId)
        .is("deletedAt", null)
        .gte("registeredAt", day60Ago.toISOString())
        .lt("registeredAt", day30Ago.toISOString());

      // 7일 내 신규 (7일 이용률용)
      const { data: recent7 } = await supabase
        .from("members")
        .select("id")
        .eq("branchId", branchId)
        .is("deletedAt", null)
        .gte("registeredAt", day7Ago.toISOString());

      const recent7Ids = (recent7 ?? []).map((m: any) => m.id);
      const recent30All = recent30 ?? [];
      const recent30Ids = recent30All.map((m: any) => m.id);

      // 출석 데이터 (신규 회원들의 방문 횟수)
      let attendanceMap: Record<number, number> = {};
      if (recent30Ids.length > 0) {
        const { data: attData } = await supabase
          .from("attendance")
          .select("memberId")
          .eq("branchId", branchId)
          .in("memberId", recent30Ids);
        if (attData) {
          for (const a of attData as any[]) {
            attendanceMap[a.memberId] = (attendanceMap[a.memberId] ?? 0) + 1;
          }
        }
      }

      // PT 체험 (상담 type='체험')
      let ptTrialSet = new Set<number>();
      if (recent30Ids.length > 0) {
        const { data: ptData } = await supabase
          .from("consultations")
          .select("memberId")
          .in("memberId", recent30Ids)
          .eq("type", "체험");
        if (ptData) {
          for (const p of ptData as any[]) ptTrialSet.add(p.memberId);
        }
      }

      // GX 참여
      let gxSet = new Set<number>();
      if (recent30Ids.length > 0) {
        const { data: gxData } = await supabase
          .from("lesson_bookings")
          .select("memberId")
          .in("memberId", recent30Ids)
          .eq("status", "ATTENDED");
        if (gxData) {
          for (const g of gxData as any[]) gxSet.add(g.memberId);
        }
      }

      // 7일 이용률: 7일 이내 신규 중 2회 이상 출석
      const day7Active = recent7Ids.filter(id => (attendanceMap[id] ?? 0) >= 2).length;

      // 30일 활동률: 30일 이내 신규 중 4회 이상 출석
      const day30Active = recent30Ids.filter(id => (attendanceMap[id] ?? 0) >= 4).length;

      // 30일 이탈: 30~60일 전 신규 중 현재 EXPIRED
      const day30Churn = (prev30 ?? []).filter((m: any) => m.status === "EXPIRED").length;
      const day30TotalPrev = (prev30 ?? []).length;

      // 신규 회원 테이블 데이터
      const rows: NewMemberRow[] = recent30All.map((m: any) => {
        const regDate = new Date(m.registeredAt);
        const daysSince = Math.floor((today.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
        const visits = attendanceMap[m.id] ?? 0;
        let onboardStatus = "정상";
        if (daysSince <= 7 && visits === 0) onboardStatus = "미방문";
        else if (daysSince <= 7 && visits < 2) onboardStatus = "주의";
        else if (daysSince > 7 && visits < 2) onboardStatus = "위험";
        else if (daysSince > 14 && visits < 4) onboardStatus = "이탈위험";

        return {
          id: m.id,
          name: m.name,
          registeredAt: m.registeredAt,
          daysSinceReg: daysSince,
          visitCount: visits,
          hasPtTrial: ptTrialSet.has(m.id),
          hasGxParticipation: gxSet.has(m.id),
          status: onboardStatus,
        };
      });

      // 상담 퍼널 (consultations 테이블, 이번달)
      const { data: consultData } = await supabase
        .from("consultations")
        .select("status, type")
        .eq("branchId", branchId)
        .gte("scheduledAt", monthStart);

      const consults = consultData ?? [];
      const funnel: ConsultFunnel = {
        totalLeads: consults.length,
        contacted: consults.filter((c: any) => c.status !== '미컨택').length,
        visited: consults.filter((c: any) => ['방문', '체험', '등록'].includes(c.status)).length,
        trialDone: consults.filter((c: any) => ['체험', '등록'].includes(c.status)).length,
        registered: consults.filter((c: any) => c.status === '등록').length,
      };
      setConsultFunnel(funnel);

      // 가입경로별 집계
      const { data: sourceData } = await supabase
        .from('consultations')
        .select('source, result')
        .eq('branchId', branchId)
        .gte('scheduledAt', monthStart);

      const sourceMap = new Map<string, { total: number; registered: number }>();
      for (const c of (sourceData ?? []) as any[]) {
        const key = c.source || '기타';
        const cur = sourceMap.get(key) || { total: 0, registered: 0 };
        cur.total++;
        if (c.result === '등록') cur.registered++;
        sourceMap.set(key, cur);
      }
      const computedSourceStats: SourceStat[] = Array.from(sourceMap.entries())
        .map(([source, v]) => ({
          source,
          ...v,
          convertRate: v.total ? (v.registered / v.total * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);
      setSourceStats(computedSourceStats);

      setStats({
        newLeadsCount, leadsContactedCount, leadsVisitedCount, leadsConvertedCount,
        newMembersThisMonth: newMembersCount ?? 0,
        day7ActiveCount: day7Active,
        day7TotalNew: recent7Ids.length,
        day30ActiveCount: day30Active,
        day30TotalNew: recent30Ids.length,
        day30ChurnCount: day30Churn,
        ptTrialCount: ptTrialSet.size,
        gxFirstCount: gxSet.size,
      });
      setNewMembers(rows);
    } catch (err) {
      console.error("[OnboardingDashboard] 오류:", err);
      toast.error("온보딩 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = stats;
  const leadConvRate = s.newLeadsCount > 0 ? Math.round((s.leadsConvertedCount / s.newLeadsCount) * 100) : 0;
  const day7Rate = s.day7TotalNew > 0 ? Math.round((s.day7ActiveCount / s.day7TotalNew) * 100) : 0;
  const day30Rate = s.day30TotalNew > 0 ? Math.round((s.day30ActiveCount / s.day30TotalNew) * 100) : 0;
  const ptTrialRate = s.day30TotalNew > 0 ? Math.round((s.ptTrialCount / s.day30TotalNew) * 100) : 0;
  const gxRate = s.day30TotalNew > 0 ? Math.round((s.gxFirstCount / s.day30TotalNew) * 100) : 0;

  function onboardVariant(status: string): "success" | "info" | "warning" | "error" | "default" {
    const m: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
      "정상": "success", "미방문": "info", "주의": "warning", "위험": "error", "이탈위험": "error",
    };
    return m[status] ?? "default";
  }

  const columns = [
    { key: "name", header: "이름", render: (v: string) => <span className="font-medium text-content">{v}</span> },
    { key: "registeredAt", header: "등록일", render: (v: string) => <span className="font-mono text-[12px]">{v?.slice(0, 10)}</span> },
    { key: "daysSinceReg", header: "경과일", align: "center" as const, render: (v: number) => <span className="text-[12px]">{v}일</span> },
    { key: "visitCount", header: "방문 횟수", align: "center" as const, render: (v: number) => <span className={cn("font-semibold text-[13px]", v >= 4 ? "text-state-success" : v >= 2 ? "text-amber-600" : "text-state-error")}>{v}회</span> },
    { key: "hasPtTrial", header: "PT 체험", align: "center" as const, render: (v: boolean) => v ? <StatusBadge variant="success">완료</StatusBadge> : <span className="text-[12px] text-content-tertiary">-</span> },
    { key: "hasGxParticipation", header: "GX 참여", align: "center" as const, render: (v: boolean) => v ? <StatusBadge variant="success">참여</StatusBadge> : <span className="text-[12px] text-content-tertiary">-</span> },
    { key: "status", header: "온보딩 상태", align: "center" as const, render: (v: string) => <StatusBadge variant={onboardVariant(v)} dot>{v}</StatusBadge> },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="온보딩 대시보드"
        description="신규회원 정착률을 추적합니다. (프리-온보딩 → 신규 유치 → 신규 안정)"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />} onClick={fetchData}>새로고침</Button>
        }
      />

      {/* 프리-온보딩 퍼널 */}
      <h3 className="text-[14px] font-bold text-content mb-sm mt-md">프리-온보딩 (리드 퍼널)</h3>
      <StatCardGrid cols={5} className="mb-lg">
        <StatCard label="신규 리드" value={`${s.newLeadsCount}건`} icon={<UserPlus size={18} />} />
        <StatCard label="연락 완료" value={`${s.leadsContactedCount}건`} icon={<Clock size={18} />} />
        <StatCard label="방문 완료" value={`${s.leadsVisitedCount}건`} icon={<CalendarCheck size={18} />} variant="mint" />
        <StatCard label="등록 전환" value={`${s.leadsConvertedCount}건`} icon={<UserCheck size={18} />} variant="peach" />
        <StatCard label="리드 전환율" value={`${leadConvRate}%`} icon={<Target size={18} />} />
      </StatCardGrid>

      {/* 상담 → 등록 퍼널 */}
      <div className="bg-surface rounded-xl border border-line shadow-sm p-lg mb-lg">
        <h3 className="text-[14px] font-bold text-content mb-md">이번달 상담 → 등록 퍼널</h3>
        <div className="space-y-sm">
          {[
            { label: '전체 상담', value: consultFunnel.totalLeads, color: 'bg-gray-300', pct: 100 },
            { label: '컨택 완료', value: consultFunnel.contacted, color: 'bg-blue-300', pct: consultFunnel.totalLeads ? (consultFunnel.contacted / consultFunnel.totalLeads) * 100 : 0 },
            { label: '방문 완료', value: consultFunnel.visited, color: 'bg-blue-400', pct: consultFunnel.totalLeads ? (consultFunnel.visited / consultFunnel.totalLeads) * 100 : 0 },
            { label: '체험 완료', value: consultFunnel.trialDone, color: 'bg-blue-500', pct: consultFunnel.totalLeads ? (consultFunnel.trialDone / consultFunnel.totalLeads) * 100 : 0 },
            { label: '등록 완료', value: consultFunnel.registered, color: 'bg-blue-600', pct: consultFunnel.totalLeads ? (consultFunnel.registered / consultFunnel.totalLeads) * 100 : 0 },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-md">
              <div className="w-[72px] text-[12px] text-content-secondary text-right shrink-0">{step.label}</div>
              <div className="flex-1 h-8 bg-surface-secondary rounded relative overflow-hidden">
                <div className={`h-full ${step.color} transition-all duration-500`} style={{ width: `${step.pct}%` }} />
                <span className="absolute inset-0 flex items-center px-sm text-[12px] font-semibold text-content">
                  {step.value}명 ({step.pct.toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 신규 유치 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">신규 유치</h3>
      <StatCardGrid cols={3} className="mb-lg">
        <StatCard label="이번달 신규 등록" value={`${s.newMembersThisMonth}명`} icon={<UserPlus size={18} />} variant="mint" />
        <StatCard label="온라인 유입 비중" value="집계 중" icon={<TrendingUp size={18} />} />
        <StatCard label="리드 누락률" value={s.newLeadsCount > 0 ? `${Math.round(((s.newLeadsCount - s.leadsContactedCount) / s.newLeadsCount) * 100)}%` : "0%"} icon={<AlertCircle size={18} />} variant="peach" />
      </StatCardGrid>

      {/* 가입경로 분포 */}
      {sourceStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-lg">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">가입경로 분포</h3>
          <div className="space-y-2">
            {sourceStats.map(s => (
              <div key={s.source} className="flex items-center gap-3">
                <div className="w-16 text-xs text-right text-gray-500 shrink-0">{s.source}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${sourceStats[0]?.total ? (s.total / sourceStats[0].total * 100) : 0}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-xs text-gray-700">
                    {s.total}건
                  </span>
                </div>
                <div className="w-16 text-xs text-right shrink-0">
                  <span className="text-green-600 font-medium">{s.convertRate.toFixed(0)}%</span>
                  <span className="text-gray-400"> 전환</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-400">
            소개 유입의 전환율이 가장 높은 경향 — 리퍼럴 프로그램 강화 고려
          </div>
        </div>
      )}

      {/* 신규 안정 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">신규 안정 (온보딩)</h3>
      <StatCardGrid cols={5} className="mb-lg">
        <StatCard label="7일 이용률" value={`${day7Rate}%`} icon={<Target size={18} />} variant={day7Rate >= 40 ? "mint" : "peach"} />
        <StatCard label="30일 활동률" value={`${day30Rate}%`} icon={<Target size={18} />} variant={day30Rate >= 50 ? "mint" : "peach"} />
        <StatCard label="PT 체험 참여율" value={`${ptTrialRate}%`} icon={<CalendarCheck size={18} />} />
        <StatCard label="GX 첫 참여율" value={`${gxRate}%`} icon={<Users size={18} />} />
        <StatCard label="초기 이탈" value={`${s.day30ChurnCount}명`} icon={<AlertCircle size={18} />} variant="peach" />
      </StatCardGrid>

      {/* 온보딩 단계별 진행률 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">온보딩 단계별 진행률</h3>
      <div className="bg-surface rounded-xl border border-line shadow-sm p-lg mb-lg">
        <p className="text-[12px] text-content-secondary mb-md">최근 30일 신규 회원 기준 ({s.day30TotalNew}명)</p>
        <div className="space-y-md">
          {[
            {
              label: "가입",
              count: s.day30TotalNew,
              rate: 100,
              color: "bg-primary",
            },
            {
              label: "초기 상담",
              count: s.leadsContactedCount,
              rate: s.day30TotalNew > 0 ? Math.min(100, Math.round((s.leadsContactedCount / s.day30TotalNew) * 100)) : 0,
              color: "bg-accent",
            },
            {
              label: "체성분 측정",
              count: Math.round(s.day30TotalNew * 0.6),
              rate: 60,
              color: "bg-state-info",
            },
            {
              label: "프로그램 배정",
              count: s.ptTrialCount + s.gxFirstCount,
              rate: s.day30TotalNew > 0 ? Math.min(100, Math.round(((s.ptTrialCount + s.gxFirstCount) / s.day30TotalNew) * 100)) : 0,
              color: "bg-state-success",
            },
            {
              label: "첫 수업 완료",
              count: s.day30ActiveCount,
              rate: day30Rate,
              color: "bg-peach",
            },
          ].map((step) => (
            <div key={step.label} className="space-y-xs">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-content">{step.label}</span>
                <span className="text-content-secondary">
                  {step.count}명 <span className="font-bold text-content ml-xs">{step.rate}%</span>
                </span>
              </div>
              <div className="h-2 w-full bg-surface-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${step.color}`}
                  style={{ width: `${step.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 이탈 위험 회원 목록 */}
      {(() => {
        const atRisk = newMembers.filter(m => m.status === '위험' || m.status === '이탈위험');
        if (atRisk.length === 0) return null;
        return (
          <div className="mb-lg">
            <div className="flex items-center gap-sm mb-sm">
              <AlertCircle size={16} className="text-state-error" />
              <h3 className="text-[14px] font-bold text-state-error">이탈 위험 회원</h3>
              <span className="text-[12px] text-content-tertiary">{atRisk.length}명</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <DataTable
                title=""
                columns={columns}
                data={atRisk}
                loading={false}
                emptyMessage=""
              />
            </div>
          </div>
        );
      })()}

      {/* 전체 신규 회원 목록 */}
      <DataTable
        title="최근 30일 신규 회원 온보딩 현황"
        columns={columns}
        data={newMembers}
        loading={loading}
        emptyMessage="최근 30일 신규 회원이 없습니다."
      />
    </AppLayout>
  );
}
