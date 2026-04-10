import React, { useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Coins,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FormSection from "@/components/FormSection";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import TabNav from "@/components/TabNav";
import { moveToPage } from "@/internal";
import { useAuthStore } from "@/stores/authStore";
import { normalizeRole } from "@/lib/permissions";

type BoardKey = "hq" | "branch" | "fc" | "trainer" | "operations";
type Tone = "success" | "info" | "default" | "error";

interface HeroMetric {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  variant?: "default" | "mint" | "peach";
}

interface QueueItem {
  title: string;
  owner: string;
  due: string;
  level: Tone;
}

interface RankingItem {
  label: string;
  value: string;
  delta: string;
}

interface FunnelItem {
  step: string;
  value: string;
  change: string;
}

interface BoardContent {
  subtitle: string;
  metrics: HeroMetric[];
  queueTitle: string;
  queue: QueueItem[];
  rankingTitle: string;
  ranking: RankingItem[];
  funnelTitle: string;
  funnel: FunnelItem[];
  insightTitle: string;
  insights: string[];
}

const boardTabs = [
  { key: "hq", label: "본사", icon: Building2 },
  { key: "branch", label: "지점", icon: LayoutDashboard },
  { key: "fc", label: "FC", icon: Users },
  { key: "trainer", label: "트레이너", icon: Activity },
  { key: "operations", label: "운영", icon: BellRing },
];

const boardContents: Record<BoardKey, BoardContent> = {
  hq: {
    subtitle: "전사 성장률, 지점 비교, 이탈위험, 자동화 효율을 한 번에 관리합니다.",
    metrics: [
      { label: "전사 신규", value: "428명", description: "전월 대비 +12.4%", icon: <Users />, variant: "mint" },
      { label: "유지율", value: "88.6%", description: "상위 5개 지점 평균", icon: <UserCheck /> },
      { label: "전사 매출", value: "4.82억", description: "월 누적 / 목표 96%", icon: <Coins />, variant: "peach" },
      { label: "이탈위험 지점", value: "3곳", description: "14일 기준 경고 상태", icon: <ShieldAlert /> },
    ],
    queueTitle: "본사 액션 큐",
    queue: [
      { title: "재등록률 40% 이하 지점 코칭", owner: "운영총괄", due: "오늘 14:00", level: "error" },
      { title: "신규 리드 응답 지연 지점 점검", owner: "CRM 매니저", due: "오늘 16:00", level: "info" },
      { title: "4월 자동알림 시나리오 승인", owner: "마케팅", due: "내일", level: "default" },
      { title: "운영비 급증 지점 원인 확인", owner: "재무", due: "이번 주", level: "success" },
    ],
    rankingTitle: "지점 성과 랭킹",
    ranking: [
      { label: "강남점", value: "목표 달성 121%", delta: "+18%" },
      { label: "송도점", value: "유지율 92.4%", delta: "+6%" },
      { label: "분당점", value: "PT 재구매 38%", delta: "+9%" },
      { label: "마곡점", value: "자동화 실행률 94%", delta: "+11%" },
    ],
    funnelTitle: "전사 퍼널 요약",
    funnel: [
      { step: "리드 유입", value: "1,280", change: "+14%" },
      { step: "상담 완료", value: "742", change: "+9%" },
      { step: "등록 전환", value: "286", change: "+6%" },
      { step: "재등록", value: "191", change: "+4%" },
    ],
    insightTitle: "전사 인사이트",
    insights: [
      "PT 재구매율은 강남/분당에서 강하고, 송도/마곡은 체험 참여율이 더 높습니다.",
      "리드 응답 속도 30분 이내 지점이 등록 전환율에서도 상위권을 유지하고 있습니다.",
      "자동화 규칙이 켜진 지점은 만료 D-7 응답률이 평균보다 높습니다.",
    ],
  },
  branch: {
    subtitle: "지점장이 오늘 바로 확인해야 할 목표, 팀 실행률, 재등록 우선순위를 모읍니다.",
    metrics: [
      { label: "월 목표 달성률", value: "84%", description: "잔여 6일 / 매출 3,200만 필요", icon: <Target />, variant: "peach" },
      { label: "활성 회원", value: "1,124명", description: "활성 비율 81.3%", icon: <Users /> },
      { label: "재등록 예정", value: "49명", description: "D-7 이내 회원", icon: <CalendarDays /> },
      { label: "Today Tasks", value: "27건", description: "미완료 6건", icon: <BellRing />, variant: "mint" },
    ],
    queueTitle: "오늘 우선 액션",
    queue: [
      { title: "만료 D-7 회원 재등록 상담 배정", owner: "FC팀", due: "오늘", level: "error" },
      { title: "PT 노쇼 3건 복구 메시지 발송", owner: "트레이너", due: "오늘", level: "info" },
      { title: "저녁 시간대 GX 증설 여부 확인", owner: "운영", due: "오늘", level: "default" },
      { title: "미수금 회원 2건 결제 일정 확인", owner: "프론트", due: "18:00", level: "success" },
    ],
    rankingTitle: "팀 KPI 스냅샷",
    ranking: [
      { label: "FC 김민지", value: "상담 전환 41%", delta: "+8%" },
      { label: "PT 이도현", value: "재구매 35%", delta: "+5%" },
      { label: "GX 박세린", value: "출석률 86%", delta: "+3%" },
      { label: "프론트 정유나", value: "태스크 완료 96%", delta: "+12%" },
    ],
    funnelTitle: "지점 운영 퍼널",
    funnel: [
      { step: "신규 상담", value: "92", change: "+12%" },
      { step: "방문", value: "61", change: "+8%" },
      { step: "등록", value: "28", change: "+5%" },
      { step: "초기 활성화", value: "23", change: "+4%" },
    ],
    insightTitle: "지점 인사이트",
    insights: [
      "방문 이후 등록 전환은 양호하지만, 신규 상담 예약 단계에서 이탈이 큽니다.",
      "저녁 7시 이후 출석 비중이 높아 해당 시간대 트레이너 배치를 늘릴 필요가 있습니다.",
      "만료예정 회원 중 PT 잔여 세션 보유자가 재구매 우선순위 상단에 올라와 있습니다.",
    ],
  },
  fc: {
    subtitle: "FC가 신규 리드와 재등록 리스트를 놓치지 않도록 응대 큐와 전환 지표 중심으로 구성합니다.",
    metrics: [
      { label: "신규 리드", value: "34건", description: "오늘 유입 / 미응답 5건", icon: <Users />, variant: "mint" },
      { label: "상담 전환율", value: "37%", description: "주간 기준", icon: <MessageSquare /> },
      { label: "등록 전환율", value: "29%", description: "상담 완료 기준", icon: <TrendingUp />, variant: "peach" },
      { label: "재등록 콜백", value: "18건", description: "우선순위 상", icon: <BellRing /> },
    ],
    queueTitle: "FC 실행 큐",
    queue: [
      { title: "10분 이상 미응답 리드 3건", owner: "나", due: "즉시", level: "error" },
      { title: "어제 방문 후 미등록 회원 후속 연락", owner: "나", due: "13:30", level: "info" },
      { title: "만료 D-1 회원 재등록 제안", owner: "나", due: "오늘", level: "default" },
      { title: "상담 결과 미기입 2건 정리", owner: "나", due: "퇴근 전", level: "success" },
    ],
    rankingTitle: "오늘의 리스트",
    ranking: [
      { label: "체험 후 미등록", value: "7명", delta: "고위험" },
      { label: "만료 D-7", value: "11명", delta: "우선" },
      { label: "장기 미방문", value: "9명", delta: "회복 대상" },
      { label: "상담 예약", value: "6건", delta: "오늘 일정" },
    ],
    funnelTitle: "FC 퍼널",
    funnel: [
      { step: "리드 유입", value: "34", change: "+5%" },
      { step: "첫 응답", value: "29", change: "85%" },
      { step: "상담 예약", value: "16", change: "47%" },
      { step: "등록 완료", value: "10", change: "29%" },
    ],
    insightTitle: "응대 인사이트",
    insights: [
      "리드 유입은 충분하지만 첫 응답 속도 편차가 커서 예약률이 흔들리고 있습니다.",
      "체험 완료 회원의 후속조치 메모가 정리되면 등록 전환 관리가 쉬워집니다.",
      "만료 D-7 회원 중 출석 빈도가 높은 회원은 재등록 가능성이 높습니다.",
    ],
  },
  trainer: {
    subtitle: "트레이너가 회원 세션 상태, 노쇼 복구, 재구매 기회를 바로 확인할 수 있도록 구성합니다.",
    metrics: [
      { label: "오늘 수업", value: "13건", description: "개인 PT 9 / 소그룹 4", icon: <Activity />, variant: "mint" },
      { label: "출석률", value: "87%", description: "최근 30일 평균", icon: <UserCheck /> },
      { label: "노쇼율", value: "4.8%", description: "복구율 61%", icon: <CircleAlert />, variant: "peach" },
      { label: "재구매 대상", value: "12명", description: "잔여 3회 이하", icon: <Coins /> },
    ],
    queueTitle: "트레이너 액션 큐",
    queue: [
      { title: "노쇼 회원 2명 재예약 제안", owner: "나", due: "수업 후", level: "error" },
      { title: "잔여 2회 회원 재구매 상담 요청", owner: "FC 연계", due: "오늘", level: "info" },
      { title: "체험 회원 후기 회수", owner: "나", due: "오늘", level: "default" },
      { title: "주간 소화율 70% 미만 회원 체크", owner: "나", due: "이번 주", level: "success" },
    ],
    rankingTitle: "회원 상태",
    ranking: [
      { label: "완강 임박", value: "8명", delta: "잔여 3회 이하" },
      { label: "노쇼 위험", value: "4명", delta: "최근 2주" },
      { label: "체험 예정", value: "5명", delta: "이번 주" },
      { label: "리뷰 요청", value: "6명", delta: "세션 완료 후" },
    ],
    funnelTitle: "PT 퍼널",
    funnel: [
      { step: "체험 제안", value: "22", change: "+6%" },
      { step: "체험 참여", value: "14", change: "64%" },
      { step: "구매", value: "6", change: "27%" },
      { step: "재구매", value: "4", change: "18%" },
    ],
    insightTitle: "세션 인사이트",
    insights: [
      "체험 참여까지는 무난하지만, 첫 4회 정착률을 높일 여지가 있습니다.",
      "노쇼 회원은 24시간 이내 재연락 시 복구율이 높습니다.",
      "완강 직전 회원에게 체형 변화나 성과 요약을 보여주면 재구매 전환이 좋아집니다.",
    ],
  },
  operations: {
    subtitle: "자동알림, Today Tasks, 중복방지, 운영 로그 상태를 한 화면에서 관리합니다.",
    metrics: [
      { label: "활성 트리거", value: "18개", description: "신규/이탈/만료/PT 규칙 포함", icon: <BellRing />, variant: "mint" },
      { label: "오늘 발송", value: "126건", description: "알림톡 84 / SMS 42", icon: <MessageSquare /> },
      { label: "Today Tasks", value: "27건", description: "본사 업무 풀에서 랜덤 배정", icon: <Target /> },
      { label: "중복 차단", value: "14건", description: "동일 대상 중복 발송 방지", icon: <ShieldAlert />, variant: "peach" },
    ],
    queueTitle: "자동화 운영 큐",
    queue: [
      { title: "만료 D-1 실패 발송 재시도", owner: "시스템", due: "즉시", level: "error" },
      { title: "7일 미방문 트리거 템플릿 점검", owner: "운영", due: "오늘", level: "info" },
      { title: "PT 잔여 세션 알림 규칙 검수", owner: "CRM", due: "이번 주", level: "default" },
      { title: "중복 방지 로그 정리", owner: "운영", due: "정기", level: "success" },
    ],
    rankingTitle: "운영 모듈 상태",
    ranking: [
      { label: "Welcome Flow", value: "정상", delta: "오픈율 61%" },
      { label: "만료 리마인드", value: "정상", delta: "응답률 34%" },
      { label: "미방문 회복", value: "관심", delta: "전환 저하" },
      { label: "PT 잔여 알림", value: "확장 가능", delta: "룰 추가" },
    ],
    funnelTitle: "운영 실행 흐름",
    funnel: [
      { step: "Trigger 감지", value: "248", change: "+18%" },
      { step: "메시지 생성", value: "241", change: "97%" },
      { step: "발송 완료", value: "234", change: "94%" },
      { step: "후속 액션 생성", value: "42", change: "17%" },
    ],
    insightTitle: "운영 인사이트",
    insights: [
      "환영 알림과 만료 리마인드는 규칙 기반으로만 운영해도 충분히 효과를 볼 수 있습니다.",
      "Today Tasks는 본사 업무 풀 100개를 랜덤 배정하는 방식으로 먼저 운영할 수 있습니다.",
      "중복방지 로그와 발송 상태를 같이 보여주면 운영자가 규칙 신뢰도를 쉽게 판단할 수 있습니다.",
    ],
  },
};

function toneVariant(tone: Tone): "success" | "info" | "default" | "error" {
  return tone;
}

function defaultBoardKey(role: string, isSuperAdmin: boolean): BoardKey {
  if (isSuperAdmin) return "hq";
  const normalized = normalizeRole(role);
  if (normalized === "fc") return "fc";
  if (normalized === "manager" || normalized === "owner" || normalized === "primary") return "branch";
  if (normalized === "staff") return "trainer";
  return "branch";
}

function ActionQueue({ title, items }: { title: string; items: QueueItem[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-lg">
      <div className="mb-md flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-content">{title}</h3>
          <p className="mt-[4px] text-[12px] text-content-secondary">오늘 처리해야 할 우선순위 작업</p>
        </div>
        <StatusBadge variant="info">{items.length}건</StatusBadge>
      </div>
      <div className="space-y-sm">
        {items.map((item) => (
          <div key={`${item.title}-${item.owner}`} className="flex items-start justify-between gap-md rounded-xl border border-line bg-surface-secondary/40 p-md">
            <div>
              <p className="text-[13px] font-semibold text-content">{item.title}</p>
              <div className="mt-[6px] flex items-center gap-sm text-[12px] text-content-secondary">
                <span>{item.owner}</span>
                <span className="text-content-tertiary">•</span>
                <span>{item.due}</span>
              </div>
            </div>
            <StatusBadge variant={toneVariant(item.level)}>{item.level === "error" ? "긴급" : item.level === "info" ? "우선" : item.level === "success" ? "완료가능" : "일반"}</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingPanel({ title, items }: { title: string; items: RankingItem[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-lg">
      <div className="mb-md flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-content">{title}</h3>
        <button
          className="flex items-center gap-[4px] text-[12px] font-medium text-primary hover:underline"
          onClick={() => moveToPage(970)}
        >
          상세 보기
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="space-y-sm">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl border border-line bg-surface-secondary/50 px-md py-sm">
            <div className="flex items-center gap-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                {index + 1}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-content">{item.label}</p>
                <p className="text-[11px] text-content-secondary">{item.delta}</p>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-content">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelPanel({ title, items }: { title: string; items: FunnelItem[] }) {
  const maxValue = useMemo(() => {
    const nums = items.map((item) => Number(item.value.replace(/[^\d.]/g, "")) || 0);
    return Math.max(...nums, 1);
  }, [items]);

  return (
    <div className="rounded-xl border border-line bg-surface p-lg">
      <div className="mb-md flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-content">{title}</h3>
        <StatusBadge variant="success">실시간 보드</StatusBadge>
      </div>
      <div className="space-y-sm">
        {items.map((item) => {
          const raw = Number(item.value.replace(/[^\d.]/g, "")) || 0;
          const width = `${Math.max((raw / maxValue) * 100, 12)}%`;
          return (
            <div key={item.step} className="rounded-xl border border-line bg-surface-secondary/40 p-md">
              <div className="mb-[8px] flex items-center justify-between gap-sm">
                <p className="text-[13px] font-semibold text-content">{item.step}</p>
                <span className="text-[12px] font-semibold text-primary">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-tertiary">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width }} />
              </div>
              <p className="mt-[8px] text-[11px] text-content-secondary">{item.change}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KpiPreviewCenter() {
  const authUser = useAuthStore((s) => s.user);
  const isSuperAdmin = authUser?.isSuperAdmin ?? false;
  const initialBoard = defaultBoardKey(authUser?.role ?? "", isSuperAdmin);
  const [activeBoard, setActiveBoard] = useState<BoardKey>(initialBoard);

  const board = boardContents[activeBoard];
  const branchName = authUser?.branchName || "센터";
  const userLabel = isSuperAdmin ? "본사 운영" : `${branchName} 운영`;

  return (
    <AppLayout>
      <PageHeader
        title="KPI 센터"
        description={`${userLabel}에서 성장, CRM, PT, 운영 지표를 한 화면에서 확인하고 바로 액션으로 연결합니다.`}
        actions={
          <>
            <button
              className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-[13px] font-medium text-content-secondary hover:bg-surface-secondary"
              onClick={() => moveToPage(992)}
            >
              <BellRing size={14} />
              자동알림
            </button>
            <button
              className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-[13px] font-medium text-content-secondary hover:bg-surface-secondary"
              onClick={() => { window.location.href = "/today-tasks"; }}
            >
              <Target size={14} />
              Today Tasks
            </button>
            <button
              className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-[13px] font-medium text-content-secondary hover:bg-surface-secondary"
              onClick={() => moveToPage(970)}
            >
              <Coins size={14} />
              매출 보기
            </button>
            <button
              className="flex items-center gap-xs rounded-button bg-primary px-md py-sm text-[13px] font-semibold text-white hover:bg-primary-dark"
              onClick={() => moveToPage(967)}
            >
              <Users size={14} />
              회원 보기
            </button>
          </>
        }
      >
        <div className="mt-md flex flex-wrap items-center gap-sm">
          <TabNav tabs={boardTabs} activeTab={activeBoard} onTabChange={(key) => setActiveBoard(key as BoardKey)} />
          <span className="inline-flex items-center gap-[6px] rounded-full bg-accent-light px-md py-[6px] text-[12px] font-semibold text-accent">
            <CalendarDays size={13} />
            2026-04-09 기준
          </span>
        </div>
      </PageHeader>

      <div className="mb-lg rounded-2xl border border-line bg-gradient-to-br from-surface via-primary/5 to-accent/10 p-xl">
        <div className="grid gap-lg xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-md flex items-center gap-sm">
              <span className="inline-flex items-center gap-[6px] rounded-full bg-primary/10 px-md py-[6px] text-[12px] font-semibold text-primary">
                <Target size={13} />
                {boardTabs.find((tab) => tab.key === activeBoard)?.label} 보드
              </span>
              <span className="inline-flex items-center gap-[6px] rounded-full bg-surface px-md py-[6px] text-[12px] font-semibold text-content-secondary">
                <TrendingUp size={13} />
                업데이트 09:00
              </span>
            </div>
            <h2 className="text-[28px] font-bold tracking-tight text-content">
              {boardTabs.find((tab) => tab.key === activeBoard)?.label} KPI를 바로 보고, 바로 실행합니다.
            </h2>
            <p className="mt-sm max-w-[760px] text-[14px] leading-7 text-content-secondary">{board.subtitle}</p>
            <div className="mt-lg flex flex-wrap gap-sm">
              {[
                "실행 큐 중심 운영",
                "전환 퍼널 추적",
                "이탈 위험 탐지",
                "역할별 전용 화면",
              ].map((chip) => (
                <span key={chip} className="rounded-full border border-line bg-surface px-md py-[6px] text-[12px] text-content-secondary">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-sm sm:grid-cols-2">
            {board.metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-line bg-surface/90 p-md">
                <div className="mb-sm flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {metric.icon}
                  </div>
                  <StatusBadge variant="info">LIVE</StatusBadge>
                </div>
                <p className="text-[12px] text-content-secondary">{metric.label}</p>
                <p className="mt-[4px] text-[24px] font-bold text-content">{metric.value}</p>
                <p className="mt-[4px] text-[12px] text-content-tertiary">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-4">
        {board.metrics.map((metric) => (
          <StatCard
            key={`summary-${metric.label}`}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            icon={metric.icon}
            variant={metric.variant}
          />
        ))}
      </div>

      <div className="mt-lg grid gap-lg xl:grid-cols-[1.1fr_0.9fr]">
        <ActionQueue title={board.queueTitle} items={board.queue} />
        <div className="grid gap-lg">
          <RankingPanel title={board.rankingTitle} items={board.ranking} />
          <FunnelPanel title={board.funnelTitle} items={board.funnel} />
        </div>
      </div>

      <div className="mt-lg grid gap-lg xl:grid-cols-[0.9fr_1.1fr]">
        <FormSection
          title={board.insightTitle}
          description="운영자가 바로 해석할 수 있는 핵심 코멘트만 남겼습니다."
          columns={1}
        >
          <div className="space-y-sm">
            {board.insights.map((insight) => (
              <div key={insight} className="flex items-start gap-sm rounded-xl border border-line bg-surface-secondary/50 p-md">
                <div className="mt-[2px] rounded-full bg-primary/10 p-[6px] text-primary">
                  <Sparkles size={14} />
                </div>
                <p className="text-[13px] leading-6 text-content-secondary">{insight}</p>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="실행 바로가기"
          description="현재 프로젝트에 이미 있는 화면과 연결되는 작업 버튼입니다."
          columns={1}
        >
          <div className="grid gap-md md:grid-cols-2">
            {[
              { label: "회원 목록", desc: "회원 상세, 상담, 이력 확인", icon: <Users size={16} />, action: () => moveToPage(967) },
              { label: "매출 통계", desc: "월매출, 환불, 미수금 점검", icon: <Coins size={16} />, action: () => moveToPage(970) },
              { label: "자동 알림", desc: "트리거와 템플릿 관리", icon: <BellRing size={16} />, action: () => moveToPage(992) },
              { label: "Today Tasks", desc: "오늘 배정된 업무 리스트 확인", icon: <Target size={16} />, action: () => { window.location.href = "/today-tasks"; } },
            ].map((item) => (
              <button
                key={item.label}
                className="group rounded-xl border border-line bg-surface p-lg text-left hover:border-primary/40 hover:bg-primary/5"
                onClick={item.action}
              >
                <div className="mb-sm flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <ChevronRight className="text-content-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-primary" size={15} />
                </div>
                <p className="text-[14px] font-semibold text-content">{item.label}</p>
                <p className="mt-[4px] text-[12px] leading-6 text-content-secondary">{item.desc}</p>
              </button>
            ))}
          </div>
        </FormSection>
      </div>

      <div className="mt-lg grid gap-md lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-lg">
          <div className="mb-sm flex items-center gap-sm text-primary">
            <BellRing size={18} />
            <span className="text-[13px] font-semibold">규칙 운영 상태</span>
          </div>
          <div className="space-y-sm">
            {[
              ["Welcome Flow", "정상"],
              ["만료 D-7 리마인드", "정상"],
              ["Today Tasks 배정", "정상"],
            ].map(([label, status]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-surface-secondary/50 px-md py-sm">
                <span className="text-[12px] text-content-secondary">{label}</span>
                <StatusBadge variant={status === "관심" ? "info" : "success"}>{status}</StatusBadge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-lg">
          <div className="mb-sm flex items-center gap-sm text-primary">
            <Target size={18} />
            <span className="text-[13px] font-semibold">오늘의 목표</span>
          </div>
          <div className="space-y-sm">
            {[
              { label: "신규 상담 12건", rate: "67%" },
              { label: "재등록 8건", rate: "50%" },
              { label: "노쇼 복구 3건", rate: "33%" },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-[6px] flex items-center justify-between text-[12px]">
                  <span className="text-content-secondary">{item.label}</span>
                  <span className="font-semibold text-content">{item.rate}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-tertiary">
                  <div className="h-full rounded-full bg-primary" style={{ width: item.rate }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-lg">
          <div className="mb-sm flex items-center gap-sm text-primary">
            <CircleAlert size={18} />
            <span className="text-[13px] font-semibold">위험 감지</span>
          </div>
          <div className="space-y-sm">
            {[
              { label: "10일 미방문 + PT 잔여", count: "6명", tone: "error" as Tone },
              { label: "만료 D-1 미응답", count: "4명", tone: "info" as Tone },
              { label: "리드 미응답 30분 초과", count: "3건", tone: "error" as Tone },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-surface-secondary/50 px-md py-sm">
                <span className="text-[12px] text-content-secondary">{item.label}</span>
                <StatusBadge variant={toneVariant(item.tone)}>{item.count}</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
