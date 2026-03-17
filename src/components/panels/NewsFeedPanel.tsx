import React, { useState, useEffect, useCallback } from "react";
import { Bell, RefreshCw, CheckCheck } from "lucide-react";
import {
  getNewsFeed,
  markAllAsRead,
  type NewsFeedItem,
} from "@/api/endpoints/newsFeed";

// ─── 타임라인 타입별 배지 색상 ──────────────────────────────────────────────

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  member_join:    { label: "회원가입",  className: "bg-state-info/10 text-state-info" },
  member_expire:  { label: "만료임박",  className: "bg-state-warning/10 text-state-warning" },
  payment:        { label: "결제",      className: "bg-state-success/10 text-state-success" },
  attendance:     { label: "출석",      className: "bg-accent-light text-accent" },
  penalty:        { label: "위약금",    className: "bg-state-error/10 text-state-error" },
  default:        { label: "알림",      className: "bg-surface-tertiary text-content-secondary" },
};

function getBadge(action: string) {
  return ACTION_BADGE[action] ?? ACTION_BADGE.default;
}

/** ISO 날짜를 "n분 전 / n시간 전 / n일 전" 형태로 변환 */
function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface NewsFeedPanelProps {
  /** 미읽 건수 변경 시 부모에 알림 */
  onUnreadCountChange?: (count: number) => void;
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

const NewsFeedPanel = ({ onUnreadCountChange }: NewsFeedPanelProps) => {
  const [items, setItems]       = useState<NewsFeedItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [marking, setMarking]   = useState(false);

  // 뉴스피드 데이터 조회
  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNewsFeed(undefined, 1, 50);
      if (res.success) {
        const data = res.data.data;
        setItems(data);
        const unread = data.filter((i) => !i.isRead).length;
        onUnreadCountChange?.(unread);
      }
    } catch {
      // 조용히 실패 처리 (fire-and-forget 패턴)
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // 전체 읽음 처리
  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
      onUnreadCountChange?.(0);
    } catch {
      // 조용히 실패
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = items.filter((i) => !i.isRead).length;

  return (
    <div className="flex flex-col h-full">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-md py-sm border-b border-line shrink-0">
        <div className="flex items-center gap-sm">
          <Bell size={16} className="text-primary" />
          <span className="text-[14px] font-semibold text-content">알림센터</span>
          {unreadCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-xs">
          {/* 새로고침 */}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content transition-colors"
            onClick={fetchFeed}
            title="새로고침"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          {/* 전체 읽음 */}
          {unreadCount > 0 && (
            <button
              className="flex h-7 items-center gap-xs rounded-md px-sm text-[11px] font-medium text-primary hover:bg-primary-light transition-colors disabled:opacity-50"
              onClick={handleMarkAllRead}
              disabled={marking}
            >
              <CheckCheck size={13} />
              전체 읽음
            </button>
          )}
        </div>
      </div>

      {/* 타임라인 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          // 로딩 스켈레톤
          <div className="p-md space-y-sm">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-sm animate-pulse">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-line" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 rounded bg-line" />
                  <div className="h-2 w-1/3 rounded bg-line" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-sm text-content-tertiary py-xxl">
            <Bell size={28} className="opacity-30" />
            <span className="text-[13px]">새 알림이 없습니다</span>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => {
              const badge = getBadge(item.action);
              return (
                <li
                  key={item.id}
                  className={`flex items-start gap-sm px-md py-[10px] transition-colors ${
                    item.isRead ? "opacity-60" : "bg-surface hover:bg-surface-secondary"
                  }`}
                >
                  {/* 읽음/미읽 인디케이터 점 */}
                  <span
                    className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full transition-colors ${
                      item.isRead ? "bg-line" : "bg-primary"
                    }`}
                  />
                  <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                    {/* 배지 + 메시지 */}
                    <div className="flex items-start gap-xs flex-wrap">
                      <span className={`shrink-0 text-[10px] font-semibold px-[6px] py-[2px] rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-[13px] text-content leading-snug break-all">
                        {item.message}
                      </span>
                    </div>
                    {/* 상대 시간 */}
                    <span className="text-[11px] text-content-tertiary">
                      {relativeTime(item.createdAt)}
                      {item.userName && ` · ${item.userName}`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NewsFeedPanel;
