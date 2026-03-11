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
  UserPlus,
  Gift,
  AlertCircle,
  PauseCircle,
  Hourglass,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";

// ─── 기간 필터 타입 ───────────────────────────────────────────
type PeriodFilter = "today" | "week" | "month" | "quarter" | "custom";

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: "today",   label: "오늘"    },
  { key: "week",    label: "이번주"  },
  { key: "month",   label: "이번달"  },
  { key: "quarter", label: "이번분기" },
  { key: "custom",  label: "커스텀"  },
];

// ─── 포맷 헬퍼 ────────────────────────────────────────────────
function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function Dashboard() {
  const [showBanner, setShowBanner]           = useState(true);
  const [periodFilter, setPeriodFilter]       = useState<PeriodFilter>("month");
  const [lastRefreshed, setLastRefreshed]     = useState<Date>(() => new Date());
  const [isRefreshing, setIsRefreshing]       = useState(false);

  // 섹션별 에러 상태 (Mock: 실제 에러는 없지만 구조 준비)
  const [chartError, setChartError]           = useState(false);
  const [listError, setListError]             = useState(false);

  // ─── 수동 새로고침 ──────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Mock: 실제 API 호출 자리
    setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
    }, 600);
  }, []);

  // ─── Mock 데이터: 회원 현황 카드 ────────────────────────────
  const memberStats = [
    { id: "UI-010", label: "전체 회원",   value: "1,284", icon: <Users />,      change: { value: 2.5,  label: "전월 대비"   }, variant: "default", pageId: 967 },
    { id: "UI-011", label: "활성 회원",   value: "945",   icon: <UserCheck />,  change: { value: 1.2,  label: "전체 73.6%" }, variant: "default", pageId: 967 },
    { id: "UI-012", label: "만료 임박",   value: "42",    icon: <Clock />,      change: { value: -0.5, label: "30일 이내"   }, variant: "peach",   pageId: 967 },
    { id: "UI-013", label: "만료 회원",   value: "156",   icon: <UserMinus />,  change: { value: 0.8,  label: "전체 12.1%" }, variant: "default", pageId: 967 },
    { id: "UI-014", label: "오늘 출석",   value: "184",   icon: <Calendar />,   change: { value: 4.2,  label: "어제 대비"   }, variant: "default", pageId: 968 },
    { id: "UI-015", label: "이번달 매출", value: "1.2억", icon: <UserPlus />,   change: { value: -2.1, label: "목표 82%"    }, variant: "default", pageId: 970 },
  ];

  // ─── Mock 데이터: 생일자 ────────────────────────────────────
  const birthdayMembers = [
    { id: 1, name: "김태희", birth: "1995-05-20", status: "활성" },
    { id: 2, name: "이동건", birth: "1988-05-21", status: "활성" },
    { id: 3, name: "최수지", birth: "1992-05-20", status: "만료" },
  ];

  // ─── Mock 데이터: 미수금 (overdueDays 추가) ─────────────────
  const unpaidMembers = [
    { id: 1, name: "정우성", amount: "155,000", item: "PT 20회",      overdueDays: 35 },
    { id: 2, name: "한지민", amount: "42,000",  item: "필라테스 10회", overdueDays: 12 },
  ];

  // ─── Mock 데이터: 홀딩 ──────────────────────────────────────
  const holdingMembers = [
    { id: 1, name: "박서준", period: "05.10 ~ 06.10", remaining: 21 },
    { id: 2, name: "강소라", period: "05.15 ~ 05.30", remaining: 11 },
  ];

  // ─── Mock 데이터: 만료 임박 (ddayNum 추가) ──────────────────
  const expiringMembers = [
    { id: 1, name: "유재석", expiry: "2024.05.25", dday: "D-5", ddayNum: 5 },
    { id: 2, name: "지석진", expiry: "2024.05.22", dday: "D-2", ddayNum: 2 },
  ];

  // ─── D-Day 배지 variant 결정 ─────────────────────────────────
  function getDdayVariant(ddayNum: number): "error" | "warning" | "default" {
    if (ddayNum <= 3) return "error";
    if (ddayNum <= 7) return "warning";
    return "default";
  }

  // ─── 에러 섹션 공통 UI ───────────────────────────────────────
  function ErrorBlock({ onRetry }: { onRetry: () => void }) {
    return (
      <div className="flex flex-col items-center justify-center gap-md py-xl text-5">
        <AlertCircle size={24} className="text-5" />
        <p className="text-Body-2">데이터를 불러올 수 없습니다.</p>
        <button
          className="rounded-button border border-7 bg-3 px-md py-sm text-Label font-semibold text-4 hover:border-0 hover:text-0 transition-all"
          onClick={onRetry}
        >
          재시도
        </button>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* 상단 공지 배너 (UI-042) */}
      {showBanner && (
        <div className="mb-lg relative flex items-center justify-between rounded-card-normal bg-6 px-lg py-md border border-0/10 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-0/10 text-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-Body-1 font-bold text-4">신규 '전자계약' 기능이 업데이트 되었습니다!</p>
              <p className="text-Body-2 text-5">종이 계약서 대신 모바일로 간편하게 서명을 받으세요.</p>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button
              className="rounded-button bg-0 px-md py-sm text-Label font-bold text-3 hover:bg-opacity-90 transition-all"
              onClick={() => moveToPage(977)}
            >
              기능 보기
            </button>
            <button
              className="text-5 hover:text-4 transition-colors"
              onClick={() => setShowBanner(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 페이지 헤더 + 자동 갱신 인디케이터 */}
      <PageHeader
        title="대시보드"
        description="스포짐 종각점의 실시간 센터 운영 현황입니다."
        actions={
          <div className="flex items-center gap-sm">
            {/* 마지막 갱신 시각 + 새로고침 버튼 */}
            <div className="flex items-center gap-xs rounded-button border border-7 bg-3 px-md py-sm shadow-sm">
              <span className="text-Label text-5">마지막 갱신: {formatTime(lastRefreshed)}</span>
              <button
                className={cn(
                  "text-5 hover:text-0 transition-all",
                  isRefreshing && "animate-spin text-0"
                )}
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="새로고침"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <button
              className="flex items-center gap-xs rounded-button bg-3 border border-7 px-md py-sm text-Label font-semibold text-5 hover:text-0 hover:border-0 transition-all shadow-sm"
              onClick={() => moveToPage(970)}
            >
              <DollarSign size={16} />
              매출 리포트
            </button>
            <button
              className="rounded-button bg-0 px-md py-sm text-Label font-bold text-3 hover:shadow-lg hover:shadow-0/20 transition-all"
              onClick={() => moveToPage(986)}
            >
              회원 신규 등록
            </button>
          </div>
        }
      />

      {/* 회원 현황 카드 섹션 (UI-010 ~ UI-015) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-md mb-xl">
        {memberStats.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            variant={stat.variant as "default" | "peach" | "mint"}
            onClick={() => moveToPage(stat.pageId)}
          />
        ))}
      </div>

      {/* 차트 영역 (UI-020 ~ UI-023) + 기간 필터 */}
      <div className="mb-xl">
        {/* 기간 필터 버튼 그룹 */}
        <div className="mb-lg flex items-center justify-between">
          <h2 className="text-Heading-2 font-bold text-4">운영 현황</h2>
          <div className="flex items-center gap-xs rounded-button border border-7 bg-3 p-xs shadow-sm">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={cn(
                  "rounded-button px-md py-xs text-Label font-semibold transition-all",
                  periodFilter === opt.key
                    ? "bg-0 text-3 shadow-sm"
                    : "text-5 hover:text-4"
                )}
                onClick={() => setPeriodFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {chartError ? (
          <div className="rounded-card-normal border border-7 bg-3 p-lg shadow-card-soft">
            <ErrorBlock onRetry={() => setChartError(false)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
            {/* 성별/연령대 통합 차트 카드 */}
            <div className="rounded-card-normal border border-7 bg-3 p-lg shadow-card-soft">
              <div className="mb-lg flex items-center justify-between">
                <h2 className="text-Heading-2 font-bold text-4">회원 분포</h2>
                <StatusBadge variant="info">활성회원 기준</StatusBadge>
              </div>
              <div className="flex flex-col gap-xl">
                {/* 성별 비율 (도넛) */}
                <div className="flex items-center gap-xl">
                  <div className="relative h-24 w-24">
                    <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                      <circle className="stroke-6" cx="18" cy="18" r="16" fill="none" strokeWidth="4" />
                      <circle className="stroke-0" cx="18" cy="18" r="16" fill="none" strokeWidth="4" strokeDasharray="55 100" />
                      <circle className="stroke-1" cx="18" cy="18" r="16" fill="none" strokeWidth="4" strokeDasharray="45 100" strokeDashoffset="-55" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-Label font-bold text-4">100%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-xs">
                        <div className="h-2 w-2 rounded-full bg-0" />
                        <span className="text-Body-2 text-5">여성</span>
                      </div>
                      <span className="text-Body-2 font-bold text-4">55%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-xs">
                        <div className="h-2 w-2 rounded-full bg-secondary-mint" />
                        <span className="text-Body-2 text-5">남성</span>
                      </div>
                      <span className="text-Body-2 font-bold text-4">45%</span>
                    </div>
                  </div>
                </div>
                {/* 연령대 (수평 바) */}
                <div className="space-y-md">
                  {[
                    { label: "20대", value: 45, color: "bg-0" },
                    { label: "30대", value: 32, color: "bg-secondary-mint" },
                    { label: "40대", value: 15, color: "bg-5" },
                    { label: "기타",  value: 8,  color: "bg-5" },
                  ].map((age) => (
                    <div className="space-y-xs" key={age.label}>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-5 uppercase">
                        <span>{age.label}</span>
                        <span>{age.value}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-2 overflow-hidden">
                        <div className={cn("h-full rounded-full", age.color)} style={{ width: `${age.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 주간 출석 현황 (라인 차트) */}
            <div className="rounded-card-normal border border-7 bg-3 p-lg shadow-card-soft">
              <div className="mb-lg flex items-center justify-between">
                <h2 className="text-Heading-2 font-bold text-4">주간 출석</h2>
                <div className="flex items-center gap-sm">
                  <div className="flex items-center gap-xs">
                    <div className="h-1.5 w-3 bg-secondary-mint rounded-full" />
                    <span className="text-[10px] text-5">전체</span>
                  </div>
                  <div className="flex items-center gap-xs">
                    <div className="h-1.5 w-3 bg-0 rounded-full" />
                    <span className="text-[10px] text-5">신규</span>
                  </div>
                </div>
              </div>
              <div className="relative h-[200px] w-full pt-md">
                <svg className="h-full w-full" viewBox="0 0 100 40">
                  <path d="M0,35 Q10,25 20,30 T40,15 T60,20 T80,5 T100,10" fill="none" stroke="#FFD1B3" strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,38 Q10,36 20,37 T40,32 T60,35 T80,28 T100,30" fill="none" stroke="#FF751A" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 1" />
                  <line x1="0" y1="38" x2="100" y2="38" stroke="#E5E7EB" strokeWidth="0.5" />
                  <line x1="0" y1="20" x2="100" y2="20" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2 2" />
                </svg>
                <div className="mt-md flex justify-between px-xs text-[10px] font-bold text-5">
                  <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span>
                </div>
              </div>
              <div className="mt-xl flex items-center justify-between rounded-button bg-6/30 p-md">
                <div>
                  <p className="text-Label text-0">오늘 총 방문</p>
                  <p className="text-Heading-2 font-bold text-4">184명</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-5">어제 대비</p>
                  <p className="text-Body-2 font-bold text-4">+12% ↑</p>
                </div>
              </div>
            </div>

            {/* 월별 매출 현황 (바 차트) */}
            <div className="rounded-card-normal border border-7 bg-3 p-lg shadow-card-soft">
              <div className="mb-lg flex items-center justify-between">
                <h2 className="text-Heading-2 font-bold text-4">매출 추이</h2>
                <select className="rounded-button border-none bg-2 px-sm py-xs text-[10px] font-bold text-5 outline-none cursor-pointer">
                  <option>최근 6개월</option>
                  <option>2024년 전체</option>
                </select>
              </div>
              <div className="flex h-[200px] items-end justify-between gap-sm pt-md">
                {[
                  { month: "1월", value: 45 },
                  { month: "2월", value: 65 },
                  { month: "3월", value: 55 },
                  { month: "4월", value: 85 },
                  { month: "5월", value: 120 },
                  { month: "6월", value: 95 },
                ].map((d, idx) => (
                  <div className="group relative flex flex-1 flex-col items-center gap-sm" key={d.month}>
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-all duration-300 group-hover:bg-0/80",
                        idx === 4 ? "bg-0" : "bg-secondary-mint"
                      )}
                      style={{ height: `${(d.value / 120) * 100}%` }}
                    />
                    <span className="text-[10px] font-bold text-5">{d.month}</span>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-button bg-4 px-sm py-xs text-[10px] text-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.value}M
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-xl grid grid-cols-2 gap-sm">
                <div className="rounded-button border border-7 p-md">
                  <p className="text-Label text-5">이달 목표</p>
                  <div className="flex items-center justify-between">
                    <span className="text-Body-1 font-bold text-4">1.2억</span>
                    <span className="text-[10px] text-0 font-bold">82%</span>
                  </div>
                </div>
                <div className="rounded-button border border-7 p-md">
                  <p className="text-Label text-5">당일 결제</p>
                  <div className="flex items-center justify-between">
                    <span className="text-Body-1 font-bold text-4">4.2백</span>
                    <span className="text-[10px] text-1 font-bold">15건</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 리스트 영역 (UI-030 ~ UI-033) */}
      {listError ? (
        <div className="rounded-card-normal border border-7 bg-3 p-lg shadow-card-soft mb-xl">
          <ErrorBlock onRetry={() => setListError(false)} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">
          {/* 생일자 & 미수금 */}
          <div className="space-y-lg">
            {/* 생일자 회원 (UI-030) */}
            <div className="rounded-card-normal border border-7 bg-3 overflow-hidden shadow-card-soft">
              <div className="flex items-center justify-between border-b border-7 bg-9/50 px-lg py-md">
                <div className="flex items-center gap-sm">
                  <div className="rounded-full bg-3 p-sm text-0 shadow-sm">
                    <Gift size={18} />
                  </div>
                  <h3 className="text-Body-1 font-bold text-4">오늘 생일자 회원</h3>
                </div>
                <span className="text-Label font-bold text-0">{birthdayMembers.length}명</span>
              </div>
              <div className="p-sm">
                <DataTable
                  columns={[
                    { key: "name",   header: "이름",    align: "left" },
                    { key: "birth",  header: "생년월일", align: "center" },
                    {
                      key: "status",
                      header: "상태",
                      align: "center",
                      render: (val) => (
                        <StatusBadge variant={val === "활성" ? "success" : "default"}>{val}</StatusBadge>
                      ),
                    },
                    {
                      key: "action",
                      header: "",
                      align: "right",
                      render: (_, row) => (
                        <button
                          className="p-xs text-5 hover:text-0 transition-colors"
                          onClick={() => moveToPage(985)}
                        >
                          <ChevronRight size={16} />
                        </button>
                      ),
                    },
                  ]}
                  data={birthdayMembers}
                />
              </div>
            </div>

            {/* 미수금 회원 (UI-031) — 30일 초과 시 "장기미납" 배지 */}
            <div className="rounded-card-normal border border-7 bg-3 overflow-hidden shadow-card-soft">
              <div className="flex items-center justify-between border-b border-7 bg-6 px-lg py-md">
                <div className="flex items-center gap-sm">
                  <div className="rounded-full bg-3 p-sm text-0 shadow-sm">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="text-Body-1 font-bold text-4">미수금 회원</h3>
                </div>
                <span className="text-Label font-bold text-0">{unpaidMembers.length}건</span>
              </div>
              <div className="p-sm">
                <DataTable
                  columns={[
                    { key: "name", header: "이름", align: "left" },
                    { key: "item", header: "상품명", align: "left" },
                    {
                      key: "overdueDays",
                      header: "연체",
                      align: "center",
                      render: (val: number) =>
                        val > 30 ? (
                          <StatusBadge variant="error">장기미납</StatusBadge>
                        ) : (
                          <span className="text-Body-2 text-5">{val}일</span>
                        ),
                    },
                    {
                      key: "amount",
                      header: "미납 금액",
                      align: "right",
                      render: (val) => <span className="font-bold text-4">₩{val}</span>,
                    },
                    {
                      key: "action",
                      header: "",
                      align: "right",
                      render: () => (
                        <button
                          className="rounded-button bg-6 px-sm py-xs text-[10px] font-bold text-0 hover:bg-0 hover:text-3 transition-all"
                          onClick={() => moveToPage(971)}
                        >
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

          {/* 홀딩 & 만료 임박 */}
          <div className="space-y-lg">
            {/* 연기(홀딩) 회원 (UI-032) */}
            <div className="rounded-card-normal border border-7 bg-3 overflow-hidden shadow-card-soft">
              <div className="flex items-center justify-between border-b border-7 bg-2 px-lg py-md">
                <div className="flex items-center gap-sm">
                  <div className="rounded-full bg-3 p-sm text-5 shadow-sm">
                    <PauseCircle size={18} />
                  </div>
                  <h3 className="text-Body-1 font-bold text-4">연기(홀딩) 중인 회원</h3>
                </div>
                <span className="text-Label font-bold text-5">{holdingMembers.length}명</span>
              </div>
              <div className="p-sm">
                <DataTable
                  columns={[
                    { key: "name",      header: "이름",    align: "left" },
                    { key: "period",    header: "홀딩 기간", align: "center" },
                    {
                      key: "remaining",
                      header: "잔여일",
                      align: "center",
                      render: (val) => <StatusBadge variant="info" dot>{val}일</StatusBadge>,
                    },
                    {
                      key: "action",
                      header: "",
                      align: "right",
                      render: () => (
                        <button
                          className="p-xs text-5 hover:text-5 transition-colors"
                          onClick={() => moveToPage(985)}
                        >
                          <ChevronRight size={16} />
                        </button>
                      ),
                    },
                  ]}
                  data={holdingMembers}
                />
              </div>
            </div>

            {/* 만료 임박 회원 (UI-033) — D-3 이내 빨간색, D-7 이내 주황색 */}
            <div className="rounded-card-normal border border-7 bg-3 overflow-hidden shadow-card-soft">
              <div className="flex items-center justify-between border-b border-7 bg-3/5 px-lg py-md">
                <div className="flex items-center gap-sm">
                  <div className="rounded-full bg-3 p-sm text-4 shadow-sm">
                    <Hourglass size={18} />
                  </div>
                  <h3 className="text-Body-1 font-bold text-4">수강권 만료 임박</h3>
                </div>
                <span className="text-Label font-bold text-4">{expiringMembers.length}명</span>
              </div>
              <div className="p-sm">
                <DataTable
                  columns={[
                    { key: "name",   header: "이름",      align: "left" },
                    { key: "expiry", header: "만료 예정일", align: "center" },
                    {
                      key: "dday",
                      header: "D-Day",
                      align: "center",
                      render: (val: string, row: { ddayNum: number }) => (
                        <StatusBadge variant={getDdayVariant(row.ddayNum)}>{val}</StatusBadge>
                      ),
                    },
                    {
                      key: "action",
                      header: "",
                      align: "right",
                      render: () => (
                        <button
                          className="rounded-button bg-6 px-sm py-xs text-[10px] font-bold text-0 hover:bg-0 hover:text-3 transition-all"
                          onClick={() => moveToPage(985)}
                        >
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
      )}

      {/* 프로모션 배너 슬롯 (UI-040) */}
      <div className="mt-xxl grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div
          className="group relative overflow-hidden rounded-card-strong bg-gradient-to-r from-[#FF751A] to-[#FFD1B3] p-xl text-3 shadow-lg cursor-pointer transition-transform hover:scale-[1.01]"
          onClick={() => moveToPage(983)}
        >
          <div className="relative z-10">
            <span className="rounded-full bg-3/20 px-sm py-xs text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">Premium Service</span>
            <h4 className="mt-md text-Heading-2 font-bold leading-tight">구독형 키오스크 패키지<br />출시 기념 30% 할인!</h4>
            <p className="mt-sm text-Body-2 text-3/80">인력 관리의 혁신, 무인 센터 운영을 시작해보세요.</p>
            <div className="mt-lg flex items-center gap-xs font-bold">
              <span>혜택 보기</span>
              <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
            </div>
          </div>
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-3/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-3/10 blur-2xl" />
        </div>

        <div
          className="group relative overflow-hidden rounded-card-strong bg-gradient-to-r from-[#121212] to-[#969696] p-xl text-3 shadow-lg cursor-pointer transition-transform hover:scale-[1.01]"
          onClick={() => moveToPage(980)}
        >
          <div className="relative z-10">
            <span className="rounded-full bg-3/20 px-sm py-xs text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">Automation</span>
            <h4 className="mt-md text-Heading-2 font-bold leading-tight">알림톡 자동 발송으로<br />재등록률을 높이세요</h4>
            <p className="mt-sm text-Body-2 text-3/80">만료 전 안내, 생일 축하 메시지를 자동으로 발송합니다.</p>
            <div className="mt-lg flex items-center gap-xs font-bold">
              <span>설정 바로가기</span>
              <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-3/10 blur-3xl" />
          <div className="absolute top-4 left-1/4 h-16 w-16 rounded-full bg-3/5 blur-xl" />
        </div>
      </div>
    </AppLayout>
  );
}
