'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import {
  Plus,
  History,
  TrendingUp,
  Scale,
  Activity,
  Zap,
  ChevronLeft,
  Download,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Target,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import TabNav from "@/components/common/TabNav";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { moveToPage } from "@/internal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

// ────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────

type Measurement = {
  id: number;
  date: string;
  weight: number;
  muscle: number;
  fat: number;
  bmi: number;
  pbf: number;
  bmr: number;
  bodyWater?: number | null;
};

// INITIAL_MEASUREMENTS 제거 - Supabase body_compositions 테이블에서 로드

const RANGES = {
  weight: { min: 20, max: 300, label: "체중", unit: "kg" },
  muscle: { min: 5, max: 80, label: "골격근량", unit: "kg" },
  pbf:    { min: 3, max: 60, label: "체지방률", unit: "%" },
};

// ────────────────────────────────────────────────────────────
// 헬퍼 (height, age는 컴포넌트에서 주입)
// ────────────────────────────────────────────────────────────

const calcBMI = (weight: number, height: number) => {
  if (!height || height <= 0) return 0;
  const hm = height / 100;
  return +(weight / (hm * hm)).toFixed(1);
};

const calcBMR = (weight: number, height: number, age: number) =>
  Math.round(10 * weight + 6.25 * height - 5 * age - 161);

// ────────────────────────────────────────────────────────────
// SVG 라인 차트 컴포넌트 (UI-122)
// ────────────────────────────────────────────────────────────

type MetricKey = "weight" | "muscle" | "pbf";

const METRICS: { key: MetricKey; label: string; color: string; unit: string }[] = [
  { key: "weight", label: "체중", color: "#FF7F6E", unit: "kg" },
  { key: "muscle", label: "골격근량", color: "#48D1CC", unit: "kg" },
  { key: "pbf",    label: "체지방률", color: "#F59E0B", unit: "%" },
];

function LineChart({ records }: { records: Measurement[] }) {
  const [active, setActive] = useState<MetricKey[]>(["weight", "muscle", "pbf"]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; record: Measurement; metric: MetricKey } | null>(null);

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const W = 560, H = 220, PAD_X = 48, PAD_Y = 28;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;
  const n = sorted.length;

  const toggleMetric = (k: MetricKey) =>
    setActive(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const getCoords = (key: MetricKey) => {
    const vals = sorted.map(r => r[key] as number);
    const min = Math.min(...vals) * 0.95;
    const max = Math.max(...vals) * 1.05;
    const range = max - min || 1;
    return sorted.map((r, i) => ({
      x: PAD_X + (i / (n - 1)) * chartW,
      y: PAD_Y + chartH - ((r[key] as number - min) / range) * chartH,
      value: r[key] as number,
    }));
  };

  const getPath = (key: MetricKey) =>
    getCoords(key)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

  return (
    <div className="space-y-md">
      {/* 항목별 토글 버튼 */}
      <div className="flex gap-sm flex-wrap">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className={cn(
              "flex items-center gap-xs px-md py-xs rounded-full text-[12px] font-semibold border transition-all",
              active.includes(m.key)
                ? "text-white border-transparent shadow-sm"
                : "bg-surface text-content-secondary border-line hover:bg-surface-secondary"
            )}
            style={active.includes(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: active.includes(m.key) ? "rgba(255,255,255,0.8)" : m.color }}
            />
            {m.label} ({m.unit})
          </button>
        ))}
      </div>

      {/* SVG 차트 */}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface-secondary/30">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="min-w-[360px]">
          {/* 격자선 */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
            <line
              key={i}
              x1={PAD_X} y1={PAD_Y + r * chartH}
              x2={W - PAD_X} y2={PAD_Y + r * chartH}
              stroke="#E2E8F0" strokeWidth="1" strokeDasharray={r > 0 ? "4 4" : "0"}
            />
          ))}

          {/* X축 날짜 레이블 */}
          {sorted.map((r, i) => (
            <text
              key={i}
              x={PAD_X + (i / (n - 1)) * chartW}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill="#94A3B8"
            >
              {r.date.slice(5)}
            </text>
          ))}

          {/* 라인 + 포인트 */}
          {METRICS.map(m => {
            if (!active.includes(m.key)) return null;
            const coords = getCoords(m.key);
            return (
              <g key={m.key}>
                {/* 라인 */}
                <path
                  d={getPath(m.key)}
                  fill="none"
                  stroke={m.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* 포인트 */}
                {coords.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x} cy={p.y} r="5"
                    fill={m.color}
                    stroke="#fff" strokeWidth="2"
                    className="cursor-pointer hover:r-7 transition-all"
                    onMouseEnter={() => setTooltip({ x: p.x, y: p.y, record: sorted[i], metric: m.key })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </g>
            );
          })}

          {/* 호버 툴팁 */}
          {tooltip && (() => {
            const tx = Math.min(tooltip.x, W - PAD_X - 80);
            const ty = Math.max(tooltip.y - 60, PAD_Y);
            const metric = METRICS.find(m => m.key === tooltip.metric)!;
            return (
              <g>
                <rect x={tx - 4} y={ty} width="110" height="44" rx="6" fill="#1E293B" fillOpacity="0.92" />
                <text x={tx + 51} y={ty + 15} textAnchor="middle" fontSize="10" fill="#94A3B8">{tooltip.record.date}</text>
                <text x={tx + 51} y={ty + 31} textAnchor="middle" fontSize="11" fill={metric.color} fontWeight="700">
                  {metric.label}: {tooltip.record[tooltip.metric]} {metric.unit}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* 범례 */}
      <div className="flex gap-lg justify-center flex-wrap">
        {METRICS.map(m => (
          <div key={m.key} className="flex items-center gap-xs">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[12px] text-content-secondary">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 목표 게이지 컴포넌트
// ────────────────────────────────────────────────────────────

function GoalGauge({
  label,
  current,
  goal,
  unit,
  progress,
  color,
  description,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  progress: number;
  color: "coral" | "mint";
  description: string;
}) {
  const reached = progress >= 100;
  const barColor = reached ? "#10B981" : color === "coral" ? "#FF7F6E" : "#48D1CC";

  return (
    <div className="bg-surface rounded-xl border border-line p-lg space-y-md shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold text-content">{label}</p>
          <p className="text-[12px] text-content-secondary mt-xs">{description}</p>
        </div>
        <div className="text-[24px] font-bold" style={{ color: barColor }}>
          {progress}%
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="h-4 bg-surface-secondary rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-content-secondary">
        <span>0{unit}</span>
        <span className={cn("font-semibold", reached ? "text-state-success" : color === "coral" ? "text-primary" : "text-accent")}>
          {reached ? "목표 달성!" : `목표: ${goal}${unit}`}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 분석 로우 컴포넌트
// ────────────────────────────────────────────────────────────

function AnalysisRow({
  label,
  value,
  unit,
  min,
  max,
  color = "mint",
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  color?: "mint" | "coral";
}) {
  const minEdge = min * 0.5;
  const maxEdge = max * 1.5;
  const range = maxEdge - minEdge || 1;
  const pct = Math.min(100, Math.max(0, ((value - minEdge) / range) * 100));
  const stdLeft = ((min - minEdge) / range) * 100;
  const stdRight = 100 - ((max - minEdge) / range) * 100;
  const barColor = color === "mint" ? "#48D1CC" : "#FF7F6E";

  return (
    <div className="space-y-sm">
      <div className="flex justify-between items-end">
        <span className="text-[13px] text-content-secondary">{label}</span>
        <span className="text-[14px] font-bold text-content">
          {value} <small className="text-[11px] font-normal text-content-secondary">{unit}</small>
        </span>
      </div>
      <div className="h-4 bg-surface-secondary rounded-full relative overflow-hidden">
        {/* 표준 범위 표시 */}
        <div
          className="absolute h-full bg-state-success/15 border-x border-state-success/25 z-0"
          style={{ left: `${stdLeft}%`, right: `${stdRight}%` }}
        />
        {/* 현재값 바 */}
        <div
          className="absolute h-full rounded-full z-10 transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-content-secondary px-xs">
        <span>저체중</span>
        <span className="text-state-success text-[10px]">표준 ({min}~{max}{unit})</span>
        <span>과체중</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────

function BodyComposition() {
  const searchParams = useSearchParams();
  const memberId = searchParams?.get("memberId") ?? "1";

  const [activeTab, setActiveTab] = useState("list");
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [memberInfo, setMemberInfo] = useState({ id: memberId, name: "회원", age: 0, gender: "미상", height: 0 });

  useEffect(() => {
    const fetchData = async () => {
      // 회원 정보 로드 (height, birthDate 포함)
      const { data: memberData } = await supabase
        .from('members')
        .select('id, name, height, birthDate, gender')
        .eq('id', memberId)
        .single();
      if (memberData) {
        const age = memberData.birthDate
          ? Math.floor((Date.now() - new Date(memberData.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 0;
        setMemberInfo(prev => ({
          ...prev,
          name: memberData.name,
          height: memberData.height ?? 0,
          age,
          gender: memberData.gender === 'M' ? '남' : memberData.gender === 'F' ? '여' : '미상',
        }));
      }

      // 체성분 데이터 로드
      const mHeight = memberData?.height ?? 0;
      const mAge = memberData?.birthDate
        ? Math.floor((Date.now() - new Date(memberData.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;
      const { data, error } = await supabase
        .from('body_compositions')
        .select('id, memberId, date, weight, muscle, fat, fatRate, bmi, memo')
        .eq('memberId', memberId)
        .order('date', { ascending: false });
      if (!error && data) {
        setMeasurements(data.map((r: any) => ({
          id: r.id,
          date: r.date,
          weight: r.weight ?? 0,
          muscle: r.muscle ?? 0,
          fat: r.fat ?? 0,
          bmi: mHeight ? calcBMI(r.weight ?? 0, mHeight) : (r.bmi ?? 0),
          pbf: r.fatRate ?? 0,
          bmr: calcBMR(r.weight ?? 0, mHeight, mAge),
        })));
      }
    };
    fetchData();
  }, [memberId]);

  // UI-121 측정값 입력 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split("T")[0], weight: "", muscle: "", pbf: "", bodyWater: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 덮어쓰기 확인
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<Omit<Measurement, "id"> | null>(null);

  // 상세 보기 모달
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: Measurement | null }>({ open: false, record: null });

  // 목표 관리
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goals, setGoals] = useState({ weight: 0, pbf: 0 });
  const [goalDraft, setGoalDraft] = useState({ weight: "0", pbf: "0" });

  // 목표값 DB에서 로드
  useEffect(() => {
    const fetchGoals = async () => {
      const { data } = await supabase
        .from('member_goals')
        .select('goalWeight, goalPbf')
        .eq('memberId', memberId)
        .single();
      if (data) {
        const w = data.goalWeight ?? 0;
        const p = data.goalPbf ?? 0;
        setGoals({ weight: w, pbf: p });
        setGoalDraft({ weight: String(w), pbf: String(p) });
      }
    };
    fetchGoals();
  }, [memberId]);

  const latest = measurements[0] ?? { id: 0, date: '-', weight: 0, muscle: 0, fat: 0, bmi: 0, pbf: 0, bmr: 0 };
  const prev = measurements[1] ?? latest;

  const getChange = (curr: number, previous: number) => {
    const diff = +(curr - previous).toFixed(1);
    return { value: Math.abs(diff), label: `${diff > 0 ? "+" : ""}${diff} 대비`, isPositive: diff >= 0 };
  };

  // 목표 달성률 (낮을수록 좋은 지표 반전)
  const calcProgress = (current: number, goal: number) =>
    Math.min(100, Math.max(0,
      current <= goal ? 100 : Math.round((1 - (current - goal) / goal) * 100)
    ));

  const weightProgress = calcProgress(latest.weight, goals.weight);
  const pbfProgress    = calcProgress(latest.pbf, goals.pbf);

  const previewBMI = formData.weight ? calcBMI(parseFloat(formData.weight) || 0, memberInfo.height) : null;

  // ── 폼 검증 ──
  const validateAddForm = () => {
    const errs: Record<string, string> = {};
    const w = parseFloat(formData.weight);
    const m = parseFloat(formData.muscle);
    const p = parseFloat(formData.pbf);
    if (!formData.date) errs.date = "날짜를 입력해주세요.";
    if (isNaN(w) || w < RANGES.weight.min || w > RANGES.weight.max)
      errs.weight = `유효 범위: ${RANGES.weight.min}~${RANGES.weight.max}kg`;
    if (isNaN(m) || m < RANGES.muscle.min || m > RANGES.muscle.max)
      errs.muscle = `유효 범위: ${RANGES.muscle.min}~${RANGES.muscle.max}kg`;
    if (isNaN(p) || p < RANGES.pbf.min || p > RANGES.pbf.max)
      errs.pbf = `유효 범위: ${RANGES.pbf.min}~${RANGES.pbf.max}%`;
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubmit = () => {
    if (!validateAddForm()) return;
    const w = parseFloat(formData.weight);
    const m = parseFloat(formData.muscle);
    const p = parseFloat(formData.pbf);
    const entry: Omit<Measurement, "id"> = {
      date: formData.date,
      weight: w,
      muscle: m,
      pbf: p,
      fat: +(w * (p / 100)).toFixed(1),
      bmi: calcBMI(w, memberInfo.height),
      bmr: calcBMR(w, memberInfo.height, memberInfo.age),
      bodyWater: formData.bodyWater ? parseFloat(formData.bodyWater) : null,
    };
    const existing = measurements.find(m => m.date === formData.date);
    if (existing) {
      setPendingEntry(entry);
      setShowOverwriteDialog(true);
    } else {
      commitEntry(entry);
    }
  };

  const commitEntry = async (entry: Omit<Measurement, "id">) => {
    // Supabase에 체성분 데이터 저장 (같은 날짜면 upsert)
    const existing = measurements.find(m => m.date === entry.date);
    const payload = {
      memberId: Number(memberId),
      date: entry.date,
      weight: entry.weight,
      muscle: entry.muscle,
      fat: entry.fat,
      fatRate: entry.pbf,
      bmi: entry.bmi,
      bodyWater: entry.bodyWater ?? null,
    };

    let result;
    if (existing) {
      result = await supabase
        .from('body_compositions')
        .update(payload)
        .eq('id', existing.id);
    } else {
      result = await supabase
        .from('body_compositions')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      toast.error(`저장 실패: ${result.error.message}`);
      return;
    }

    // 성공 시 로컬 state 업데이트
    const newId = existing ? existing.id : (result.data?.id ?? Date.now());
    setMeasurements(prev => {
      const filtered = prev.filter(m => m.date !== entry.date);
      return [{ ...entry, id: newId }, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
    setShowAddModal(false);
    setShowOverwriteDialog(false);
    setPendingEntry(null);
    setFormData({ date: new Date().toISOString().split("T")[0], weight: "", muscle: "", pbf: "", bodyWater: "" });
    setFormErrors({});
    toast.success("체성분 데이터가 저장되었습니다.");
  };

  const openAddModal = () => {
    setFormData({ date: new Date().toISOString().split("T")[0], weight: "", muscle: "", pbf: "", bodyWater: "" });
    setFormErrors({});
    setShowAddModal(true);
  };

  // 공통 입력 클래스
  const inputCls = (field: string) => cn(
    "flex-1 px-md py-sm rounded-input border bg-surface-secondary outline-none focus:ring-2 transition-all text-[13px] text-content",
    formErrors[field] ? "border-state-error focus:ring-state-error/20" : "border-line focus:ring-primary/20"
  );

  // 테이블 컬럼 정의
  const columns = [
    { key: "date", header: "측정일", align: "center" as const, render: (v: string) => <span className="tabular-nums">{v?.slice(0, 10) ?? '-'}</span> },
    {
      key: "weight", header: "체중 (kg)", align: "right" as const,
      render: (v: number) => <span className="font-bold text-content">{v}</span>,
    },
    {
      key: "muscle", header: "골격근 (kg)", align: "right" as const,
      render: (v: number) => <span className="text-accent font-semibold">{v}</span>,
    },
    {
      key: "fat", header: "체지방량 (kg)", align: "right" as const,
      render: (v: number) => <span className="text-primary font-medium">{v}</span>,
    },
    { key: "bmi", header: "BMI", align: "right" as const, render: (v: number) => <span>{!v || !isFinite(v) ? '-' : v}</span> },
    {
      key: "pbf", header: "체지방률 (%)", align: "right" as const,
      render: (v: number) => <span className="text-state-warning font-medium">{v}</span>,
    },
    { key: "bmr", header: "기초대사량 (kcal)", align: "right" as const },
    {
      key: "actions", header: "리포트", align: "center" as const,
      render: () => (
        <button className="p-xs text-content-secondary hover:text-primary transition-colors">
          <FileText size={16} />
        </button>
      ),
    },
  ];

  const tabs = [
    { key: "list",  label: "기록 목록", icon: History },
    { key: "chart", label: "변화 그래프", icon: TrendingUp },
    { key: "goal",  label: "목표 관리", icon: Target },
  ];

  return (
    <AppLayout>
      <div className="p-lg bg-surface-secondary min-h-screen">
        {/* 뒤로가기 */}
        <button
          className="flex items-center gap-xs text-content-secondary hover:text-content mb-md transition-colors text-[13px]"
          onClick={() => moveToPage(985, { id: memberId })}
        >
          <ChevronLeft size={18} />
          회원 상세로 돌아가기
        </button>

        {/* 페이지 헤더 */}
        <PageHeader
          title={`${memberInfo.name} 회원의 체성분 정보`}
          description={`최근 측정일: ${latest?.date?.slice(0, 10) ?? '-'} | 목표 체중: ${goals.weight}kg | 목표 체지방률: ${goals.pbf}%`}
          actions={
            <div className="flex gap-sm">
              <button className="flex items-center gap-xs px-md py-sm bg-surface border border-line text-content rounded-button text-[13px] hover:bg-surface-secondary transition-all">
                <Download size={15} />
                전체 기록 추출
              </button>
              <button
                className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-bold shadow-sm hover:bg-primary-dark transition-all"
                onClick={openAddModal}
              >
                <Plus size={15} />
                새 측정 기록 추가
              </button>
            </div>
          }
        />

        {/* UI-121 핵심 지표 요약 */}
        <StatCardGrid cols={3} className="mb-lg">
          <StatCard
            label="현재 체중"
            value={`${latest.weight} kg`}
            icon={<Scale />}
            variant="default"
            change={getChange(latest.weight, prev.weight)}
            description="표준 범위: 50.1 ~ 67.8 kg"
          />
          <StatCard
            label="골격근량"
            value={`${latest.muscle} kg`}
            icon={<Activity />}
            variant="mint"
            change={getChange(latest.muscle, prev.muscle)}
            description="표준 범위: 21.5 ~ 26.3 kg"
          />
          <StatCard
            label="체지방률"
            value={`${latest.pbf} %`}
            icon={<Zap />}
            variant="peach"
            change={getChange(latest.pbf, prev.pbf)}
            description="표준 범위: 18.0 ~ 28.0 %"
          />
        </StatCardGrid>

        {/* 탭 */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden border border-line">
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="px-lg pt-sm" />

          <div className="p-lg">
            {/* 기록 목록 탭 */}
            {activeTab === "list" && (
              <DataTable
                columns={columns}
                data={measurements}
                title="체성분 측정 히스토리"
                onRowClick={(row: Measurement) => setDetailModal({ open: true, record: row })}
              />
            )}

            {/* UI-122 변화 그래프 탭 */}
            {activeTab === "chart" && (
              <div className="space-y-lg">
                <div className="bg-surface rounded-xl border border-line p-lg">
                  <h3 className="text-Section-Title text-content mb-md">체성분 변화 추이 (최근 6회)</h3>
                  <LineChart records={measurements.slice(0, 6)} />
                </div>

                {/* 변화 요약 */}
                <div className="bg-surface rounded-xl border border-line p-lg">
                  <h4 className="text-Section-Title text-content mb-md">변화 요약</h4>
                  {(() => {
                    const first = measurements[measurements.length - 1];
                    const last  = measurements[0];
                    const wDiff = +(last.weight - first.weight).toFixed(1);
                    const mDiff = +(last.muscle - first.muscle).toFixed(1);
                    const pDiff = +(last.pbf - first.pbf).toFixed(1);
                    return (
                      <p className="text-[13px] text-content-secondary leading-relaxed">
                        측정 기간({first.date} ~ {last.date}) 동안 체중은{" "}
                        <span className={cn("font-bold", wDiff <= 0 ? "text-state-success" : "text-primary")}>
                          {wDiff > 0 ? "+" : ""}{wDiff}kg
                        </span>
                        , 골격근량은{" "}
                        <span className={cn("font-bold", mDiff >= 0 ? "text-accent" : "text-state-error")}>
                          {mDiff > 0 ? "+" : ""}{mDiff}kg
                        </span>
                        , 체지방률은{" "}
                        <span className={cn("font-bold", pDiff <= 0 ? "text-state-success" : "text-state-warning")}>
                          {pDiff > 0 ? "+" : ""}{pDiff}%
                        </span>{" "}
                        변화하였습니다.
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 목표 관리 탭 */}
            {activeTab === "goal" && (
              <div className="space-y-lg py-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-Section-Title text-content flex items-center gap-sm">
                    <Target className="text-primary" size={20} />
                    목표 설정 및 달성률
                  </h3>
                  <button
                    className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-bold hover:bg-primary-dark transition-all"
                    onClick={() => {
                      setGoalDraft({ weight: String(goals.weight), pbf: String(goals.pbf) });
                      setShowGoalModal(true);
                    }}
                  >
                    목표 수정
                  </button>
                </div>

                <GoalGauge
                  label="목표 체중"
                  current={latest.weight}
                  goal={goals.weight}
                  unit="kg"
                  progress={weightProgress}
                  color="coral"
                  description={`현재 ${latest.weight}kg → 목표 ${goals.weight}kg`}
                />
                <GoalGauge
                  label="목표 체지방률"
                  current={latest.pbf}
                  goal={goals.pbf}
                  unit="%"
                  progress={pbfProgress}
                  color="mint"
                  description={`현재 ${latest.pbf}% → 목표 ${goals.pbf}%`}
                />
              </div>
            )}
          </div>
        </div>

        {/* 체성분 상세 분석 */}
        <div className="mt-lg grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <div className="bg-surface p-lg rounded-xl border border-line shadow-card">
            <h3 className="text-Section-Title text-content mb-lg flex items-center gap-sm">
              <Activity className="text-accent" size={18} />
              비만 분석
            </h3>
            <div className="space-y-lg">
              <AnalysisRow label="BMI (Body Mass Index)" value={isFinite(latest.bmi) ? latest.bmi : 0} unit="kg/m²" min={18.5} max={23} color="mint" />
              <AnalysisRow label="체지방률 (Percent Body Fat)" value={latest.pbf} unit="%" min={18} max={28} color="coral" />
            </div>
          </div>

          <div className="bg-surface p-lg rounded-xl border border-line shadow-card">
            <h3 className="text-Section-Title text-content mb-lg flex items-center gap-sm">
              <Zap className="text-primary" size={18} />
              에너지 / 대사 분석
            </h3>
            <div className="space-y-sm">
              {[
                { label: "기초대사량 (BMR)", value: `${latest.bmr} kcal` },
                { label: "제지방량", value: `${(latest.weight - latest.fat).toFixed(1)} kg` },
                { label: "권장 섭취 열량", value: `${Math.round(latest.bmr * 1.4).toLocaleString()} kcal` },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center p-md bg-surface-secondary rounded-lg border border-line">
                  <span className="text-[13px] text-content-secondary">{item.label}</span>
                  <span className="text-[15px] font-bold text-content">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── UI-121 측정 추가 모달 ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[480px] mx-md overflow-hidden border border-line">
            <div className="flex items-center justify-between px-lg py-md border-b border-line bg-surface-secondary">
              <h2 className="text-Section-Title text-content font-bold flex items-center gap-sm">
                <Plus className="text-primary" size={18} />
                체성분 측정 추가
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-xs rounded-full hover:bg-surface-tertiary text-content-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-lg space-y-md">
              {/* 날짜 */}
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content">
                  측정일 <span className="text-state-error">*</span>
                </label>
                <input
                  className={cn(inputCls("date"), "w-full")}
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
                {formErrors.date && (
                  <p className="text-[11px] text-state-error flex items-center gap-xs">
                    <AlertCircle size={11} />{formErrors.date}
                  </p>
                )}
              </div>

              {/* 체중 */}
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content">
                  체중{" "}
                  <span className="text-content-secondary font-normal">({RANGES.weight.min}~{RANGES.weight.max}kg)</span>{" "}
                  <span className="text-state-error">*</span>
                </label>
                <div className="flex items-center gap-sm">
                  <input
                    className={inputCls("weight")}
                    type="number" step="0.1" placeholder="예: 54.5"
                    value={formData.weight}
                    onChange={e => setFormData(p => ({ ...p, weight: e.target.value }))}
                  />
                  <span className="text-[13px] text-content-secondary w-8 shrink-0">kg</span>
                </div>
                {formErrors.weight && (
                  <p className="text-[11px] text-state-error flex items-center gap-xs">
                    <AlertCircle size={11} />{formErrors.weight}
                  </p>
                )}
              </div>

              {/* 골격근량 */}
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content">
                  골격근량{" "}
                  <span className="text-content-secondary font-normal">({RANGES.muscle.min}~{RANGES.muscle.max}kg)</span>{" "}
                  <span className="text-state-error">*</span>
                </label>
                <div className="flex items-center gap-sm">
                  <input
                    className={inputCls("muscle")}
                    type="number" step="0.1" placeholder="예: 23.2"
                    value={formData.muscle}
                    onChange={e => setFormData(p => ({ ...p, muscle: e.target.value }))}
                  />
                  <span className="text-[13px] text-content-secondary w-8 shrink-0">kg</span>
                </div>
                {formErrors.muscle && (
                  <p className="text-[11px] text-state-error flex items-center gap-xs">
                    <AlertCircle size={11} />{formErrors.muscle}
                  </p>
                )}
              </div>

              {/* 체지방률 */}
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content">
                  체지방률{" "}
                  <span className="text-content-secondary font-normal">({RANGES.pbf.min}~{RANGES.pbf.max}%)</span>{" "}
                  <span className="text-state-error">*</span>
                </label>
                <div className="flex items-center gap-sm">
                  <input
                    className={inputCls("pbf")}
                    type="number" step="0.1" placeholder="예: 23.5"
                    value={formData.pbf}
                    onChange={e => setFormData(p => ({ ...p, pbf: e.target.value }))}
                  />
                  <span className="text-[13px] text-content-secondary w-8 shrink-0">%</span>
                </div>
                {formErrors.pbf && (
                  <p className="text-[11px] text-state-error flex items-center gap-xs">
                    <AlertCircle size={11} />{formErrors.pbf}
                  </p>
                )}
              </div>

              {/* 체수분 */}
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content">
                  체수분 <span className="text-content-secondary font-normal">(%)</span>
                </label>
                <div className="flex items-center gap-sm">
                  <input
                    className={inputCls("bodyWater")}
                    type="number" step="0.1" placeholder="예: 55.0"
                    value={formData.bodyWater}
                    onChange={e => setFormData(p => ({ ...p, bodyWater: e.target.value }))}
                  />
                  <span className="text-[13px] text-content-secondary w-8 shrink-0">%</span>
                </div>
              </div>

              {/* BMI 자동 계산 미리보기 */}
              {previewBMI !== null && !isNaN(previewBMI) && previewBMI > 0 && (
                <div className="flex items-center gap-sm px-md py-sm bg-accent-light border border-accent/20 rounded-lg">
                  <CheckCircle2 className="text-accent" size={15} />
                  <span className="text-[13px] text-content">
                    BMI 자동 계산:{" "}
                    <span className="font-bold text-accent">{previewBMI} kg/m²</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-line">
              <button
                className="px-lg py-sm rounded-button border border-line text-content-secondary text-[13px] hover:bg-surface-secondary transition-all"
                onClick={() => setShowAddModal(false)}
              >
                취소
              </button>
              <button
                className="px-lg py-sm rounded-button bg-primary text-white font-bold text-[13px] hover:bg-primary-dark transition-all shadow-sm"
                onClick={handleAddSubmit}
              >
                기록 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 덮어쓰기 확인 */}
      <ConfirmDialog
        open={showOverwriteDialog}
        title="동일 날짜 기록 존재"
        description={`${formData.date} 날짜의 기록이 이미 존재합니다.\n기존 기록을 새 데이터로 덮어쓰시겠습니까?`}
        confirmLabel="덮어쓰기"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => pendingEntry && commitEntry(pendingEntry)}
        onCancel={() => { setShowOverwriteDialog(false); setPendingEntry(null); }}
      />

      {/* 목표 수정 모달 */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[380px] mx-md overflow-hidden border border-line">
            <div className="flex items-center justify-between px-lg py-md border-b border-line bg-surface-secondary">
              <h2 className="text-Section-Title text-content font-bold flex items-center gap-sm">
                <Target className="text-primary" size={18} />
                목표 설정
              </h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-xs rounded-full hover:bg-surface-tertiary text-content-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {[
                { key: "weight", label: "목표 체중", unit: "kg" },
                { key: "pbf",    label: "목표 체지방률", unit: "%" },
              ].map(f => (
                <div key={f.key} className="space-y-xs">
                  <label className="text-[13px] font-semibold text-content">
                    {f.label} ({f.unit})
                  </label>
                  <div className="flex items-center gap-sm">
                    <input
                      className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary outline-none focus:ring-2 focus:ring-primary/20 text-[13px] text-content transition-all"
                      type="number" step="0.1"
                      value={goalDraft[f.key as keyof typeof goalDraft]}
                      onChange={e => setGoalDraft(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                    <span className="text-[13px] text-content-secondary w-8 shrink-0">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-line">
              <button
                className="px-lg py-sm rounded-button border border-line text-content-secondary text-[13px] hover:bg-surface-secondary transition-all"
                onClick={() => setShowGoalModal(false)}
              >
                취소
              </button>
              <button
                className="px-lg py-sm rounded-button bg-primary text-white font-bold text-[13px] hover:bg-primary-dark transition-all shadow-sm"
                onClick={async () => {
                  const newGoals = {
                    weight: parseFloat(goalDraft.weight) || 0,
                    pbf:    parseFloat(goalDraft.pbf) || 0,
                  };
                  const { error } = await supabase
                    .from('member_goals')
                    .upsert({
                      memberId: Number(memberId),
                      goalWeight: newGoals.weight,
                      goalPbf: newGoals.pbf,
                      updatedAt: new Date().toISOString(),
                    }, { onConflict: 'memberId' });
                  if (error) {
                    toast.error(`목표 저장 실패: ${error.message}`);
                    return;
                  }
                  setGoals(newGoals);
                  setShowGoalModal(false);
                  toast.success("목표가 저장되었습니다.");
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 체성분 측정 상세 모달 */}
      {detailModal.open && detailModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[420px] mx-md overflow-hidden border border-line">
            <div className="flex items-center justify-between px-lg py-md border-b border-line bg-surface-secondary">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <Activity className="text-accent" size={17} />
                체성분 측정 상세
              </h2>
              <button
                onClick={() => setDetailModal({ open: false, record: null })}
                className="p-xs rounded-full hover:bg-surface-tertiary text-content-secondary transition-colors"
              >
                <X size={17} />
              </button>
            </div>
            <div className="p-lg space-y-sm">
              {[
                { label: "측정일", value: detailModal.record.date?.slice(0, 10) ?? '-' },
                { label: "체중", value: `${detailModal.record.weight} kg` },
                { label: "골격근량", value: `${detailModal.record.muscle} kg` },
                { label: "체지방률", value: `${detailModal.record.pbf} %` },
                { label: "BMI", value: detailModal.record.bmi && isFinite(detailModal.record.bmi) ? `${detailModal.record.bmi} kg/m²` : '-' },
                { label: "체수분", value: detailModal.record.bodyWater != null ? `${detailModal.record.bodyWater} %` : '-' },
                { label: "기초대사량", value: `${detailModal.record.bmr} kcal` },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-sm border-b border-line last:border-0">
                  <span className="text-[12px] text-content-secondary">{item.label}</span>
                  <span className="text-[13px] font-semibold text-content">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end px-lg py-md border-t border-line">
              <button
                className="px-lg py-sm rounded-button bg-surface-secondary border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
                onClick={() => setDetailModal({ open: false, record: null })}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function BodyCompositionPage() {
  return (
    <React.Suspense>
      <BodyComposition />
    </React.Suspense>
  );
}
