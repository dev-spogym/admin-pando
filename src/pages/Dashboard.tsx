import React, { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import {
  Users,
  UserCheck,
  Clock,
  UserMinus,
  Calendar,
  DollarSign,
  ChevronRight,
  X,
  RefreshCw,
  TrendingUp,
  Gift,
  AlertCircle,
  PauseCircle,
  Hourglass,
  ArrowRight,
} from "lucide-react";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";

type PeriodFilter = "today" | "week" | "month" | "quarter";

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "week", label: "이번주" },
  { key: "month", label: "이번달" },
  { key: "quarter", label: "분기" },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function Dashboard() {
  const [showBanner, setShowBanner] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
    }, 600);
  }, []);

  // Mock 데이터
  const memberStats = [
    { label: "전체 회원", value: "1,284", icon: <Users />, change: { value: 2.5, label: "전월 대비" }, variant: "default" as const, pageId: 967 },
    { label: "활성 회원", value: "945", icon: <UserCheck />, change: { value: 1.2, label: "전체 73.6%" }, variant: "default" as const, pageId: 967 },
    { label: "만료 임박", value: "42", icon: <Clock />, change: { value: -0.5, label: "30일 이내" }, variant: "peach" as const, pageId: 967 },
    { label: "만료 회원", value: "156", icon: <UserMinus />, change: { value: 0.8, label: "전체 12.1%" }, variant: "default" as const, pageId: 967 },
    { label: "오늘 출석", value: "184", icon: <Calendar />, change: { value: 4.2, label: "어제 대비" }, variant: "default" as const, pageId: 968 },
    { label: "이번달 매출", value: "1.2억", icon: <DollarSign />, change: { value: -2.1, label: "목표 82%" }, variant: "default" as const, pageId: 970 },
  ];

  const birthdayMembers = [
    { id: 1, name: "김태희", birth: "1995-05-20", status: "활성" },
    { id: 2, name: "이동건", birth: "1988-05-21", status: "활성" },
    { id: 3, name: "최수지", birth: "1992-05-20", status: "만료" },
  ];

  const unpaidMembers = [
    { id: 1, name: "정우성", amount: "155,000", item: "PT 20회", overdueDays: 35 },
    { id: 2, name: "한지민", amount: "42,000", item: "필라테스 10회", overdueDays: 12 },
  ];

  const holdingMembers = [
    { id: 1, name: "박서준", period: "05.10 ~ 06.10", remaining: 21 },
    { id: 2, name: "강소라", period: "05.15 ~ 05.30", remaining: 11 },
  ];

  const expiringMembers = [
    { id: 1, name: "유재석", expiry: "2024.05.25", dday: "D-5", ddayNum: 5 },
    { id: 2, name: "지석진", expiry: "2024.05.22", dday: "D-2", ddayNum: 2 },
  ];

  function getDdayVariant(ddayNum: number): "error" | "warning" | "default" {
    if (ddayNum <= 3) return "error";
    if (ddayNum <= 7) return "warning";
    return "default";
  }

  return (
    <AppLayout>
      {/* 공지 배너 */}
      {showBanner && (
        <div className="mb-lg flex items-center justify-between rounded-xl bg-primary-light border border-primary/10 px-lg py-md">
          <div className="flex items-center gap-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-content">신규 '전자계약' 기능이 업데이트 되었습니다!</p>
              <p className="text-[12px] text-content-secondary">종이 계약서 대신 모바일로 간편하게 서명을 받으세요.</p>
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <button
              className="rounded-lg bg-primary px-md py-[6px] text-[12px] font-semibold text-white hover:bg-primary-dark transition-colors"
              onClick={() => moveToPage(977)}
            >
              기능 보기
            </button>
            <button className="text-content-tertiary hover:text-content transition-colors" onClick={() => setShowBanner(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 페이지 헤더 */}
      <PageHeader
        title="대시보드"
        description="스포짐 종각점의 실시간 센터 운영 현황입니다."
        actions={
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-[6px] rounded-lg border border-line bg-surface px-md py-[6px]">
              <span className="text-[12px] text-content-tertiary">갱신: {formatTime(lastRefreshed)}</span>
              <button
                className={cn("text-content-tertiary hover:text-primary transition-colors", isRefreshing && "animate-spin text-primary")}
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <button
              className="rounded-lg bg-primary px-md py-[6px] text-[12px] font-semibold text-white hover:bg-primary-dark transition-colors"
              onClick={() => moveToPage(986)}
            >
              회원 신규 등록
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-md mb-xl">
        {memberStats.map((stat, idx) => (
          <StatCard key={idx} {...stat} onClick={() => moveToPage(stat.pageId)} />
        ))}
      </div>

      {/* 운영 현황 차트 */}
      <div className="mb-xl">
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-content">운영 현황</h2>
          <div className="flex items-center gap-[2px] rounded-lg bg-surface-tertiary p-[3px]">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={cn(
                  "rounded-md px-3 py-[5px] text-[12px] font-medium transition-all",
                  periodFilter === opt.key ? "bg-surface text-content shadow-xs" : "text-content-secondary hover:text-content"
                )}
                onClick={() => setPeriodFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {/* 회원 분포 */}
          <div className="rounded-xl border border-line bg-surface p-lg">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-content">회원 분포</h3>
              <StatusBadge variant="info">활성회원 기준</StatusBadge>
            </div>
            <div className="flex items-center gap-xl">
              <div className="relative h-20 w-20 shrink-0">
                <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                  <circle className="stroke-surface-tertiary" cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" />
                  <circle className="stroke-primary" cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" strokeDasharray="55 100" strokeLinecap="round" />
                  <circle className="stroke-accent" cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" strokeDasharray="45 100" strokeDashoffset="-55" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-content">100%</span>
                </div>
              </div>
              <div className="flex-1 space-y-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[6px]">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[12px] text-content-secondary">여성</span>
                  </div>
                  <span className="text-[12px] font-semibold text-content">55%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[6px]">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-[12px] text-content-secondary">남성</span>
                  </div>
                  <span className="text-[12px] font-semibold text-content">45%</span>
                </div>
              </div>
            </div>
            <div className="mt-lg space-y-sm">
              {[
                { label: "20대", value: 45, color: "bg-primary" },
                { label: "30대", value: 32, color: "bg-accent" },
                { label: "40대", value: 15, color: "bg-content-tertiary" },
                { label: "기타", value: 8, color: "bg-line" },
              ].map((age) => (
                <div key={age.label} className="space-y-[3px]">
                  <div className="flex items-center justify-between text-[11px] text-content-secondary">
                    <span>{age.label}</span>
                    <span className="font-semibold">{age.value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                    <div className={cn("h-full rounded-full", age.color)} style={{ width: `${age.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주간 출석 */}
          <div className="rounded-xl border border-line bg-surface p-lg">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-content">주간 출석</h3>
              <div className="flex items-center gap-md">
                <div className="flex items-center gap-[4px]">
                  <div className="h-1 w-3 bg-accent rounded-full" />
                  <span className="text-[10px] text-content-tertiary">전체</span>
                </div>
                <div className="flex items-center gap-[4px]">
                  <div className="h-1 w-3 bg-primary rounded-full" />
                  <span className="text-[10px] text-content-tertiary">신규</span>
                </div>
              </div>
            </div>
            <div className="relative h-[180px] w-full pt-sm">
              <svg className="h-full w-full" viewBox="0 0 100 40">
                <line x1="0" y1="38" x2="100" y2="38" stroke="#E2E8F0" strokeWidth="0.5" />
                <line x1="0" y1="20" x2="100" y2="20" stroke="#E2E8F0" strokeWidth="0.3" strokeDasharray="2 2" />
                <path d="M0,35 Q10,25 20,30 T40,15 T60,20 T80,5 T100,10" fill="none" stroke="#48D1CC" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M0,38 Q10,36 20,37 T40,32 T60,35 T80,28 T100,30" fill="none" stroke="#FF7F6E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" />
              </svg>
              <div className="mt-sm flex justify-between px-xs text-[10px] text-content-tertiary font-medium">
                <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span>
              </div>
            </div>
            <div className="mt-md flex items-center justify-between rounded-lg bg-surface-secondary p-md">
              <div>
                <p className="text-[11px] text-content-secondary">오늘 총 방문</p>
                <p className="text-[18px] font-bold text-content">184명</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-content-tertiary">어제 대비</p>
                <p className="text-[13px] font-semibold text-state-success">+12%</p>
              </div>
            </div>
          </div>

          {/* 매출 추이 */}
          <div className="rounded-xl border border-line bg-surface p-lg">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-content">매출 추이</h3>
              <select className="rounded-md border-none bg-surface-secondary px-sm py-[4px] text-[11px] text-content-secondary outline-none cursor-pointer">
                <option>최근 6개월</option>
                <option>2024년 전체</option>
              </select>
            </div>
            <div className="flex h-[180px] items-end justify-between gap-[6px] pt-sm">
              {[
                { month: "1월", value: 45 },
                { month: "2월", value: 65 },
                { month: "3월", value: 55 },
                { month: "4월", value: 85 },
                { month: "5월", value: 120 },
                { month: "6월", value: 95 },
              ].map((d, idx) => (
                <div className="group relative flex flex-1 flex-col items-center gap-[4px]" key={d.month}>
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all group-hover:opacity-80",
                      idx === 4 ? "bg-primary" : "bg-accent/60"
                    )}
                    style={{ height: `${(d.value / 120) * 100}%` }}
                  />
                  <span className="text-[10px] text-content-tertiary">{d.month}</span>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-content px-[6px] py-[2px] text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {d.value}M
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-md grid grid-cols-2 gap-sm">
              <div className="rounded-lg bg-surface-secondary p-sm">
                <p className="text-[11px] text-content-tertiary">이달 목표</p>
                <div className="flex items-center justify-between mt-[2px]">
                  <span className="text-[14px] font-bold text-content">1.2억</span>
                  <span className="text-[11px] font-semibold text-primary">82%</span>
                </div>
              </div>
              <div className="rounded-lg bg-surface-secondary p-sm">
                <p className="text-[11px] text-content-tertiary">당일 결제</p>
                <div className="flex items-center justify-between mt-[2px]">
                  <span className="text-[14px] font-bold text-content">4.2백</span>
                  <span className="text-[11px] font-semibold text-accent">15건</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 리스트 카드 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-md">
        <div className="space-y-md">
          {/* 생일자 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <Gift size={16} className="text-primary" />
                <h3 className="text-[13px] font-semibold text-content">오늘 생일자 회원</h3>
              </div>
              <span className="text-[12px] font-semibold text-primary">{birthdayMembers.length}명</span>
            </div>
            <div className="p-sm">
              <DataTable
                columns={[
                  { key: "name", header: "이름", align: "left" },
                  { key: "birth", header: "생년월일", align: "center" },
                  {
                    key: "status", header: "상태", align: "center",
                    render: (val) => <StatusBadge variant={val === "활성" ? "success" : "default"}>{val}</StatusBadge>,
                  },
                  {
                    key: "action", header: "", align: "right",
                    render: () => (
                      <button className="p-xs text-content-tertiary hover:text-primary transition-colors" onClick={() => moveToPage(985)}>
                        <ChevronRight size={14} />
                      </button>
                    ),
                  },
                ]}
                data={birthdayMembers}
              />
            </div>
          </div>

          {/* 미수금 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <AlertCircle size={16} className="text-state-error" />
                <h3 className="text-[13px] font-semibold text-content">미수금 회원</h3>
              </div>
              <span className="text-[12px] font-semibold text-state-error">{unpaidMembers.length}건</span>
            </div>
            <div className="p-sm">
              <DataTable
                columns={[
                  { key: "name", header: "이름", align: "left" },
                  { key: "item", header: "상품명", align: "left" },
                  {
                    key: "overdueDays", header: "연체", align: "center",
                    render: (val: number) => val > 30 ? <StatusBadge variant="error">장기미납</StatusBadge> : <span className="text-[12px] text-content-secondary">{val}일</span>,
                  },
                  {
                    key: "amount", header: "미납 금액", align: "right",
                    render: (val) => <span className="font-semibold text-content">{val}원</span>,
                  },
                  {
                    key: "action", header: "", align: "right",
                    render: () => (
                      <button className="rounded-md bg-primary-light px-[8px] py-[3px] text-[11px] font-medium text-primary hover:bg-primary hover:text-white transition-all" onClick={() => moveToPage(971)}>
                        결제
                      </button>
                    ),
                  },
                ]}
                data={unpaidMembers}
              />
            </div>
          </div>
        </div>

        <div className="space-y-md">
          {/* 홀딩 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <PauseCircle size={16} className="text-content-secondary" />
                <h3 className="text-[13px] font-semibold text-content">연기(홀딩) 중인 회원</h3>
              </div>
              <span className="text-[12px] font-semibold text-content-secondary">{holdingMembers.length}명</span>
            </div>
            <div className="p-sm">
              <DataTable
                columns={[
                  { key: "name", header: "이름", align: "left" },
                  { key: "period", header: "홀딩 기간", align: "center" },
                  {
                    key: "remaining", header: "잔여일", align: "center",
                    render: (val) => <StatusBadge variant="info" dot>{val}일</StatusBadge>,
                  },
                  {
                    key: "action", header: "", align: "right",
                    render: () => (
                      <button className="p-xs text-content-tertiary hover:text-primary transition-colors" onClick={() => moveToPage(985)}>
                        <ChevronRight size={14} />
                      </button>
                    ),
                  },
                ]}
                data={holdingMembers}
              />
            </div>
          </div>

          {/* 만료 임박 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <Hourglass size={16} className="text-amber-500" />
                <h3 className="text-[13px] font-semibold text-content">수강권 만료 임박</h3>
              </div>
              <span className="text-[12px] font-semibold text-content">{expiringMembers.length}명</span>
            </div>
            <div className="p-sm">
              <DataTable
                columns={[
                  { key: "name", header: "이름", align: "left" },
                  { key: "expiry", header: "만료 예정일", align: "center" },
                  {
                    key: "dday", header: "D-Day", align: "center",
                    render: (val: string, row: { ddayNum: number }) => <StatusBadge variant={getDdayVariant(row.ddayNum)}>{val}</StatusBadge>,
                  },
                  {
                    key: "action", header: "", align: "right",
                    render: () => (
                      <button className="rounded-md bg-primary-light px-[8px] py-[3px] text-[11px] font-medium text-primary hover:bg-primary hover:text-white transition-all" onClick={() => moveToPage(985)}>
                        재등록 상담
                      </button>
                    ),
                  },
                ]}
                data={expiringMembers}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 프로모션 배너 */}
      <div className="mt-xl grid grid-cols-1 lg:grid-cols-2 gap-md">
        <div
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-dark p-xl text-white cursor-pointer transition-transform hover:scale-[1.005]"
          onClick={() => moveToPage(983)}
        >
          <div className="relative z-10">
            <span className="rounded-full bg-white/20 px-sm py-[3px] text-[10px] font-semibold backdrop-blur-sm">Premium</span>
            <h4 className="mt-md text-[17px] font-bold leading-snug">구독형 키오스크 패키지<br />출시 기념 30% 할인!</h4>
            <p className="mt-sm text-[12px] text-white/70">무인 센터 운영을 시작해보세요.</p>
            <div className="mt-md flex items-center gap-xs text-[13px] font-semibold">
              <span>혜택 보기</span>
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={14} />
            </div>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-content to-content-secondary p-xl text-white cursor-pointer transition-transform hover:scale-[1.005]"
          onClick={() => moveToPage(980)}
        >
          <div className="relative z-10">
            <span className="rounded-full bg-white/20 px-sm py-[3px] text-[10px] font-semibold backdrop-blur-sm">Automation</span>
            <h4 className="mt-md text-[17px] font-bold leading-snug">알림톡 자동 발송으로<br />재등록률을 높이세요</h4>
            <p className="mt-sm text-[12px] text-white/70">만료 전 안내, 생일 축하 메시지를 자동 발송합니다.</p>
            <div className="mt-md flex items-center gap-xs text-[13px] font-semibold">
              <span>설정 바로가기</span>
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={14} />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        </div>
      </div>
    </AppLayout>
  );
}
