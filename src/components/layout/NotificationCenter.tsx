import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  Check,
  UserPlus,
  Coins,
  Clock,
  Settings,
  Shield,
  RefreshCw,
  X,
  LogIn,
  LogOut as LogOutIcon,
  Package,
  Building2,
  CreditCard,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { getAuditLogs, type AuditLogEntry } from "@/api/endpoints/auditLog";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

/** action → 한국어 제목 매핑 */
const ACTION_LABEL_MAP: Record<string, string> = {
  CREATE: "신규 등록",
  UPDATE: "정보 수정",
  DELETE: "삭제",
  REFUND: "환불 처리",
  LOGIN: "로그인",
  LOGOUT: "로그아웃",
  LOGIN_FAILED: "로그인 실패",
  BRANCH_SWITCH: "지점 전환",
  ROLE_CHANGE: "권한 변경",
  RESIGN: "퇴직 처리",
  TRANSFER: "이동 처리",
  LEAVE_START: "휴직 시작",
  LEAVE_END: "휴직 종료",
  MEMBER_TRANSFER: "회원 이동",
  MEMBER_WITHDRAW: "회원 탈퇴",
  EXPORT: "데이터 내보내기",
  SETTINGS_CHANGE: "설정 변경",
  BRANCH_CREATE: "지점 생성",
  BRANCH_CLOSE: "지점 폐점",
  SUPER_ADMIN_GRANT: "슈퍼관리자 권한 부여",
  SUPER_ADMIN_REVOKE: "슈퍼관리자 권한 회수",
};

/** targetType → 설명 prefix 매핑 */
const TARGET_TYPE_LABEL_MAP: Record<string, string> = {
  member: "회원",
  staff: "직원",
  sale: "매출",
  branch: "지점",
  settings: "설정",
  product: "상품",
  locker: "락커",
  payroll: "급여",
  lesson: "수업",
  contract: "계약",
};

/** action/targetType → 아이콘 매핑 */
function getNotificationIcon(entry: AuditLogEntry): React.ReactNode {
  const { action, targetType } = entry;

  // targetType 기반
  if (targetType === "member") {
    if (action === "CREATE") return <UserPlus size={15} strokeWidth={1.8} />;
    return <UserPlus size={15} strokeWidth={1.5} />;
  }
  if (targetType === "sale") return <Coins size={15} strokeWidth={1.5} />;
  if (targetType === "lesson") return <Clock size={15} strokeWidth={1.5} />;
  if (targetType === "product") return <Package size={15} strokeWidth={1.5} />;
  if (targetType === "branch") return <Building2 size={15} strokeWidth={1.5} />;
  if (targetType === "payroll") return <CreditCard size={15} strokeWidth={1.5} />;
  if (targetType === "settings") return <Settings size={15} strokeWidth={1.5} />;

  // action 기반
  if (action === "LOGIN" || action === "LOGIN_FAILED") return <LogIn size={15} strokeWidth={1.5} />;
  if (action === "LOGOUT") return <LogOutIcon size={15} strokeWidth={1.5} />;
  if (action === "REFUND") return <RefreshCw size={15} strokeWidth={1.5} />;
  if (action === "ROLE_CHANGE" || action === "SUPER_ADMIN_GRANT" || action === "SUPER_ADMIN_REVOKE")
    return <Shield size={15} strokeWidth={1.5} />;
  if (action === "SETTINGS_CHANGE") return <Settings size={15} strokeWidth={1.5} />;

  return <Bell size={15} strokeWidth={1.5} />;
}

/** action/targetType → 이동 viewId 매핑 */
function getNavigationViewId(entry: AuditLogEntry): number | null {
  const { targetType, action } = entry;
  if (targetType === "member") return 967; // 회원 목록
  if (targetType === "sale") return 970;   // 매출 현황
  if (targetType === "lesson") return 969; // 캘린더
  if (targetType === "product") return 972; // 상품 관리
  if (targetType === "branch") return 984; // 지점 관리
  if (targetType === "payroll") return 976; // 급여 관리
  if (targetType === "settings") return 975; // 설정
  if (action === "LOGIN" || action === "LOGOUT" || action === "LOGIN_FAILED") return 1001; // 감사 로그
  return null;
}

const STORAGE_KEY = "last_notification_read_at";
const READ_IDS_KEY = "notification_read_ids";
const SETTINGS_KEY = "notification_settings";

/** 상대 시간 포맷 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

/** 알림 항목 설명 생성 */
function buildDescription(entry: AuditLogEntry): string {
  const parts: string[] = [];
  if (entry.userName) parts.push(`${entry.userName}님이`);
  if (entry.targetType) {
    const typeLabel = TARGET_TYPE_LABEL_MAP[entry.targetType] ?? entry.targetType;
    parts.push(`${typeLabel} 항목을`);
  }
  const actionLabel = ACTION_LABEL_MAP[entry.action] ?? entry.action;
  parts.push(actionLabel);
  return parts.join(" ");
}

type TabType = "all" | "unread" | "read";

interface NotificationSettings {
  kakao: boolean;
  sms: boolean;
  push: boolean;
  email: boolean;
}

interface NotificationCenterProps {
  collapsed?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ collapsed = false }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("all");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 개별 읽음 ID 세트 (localStorage 기반)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(READ_IDS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // 전체 읽음 기준 시각 (fallback)
  const [lastReadAt, setLastReadAt] = useState<Date | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Date(stored) : null;
  });

  // 알림 설정 상태
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() => {
    if (typeof window === "undefined") return { kakao: true, sms: true, push: true, email: false };
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? JSON.parse(stored) : { kakao: true, sms: true, push: true, email: false };
    } catch {
      return { kakao: true, sms: true, push: true, email: false };
    }
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const authUser = useAuthStore((s) => s.user);
  const branchId = authUser?.currentBranchId ?? authUser?.branchId ?? undefined;

  /** audit_logs 최근 30건 조회 */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        size: 30,
        ...(branchId ? { branchId: Number(branchId) } : {}),
      };
      const res = await getAuditLogs(params);
      if (res.success && res.data?.data) {
        setLogs(res.data.data);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  /** 패널 열릴 때 데이터 로드 */
  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  /** 외부 클릭 시 패널 닫기 */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /** 미읽음 여부 판단: 개별 읽음 처리 OR 전체 읽음 시각 기준 */
  const isUnread = useCallback(
    (entry: AuditLogEntry) => {
      if (readIds.has(String(entry.id))) return false;
      if (lastReadAt && new Date(entry.createdAt) <= lastReadAt) return false;
      return true;
    },
    [readIds, lastReadAt]
  );

  const unreadCount = logs.filter(isUnread).length;

  /** 탭별 필터링 */
  const filteredLogs = logs.filter((entry) => {
    if (tab === "unread") return isUnread(entry);
    if (tab === "read") return !isUnread(entry);
    return true;
  });

  /** 전체 읽음 처리 */
  const markAllRead = () => {
    const now = new Date();
    localStorage.setItem(STORAGE_KEY, now.toISOString());
    setLastReadAt(now);
    // 개별 읽음 IDs도 초기화
    setReadIds(new Set());
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([]));
  };

  /** 개별 알림 클릭: 읽음 처리 + 페이지 이동 */
  const handleNotificationClick = (entry: AuditLogEntry) => {
    // 읽음 처리
    const newIds = new Set(readIds);
    newIds.add(String(entry.id));
    setReadIds(newIds);
    try {
      localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(newIds)));
    } catch {/* ignore */}

    // 페이지 이동
    const viewId = getNavigationViewId(entry);
    if (viewId) {
      setOpen(false);
      moveToPage(viewId);
    }
  };

  /** 알림 설정 토글 */
  const toggleSetting = (key: keyof NotificationSettings) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {/* ignore */}
  };

  return (
    <div className="relative">
      {/* 벨 버튼 */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center justify-center rounded-md transition-colors",
          collapsed ? "h-7 w-7" : "h-7 w-7",
          open
            ? "bg-primary-light text-primary"
            : "text-content-tertiary hover:bg-surface-tertiary hover:text-content"
        )}
        aria-label="알림 센터"
        title="알림 센터"
      >
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 패널 */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-9 z-50 w-[360px] rounded-xl border border-line bg-surface shadow-lg overflow-hidden"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-[14px] font-semibold text-content">알림</span>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors"
                title="전체 읽음 처리"
              >
                <Check size={13} strokeWidth={2} />
                전체 읽음
              </button>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                  showSettings
                    ? "bg-primary-light text-primary"
                    : "text-content-tertiary hover:bg-surface-tertiary hover:text-content"
                )}
                title="알림 설정"
              >
                <Settings size={13} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* 알림 설정 패널 */}
          {showSettings && (
            <div className="border-b border-line bg-surface-secondary px-4 py-3">
              <p className="text-[12px] font-semibold text-content mb-2">알림 수신 설정</p>
              <div className="space-y-2">
                {(
                  [
                    { key: "kakao", label: "카카오 알림톡" },
                    { key: "sms", label: "SMS 문자" },
                    { key: "push", label: "푸시 알림" },
                    { key: "email", label: "이메일 알림" },
                  ] as { key: keyof NotificationSettings; label: string }[]
                ).map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[12px] text-content-secondary">{label}</span>
                    <button
                      onClick={() => toggleSetting(key)}
                      className={cn(
                        "flex items-center gap-1 text-[11px] font-medium transition-colors",
                        notifSettings[key] ? "text-primary" : "text-content-tertiary"
                      )}
                    >
                      {notifSettings[key] ? (
                        <ToggleRight size={20} strokeWidth={1.5} />
                      ) : (
                        <ToggleLeft size={20} strokeWidth={1.5} />
                      )}
                      {notifSettings[key] ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 탭 */}
          <div className="flex border-b border-line">
            {(["all", "unread", "read"] as TabType[]).map((t) => {
              const labels: Record<TabType, string> = { all: "전체", unread: "미읽음", read: "읽음" };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 py-2 text-[12px] font-medium transition-colors",
                    tab === t
                      ? "text-primary border-b-2 border-primary"
                      : "text-content-tertiary hover:text-content"
                  )}
                >
                  {labels[t]}
                  {t === "unread" && unreadCount > 0 && (
                    <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-[360px] overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-[13px] text-content-tertiary">
                불러오는 중...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-content-tertiary">
                <Bell size={24} strokeWidth={1} className="opacity-30" />
                <span className="text-[13px]">알림이 없습니다</span>
              </div>
            ) : (
              filteredLogs.map((entry) => {
                const unread = isUnread(entry);
                const navigable = getNavigationViewId(entry) !== null;
                return (
                  <div
                    key={entry.id}
                    onClick={() => handleNotificationClick(entry)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-line/50 last:border-0 transition-colors",
                      navigable ? "cursor-pointer" : "cursor-default",
                      unread
                        ? "bg-primary-light/30 hover:bg-primary-light/50"
                        : "hover:bg-surface-tertiary"
                    )}
                  >
                    {/* 알림 유형 아이콘 */}
                    <div
                      className={cn(
                        "mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center",
                        unread
                          ? "bg-primary-light text-primary"
                          : "bg-surface-tertiary text-content-tertiary"
                      )}
                    >
                      {getNotificationIcon(entry)}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-[13px] leading-snug",
                            unread ? "font-semibold text-content" : "font-medium text-content-secondary"
                          )}
                        >
                          {ACTION_LABEL_MAP[entry.action] ?? entry.action}
                        </p>
                        {unread && (
                          <span className="mt-0.5 shrink-0 block h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-content-tertiary truncate">
                        {buildDescription(entry)}
                      </p>
                      <p className="mt-1 text-[11px] text-content-tertiary">
                        {formatRelativeTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 푸터 */}
          <div className="border-t border-line px-4 py-2">
            <button
              onClick={() => { setOpen(false); moveToPage(1001); }}
              className="text-[12px] text-content-tertiary hover:text-primary transition-colors w-full text-center"
            >
              감사 로그 전체 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
