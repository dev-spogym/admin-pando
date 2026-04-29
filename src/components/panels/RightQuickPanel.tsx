import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Calendar, Users, Wifi, X } from "lucide-react";
import { cn } from "@/lib/utils";
import NewsFeedPanel from "@/components/panels/NewsFeedPanel";
import SchedulePanel from "@/components/panels/SchedulePanel";
import VisitPanel    from "@/components/panels/VisitPanel";
import RemotePanel   from "@/components/panels/RemotePanel";

// ─── 패널 식별자 타입 ──────────────────────────────────────────────────────

type PanelKey = "news" | "schedule" | "visit" | "remote";

// ─── 퀵메뉴 버튼 설정 ─────────────────────────────────────────────────────

interface QuickMenuButton {
  key: PanelKey;
  label: string;
  icon: React.ReactNode;
  panelTitle: string;
}

const QUICK_BUTTONS: QuickMenuButton[] = [
  {
    key:        "news",
    label:      "알림센터",
    icon:       <Bell size={18} />,
    panelTitle: "알림센터",
  },
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
  onUnreadCountChange: (count: number) => void;
}

function PanelContent({ panelKey, onUnreadCountChange }: PanelContentProps) {
  switch (panelKey) {
    case "news":
      return <NewsFeedPanel onUnreadCountChange={onUnreadCountChange} />;
    case "schedule":
      return <SchedulePanel />;
    case "visit":
      return <VisitPanel />;
    case "remote":
      return <RemotePanel />;
  }
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────

const RightQuickPanel = () => {
  // 현재 열린 패널 (null = 모두 닫힘)
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  // 알림 미읽 건수 (벨 버튼 배지에 표시)
  const [unreadCount, setUnreadCount] = useState(0);

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

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  return (
    <div className="relative hidden h-full shrink-0 xl:flex">
      {/* ── 슬라이드 패널 (w-80, 전체 높이) ── */}
      <div
        ref={panelRef}
        className={cn(
          "absolute right-full top-0 h-full w-80 border-l border-line/80 bg-white/88 shadow-card-deep backdrop-blur-xl",
          "transition-transform duration-200 ease-in-out z-30",
          activePanel ? "translate-x-0" : "translate-x-full pointer-events-none opacity-0"
        )}
      >
        {activePanel && (
          <div className="flex flex-col h-full">
            {/* 패널 닫기 버튼 (모바일 접근성용 - 헤더 내에서도 닫기 가능) */}
            <button
              className="absolute top-[10px] right-[10px] z-10 flex h-6 w-6 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content transition-colors"
              onClick={() => setActivePanel(null)}
              title="닫기"
            >
              <X size={14} />
            </button>
            <PanelContent
              panelKey={activePanel}
              onUnreadCountChange={handleUnreadCountChange}
            />
          </div>
        )}
      </div>

      {/* ── 세로 버튼 바 (항상 표시) ── */}
      <div
        ref={barRef}
        className="flex h-full w-14 shrink-0 flex-col items-center gap-[6px] border-l border-line/80 bg-white/72 py-sm backdrop-blur-xl"
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
                {/* 알림 미읽 배지 (뉴스피드 버튼에만 표시) */}
                {btn.key === "news" && unreadCount > 0 && (
                  <span className="absolute -right-[3px] -top-[3px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-state-error text-[9px] font-bold text-white px-[3px]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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
