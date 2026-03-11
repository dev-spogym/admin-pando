import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  User,
  Phone,
  Calendar as CalendarIcon,
  Mail,
  MapPin,
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  MessageSquare,
  ClipboardList,
  Star,
  ShoppingBag,
  History,
  TrendingUp,
  BarChart3,
  Dumbbell,
  Users,
  Save,
  X,
  ChevronLeft,
  Scale,
  Zap,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";

// ────────────────────────────────────────────────────────────
// Mock 데이터
// ────────────────────────────────────────────────────────────

const MEMBER = {
  id: "M-12345",
  name: "김민수",
  attendanceNo: "8823",
  gender: "남",
  birthDate: "1992-05-14",
  phone: "010-1234-5678",
  email: "minsoo.kim@example.com",
  status: "active",
  dDay: 7,
  recentVisit: "2026-02-18 14:30",
  joinDate: "2025-01-10",
  trainer: "이지은 (Jenny)",
  fc: "박상준 (Leo)",
  address: "서울시 강남구 테헤란로 123, 온핏 타워 8층",
  company: "(주)온핏테크",
  marketingAgreed: true,
  appLinked: true,
  appAccount: "minsoo_92",
  purpose: "다이어트 및 근력 강화",
  source: "인스타그램 광고",
  memo: "좌측 무릎 부상 이력 있음 (2년 전 수술). 하체 운동 시 가동 범위 주의 필요. 식단 관리 철저히 요청함.",
};

type Ticket = {
  id: number;
  name: string;
  type: string;
  status: "active" | "holding" | "expired";
  startDate: string;
  endDate: string;
  totalCount: number | null;
  usedCount: number | null;
  remainDays: number;
  price: string;
};

const TICKETS: Ticket[] = [
  {
    id: 1,
    name: "퍼스널 트레이닝 30회 (1:1)",
    type: "수강권",
    status: "active",
    startDate: "2026.01.10",
    endDate: "2026.07.10",
    totalCount: 30,
    usedCount: 12,
    remainDays: 142,
    price: "1,800,000원",
  },
  {
    id: 2,
    name: "헬스 회원권 6개월 (전지점)",
    type: "회원권",
    status: "active",
    startDate: "2026.01.10",
    endDate: "2026.01.17",
    totalCount: null,
    usedCount: null,
    remainDays: 7,
    price: "660,000원",
  },
  {
    id: 3,
    name: "운동복 & 수건 대여 (6개월)",
    type: "대여권",
    status: "active",
    startDate: "2026.01.10",
    endDate: "2026.02.10",
    totalCount: null,
    usedCount: null,
    remainDays: 25,
    price: "55,000원",
  },
];

type AttendanceRecord = {
  date: string;
  checkIn: string;
  checkOut: string;
  branch: string;
  isBranch: boolean;
};

const ATTENDANCE_LIST: AttendanceRecord[] = [
  { date: "2026-02-18", checkIn: "14:30", checkOut: "16:10", branch: "강남점", isBranch: false },
  { date: "2026-02-17", checkIn: "10:00", checkOut: "11:45", branch: "강남점", isBranch: false },
  { date: "2026-02-15", checkIn: "09:20", checkOut: "11:00", branch: "홍대점", isBranch: true },
  { date: "2026-02-14", checkIn: "14:00", checkOut: "15:30", branch: "강남점", isBranch: false },
  { date: "2026-02-12", checkIn: "18:30", checkOut: "20:00", branch: "강남점", isBranch: false },
  { date: "2026-02-11", checkIn: "10:10", checkOut: "11:50", branch: "판교점", isBranch: true },
];

type Payment = {
  id: number;
  date: string;
  product: string;
  amount: string;
  method: string;
  status: string;
};

const PAYMENTS: Payment[] = [
  { id: 1, date: "2026-01-10", product: "퍼스널 트레이닝 30회", amount: "1,800,000원", method: "카드", status: "완료" },
  { id: 2, date: "2026-01-10", product: "헬스 회원권 6개월", amount: "660,000원", method: "카드", status: "완료" },
  { id: 3, date: "2026-01-10", product: "운동복 & 수건 대여 6개월", amount: "55,000원", method: "현금", status: "완료" },
  { id: 4, date: "2025-07-15", product: "헬스 회원권 6개월", amount: "660,000원", method: "카드", status: "완료" },
  { id: 5, date: "2025-01-10", product: "퍼스널 트레이닝 20회", amount: "1,200,000원", method: "카드", status: "완료" },
];

type BodyRecord = {
  id: number;
  date: string;
  weight: number;
  muscle: number;
  fat: number;
  bmi: number;
  pbf: number;
};

const BODY_RECORDS: BodyRecord[] = [
  { id: 1, date: "2026-02-15", weight: 78.2, muscle: 35.1, fat: 18.4, bmi: 24.8, pbf: 23.5 },
  { id: 2, date: "2026-01-12", weight: 79.8, muscle: 34.6, fat: 20.1, bmi: 25.3, pbf: 25.2 },
  { id: 3, date: "2025-12-10", weight: 81.5, muscle: 34.0, fat: 22.3, bmi: 25.8, pbf: 27.4 },
  { id: 4, date: "2025-11-05", weight: 83.0, muscle: 33.5, fat: 24.1, bmi: 26.3, pbf: 29.0 },
  { id: 5, date: "2025-10-01", weight: 84.5, muscle: 33.0, fat: 25.8, bmi: 26.8, pbf: 30.5 },
  { id: 6, date: "2025-09-01", weight: 86.0, muscle: 32.5, fat: 27.5, bmi: 27.3, pbf: 32.0 },
];

// ────────────────────────────────────────────────────────────
// 출석 히트맵 생성
// ────────────────────────────────────────────────────────────

function generateHeatmapData(): Record<string, number> {
  const data: Record<string, number> = {};
  const today = new Date();
  for (let i = 180; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const day = d.getDay();
    if (day !== 0 && day !== 6 && Math.random() > 0.4) {
      data[key] = Math.random() > 0.7 ? 2 : 1;
    }
  }
  return data;
}

const ATTENDANCE_MAP = generateHeatmapData();

// ────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  icon,
  badge,
  onClick,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  badge?: "success" | "error" | "default";
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-xs border-b border-line last:border-0",
        onClick && "cursor-pointer hover:bg-surface-secondary/50 px-xs -mx-xs rounded transition-colors"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-sm">
        {icon && <span className="text-content-secondary">{icon}</span>}
        <span className="text-[13px] text-content-secondary font-medium">{label}</span>
      </div>
      {badge ? (
        <StatusBadge variant={badge}>{String(value)}</StatusBadge>
      ) : (
        <span
          className={cn(
            "text-[13px] font-semibold",
            onClick ? "text-primary underline underline-offset-4" : "text-content"
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// D-Day 배지 색상
function getDDayClass(days: number) {
  if (days <= 7) return "bg-red-50 text-state-error border border-state-error/30";
  if (days <= 30) return "bg-orange-50 text-orange-500 border border-orange-300";
  return "bg-surface-tertiary text-content-secondary border border-line";
}

// 잔여 텍스트 색상
function getRemainClass(days: number) {
  if (days <= 7) return "text-state-error font-bold";
  if (days <= 30) return "text-orange-500 font-semibold";
  return "text-content font-medium";
}

// 체성분 SVG 라인 차트
function BodyLineChart({ records }: { records: BodyRecord[] }) {
  const reversed = [...records].reverse();
  const W = 520, H = 200, PAD = 40;

  const metrics = [
    { key: "weight" as keyof BodyRecord, label: "체중(kg)", color: "#FF7F6E" },
    { key: "muscle" as keyof BodyRecord, label: "골격근(kg)", color: "#48D1CC" },
    { key: "pbf" as keyof BodyRecord, label: "체지방률(%)", color: "#F59E0B" },
  ];

  const [activeMetrics, setActiveMetrics] = useState<string[]>(["weight", "muscle", "pbf"]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null);

  const toggleMetric = (key: string) => {
    setActiveMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getPath = (key: keyof BodyRecord) => {
    const vals = reversed.map(r => Number(r[key]));
    const min = Math.min(...vals) * 0.95;
    const max = Math.max(...vals) * 1.05;
    const xStep = (W - PAD * 2) / (reversed.length - 1);
    return reversed
      .map((r, i) => {
        const x = PAD + i * xStep;
        const y = H - PAD - ((Number(r[key]) - min) / (max - min)) * (H - PAD * 2);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const getPoints = (key: keyof BodyRecord) => {
    const vals = reversed.map(r => Number(r[key]));
    const min = Math.min(...vals) * 0.95;
    const max = Math.max(...vals) * 1.05;
    const xStep = (W - PAD * 2) / (reversed.length - 1);
    return reversed.map((r, i) => ({
      x: PAD + i * xStep,
      y: H - PAD - ((Number(r[key]) - min) / (max - min)) * (H - PAD * 2),
    }));
  };

  return (
    <div className="space-y-md">
      {/* 토글 */}
      <div className="flex gap-sm flex-wrap">
        {metrics.map(m => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className={cn(
              "flex items-center gap-xs px-md py-xs rounded-full text-[12px] font-medium border transition-all",
              activeMetrics.includes(m.key)
                ? "text-white border-transparent"
                : "bg-surface-secondary text-content-secondary border-line"
            )}
            style={activeMetrics.includes(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeMetrics.includes(m.key) ? "#fff" : m.color }}
            />
            {m.label}
          </button>
        ))}
      </div>

      {/* SVG */}
      <div className="relative overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="min-w-[320px]">
          {/* 격자선 */}
          {[0, 0.25, 0.5, 0.75, 1].map(r => (
            <line
              key={r}
              x1={PAD}
              y1={PAD + r * (H - PAD * 2)}
              x2={W - PAD}
              y2={PAD + r * (H - PAD * 2)}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          ))}
          {/* X축 날짜 */}
          {reversed.map((r, i) => {
            const x = PAD + i * ((W - PAD * 2) / (reversed.length - 1));
            return (
              <text key={i} x={x} y={H - 8} textAnchor="middle" fontSize="9" fill="#94A3B8">
                {r.date.slice(5)}
              </text>
            );
          })}
          {/* 라인 + 포인트 */}
          {metrics.map(m => {
            if (!activeMetrics.includes(m.key)) return null;
            const pts = getPoints(m.key);
            return (
              <g key={m.key}>
                <path d={getPath(m.key)} fill="none" stroke={m.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill={m.color}
                    stroke="#fff"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setTooltip({ x: p.x, y: p.y, idx: i })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </g>
            );
          })}
          {/* 툴팁 */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x - 48, W - PAD - 96)}
                y={tooltip.y - 52}
                width="96"
                height="44"
                rx="6"
                fill="#1E293B"
                fillOpacity="0.9"
              />
              <text
                x={Math.min(tooltip.x - 48, W - PAD - 96) + 48}
                y={tooltip.y - 35}
                textAnchor="middle"
                fontSize="10"
                fill="#fff"
                fontWeight="600"
              >
                {reversed[tooltip.idx].date}
              </text>
              {activeMetrics.map((mk, li) => {
                const metric = metrics.find(m => m.key === mk)!;
                return (
                  <text
                    key={mk}
                    x={Math.min(tooltip.x - 48, W - PAD - 96) + 48}
                    y={tooltip.y - 20 + li * 12}
                    textAnchor="middle"
                    fontSize="9"
                    fill={metric.color}
                  >
                    {metric.label}: {reversed[tooltip.idx][mk as keyof BodyRecord]}
                  </text>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 탭별 렌더 함수
// ────────────────────────────────────────────────────────────

// UI-022 프로필 탭 (회원정보)
function TabInfo() {
  return (
    <div className="space-y-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <StatCard label="최근 방문일" value={MEMBER.recentVisit.split(" ")[0]} description={MEMBER.recentVisit.split(" ")[1] + " 방문"} icon={<Clock />} />
        <StatCard label="담당 트레이너" value={MEMBER.trainer} icon={<Users />} variant="peach" />
        <StatCard label="담당 FC" value={MEMBER.fc} icon={<User />} variant="mint" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <FormSection title="기본 정보" collapsible>
          <div className="space-y-xs">
            <InfoItem label="휴대전화" value={MEMBER.phone} icon={<Phone size={16} />} />
            <InfoItem label="생년월일" value={`${MEMBER.birthDate} (${MEMBER.gender})`} icon={<CalendarIcon size={16} />} />
            <InfoItem label="이메일" value={MEMBER.email} icon={<Mail size={16} />} />
            <InfoItem label="주소" value={MEMBER.address} icon={<MapPin size={16} />} />
            <InfoItem label="회원번호" value={MEMBER.id} />
            <InfoItem label="출석번호" value={MEMBER.attendanceNo} />
            <InfoItem label="가입일" value={MEMBER.joinDate} />
            <InfoItem label="앱 연동" value={MEMBER.appLinked ? `연동됨 (${MEMBER.appAccount})` : "미연동"} badge={MEMBER.appLinked ? "success" : "default"} />
          </div>
        </FormSection>
        <FormSection title="운영 정보" collapsible>
          <div className="space-y-xs">
            <InfoItem label="유입경로" value={MEMBER.source} />
            <InfoItem label="운동목적" value={MEMBER.purpose} />
            <InfoItem label="소속 회사" value={MEMBER.company} />
            <InfoItem label="광고 수신" value={MEMBER.marketingAgreed ? "동의" : "미동의"} badge={MEMBER.marketingAgreed ? "success" : "error"} />
          </div>
          <div className="md:col-span-2">
            <div className="flex flex-col gap-xs">
              <span className="text-[12px] text-content-secondary font-medium">특이사항 및 메모</span>
              <div className="p-md bg-surface-secondary rounded-lg text-[13px] text-content min-h-[100px] whitespace-pre-wrap border border-line">
                {MEMBER.memo}
              </div>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}

// UI-023 이용권 탭
function TabTickets() {
  return (
    <div className="space-y-lg">
      <div className="grid gap-md">
        {TICKETS.map(ticket => {
          const dDayClass = getDDayClass(ticket.remainDays);
          const remainClass = getRemainClass(ticket.remainDays);
          const statusMap: Record<string, { label: string; variant: any }> = {
            active: { label: "이용중", variant: "success" },
            holding: { label: "홀딩", variant: "info" },
            expired: { label: "만료", variant: "error" },
          };
          const s = statusMap[ticket.status];

          return (
            <div key={ticket.id} className="bg-surface rounded-xl border border-line p-lg shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
                <div className="flex-1 space-y-xs">
                  <div className="flex items-center gap-sm flex-wrap">
                    <span className="text-[15px] font-bold text-content">{ticket.name}</span>
                    <StatusBadge variant={s.variant} dot>{s.label}</StatusBadge>
                    <span className="text-[11px] px-sm py-[2px] bg-surface-secondary rounded-full text-content-secondary border border-line">
                      {ticket.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-md text-[12px] text-content-secondary flex-wrap">
                    <span className="flex items-center gap-xs">
                      <CalendarIcon size={12} />
                      {ticket.startDate} ~ {ticket.endDate}
                    </span>
                    {ticket.totalCount !== null && (
                      <span className="flex items-center gap-xs">
                        <Activity size={12} />
                        잔여 <strong className="text-content">{ticket.totalCount - (ticket.usedCount ?? 0)}회</strong> / {ticket.totalCount}회
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-md shrink-0">
                  <div className={cn("px-md py-xs rounded-full text-[12px] font-bold", dDayClass)}>
                    D-{ticket.remainDays}
                  </div>
                  <span className={cn("text-[14px]", remainClass)}>
                    {ticket.remainDays <= 7 ? "곧 만료!" : ticket.remainDays <= 30 ? "만료 임박" : ""}
                  </span>
                  <span className="text-[14px] font-semibold text-content">{ticket.price}</span>
                  <button className="p-xs hover:bg-surface-secondary rounded-full transition-colors text-content-secondary">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center p-xl bg-surface rounded-xl border border-dashed border-line">
        <button
          className="flex items-center gap-sm px-xl py-md bg-primary-light text-primary rounded-button font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
          onClick={() => moveToPage(971)}
        >
          <Plus size={20} />
          신규 이용권 / 상품 구매
        </button>
      </div>
    </div>
  );
}

// UI-024 출석 탭
function TabAttendance() {
  const totalDays = Object.values(ATTENDANCE_MAP).filter(v => v > 0).length;
  const today = new Date();

  // 히트맵 주차 계산
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = new Date(sixMonthsAgo);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks: Date[][] = [];
  const current = new Date(startDate);
  while (current <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  const monthLabels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const month = week[0].getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ label: `${week[0].getMonth() + 1}월`, colIndex: i });
      lastMonth = month;
    }
  });

  const getCellColor = (date: Date) => {
    const key = date.toISOString().split("T")[0];
    const count = ATTENDANCE_MAP[key];
    if (date > today) return "bg-transparent";
    if (!count) return "bg-surface-tertiary";
    if (count >= 2) return "bg-primary";
    return "bg-primary/40";
  };

  return (
    <div className="space-y-lg">
      <div className="flex gap-md flex-wrap">
        <StatCard label="최근 6개월 출석" value={`${totalDays}일`} icon={<History size={20} />} variant="mint" />
        <StatCard label="이번 달 출석" value="12일" icon={<CalendarIcon size={20} />} variant="default" />
        <StatCard label="연속 출석" value="5일" icon={<TrendingUp size={20} />} variant="peach" />
      </div>

      {/* 히트맵 */}
      <div className="bg-surface rounded-xl border border-line p-lg">
        <h3 className="text-Section-Title text-content mb-md">출석 캘린더 (최근 6개월)</h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-max">
            <div className="flex mb-xs ml-6">
              {weeks.map((week, i) => {
                const ml = monthLabels.find(m => m.colIndex === i);
                return (
                  <div key={i} className="w-4 mr-1 text-[10px] text-content-secondary">
                    {ml ? ml.label : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-0">
              <div className="flex flex-col mr-1">
                {dayLabels.map((d, i) => (
                  <div key={i} className="h-4 mb-1 text-[10px] text-content-secondary w-5 flex items-center">
                    {i % 2 === 1 ? d : ""}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col mr-1">
                  {week.map((date, di) => {
                    const key = date.toISOString().split("T")[0];
                    const count = ATTENDANCE_MAP[key];
                    return (
                      <div
                        key={di}
                        className={cn("w-4 h-4 mb-1 rounded-sm transition-colors cursor-default", getCellColor(date))}
                        title={`${key}${count ? ` (${count}회 출석)` : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-sm mt-md ml-6">
              <span className="text-[11px] text-content-secondary">적음</span>
              <div className="w-4 h-4 rounded-sm bg-surface-tertiary border border-line" />
              <div className="w-4 h-4 rounded-sm bg-primary/40" />
              <div className="w-4 h-4 rounded-sm bg-primary" />
              <span className="text-[11px] text-content-secondary">많음</span>
            </div>
          </div>
        </div>
      </div>

      {/* 출석 리스트 */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-lg py-md border-b border-line flex items-center justify-between">
          <h3 className="text-Section-Title text-content">최근 출석 내역</h3>
        </div>
        <div className="divide-y divide-line">
          {ATTENDANCE_LIST.map((rec, i) => (
            <div key={i} className="flex items-center justify-between px-lg py-sm hover:bg-surface-secondary/40 transition-colors">
              <div className="flex items-center gap-md">
                <div className={cn("w-2 h-2 rounded-full shrink-0", rec.isBranch ? "bg-state-info" : "bg-state-success")} />
                <div>
                  <span className="text-[13px] font-semibold text-content">{rec.date}</span>
                  {rec.isBranch && (
                    <span className="ml-sm text-[11px] px-xs py-[2px] bg-blue-50 text-state-info rounded border border-state-info/20">
                      타지점
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-lg text-[12px] text-content-secondary">
                <span>{rec.branch}</span>
                <span>
                  {rec.checkIn} ~ {rec.checkOut}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// UI-025 결제 탭
function TabPayment() {
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [detailTarget, setDetailTarget] = useState<Payment | null>(null);
  const PAGE_SIZE = 3;
  const paged = PAYMENTS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const paymentColumns = [
    {
      key: "date",
      header: "결제일",
      render: (v: string) => <span className="font-mono text-[12px] text-content">{v}</span>,
    },
    { key: "product", header: "상품명" },
    {
      key: "amount",
      header: "금액",
      align: "right" as const,
      render: (v: string) => <span className="font-bold text-content">{v}</span>,
    },
    { key: "method", header: "결제방법", align: "center" as const },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (v: string) => <StatusBadge variant="success" dot>{v}</StatusBadge>,
    },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: (_: unknown, row: Payment) => (
        <div className="flex items-center justify-center gap-xs">
          <button
            className="text-[11px] px-sm py-xs rounded border border-line text-content-secondary hover:bg-surface-secondary transition-colors"
            onClick={() => setDetailTarget(row)}
          >
            상세
          </button>
          <button
            className="text-[11px] px-sm py-xs rounded border border-state-error/40 text-state-error hover:bg-red-50 transition-colors"
            onClick={() => setRefundTarget(row)}
          >
            환불
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-lg">
      <DataTable
        title="결제 이력"
        columns={paymentColumns}
        data={paged}
        pagination={{ page, pageSize: PAGE_SIZE, total: PAYMENTS.length }}
        onPageChange={setPage}
        emptyMessage="결제 이력이 없습니다."
      />

      {/* 환불 확인 다이얼로그 */}
      <ConfirmDialog
        open={refundTarget !== null}
        title="환불 처리"
        description={`[${refundTarget?.product}] ${refundTarget?.amount} 결제 건을 환불 처리하시겠습니까?`}
        confirmLabel="환불 처리"
        variant="danger"
        onConfirm={() => { alert("환불 처리가 완료되었습니다."); setRefundTarget(null); }}
        onCancel={() => setRefundTarget(null)}
      />

      {/* 결제 상세 모달 */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl border border-line shadow-lg w-full max-w-[400px] mx-md overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-Section-Title text-content font-bold">결제 상세</h2>
              <button
                className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors"
                onClick={() => setDetailTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-sm">
              {[
                { label: "상품명", value: detailTarget.product },
                { label: "결제일", value: detailTarget.date },
                { label: "결제금액", value: detailTarget.amount },
                { label: "결제방법", value: detailTarget.method },
                { label: "상태", value: detailTarget.status },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-xs border-b border-line last:border-0">
                  <span className="text-[13px] text-content-secondary">{item.label}</span>
                  <span className="text-[13px] font-semibold text-content">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="px-lg py-md border-t border-line flex justify-end">
              <button
                className="px-lg py-sm bg-surface-secondary text-content rounded-button text-[13px] font-medium hover:bg-surface-tertiary transition-colors"
                onClick={() => setDetailTarget(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// UI-026 체성분 탭
function TabBody() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [records, setRecords] = useState<BodyRecord[]>(BODY_RECORDS);
  const [form, setForm] = useState({ weight: "", muscle: "", pbf: "", bmi: "", date: new Date().toISOString().split("T")[0] });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const latest = records[0];
  const prev = records[1];

  const change = (curr: number, previous: number) => {
    const diff = +(curr - previous).toFixed(1);
    return { value: diff, label: `${diff > 0 ? "+" : ""}${diff} 대비` };
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    const w = parseFloat(form.weight);
    const m = parseFloat(form.muscle);
    const p = parseFloat(form.pbf);
    if (isNaN(w) || w < 20 || w > 300) errs.weight = "체중을 올바르게 입력하세요 (20~300kg)";
    if (isNaN(m) || m < 5 || m > 80) errs.muscle = "골격근량을 올바르게 입력하세요 (5~80kg)";
    if (isNaN(p) || p < 3 || p > 60) errs.pbf = "체지방률을 올바르게 입력하세요 (3~60%)";
    if (!form.date) errs.date = "날짜를 입력하세요";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) return;
    const w = parseFloat(form.weight);
    const m = parseFloat(form.muscle);
    const p = parseFloat(form.pbf);
    const newRecord: BodyRecord = {
      id: Date.now(),
      date: form.date,
      weight: w,
      muscle: m,
      pbf: p,
      fat: +(w * (p / 100)).toFixed(1),
      bmi: +(w / ((177 / 100) ** 2)).toFixed(1),
    };
    setRecords(prev => [newRecord, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setShowAddModal(false);
    setForm({ weight: "", muscle: "", pbf: "", bmi: "", date: new Date().toISOString().split("T")[0] });
    setFormErrors({});
  };

  const bodyColumns = [
    { key: "date", header: "측정일", align: "center" as const },
    { key: "weight", header: "체중(kg)", align: "right" as const, render: (v: number) => <span className="font-bold text-content">{v}</span> },
    { key: "muscle", header: "골격근(kg)", align: "right" as const, render: (v: number) => <span className="text-accent font-semibold">{v}</span> },
    { key: "pbf", header: "체지방률(%)", align: "right" as const, render: (v: number) => <span className="text-state-warning font-semibold">{v}</span> },
    { key: "fat", header: "체지방량(kg)", align: "right" as const, render: (v: number) => <span className="text-primary font-medium">{v}</span> },
    { key: "bmi", header: "BMI", align: "right" as const },
  ];

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-Section-Title text-content">체성분 변화 추이</h3>
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={14} />
          측정 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <StatCard
          label="현재 체중"
          value={`${latest.weight} kg`}
          icon={<Scale />}
          variant="default"
          change={change(latest.weight, prev.weight)}
        />
        <StatCard
          label="골격근량"
          value={`${latest.muscle} kg`}
          icon={<Activity />}
          variant="mint"
          change={change(latest.muscle, prev.muscle)}
        />
        <StatCard
          label="체지방률"
          value={`${latest.pbf} %`}
          icon={<Zap />}
          variant="peach"
          change={change(latest.pbf, prev.pbf)}
        />
      </div>

      {/* 라인 차트 */}
      <div className="bg-surface rounded-xl border border-line p-lg">
        <h4 className="text-Section-Title text-content mb-md">변화 그래프 (최근 6회)</h4>
        <BodyLineChart records={records.slice(0, 6)} />
      </div>

      {/* 테이블 */}
      <DataTable title="측정 기록" columns={bodyColumns} data={records} emptyMessage="측정 기록이 없습니다." />

      {/* 측정 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[440px] mx-md overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-Section-Title text-content font-bold flex items-center gap-sm">
                <Plus className="text-primary" size={18} />
                체성분 측정 추가
              </h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {[
                { key: "date", label: "측정일", type: "date", unit: "" },
                { key: "weight", label: "체중", type: "number", unit: "kg" },
                { key: "muscle", label: "골격근량", type: "number", unit: "kg" },
                { key: "pbf", label: "체지방률", type: "number", unit: "%" },
              ].map(f => (
                <div key={f.key} className="space-y-xs">
                  <label className="text-[13px] font-semibold text-content">
                    {f.label} {f.unit && <span className="text-content-secondary font-normal">({f.unit})</span>}
                    {" "}<span className="text-state-error">*</span>
                  </label>
                  <div className="flex items-center gap-sm">
                    <input
                      className={cn(
                        "flex-1 px-md py-sm rounded-input border bg-surface-secondary outline-none focus:ring-2 focus:ring-primary/30 text-[13px] transition-all",
                        formErrors[f.key] ? "border-state-error" : "border-line"
                      )}
                      type={f.type}
                      step="0.1"
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                    {f.unit && <span className="text-[13px] text-content-secondary w-8 shrink-0">{f.unit}</span>}
                  </div>
                  {formErrors[f.key] && (
                    <p className="text-[11px] text-state-error">{formErrors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button
                className="px-lg py-sm border border-line text-content-secondary rounded-button text-[13px] hover:bg-surface-secondary transition-colors"
                onClick={() => setShowAddModal(false)}
              >
                취소
              </button>
              <button
                className="px-lg py-sm bg-primary text-white rounded-button text-[13px] font-bold hover:bg-primary-dark transition-colors shadow-sm"
                onClick={handleAdd}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// UI-027 메모 탭
function TabMemo() {
  const [memos, setMemos] = useState([
    { id: 1, date: "2026-02-10", author: "이지원", content: "식단 상담 진행. 단백질 섭취 늘리기로 계획.", category: "상담" },
    { id: 2, date: "2026-01-20", author: "김민수", content: "좌측 무릎 통증 호소. PT 일정 조정.", category: "특이사항" },
    { id: 3, date: "2025-12-05", author: "이지원", content: "체성분 측정 후 목표 재설정. 체지방 5% 감량 목표.", category: "상담" },
  ]);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("상담");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newContent.trim()) return;
    setMemos(prev => [
      {
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        author: "관리자",
        content: newContent.trim(),
        category: newCategory,
      },
      ...prev,
    ]);
    setNewContent("");
  };

  const handleSave = (id: number) => {
    if (!editingContent.trim()) return;
    setMemos(prev => prev.map(m => (m.id === id ? { ...m, content: editingContent.trim() } : m)));
    setEditingId(null);
    setEditingContent("");
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      setMemos(prev => prev.filter(m => m.id !== deleteId));
      setDeleteId(null);
    }
  };

  const categoryVariant = (cat: string): any => {
    if (cat === "특이사항") return "warning";
    if (cat === "상담") return "info";
    return "default";
  };

  return (
    <div className="space-y-lg">
      {/* 새 메모 작성 */}
      <div className="bg-surface rounded-xl border border-line p-lg">
        <h3 className="text-Section-Title text-content mb-md">새 메모 작성</h3>
        <div className="space-y-sm">
          <select
            className="rounded-input bg-surface-secondary border border-line px-md py-sm text-[13px] text-content outline-none focus:ring-2 focus:ring-primary/20 w-auto"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
          >
            <option value="상담">상담</option>
            <option value="특이사항">특이사항</option>
            <option value="일반">일반</option>
          </select>
          <textarea
            className="w-full rounded-input bg-surface-secondary border border-line px-md py-sm text-[13px] text-content outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={3}
            placeholder="상담 내용 또는 특이사항을 입력하세요..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-all disabled:opacity-40"
              onClick={handleAdd}
              disabled={!newContent.trim()}
            >
              <Plus size={14} />
              메모 저장
            </button>
          </div>
        </div>
      </div>

      {/* 메모 목록 (시간순 내림차순) */}
      <div className="space-y-sm">
        {memos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-xxl text-content-secondary">
            <MessageSquare size={40} className="mb-sm opacity-20" />
            <p className="text-[13px]">작성된 메모가 없습니다.</p>
          </div>
        )}
        {memos.map(memo => (
          <div key={memo.id} className="bg-surface rounded-xl border border-line p-md">
            <div className="flex items-start justify-between gap-sm">
              <div className="flex items-center gap-sm flex-wrap">
                <StatusBadge variant={categoryVariant(memo.category)}>{memo.category}</StatusBadge>
                <span className="text-[12px] text-content-secondary font-medium">{memo.date}</span>
                <span className="text-[12px] text-content-secondary">작성자: {memo.author}</span>
              </div>
              <div className="flex items-center gap-xs shrink-0">
                {editingId === memo.id ? (
                  <>
                    <button
                      className="p-xs rounded-md hover:bg-accent-light text-accent transition-colors"
                      onClick={() => handleSave(memo.id)}
                      title="저장"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      className="p-xs rounded-md hover:bg-surface-secondary text-content-secondary transition-colors"
                      onClick={() => { setEditingId(null); setEditingContent(""); }}
                      title="취소"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="p-xs rounded-md hover:bg-surface-secondary text-content-secondary hover:text-content transition-colors"
                      onClick={() => { setEditingId(memo.id); setEditingContent(memo.content); }}
                      title="수정"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="p-xs rounded-md hover:bg-red-50 text-content-secondary hover:text-state-error transition-colors"
                      onClick={() => setDeleteId(memo.id)}
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-sm">
              {editingId === memo.id ? (
                <textarea
                  className="w-full rounded-input bg-surface-secondary border border-line px-md py-sm text-[13px] text-content outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={3}
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  autoFocus
                />
              ) : (
                <p className="text-[13px] text-content whitespace-pre-wrap">{memo.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="메모 삭제"
        description="이 메모를 삭제하시겠습니까? 되돌릴 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────

export default function MemberDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const tabs = [
    { key: "info", label: "회원정보", icon: User },
    { key: "tickets", label: "이용권", icon: CreditCard, count: TICKETS.length },
    { key: "attendance", label: "출석 이력", icon: History },
    { key: "payment", label: "결제 이력", icon: ShoppingBag },
    { key: "body", label: "체성분", icon: Activity },
    { key: "memo", label: "상담·메모", icon: MessageSquare },
    { key: "coupons", label: "쿠폰·마일리지", icon: Star },
    { key: "reservation", label: "예약 이력", icon: ClipboardList },
    { key: "analysis", label: "분석", icon: TrendingUp },
  ];

  const confirmDelete = () => {
    alert("회원이 삭제되었습니다.");
    setIsDeleteDialogOpen(false);
    moveToPage(967);
  };

  // D-7 경고 배지
  const urgentTicket = TICKETS.find(t => t.remainDays <= 7);
  const warningTicket = TICKETS.find(t => t.remainDays > 7 && t.remainDays <= 30);

  return (
    <AppLayout>
      <div className="p-lg">
        {/* UI-022 프로필 카드 */}
        <div className="bg-surface rounded-xl border border-line p-xl mb-lg shadow-card">
          {urgentTicket && (
            <div className="flex items-center gap-sm px-md py-sm bg-red-50 border border-state-error/20 rounded-lg mb-lg text-[12px] text-state-error">
              <AlertTriangle size={14} />
              <strong>{urgentTicket.name}</strong> 이용권이 D-{urgentTicket.remainDays} 만료 예정입니다.
            </div>
          )}
          {!urgentTicket && warningTicket && (
            <div className="flex items-center gap-sm px-md py-sm bg-orange-50 border border-orange-200 rounded-lg mb-lg text-[12px] text-orange-600">
              <AlertTriangle size={14} />
              <strong>{warningTicket.name}</strong> 이용권이 D-{warningTicket.remainDays} 만료 예정입니다.
            </div>
          )}

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-xl">
            {/* 프로필 이미지 */}
            <div className="relative">
              <div className="w-[120px] h-[120px] rounded-full bg-surface-secondary flex items-center justify-center border-4 border-surface-tertiary overflow-hidden">
                <User className="text-content-tertiary" size={64} />
              </div>
              <button
                className={cn(
                  "absolute bottom-0 right-0 p-sm rounded-full shadow-md transition-all border border-line",
                  isFavorite ? "bg-primary text-white border-primary" : "bg-surface text-content-secondary hover:text-primary"
                )}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>

            {/* 회원 기본 정보 */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-sm mb-xs">
                <h1 className="text-[22px] font-bold text-content leading-tight">{MEMBER.name}</h1>
                <span className="text-[14px] text-content-secondary">({MEMBER.attendanceNo})</span>
                <StatusBadge variant="success" dot>정상 이용중</StatusBadge>
                <span className={cn("text-[12px] px-sm py-[2px] rounded-full font-bold border", getDDayClass(MEMBER.dDay))}>
                  D-{MEMBER.dDay}
                </span>
              </div>
              <p className="text-[13px] text-content-secondary mb-md">
                {MEMBER.gender} · {MEMBER.phone} · {MEMBER.email}
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-sm">
                <button
                  className="flex items-center gap-xs px-md py-sm bg-state-success text-white rounded-button font-semibold text-[13px] hover:opacity-90 transition-all"
                  onClick={() => alert(`${MEMBER.name} 회원 수동 출석 처리`)}
                >
                  <CheckCircle2 size={15} />
                  수동 출석
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-surface-secondary text-content rounded-button font-semibold text-[13px] border border-line hover:bg-surface-tertiary transition-all"
                  onClick={() => moveToPage(986)}
                >
                  <Edit size={15} />
                  수정
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-accent-light text-accent rounded-button font-semibold text-[13px] hover:bg-accent hover:text-white transition-all"
                  onClick={() => moveToPage(971)}
                >
                  <ShoppingBag size={15} />
                  상품 구매
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm border border-state-error/40 text-state-error rounded-button font-semibold text-[13px] hover:bg-red-50 transition-all"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 size={15} />
                  삭제
                </button>
              </div>
            </div>

            {/* 퀵 지표 */}
            <div className="hidden xl:flex flex-col gap-sm min-w-[200px]">
              {[
                { label: "미수금", value: "0원", color: "text-state-error" },
                { label: "마일리지", value: "1,250P", color: "text-accent" },
                { label: "쿠폰", value: "2장", color: "text-primary" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center p-sm bg-surface-secondary rounded-lg border border-line">
                  <span className="text-[12px] text-content-secondary">{item.label}</span>
                  <span className={cn("text-[13px] font-bold", item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="p-xl bg-surface-secondary/5 min-h-[500px]">
            {activeTab === "info" && <TabInfo />}
            {activeTab === "tickets" && <TabTickets />}
            {activeTab === "attendance" && <TabAttendance />}
            {activeTab === "payment" && <TabPayment />}
            {activeTab === "body" && <TabBody />}
            {activeTab === "memo" && <TabMemo />}

            {!["info", "tickets", "attendance", "payment", "body", "memo"].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-xxl text-content-secondary">
                <Activity className="mb-md opacity-20" size={48} />
                <p className="text-[16px] font-medium text-content">준비 중인 탭입니다</p>
                <p className="text-[13px] mt-xs text-content-secondary">
                  {tabs.find(t => t.key === activeTab)?.label} 데이터를 준비하고 있습니다.
                </p>
                {activeTab === "coupons" && (
                  <div className="flex gap-md mt-lg">
                    <button
                      className="flex items-center gap-sm px-xl py-md bg-primary text-white rounded-button font-bold hover:opacity-90 transition-all shadow-sm"
                      onClick={() => moveToPage(993)}
                    >
                      <Star size={18} />
                      쿠폰 관리
                    </button>
                    <button
                      className="flex items-center gap-sm px-xl py-md bg-surface-secondary text-content rounded-button font-bold border border-line hover:bg-surface-tertiary transition-all shadow-sm"
                      onClick={() => moveToPage(981)}
                    >
                      <CreditCard size={18} />
                      마일리지 관리
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="회원 삭제 확인"
        description={`${MEMBER.name} 회원의 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?`}
        confirmLabel="삭제하기"
        variant="danger"
        confirmationText="삭제"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </AppLayout>
  );
}
