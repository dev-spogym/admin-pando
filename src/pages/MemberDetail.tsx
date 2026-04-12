import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { startHolding, endHolding } from "@/lib/businessLogic";
import { useAuthStore } from "@/stores/authStore";
import { hasFeature, hasPermission } from "@/lib/permissions";
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
  // BROJ 추가 아이콘
  CalendarRange,
  ListOrdered,
  UserCheck,
  Navigation,
  Target,
  Megaphone,
  LogIn,
  ArrowRightLeft,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { supabase } from "@/lib/supabase";
import { readBranchJson, writeBranchJson } from "@/lib/branchStorage";
import { getMemberGrade } from "@/lib/memberGrade";

import SignaturePad from "@/components/SignaturePad";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";
// BROJ 서브 컴포넌트
import TabPaymentDetail from "@/components/member/TabPaymentDetail";
import TabReservation from "@/components/member/TabReservation";
import TabDetailHistory from "@/components/member/TabDetailHistory";
// Sprint 2: 신규 탭 컴포넌트
import TabBodyInfo from "@/components/member/TabBodyInfo";
import TabEvaluation from "@/components/member/TabEvaluation";
import TabConsultation from "@/components/member/TabConsultation";
import TabExerciseProgram from "@/components/member/TabExerciseProgram";
import TabExerciseLog from "@/components/member/TabExerciseLog";

// ────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────

type Member = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birthDate: string | null;
  profileImage: string | null;
  registeredAt: string | null;
  membershipType: string | null;
  membershipStart: string | null;
  membershipExpiry: string | null;
  status: string | null;
  mileage: number | null;
  memo: string | null;
  height: number | null;
  branchId: number | null;
  // BROJ CRM 추가 필드
  counselorName: string | null;
  specialNote: string | null;
  visitSource: string | null;
  exercisePurpose: string | null;
  adConsent: boolean | null;
  lastVisitAt: string | null;
};

type SaleRecord = {
  id: number;
  saleDate: string | null;
  itemName: string | null;
  amount: number;
  salePrice: number;
  originalPrice: number;
  discountPrice: number;
  cash: number;
  card: number;
  mileageUsed: number;
  unpaid: number;
  paymentMethod: string | null;
  status: string | null;
};

type AttendanceRecord = {
  id: number;
  checkInAt: string | null;
  checkOutAt: string | null;
  branchId: number | null;
};

type BodyRecord = {
  id: number;
  date: string;
  weight: number;
  muscle: number;
  fat: number;
  bmi: number;
  pbf: number;
};

type LockerRecord = {
  id: number;
  lockerNumber: string | null;
  status: string | null;
};

type ContractRecord = {
  id: number;
  createdAt: string | null;
  productName: string | null;
  status: string | null;
};

// ────────────────────────────────────────────────────────────
// 출석 히트맵 생성
// ────────────────────────────────────────────────────────────

function buildAttendanceMap(attendances: AttendanceRecord[]): Record<string, number> {
  const data: Record<string, number> = {};
  for (const rec of attendances) {
    if (!rec.checkInAt) continue;
    const key = rec.checkInAt.slice(0, 10);
    data[key] = (data[key] || 0) + 1;
  }
  return data;
}

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
function TabInfo({ member }: { member: Member }) {
  return (
    <div className="space-y-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <StatCard
          label="최근 방문일"
          value={member.registeredAt ? member.registeredAt.slice(0, 10) : "-"}
          icon={<Clock />}
        />
        <StatCard label="회원권 종류" value={member.membershipType || "-"} icon={<Users />} variant="peach" />
        <StatCard label="상태" value={{ ACTIVE: "정상 이용중", INACTIVE: "비활성", EXPIRED: "만료", HOLDING: "홀딩", SUSPENDED: "정지" }[member.status ?? ""] || member.status || "-"} icon={<User />} variant="mint" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <FormSection title="기본 정보" collapsible>
          <div className="space-y-xs">
            <InfoItem label="휴대전화" value={member.phone || "-"} icon={<Phone size={16} />} />
            <InfoItem
              label="생년월일"
              value={`${member.birthDate ? member.birthDate.slice(0, 10) : "-"} (${member.gender === "M" ? "남" : member.gender === "F" ? "여" : "-"})`}
              icon={<CalendarIcon size={16} />}
            />
            <InfoItem label="이메일" value={member.email || "-"} icon={<Mail size={16} />} />
            <InfoItem label="키" value={member.height ? `${member.height}cm` : "-"} icon={<Scale size={16} />} />
            <InfoItem label="회원번호" value={String(member.id)} />
            <InfoItem label="가입일" value={member.registeredAt ? member.registeredAt.slice(0, 10) : "-"} />
            <InfoItem
              label="회원권 기간"
              value={`${member.membershipStart ? member.membershipStart.slice(0, 10) : "-"} ~ ${member.membershipExpiry ? member.membershipExpiry.slice(0, 10) : "-"}`}
            />
          </div>
        </FormSection>
        <FormSection title="운영 정보" collapsible>
          <div className="space-y-xs">
            <InfoItem label="마일리지" value={`${member.mileage ?? 0}P`} />
            {/* BROJ CRM 추가 필드 */}
            <InfoItem
              label="상담 담당자"
              value={member.counselorName || "-"}
              icon={<UserCheck size={16} />}
            />
            <InfoItem
              label="방문경로"
              value={member.visitSource || "-"}
              icon={<Navigation size={16} />}
            />
            <InfoItem
              label="운동목적"
              value={member.exercisePurpose || "-"}
              icon={<Target size={16} />}
            />
            <InfoItem
              label="광고성 수신"
              value={member.adConsent === true ? "동의" : member.adConsent === false ? "거부" : "-"}
              icon={<Megaphone size={16} />}
              badge={member.adConsent === true ? "success" : member.adConsent === false ? "error" : undefined}
            />
            <InfoItem
              label="마지막 방문"
              value={member.lastVisitAt ? member.lastVisitAt.slice(0, 10) : "-"}
              icon={<LogIn size={16} />}
            />
          </div>
          {/* 특이사항 */}
          {member.specialNote && (
            <div className="mt-md flex flex-col gap-xs">
              <span className="text-[12px] text-content-secondary font-medium">특이사항</span>
              <div className="p-md bg-orange-50 rounded-lg text-[13px] text-content whitespace-pre-wrap border border-orange-200">
                {member.specialNote}
              </div>
            </div>
          )}
          <div className="md:col-span-2">
            <div className="flex flex-col gap-xs">
              <span className="text-[12px] text-content-secondary font-medium">메모</span>
              <div className="p-md bg-surface-secondary rounded-lg text-[13px] text-content min-h-[100px] whitespace-pre-wrap border border-line">
                {member.memo || "메모가 없습니다."}
              </div>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}

// UI-024 출석 탭
function TabAttendance({ attendances }: { attendances: AttendanceRecord[] }) {
  const attendanceMap = buildAttendanceMap(attendances);
  const totalDays = Object.values(attendanceMap).filter(v => v > 0).length;
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
    const count = attendanceMap[key];
    if (date > today) return "bg-transparent";
    if (!count) return "bg-surface-tertiary";
    if (count >= 2) return "bg-primary";
    return "bg-primary/40";
  };

  return (
    <div className="space-y-lg">
      <div className="flex gap-md flex-wrap">
        <StatCard label="최근 6개월 출석" value={`${totalDays}일`} icon={<History size={20} />} variant="mint" />
        <StatCard label="전체 출석 기록" value={`${attendances.length}회`} icon={<CalendarIcon size={20} />} variant="default" />
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
                    const count = attendanceMap[key];
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
          <h3 className="text-Section-Title text-content">최근 출석 내역 (최근 20회)</h3>
        </div>
        <div className="divide-y divide-line">
          {attendances.length === 0 && (
            <div className="flex items-center justify-center py-xl text-content-secondary text-[13px]">
              출석 기록이 없습니다.
            </div>
          )}
          {attendances.map((rec, i) => {
            const dateStr = rec.checkInAt ? rec.checkInAt.slice(0, 10) : "-";
            const checkIn = rec.checkInAt ? rec.checkInAt.slice(11, 16) : "-";
            const checkOut = rec.checkOutAt ? rec.checkOutAt.slice(11, 16) : "-";
            return (
              <div key={rec.id || i} className="flex items-center justify-between px-lg py-sm hover:bg-surface-secondary/40 transition-colors">
                <div className="flex items-center gap-md">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-state-success" />
                  <div>
                    <span className="text-[13px] font-semibold text-content">{dateStr}</span>
                  </div>
                </div>
                <div className="flex items-center gap-lg text-[12px] text-content-secondary">
                  <span>
                    {checkIn} ~ {checkOut}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// UI-025 결제 탭
function TabPayment({ sales, memberId, memberName }: { sales: SaleRecord[]; memberId: string | null; memberName: string }) {
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<SaleRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<SaleRecord | null>(null);
  const PAGE_SIZE = 3;
  const paged = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const paymentColumns = [
    {
      key: "saleDate",
      header: "결제일",
      render: (v: string) => <span className="font-mono text-[12px] text-content">{v ? v.slice(0, 10) : "-"}</span>,
    },
    { key: "itemName", header: "상품명", render: (v: string) => <span>{v || "-"}</span> },
    {
      key: "salePrice",
      header: "금액",
      align: "right" as const,
      render: (v: number) => <span className="font-bold text-content">{Number(v).toLocaleString()}원</span>,
    },
    {
      key: "paymentMethod",
      header: "결제방법",
      align: "center" as const,
      render: (v: string) => <span>{v || "-"}</span>,
    },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (v: string) => <StatusBadge variant="success" dot>{v || "완료"}</StatusBadge>,
    },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: (_: unknown, row: SaleRecord) => (
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
        pagination={{ page, pageSize: PAGE_SIZE, total: sales.length }}
        onPageChange={setPage}
        emptyMessage="결제 이력이 없습니다."
      />

      {/* 환불 확인 다이얼로그 */}
      <ConfirmDialog
        open={refundTarget !== null}
        title="환불 처리"
        description={`[${refundTarget?.itemName}] ${Number(refundTarget?.salePrice).toLocaleString()}원 결제 건을 환불 처리하시겠습니까?`}
        confirmLabel="환불 처리"
        variant="danger"
        onConfirm={async () => {
          if (!refundTarget) return;
          // 환불 레코드를 sales 테이블에 저장 (음수 금액)
          const { error } = await supabase.from('sale').insert({
            branchId: Number(localStorage.getItem('branchId') || '1'),
            memberId: Number(memberId),
            memberName: memberName,
            productName: refundTarget.itemName,
            type: '환불',
            amount: -Math.abs(Number(refundTarget.salePrice)),
            salePrice: -Math.abs(Number(refundTarget.salePrice)),
            originalPrice: Number(refundTarget.originalPrice),
            discountPrice: 0,
            paymentMethod: (refundTarget.paymentMethod as 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE') ?? 'CARD',
            status: 'REFUNDED',
            saleDate: new Date().toISOString(),
            memo: `환불: ${refundTarget.itemName}`,
          });
          if (error) {
            toast.error(`환불 처리 실패: ${error.message}`);
            return;
          }
          // 원본 결제 건 상태를 REFUNDED로 업데이트
          await supabase.from('sale').update({ status: 'REFUNDED' }).eq('id', refundTarget.id);
          toast.success("환불 처리가 완료되었습니다.");
          setRefundTarget(null);
        }}
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
                { label: "상품명", value: detailTarget.itemName || "-" },
                { label: "결제일", value: detailTarget.saleDate ? detailTarget.saleDate.slice(0, 10) : "-" },
                { label: "결제금액", value: `${Number(detailTarget.salePrice).toLocaleString()}원` },
                { label: "카드", value: `${Number(detailTarget.card).toLocaleString()}원` },
                { label: "현금", value: `${Number(detailTarget.cash).toLocaleString()}원` },
                { label: "미수금", value: `${Number(detailTarget.unpaid).toLocaleString()}원` },
                { label: "결제방법", value: detailTarget.paymentMethod || "-" },
                { label: "상태", value: detailTarget.status || "완료" },
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
function TabBody({ initialRecords, memberHeight }: { initialRecords: BodyRecord[]; memberHeight: number }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [records, setRecords] = useState<BodyRecord[]>(initialRecords);
  const [form, setForm] = useState({ weight: "", muscle: "", pbf: "", bmi: "", date: new Date().toISOString().split("T")[0] });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // initialRecords가 변경되면 동기화
  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

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
      bmi: memberHeight ? +(w / ((memberHeight / 100) ** 2)).toFixed(1) : 0,
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

      {latest && prev ? (
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
      ) : latest ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <StatCard label="현재 체중" value={`${latest.weight} kg`} icon={<Scale />} variant="default" />
          <StatCard label="골격근량" value={`${latest.muscle} kg`} icon={<Activity />} variant="mint" />
          <StatCard label="체지방률" value={`${latest.pbf} %`} icon={<Zap />} variant="peach" />
        </div>
      ) : null}

      {/* 라인 차트 */}
      {records.length >= 2 && (
        <div className="bg-surface rounded-xl border border-line p-lg">
          <h4 className="text-Section-Title text-content mb-md">변화 그래프 (최근 6회)</h4>
          <BodyLineChart records={records.slice(0, 6)} />
        </div>
      )}

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
function TabMemo({ memberId }: { memberId: string }) {
  const [memos, setMemos] = useState<{ id: number; date: string; author: string; content: string; category: string }[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("상담");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // DB에서 메모 로드
  useEffect(() => {
    const fetchMemos = async () => {
      const { data, error } = await supabase
        .from('member_memos')
        .select('*')
        .eq('memberId', memberId)
        .order('createdAt', { ascending: false });
      if (!error && data) {
        setMemos(data.map((m: any) => ({
          id: m.id,
          date: m.createdAt?.slice(0, 10) ?? '',
          author: m.author ?? '관리자',
          content: m.content,
          category: m.category ?? '일반',
        })));
      }
    };
    fetchMemos();
  }, [memberId]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    const { data, error } = await supabase
      .from('member_memos')
      .insert({
        memberId: Number(memberId),
        content: newContent.trim(),
        category: newCategory,
        author: '관리자',
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      toast.error(`메모 저장 실패: ${error.message}`);
      return;
    }
    setMemos(prev => [
      {
        id: data.id,
        date: data.createdAt?.slice(0, 10) ?? new Date().toISOString().split("T")[0],
        author: data.author ?? '관리자',
        content: data.content,
        category: data.category ?? newCategory,
      },
      ...prev,
    ]);
    setNewContent("");
    toast.success("메모가 저장되었습니다.");
  };

  const handleSave = async (id: number) => {
    if (!editingContent.trim()) return;
    const { error } = await supabase
      .from('member_memos')
      .update({ content: editingContent.trim(), updatedAt: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error(`수정 실패: ${error.message}`);
      return;
    }
    setMemos(prev => prev.map(m => (m.id === id ? { ...m, content: editingContent.trim() } : m)));
    setEditingId(null);
    setEditingContent("");
  };

  const handleDelete = async () => {
    if (deleteId !== null) {
      const { error } = await supabase
        .from('member_memos')
        .delete()
        .eq('id', deleteId);
      if (error) {
        toast.error(`삭제 실패: ${error.message}`);
        return;
      }
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
// UI-028 레슨 탭 (FN-039 / FN-040)
// ────────────────────────────────────────────────────────────

type LessonRecord = {
  id: string;
  date: string;
  className: string;
  trainer: string;
  memo: string;
  signature: string; // dataUrl or ""
};

function TabLesson({ memberId }: { memberId: string }) {
  const SETTINGS_KEY = `lesson_records_${memberId}`;
  const branchId = localStorage.getItem("branchId") || "1";

  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [showModal, setShowModal] = useState(false);

  // 저장 / 불러오기
  const loadRecords = async () => {
    const saved = readBranchJson<LessonRecord[]>(SETTINGS_KEY, [], branchId);
    if (Array.isArray(saved)) setRecords(saved);
  };

  const saveRecords = async (next: LessonRecord[]) => {
    writeBranchJson(SETTINGS_KEY, next, branchId);
  };

  useEffect(() => { loadRecords(); }, [memberId]);

  const handleAdd = async (rec: Omit<LessonRecord, "id">) => {
    const next = [{ ...rec, id: Date.now().toString() }, ...records];
    setRecords(next);
    await saveRecords(next);
    toast.success("레슨 기록이 저장되었습니다.");
  };

  // FN-040 통계
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalCount = records.length;
  const monthCount = records.filter(r => r.date.startsWith(thisMonth)).length;
  const classFreq: Record<string, number> = {};
  for (const r of records) classFreq[r.className] = (classFreq[r.className] || 0) + 1;
  const topClass = Object.entries(classFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  return (
    <div className="space-y-lg">
      {/* FN-040 통계 */}
      <div className="grid grid-cols-3 gap-md">
        <div className="bg-surface rounded-xl border border-line p-md text-center">
          <p className="text-[11px] text-content-secondary mb-xs">총 레슨 횟수</p>
          <p className="text-[22px] font-bold text-content">{totalCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-line p-md text-center">
          <p className="text-[11px] text-content-secondary mb-xs">이번 달</p>
          <p className="text-[22px] font-bold text-primary">{monthCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-line p-md text-center">
          <p className="text-[11px] text-content-secondary mb-xs">최다 수업</p>
          <p className="text-[15px] font-bold text-content truncate">{topClass}</p>
        </div>
      </div>

      {/* 레슨 기록 추가 버튼 */}
      <div className="flex justify-end">
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:opacity-90 transition-all shadow-sm"
          onClick={() => setShowModal(true)}
        >
          <Plus size={14} />
          레슨 기록 추가
        </button>
      </div>

      {/* 레슨 기록 목록 */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-xxl text-content-secondary">
          <Dumbbell size={40} className="mb-sm opacity-20" />
          <p className="text-[13px]">등록된 레슨 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-sm">
          {records.map(r => (
            <div key={r.id} className="bg-surface rounded-xl border border-line p-md">
              <div className="flex items-center justify-between mb-xs">
                <div className="flex items-center gap-sm flex-wrap">
                  <span className="text-[13px] font-bold text-content">{r.className}</span>
                  <span className="text-[12px] text-content-secondary">{r.date}</span>
                  <span className="text-[12px] text-content-secondary">트레이너: {r.trainer}</span>
                </div>
                {r.signature && (
                  <span className="text-[11px] text-state-success font-semibold flex items-center gap-xs">
                    <CheckCircle2 size={13} /> 서명 완료
                  </span>
                )}
              </div>
              {r.memo && <p className="text-[13px] text-content-secondary whitespace-pre-wrap">{r.memo}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 레슨 기록 추가 모달 */}
      {showModal && (
        <LessonModal
          onClose={() => setShowModal(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  );
}

// 레슨 기록 추가 모달
function LessonModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (rec: Omit<LessonRecord, "id">) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [className, setClassName] = useState("");
  const [trainer, setTrainer] = useState("");
  const [memo, setMemo] = useState("");
  const [signature, setSignature] = useState("");

  const isValid = className.trim().length > 0 && trainer.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-surface rounded-xl w-full max-w-[560px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-xl py-lg border-b border-line flex items-center justify-between shrink-0">
          <h3 className="text-[16px] font-bold text-content">레슨 기록 추가</h3>
          <button
            className="p-sm hover:bg-surface-secondary rounded-full transition-colors text-content-secondary"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-xl space-y-lg overflow-y-auto">
          {/* 날짜 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              날짜 <span className="text-state-error">*</span>
            </label>
            <input
              type="date"
              className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* 수업명 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              수업명 <span className="text-state-error">*</span>
            </label>
            <input
              type="text"
              className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none"
              placeholder="예: PT, 요가, 필라테스"
              value={className}
              onChange={e => setClassName(e.target.value)}
            />
          </div>

          {/* 트레이너 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              트레이너 <span className="text-state-error">*</span>
            </label>
            <input
              type="text"
              className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none"
              placeholder="트레이너 이름"
              value={trainer}
              onChange={e => setTrainer(e.target.value)}
            />
          </div>

          {/* 운동 내용 메모 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">운동 내용 메모</label>
            <textarea
              className="w-full h-20 rounded-lg bg-surface-secondary border border-line p-md text-[13px] focus:border-primary outline-none resize-none"
              placeholder="운동 내용, 특이사항 등을 입력하세요"
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>

          {/* 서명 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">고객 서명</label>
            <SignaturePad onSign={dataUrl => setSignature(dataUrl)} height={160} />
            {signature && (
              <p className="mt-xs text-[11px] text-state-success font-semibold flex items-center gap-xs">
                <CheckCircle2 size={12} /> 서명이 저장되었습니다.
              </p>
            )}
          </div>
        </div>

        <div className="px-xl py-lg bg-surface-secondary flex gap-md shrink-0">
          <button
            className="flex-1 h-11 rounded-lg border border-line text-content-secondary text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className={cn(
              "flex-1 h-11 rounded-lg text-[13px] font-bold shadow-sm transition-all",
              isValid ? "bg-primary text-white hover:opacity-90" : "bg-surface-tertiary text-content-tertiary cursor-not-allowed"
            )}
            disabled={!isValid}
            onClick={() => {
              if (!isValid) return;
              onSave({ date, className, trainer, memo, signature });
              onClose();
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────

export default function MemberDetail() {
  const authUser = useAuthStore((s) => s.user);
  const canDelete = hasFeature(authUser?.role ?? '', 'memberDelete', authUser?.isSuperAdmin);
  const canEdit = hasPermission(authUser?.role ?? '', '/members/edit', authUser?.isSuperAdmin);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";
  const memberId = searchParams.get("id");
  const setActiveTab = (tab: string) =>
    setSearchParams(memberId ? { id: memberId, tab } : { tab });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHoldingModalOpen, setIsHoldingModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const canTransfer = hasFeature(authUser?.role ?? '', 'memberTransfer', authUser?.isSuperAdmin);
  const canWithdraw = hasFeature(authUser?.role ?? '', 'memberWithdraw', authUser?.isSuperAdmin);

  // 즐겨찾기 DB 연동 (settings 테이블, key='favorites')
  useEffect(() => {
    if (!memberId) return;
    const loadFavorite = async () => {
      const branchId = Number(localStorage.getItem('branchId') || '1');
      const favIds = readBranchJson<number[]>('favorites', [], branchId);
      setIsFavorite(favIds.includes(Number(memberId)));
    };
    loadFavorite();
  }, [memberId]);

  const toggleFavorite = async () => {
    const branchId = Number(localStorage.getItem('branchId') || '1');
    let favIds = readBranchJson<number[]>('favorites', [], branchId);

    const mid = Number(memberId);
    if (isFavorite) {
      favIds = favIds.filter(id => id !== mid);
    } else {
      if (!favIds.includes(mid)) favIds.push(mid);
    }

    writeBranchJson('favorites', favIds, branchId);

    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? '즐겨찾기가 해제되었습니다.' : '즐겨찾기에 추가되었습니다.');
  };
  const [holdDays, setHoldDays] = useState(7);
  const [holdReason, setHoldReason] = useState('');

  // Supabase 데이터 상태
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([]);
  const [locker, setLocker] = useState<LockerRecord | null>(null);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [
          memberRes,
          salesRes,
          attendanceRes,
          bodyRes,
          lockerRes,
          contractRes,
        ] = await Promise.all([
          supabase.from('members').select('*').eq('id', memberId).single(),
          supabase.from('sale').select('*').eq('memberId', memberId).order('saleDate', { ascending: false }),
          supabase.from('attendance').select('*').eq('memberId', memberId).order('checkInAt', { ascending: false }).limit(20),
          supabase.from('bodyComposition').select('*').eq('memberId', memberId).order('date', { ascending: false }),
          supabase.from('locker').select('*').eq('memberId', memberId).limit(1),
          supabase.from('contract').select('*').eq('memberId', memberId).order('createdAt', { ascending: false }),
        ]);

        if (memberRes.data) setMember(memberRes.data as Member);

        if (salesRes.data) {
          setSales(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            salesRes.data.map((s: any) => ({
              ...s,
              amount: Number(s.amount),
              salePrice: Number(s.salePrice),
              originalPrice: Number(s.originalPrice),
              discountPrice: Number(s.discountPrice),
              cash: Number(s.cash),
              card: Number(s.card),
              mileageUsed: Number(s.mileageUsed),
              unpaid: Number(s.unpaid),
            }))
          );
        }

        if (attendanceRes.data) setAttendances(attendanceRes.data as AttendanceRecord[]);

        if (bodyRes.data) {
          setBodyRecords(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bodyRes.data.map((b: any) => ({
              id: b.id,
              date: b.date ? String(b.date).slice(0, 10) : "",
              weight: Number(b.weight),
              muscle: Number(b.muscle),
              fat: Number(b.fat),
              bmi: Number(b.bmi),
              pbf: Number(b.pbf),
            }))
          );
        }

        if (lockerRes.data && lockerRes.data.length > 0) {
          setLocker(lockerRes.data[0] as LockerRecord);
        }

        if (contractRes.data) setContracts(contractRes.data as ContractRecord[]);
      } catch (err) {
        console.error('회원 데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [memberId]);

  const tabs = [
    { key: "info", label: "회원정보", icon: User },
    { key: "tickets", label: "이용권", icon: CreditCard, count: contracts.length },
    { key: "attendance", label: "출석 이력", icon: History },
    { key: "payment", label: "결제 이력", icon: ShoppingBag },
    // BROJ 추가 탭
    { key: "payment_detail", label: "결제내역", icon: CreditCard },
    { key: "reservation", label: "예약내역", icon: CalendarRange },
    { key: "detail_history", label: "상세내역", icon: ListOrdered },
    { key: "body", label: "체성분", icon: Activity },
    { key: "memo", label: "상담·메모", icon: MessageSquare },
    { key: "lesson", label: "레슨", icon: Dumbbell },
    // Sprint 2: 신규 탭
    { key: "bodyInfo", label: "신체정보", icon: Activity },
    { key: "evaluation", label: "종합평가", icon: Star },
    { key: "consultation", label: "상담이력", icon: ClipboardList },
    { key: "exerciseProgram", label: "운동프로그램", icon: Dumbbell },
    { key: "exerciseLog", label: "운동이력", icon: BarChart3 },
  ];

  const confirmDelete = async () => {
    if (!memberId) return;
    const { error } = await supabase
      .from('members')
      .update({ deletedAt: new Date().toISOString(), status: 'INACTIVE' })
      .eq('id', memberId);
    if (error) {
      toast.error(`삭제 실패: ${error.message}`);
      return;
    }
    toast.success("회원이 삭제되었습니다.");
    setIsDeleteDialogOpen(false);
    moveToPage(967);
  };

  const confirmWithdraw = async () => {
    if (!memberId) return;
    const { error } = await supabase
      .from('members')
      .update({ status: 'WITHDRAWN', withdrawReason: withdrawReason.trim() || null, withdrawnAt: new Date().toISOString() })
      .eq('id', memberId);
    if (error) {
      toast.error(`탈퇴 처리 실패: ${error.message}`);
      return;
    }
    toast.success("회원이 탈퇴 처리되었습니다.");
    setIsWithdrawModalOpen(false);
    setWithdrawReason('');
    moveToPage(967);
  };

  // 회원권 만료일까지 남은 일수 계산
  const dDay = member?.membershipExpiry
    ? Math.ceil((new Date(member.membershipExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px] text-content-secondary text-[14px]">
          <RefreshCcw size={20} className="animate-spin mr-sm" />
          회원 정보를 불러오는 중입니다...
        </div>
      </AppLayout>
    );
  }

  if (!member) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-content-secondary">
          <User size={48} className="mb-md opacity-20" />
          <p className="text-[16px] font-medium text-content">회원을 찾을 수 없습니다.</p>
          <p className="text-[13px] mt-xs">URL에 올바른 회원 ID가 포함되어 있는지 확인하세요.</p>
        </div>
      </AppLayout>
    );
  }

  const statusVariantMap: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
    ACTIVE: "success",
    INACTIVE: "default",
    EXPIRED: "error",
    HOLDING: "info",
    SUSPENDED: "warning",
  };
  const statusLabelMap: Record<string, string> = {
    ACTIVE: "정상 이용중",
    INACTIVE: "비활성",
    EXPIRED: "만료",
    HOLDING: "홀딩",
    SUSPENDED: "정지",
  };
  const memberStatus = member.status || "INACTIVE";
  const statusVariant = statusVariantMap[memberStatus] || "default";
  const statusLabel = statusLabelMap[memberStatus] || memberStatus;

  return (
    <AppLayout>
      <div className="p-lg">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-xs text-[13px] text-content-secondary mb-md">
          <button className="hover:text-primary transition-colors" onClick={() => moveToPage(967)}>회원 목록</button>
          <span className="text-content-tertiary">/</span>
          <span className="text-content font-medium">{member.name} 회원 상세</span>
        </nav>

        {/* 고정 영역: 컴팩트 프로필 + 탭 네비게이션 */}
        <div className="sticky top-0 z-10 bg-surface-secondary -mx-lg px-lg -mt-lg pt-lg pb-0">

          {/* 만료 알림 배너 (sticky 위에 표시) */}
          {dDay !== null && dDay <= 7 && dDay >= 0 && (
            <div className="flex items-center gap-sm px-md py-sm bg-red-50 border border-state-error/20 rounded-lg mb-sm text-[12px] text-state-error">
              <AlertTriangle size={14} />
              회원권이 {dDay >= 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`} 만료 예정입니다.
            </div>
          )}
          {dDay !== null && dDay > 7 && dDay <= 30 && (
            <div className="flex items-center gap-sm px-md py-sm bg-orange-50 border border-orange-200 rounded-lg mb-sm text-[12px] text-orange-600">
              <AlertTriangle size={14} />
              회원권이 {dDay >= 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`} 만료 예정입니다.
            </div>
          )}

          {/* 컴팩트 프로필 카드 */}
          <div className="bg-surface rounded-t-xl border border-b-0 border-line px-lg py-md shadow-card">
            <div className="flex items-center gap-md">
              {/* 프로필 이미지 (컴팩트) */}
              <div className="relative shrink-0">
                <div className="w-[52px] h-[52px] rounded-full bg-surface-secondary flex items-center justify-center border-2 border-surface-tertiary overflow-hidden">
                  {member.profileImage ? (
                    <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-content-tertiary" size={28} />
                  )}
                </div>
                <button
                  className={cn(
                    "absolute -bottom-[2px] -right-[2px] p-[3px] rounded-full shadow-md transition-all border border-line",
                    isFavorite ? "bg-primary text-white border-primary" : "bg-surface text-content-secondary hover:text-primary"
                  )}
                  onClick={toggleFavorite}
                >
                  <Star size={10} fill={isFavorite ? "currentColor" : "none"} />
                </button>
              </div>

              {/* 이름 + 상태 + 연락처 */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-xs mb-[2px]">
                  <h1 className="text-[16px] font-bold text-content leading-tight">{member.name}</h1>
                  {(() => { const g = getMemberGrade(member.registeredAt); return (
                    <span className={`text-[11px] px-xs py-[1px] rounded-full font-semibold ${g.color}`}>{g.emoji} {g.label}</span>
                  ); })()}
                  <StatusBadge variant={statusVariant} dot>{statusLabel}</StatusBadge>
                  {dDay !== null && (
                    <span className={cn("text-[11px] px-xs py-[1px] rounded-full font-bold border", getDDayClass(dDay))}>
                      {dDay >= 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-content-secondary truncate">
                  {member.gender === "M" ? "남" : member.gender === "F" ? "여" : "-"} · {member.phone || "-"} · {member.email || "-"}
                </p>
              </div>

              {/* 퀵 지표 (인라인) */}
              <div className="hidden md:flex items-center gap-sm shrink-0">
                <div className="flex flex-col items-center px-sm py-xs bg-surface-secondary rounded-lg border border-line min-w-[56px]">
                  <span className="text-[10px] text-content-secondary">미수금</span>
                  <span className="text-[12px] font-bold text-state-error">{sales.reduce((acc, s) => acc + s.unpaid, 0).toLocaleString()}원</span>
                </div>
                <div className="flex flex-col items-center px-sm py-xs bg-surface-secondary rounded-lg border border-line min-w-[56px]">
                  <span className="text-[10px] text-content-secondary">마일리지</span>
                  <span className="text-[12px] font-bold text-accent">{member.mileage ?? 0}P</span>
                </div>
                <div className="flex flex-col items-center px-sm py-xs bg-surface-secondary rounded-lg border border-line min-w-[56px]">
                  <span className="text-[10px] text-content-secondary">계약</span>
                  <span className="text-[12px] font-bold text-primary">{contracts.length}건</span>
                </div>
                {locker && (
                  <div className="flex flex-col items-center px-sm py-xs bg-surface-secondary rounded-lg border border-line min-w-[56px]">
                    <span className="text-[10px] text-content-secondary">락커</span>
                    <span className="text-[12px] font-bold text-content">{locker.lockerNumber || "-"}</span>
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-xs shrink-0">
                <button
                  className="flex items-center gap-xs px-sm py-xs bg-state-success text-white rounded-button font-semibold text-[12px] hover:opacity-90 transition-all"
                  onClick={async () => {
                    const { error } = await supabase.from('attendance').insert({
                      branchId: Number(localStorage.getItem('branchId') || '1'),
                      memberId: member.id,
                      memberName: member.name,
                      checkInAt: new Date().toISOString(),
                      type: 'MANUAL',
                      checkInMethod: 'MANUAL',
                    });
                    if (error) {
                      toast.error(`출석 기록 실패: ${error.message}`);
                      return;
                    }
                    toast.success('출석이 기록되었습니다.');
                    const { data } = await supabase
                      .from('attendance')
                      .select('*')
                      .eq('memberId', member.id)
                      .order('checkInAt', { ascending: false })
                      .limit(20);
                    if (data) setAttendances(data as AttendanceRecord[]);
                  }}
                >
                  <CheckCircle2 size={13} />
                  수동출석
                </button>
                {canEdit && (
                  <button
                    className="flex items-center gap-xs px-sm py-xs bg-surface-secondary text-content rounded-button font-semibold text-[12px] border border-line hover:bg-surface-tertiary transition-all"
                    onClick={() => moveToPage(987, { id: memberId ?? '' })}
                  >
                    <Edit size={13} />
                    수정
                  </button>
                )}
                <button
                  className="flex items-center gap-xs px-sm py-xs bg-accent-light text-accent rounded-button font-semibold text-[12px] hover:bg-accent hover:text-white transition-all"
                  onClick={() => moveToPage(971, { memberId: memberId ?? '' })}
                >
                  <ShoppingBag size={13} />
                  상품구매
                </button>
                <button
                  className="flex items-center gap-xs px-sm py-xs bg-surface-secondary text-content rounded-button font-semibold text-[12px] border border-line hover:bg-surface-tertiary transition-all"
                  onClick={() => moveToPage(980)}
                >
                  <MessageSquare size={13} />
                  메시지
                </button>
                {canTransfer && (
                  <button
                    className="flex items-center gap-xs px-sm py-xs bg-surface-secondary text-content rounded-button font-semibold text-[12px] border border-line hover:bg-surface-tertiary transition-all"
                    onClick={() => moveToPage(968, { id: memberId ?? '' })}
                  >
                    <ArrowRightLeft size={13} />
                    지점이관
                  </button>
                )}
                {canWithdraw && (
                  <button
                    className="flex items-center gap-xs px-sm py-xs border border-state-warning/40 text-state-warning rounded-button font-semibold text-[12px] hover:bg-state-warning hover:text-white transition-all"
                    onClick={() => setIsWithdrawModalOpen(true)}
                  >
                    <UserMinus size={13} />
                    탈퇴
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-surface border-x border-line shadow-card">
            <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>{/* /고정 영역 */}

        {/* 탭 콘텐츠 */}
        <div className="bg-surface rounded-b-xl border-x border-b border-line shadow-card">
          <div className="p-xl bg-surface-secondary/5 min-h-[500px]">
            {activeTab === "info" && <TabInfo member={member} />}
            {activeTab === "tickets" && (
              <div className="space-y-lg">
                <div className="grid gap-md">
                  {contracts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-xl text-content-secondary text-[13px]">
                      등록된 이용권이 없습니다.
                    </div>
                  )}
                  {contracts.map(c => (
                    <div key={c.id} className="bg-surface rounded-xl border border-line p-lg shadow-card">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
                        <div className="flex-1 space-y-xs">
                          <div className="flex items-center gap-sm flex-wrap">
                            <span className="text-[15px] font-bold text-content">{c.productName || "-"}</span>
                            <StatusBadge variant={c.status === "ACTIVE" ? "success" : "default"} dot>
                              {c.status === "ACTIVE" ? "이용중" : c.status || "-"}
                            </StatusBadge>
                          </div>
                          <div className="flex items-center gap-md text-[12px] text-content-secondary flex-wrap">
                            <span className="flex items-center gap-xs">
                              <CalendarIcon size={12} />
                              계약일: {c.createdAt ? c.createdAt.slice(0, 10) : "-"}
                            </span>
                          </div>
                        </div>
                        <button className="p-xs hover:bg-surface-secondary rounded-full transition-colors text-content-secondary">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
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
            )}
            {activeTab === "attendance" && <TabAttendance attendances={attendances} />}
            {activeTab === "payment" && <TabPayment sales={sales} memberId={memberId} memberName={member.name} />}
            {/* BROJ 추가 탭 렌더 */}
            {activeTab === "payment_detail" && (
              <TabPaymentDetail
                sales={sales}
                memberId={memberId}
                memberName={member.name}
                onRefresh={async () => {
                  const { data } = await supabase
                    .from("sale")
                    .select("*")
                    .eq("memberId", memberId)
                    .order("saleDate", { ascending: false });
                  if (data) {
                    setSales(
                      data.map((s: any) => ({
                        ...s,
                        amount: Number(s.amount),
                        salePrice: Number(s.salePrice),
                        originalPrice: Number(s.originalPrice),
                        discountPrice: Number(s.discountPrice),
                        cash: Number(s.cash),
                        card: Number(s.card),
                        mileageUsed: Number(s.mileageUsed),
                        unpaid: Number(s.unpaid),
                      }))
                    );
                  }
                }}
              />
            )}
            {activeTab === "reservation" && <TabReservation memberId={memberId ?? ''} />}
            {activeTab === "detail_history" && (
              <TabDetailHistory memberId={memberId ?? ''} memberName={member.name} />
            )}
            {activeTab === "body" && <TabBody initialRecords={bodyRecords} memberHeight={member?.height ?? 0} />}
            {activeTab === "memo" && <TabMemo memberId={memberId ?? ''} />}
            {activeTab === "lesson" && <TabLesson memberId={memberId ?? ''} />}
            {/* Sprint 2: 신규 탭 렌더 */}
            {activeTab === "bodyInfo" && <TabBodyInfo memberId={member.id} />}
            {activeTab === "evaluation" && <TabEvaluation memberId={member.id} />}
            {activeTab === "consultation" && <TabConsultation memberId={member.id} />}
            {activeTab === "exerciseProgram" && <TabExerciseProgram memberId={member.id} />}
            {activeTab === "exerciseLog" && <TabExerciseLog memberId={member.id} />}

          </div>
        </div>
      </div>

      {/* 회원 상태 관리 */}
      <div className="mx-lg mt-lg mb-lg p-lg bg-surface border border-line rounded-xl space-y-md">
        <h3 className="text-[14px] font-bold text-content">회원 상태 관리</h3>
        <div className="flex flex-wrap gap-sm">
          {member.status === 'ACTIVE' && (
            <button
              className="flex items-center gap-xs px-md py-sm border border-state-info/40 text-state-info rounded-button font-semibold text-[13px] hover:bg-state-info hover:text-white transition-all"
              onClick={() => setIsHoldingModalOpen(true)}
            >
              <Clock size={15} />
              홀딩 처리
            </button>
          )}
          {member.status === 'HOLDING' && (
            <button
              className="flex items-center gap-xs px-md py-sm border border-state-success/40 text-state-success rounded-button font-semibold text-[13px] hover:bg-state-success hover:text-white transition-all"
              onClick={async () => {
                const result = await endHolding(Number(memberId), holdDays || 7);
                if (result.success) {
                  toast.success(result.message);
                  window.location.reload();
                } else {
                  toast.error(result.message);
                }
              }}
            >
              <CheckCircle2 size={15} />
              홀딩 해제
            </button>
          )}
        </div>
      </div>

      {/* 위험 구역 - 회원 삭제 (primary/owner만) */}
      {canDelete && (
        <div className="mx-lg mt-lg mb-lg p-lg bg-red-50 border border-state-error/20 rounded-xl">
          <h3 className="text-[14px] font-bold text-state-error mb-xs">위험 구역</h3>
          <p className="text-[12px] text-content-secondary mb-md">이 작업은 되돌릴 수 없습니다. 회원의 상태가 비활성으로 변경되며 목록에서 제외됩니다.</p>
          <button
            className="flex items-center gap-xs px-md py-sm border border-state-error/40 text-state-error rounded-button font-semibold text-[13px] hover:bg-state-error hover:text-white transition-all"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 size={15} />
            회원 삭제
          </button>
        </div>
      )}

      {/* 홀딩 모달 */}
      {isHoldingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
          <div className="w-full max-w-sm bg-surface rounded-xl shadow-lg overflow-hidden">
            <div className="px-xl py-lg border-b border-line">
              <h3 className="text-[16px] font-bold text-content">홀딩 처리</h3>
              <p className="text-[12px] text-content-secondary mt-xs">홀딩 기간만큼 이용권 종료일이 자동 연장됩니다.</p>
            </div>
            <div className="p-xl space-y-md">
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content-secondary">홀딩 기간 (일)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={holdDays}
                  onChange={e => setHoldDays(Math.max(1, Math.min(90, Number(e.target.value))))}
                  className="w-full px-md py-sm border border-line rounded-button text-[14px] focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content-secondary">사유 (선택)</label>
                <input
                  type="text"
                  value={holdReason}
                  onChange={e => setHoldReason(e.target.value)}
                  placeholder="예: 부상, 출장, 개인사유"
                  className="w-full px-md py-sm border border-line rounded-button text-[14px] focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="px-xl py-lg border-t border-line flex gap-md">
              <button
                onClick={() => setIsHoldingModalOpen(false)}
                className="flex-1 py-sm rounded-button border border-line text-[14px] font-semibold text-content-secondary hover:bg-surface-secondary"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const result = await startHolding(Number(memberId), holdDays, holdReason);
                  if (result.success) {
                    toast.success(result.message);
                    setIsHoldingModalOpen(false);
                    window.location.reload();
                  } else {
                    toast.error(result.message);
                  }
                }}
                className="flex-[2] py-sm rounded-button bg-state-info text-white text-[14px] font-bold hover:opacity-90"
              >
                홀딩 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 탈퇴 모달 */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
          <div className="w-full max-w-sm bg-surface rounded-xl shadow-lg overflow-hidden">
            <div className="px-xl py-lg border-b border-line">
              <h3 className="text-[16px] font-bold text-content">회원 탈퇴 처리</h3>
              <p className="text-[12px] text-content-secondary mt-xs">탈퇴 처리 시 회원 상태가 WITHDRAWN으로 변경됩니다.</p>
            </div>
            <div className="p-xl space-y-md">
              <div className="space-y-xs">
                <label className="text-[13px] font-semibold text-content-secondary">탈퇴 사유 (선택)</label>
                <textarea
                  rows={3}
                  value={withdrawReason}
                  onChange={e => setWithdrawReason(e.target.value)}
                  placeholder="탈퇴 사유를 입력하세요."
                  className="w-full rounded-input border border-line bg-surface-secondary px-md py-sm text-[13px] text-content outline-none focus:ring-2 focus:ring-state-warning/30 resize-none"
                />
              </div>
            </div>
            <div className="px-xl py-lg border-t border-line flex gap-md">
              <button
                onClick={() => { setIsWithdrawModalOpen(false); setWithdrawReason(''); }}
                className="flex-1 py-sm rounded-button border border-line text-[14px] font-semibold text-content-secondary hover:bg-surface-secondary"
              >
                취소
              </button>
              <button
                onClick={confirmWithdraw}
                className="flex-[2] py-sm rounded-button bg-state-warning text-white text-[14px] font-bold hover:opacity-90"
              >
                탈퇴 처리
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="회원 삭제 확인"
        description={`${member.name} 회원의 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?`}
        confirmLabel="삭제하기"
        variant="danger"
        confirmationText="삭제"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </AppLayout>
  );
}
