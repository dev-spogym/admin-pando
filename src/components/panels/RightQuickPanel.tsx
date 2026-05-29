import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Calendar, Users, Wifi, X, ArrowUpRight, CreditCard, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import SchedulePanel from "@/components/panels/SchedulePanel";
import VisitPanel    from "@/components/panels/VisitPanel";
import RemotePanel   from "@/components/panels/RemotePanel";

// ─── 패널 식별자 타입 ──────────────────────────────────────────────────────
// 알림센터(news)는 사이드바 NotificationCenter(SCR-104)로 일원화되어 제거됨.

type PanelKey = "schedule" | "visit" | "remote";

// ─── 퀵메뉴 버튼 설정 ─────────────────────────────────────────────────────

interface QuickMenuButton {
  key: PanelKey;
  label: string;
  icon: React.ReactNode;
  panelTitle: string;
}

const QUICK_BUTTONS: QuickMenuButton[] = [
  {
    key:        "schedule",
    label:      "일정관리",
    icon:       <Calendar size={18} />,
    panelTitle: "일정관리",
  },
  {
    key:        "visit",
    label:      "방문회원",
    icon:       <Users size={18} />,
    panelTitle: "방문회원",
  },
  {
    key:        "remote",
    label:      "원격제어",
    icon:       <Wifi size={18} />,
    panelTitle: "원격제어",
  },
];

// ─── 패널 컨텐츠 렌더러 ────────────────────────────────────────────────────

interface PanelContentProps {
  panelKey: PanelKey;
}

function PanelContent({ panelKey }: PanelContentProps) {
  switch (panelKey) {
    case "schedule":
      return <SchedulePanel />;
    case "visit":
      return <VisitPanel />;
    case "remote":
      return <RemotePanel />;
  }
}

interface ContextShortcut {
  label: string;
  description: string;
  viewId: number;
}

function getContextShortcuts(pathname: string | null): { title: string; shortcuts: ContextShortcut[] } {
  if (pathname?.startsWith("/members")) {
    return {
      title: "회원 운영 바로가기",
      shortcuts: [
        { label: "회원 목록", description: "이탈·재등록 대상 확인", viewId: 967 },
        { label: "메시지 발송", description: "상담/리마인드 메시지 실행", viewId: 980 },
        { label: "전자계약", description: "신규 계약과 갱신 바로 진행", viewId: 977 },
        { label: "출석 관리", description: "수동 체크인과 방문 처리", viewId: 968 },
      ],
    };
  }

  if (pathname?.startsWith("/sales") || pathname?.startsWith("/pos")) {
    return {
      title: "매출 처리 바로가기",
      shortcuts: [
        { label: "신규 결제", description: "현장 결제 바로 시작", viewId: 982 },
        { label: "매출 현황", description: "환불·미수 거래 점검", viewId: 970 },
        { label: "자동 알림", description: "미수·만료 추적 알림 관리", viewId: 992 },
        { label: "회원 목록", description: "구매 회원 문맥으로 이동", viewId: 967 },
      ],
    };
  }

  if (pathname?.startsWith("/settings") || pathname?.startsWith("/staff")) {
    return {
      title: "설정 운영 바로가기",
      shortcuts: [
        { label: "센터 설정", description: "운영 정책과 환경 점검", viewId: 975 },
        { label: "권한 설정", description: "역할별 접근 범위 조정", viewId: 996 },
        { label: "직원 관리", description: "계정 상태와 담당자 구성 확인", viewId: 974 },
        { label: "키오스크", description: "현장 장비 설정과 운영 점검", viewId: 994 },
      ],
    };
  }

  return {
    title: "운영 바로가기",
    shortcuts: [
      { label: "대시보드", description: "센터 핵심 KPI 복귀", viewId: 966 },
      { label: "회원 목록", description: "회원 CRM 중심 화면 이동", viewId: 967 },
      { label: "매출 현황", description: "거래·미수·환불 흐름 점검", viewId: 970 },
      { label: "설정", description: "운영 정책과 권한 관리", viewId: 975 },
    ],
  };
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────

const RightQuickPanel = () => {
  const HEADER_HEIGHT = 72;
  const pathname = usePathname();
  // 현재 열린 패널 (null = 모두 닫힘)
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  const panelRef  = useRef<HTMLDivElement>(null);
  const barRef    = useRef<HTMLDivElement>(null);

  // 패널 외부 클릭 시 닫기
  useEffect(() => {
    if (!activePanel) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // 버튼 바나 패널 내부 클릭이면 무시
      if (barRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setActivePanel(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activePanel]);

  // ESC 키로 패널 닫기
  useEffect(() => {
    if (!activePanel) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePanel(null);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [activePanel]);

  // 버튼 클릭: 같은 패널이면 닫기, 다른 패널이면 열기
  const handleButtonClick = useCallback((key: PanelKey) => {
    setActivePanel((prev) => (prev === key ? null : key));
  }, []);

  const contextArea = getContextShortcuts(pathname);

  return (
    <div className="relative hidden h-full w-14 shrink-0 xl:block">
      {/* ── 슬라이드 패널 (w-80, 전체 높이) ── */}
      <div
        ref={panelRef}
        className={cn(
          "absolute bottom-0 right-full w-80 overflow-hidden border-l border-line/80 bg-white/88 shadow-card-deep backdrop-blur-xl",
          "transition-transform duration-200 ease-in-out z-30",
          activePanel ? "translate-x-0" : "translate-x-full pointer-events-none opacity-0"
        )}
        style={{ top: HEADER_HEIGHT }}
      >
        {activePanel && (
          <div className="flex h-full min-h-0 flex-col">
            {/* 패널 닫기 버튼 (모바일 접근성용 - 헤더 내에서도 닫기 가능) */}
            <button
              className="absolute top-[10px] right-[10px] z-10 flex h-6 w-6 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content transition-colors"
              onClick={() => setActivePanel(null)}
              title="닫기"
            >
              <X size={14} />
            </button>
            <div className="border-b border-line/80 bg-surface-secondary/70 px-md py-sm">
              <div className="flex items-center justify-between gap-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">Context</p>
                  <p className="mt-[2px] text-[13px] font-semibold text-content">{contextArea.title}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  {pathname?.startsWith("/sales") || pathname?.startsWith("/pos") ? <CreditCard size={15} /> :
                    pathname?.startsWith("/settings") || pathname?.startsWith("/staff") ? <Settings size={15} /> :
                    pathname?.startsWith("/members") ? <MessageSquare size={15} /> :
                    <ArrowUpRight size={15} />}
                </div>
              </div>
              <div className="mt-sm grid grid-cols-2 gap-xs">
                {contextArea.shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    className="rounded-xl border border-line bg-white px-sm py-sm text-left transition-colors hover:border-primary/30 hover:bg-primary-light/30"
                    onClick={() => moveToPage(shortcut.viewId)}
                  >
                    <p className="text-[12px] font-semibold text-content">{shortcut.label}</p>
                    <p className="mt-[2px] text-[11px] leading-relaxed text-content-tertiary">{shortcut.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <PanelContent panelKey={activePanel} />
            </div>
          </div>
        )}
      </div>

      {/* ── 세로 버튼 바 (항상 표시) ── */}
      <div
        ref={barRef}
        className="absolute bottom-0 right-0 flex w-14 flex-col items-center gap-[6px] border-l border-line/80 bg-white/72 py-sm backdrop-blur-xl"
        style={{ top: HEADER_HEIGHT }}
      >
        {QUICK_BUTTONS.map((btn) => {
          const isActive = activePanel === btn.key;
          return (
            <div key={btn.key} className="relative group">
              <button
                className={cn(
                  "flex h-11 w-11 flex-col items-center justify-center rounded-2xl transition-all",
                  isActive
                    ? "bg-gradient-to-br from-primary to-[#ff907f] text-white shadow-float"
                    : "text-content-tertiary hover:bg-white/80 hover:text-content"
                )}
                onClick={() => handleButtonClick(btn.key)}
                title={btn.label}
              >
                {btn.icon}
              </button>

              {/* 툴팁 (버튼 좌측에 표시) */}
              <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 whitespace-nowrap rounded-md bg-content px-sm py-xs text-[11px] font-medium text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                {btn.label}
                {/* 툴팁 화살표 */}
                <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-content" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RightQuickPanel;
