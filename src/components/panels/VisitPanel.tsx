import React, { useState, useEffect, useCallback } from "react";
import { Users, Monitor, Hand, QrCode, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Attendance } from "@/api/endpoints/attendance";

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem("branchId");
  return stored ? Number(stored) : 1;
};

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "HH:MM" 체크인 시간 포맷 */
function toTimeStr(iso: string): string {
  return iso.slice(11, 16);
}

// 체크인 방법 → 아이콘 + 레이블
const METHOD_META: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  KIOSK:  { label: "키오스크", icon: <Monitor size={11} />,  className: "bg-state-info/10 text-state-info" },
  MANUAL: { label: "수동",     icon: <Hand size={11} />,     className: "bg-surface-tertiary text-content-secondary" },
  APP:    { label: "QR",       icon: <QrCode size={11} />,   className: "bg-state-success/10 text-state-success" },
};

function getMethodMeta(method: string) {
  return METHOD_META[method] ?? METHOD_META.MANUAL;
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

const VisitPanel = () => {
  const [visits, setVisits]   = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // 오늘 출석 회원 실시간 조회
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const today    = toDateStr(new Date());
      const branchId = getBranchId();

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("branchId", branchId)
        .gte("checkInAt", `${today}T00:00:00`)
        .lte("checkInAt", `${today}T23:59:59`)
        .order("checkInAt", { ascending: false });

      if (error) throw error;
      setVisits((data ?? []) as Attendance[]);
    } catch {
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();

    // 30초마다 자동 새로고침 (실시간 느낌)
    const timer = setInterval(fetchVisits, 30_000);
    return () => clearInterval(timer);
  }, [fetchVisits]);

  // 현재 입장 중인 회원 (체크아웃 안된 회원)
  const currentlyIn = visits.filter((v) => !v.checkOutAt).length;

  return (
    <div className="flex flex-col h-full">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-md py-sm border-b border-line shrink-0">
        <div className="flex items-center gap-sm">
          <Users size={16} className="text-primary" />
          <span className="text-[14px] font-semibold text-content">방문회원</span>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content transition-colors"
          onClick={fetchVisits}
          title="새로고침"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 통계 요약 바 */}
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line shrink-0">
        <div className="flex flex-col items-center py-sm">
          <span className="text-[20px] font-bold text-content">{visits.length}</span>
          <span className="text-[10px] text-content-tertiary mt-[1px]">오늘 총 방문</span>
        </div>
        <div className="flex flex-col items-center py-sm">
          <span className="text-[20px] font-bold text-primary">{currentlyIn}</span>
          <span className="text-[10px] text-content-tertiary mt-[1px]">현재 입장중</span>
        </div>
      </div>

      {/* 방문자 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-md space-y-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-sm animate-pulse">
                <div className="h-8 w-8 rounded-full bg-line shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-1/3 rounded bg-line" />
                  <div className="h-2 w-1/4 rounded bg-line" />
                </div>
                <div className="h-5 w-12 rounded-full bg-line" />
              </div>
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-sm text-content-tertiary py-xxl">
            <Users size={28} className="opacity-30" />
            <span className="text-[13px]">오늘 방문 회원이 없습니다</span>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visits.map((v) => {
              const meta = getMethodMeta(v.checkInMethod);
              const isIn = !v.checkOutAt;
              return (
                <li
                  key={v.id}
                  className="flex items-center gap-sm px-md py-[9px] hover:bg-surface-secondary transition-colors"
                >
                  {/* 아바타 */}
                  <div
                    className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[12px] font-bold ${
                      isIn
                        ? "bg-primary-light text-primary"
                        : "bg-surface-tertiary text-content-tertiary"
                    }`}
                  >
                    {v.memberName.slice(0, 1)}
                  </div>

                  {/* 회원명 + 시간 */}
                  <div className="flex flex-col gap-[1px] flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-content truncate">
                      {v.memberName}
                    </span>
                    <span className="text-[11px] text-content-tertiary">
                      {toTimeStr(v.checkInAt)} 체크인
                      {v.checkOutAt && ` · ${toTimeStr(v.checkOutAt)} 퇴장`}
                    </span>
                  </div>

                  {/* 체크인 방법 배지 */}
                  <span
                    className={`flex items-center gap-[3px] text-[10px] font-semibold px-[6px] py-[2px] rounded-full shrink-0 ${meta.className}`}
                  >
                    {meta.icon}
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default VisitPanel;
