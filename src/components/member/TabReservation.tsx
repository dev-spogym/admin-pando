// 예약내역 탭 — BROJ CRM 스타일 (월간 미니캘린더 + 상태 카운트 + 테이블)
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/common/StatusBadge";
import DataTable from "@/components/common/DataTable";
import { CalendarIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type BookingRecord = {
  id: string;
  branchName?: string | null;
  reservedAt: string | null;
  lessonDate: string | null;
  lessonTime: string | null;
  className: string | null;
  trainerName?: string | null;
  staffName?: string | null;
  status: string | null; // SHOW | NOSHOW | PENDING
};

interface Props {
  memberId: string;
}

export default function TabReservation({ memberId }: Props) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("lesson_bookings")
        .select("*")
        .eq("memberId", memberId)
        .order("lessonDate", { ascending: false });
      if (!error && data) {
        setBookings(data as BookingRecord[]);
      }
      setLoading(false);
    };
    fetch();
  }, [memberId]);

  // 월 이동
  const prevMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() - 1);
    setViewMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    setViewMonth(d);
  };

  // 해당 월 예약만 필터
  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthBookings = bookings.filter(b => (b.lessonDate || "").startsWith(monthStr));

  const showCount = monthBookings.filter(b => b.status === "SHOW").length;
  const noshowCount = monthBookings.filter(b => b.status === "NOSHOW").length;
  const pendingCount = monthBookings.filter(b => b.status === "PENDING" || !b.status).length;

  // 미니 캘린더 날짜별 상태 맵
  const dateMap: Record<string, string[]> = {};
  for (const b of monthBookings) {
    const d = (b.lessonDate || "").slice(0, 10);
    if (!d) continue;
    if (!dateMap[d]) dateMap[d] = [];
    dateMap[d].push(b.status || "PENDING");
  }

  // 캘린더 그리기
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 7 단위 패딩
  while (calCells.length % 7 !== 0) calCells.push(null);

  const getDotColor = (statuses: string[]) => {
    if (statuses.includes("NOSHOW")) return "bg-state-error";
    if (statuses.includes("SHOW")) return "bg-state-success";
    return "bg-state-warning";
  };

  // 상태 레이블
  const statusLabel = (s: string | null) => {
    if (s === "SHOW") return <StatusBadge variant="success" dot>SHOW</StatusBadge>;
    if (s === "NOSHOW") return <StatusBadge variant="error" dot>NOSHOW</StatusBadge>;
    return <StatusBadge variant="warning" dot>미처리</StatusBadge>;
  };

  const columns = [
    {
      key: "branchName",
      header: "소속지점",
      render: (v: string) => <span className="text-[12px] text-content-secondary">{v || "-"}</span>,
    },
    {
      key: "reservedAt",
      header: "예약일시",
      render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 16).replace("T", " ") : "-"}</span>,
    },
    {
      key: "lessonDate",
      header: "수업일자",
      render: (v: string) => <span className="text-[12px]">{v ? v.slice(0, 10) : "-"}</span>,
    },
    {
      key: "lessonTime",
      header: "수업시간",
      render: (v: string) => <span className="text-[12px]">{v || "-"}</span>,
    },
    {
      key: "className",
      header: "수업명",
      render: (v: string) => <span className="text-[13px] font-medium">{v || "-"}</span>,
    },
    {
      key: "staffName",
      header: "담당자",
      render: (v: string, row: BookingRecord) => (
        <span className="text-[12px] text-content-secondary">{row.trainerName || v || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (v: string) => statusLabel(v),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xl text-content-secondary text-[13px]">
        예약 내역을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* 미니 캘린더 */}
        <div className="bg-surface rounded-xl border border-line p-md">
          {/* 월 헤더 */}
          <div className="flex items-center justify-between mb-md">
            <button
              className="p-xs rounded hover:bg-surface-secondary transition-colors text-content-secondary"
              onClick={prevMonth}
            >
              ‹
            </button>
            <span className="text-[14px] font-bold text-content">
              {year}년 {month + 1}월
            </span>
            <button
              className="p-xs rounded hover:bg-surface-secondary transition-colors text-content-secondary"
              onClick={nextMonth}
            >
              ›
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-xs">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div
                key={d}
                className={cn(
                  "text-center text-[10px] font-semibold py-xs",
                  i === 0 ? "text-state-error" : i === 6 ? "text-blue-400" : "text-content-secondary"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-[2px]">
            {calCells.map((day, idx) => {
              const dateKey = day
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : "";
              const statuses = dateKey ? (dateMap[dateKey] || []) : [];
              const hasEvent = statuses.length > 0;
              const col = idx % 7;
              return (
                <div
                  key={idx}
                  className={cn(
                    "relative flex flex-col items-center py-[3px] rounded-md",
                    hasEvent && "bg-surface-secondary"
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] leading-none",
                      !day && "invisible",
                      col === 0 ? "text-state-error" : col === 6 ? "text-blue-400" : "text-content"
                    )}
                  >
                    {day}
                  </span>
                  {hasEvent && (
                    <span className={cn("w-[5px] h-[5px] rounded-full mt-[2px]", getDotColor(statuses))} />
                  )}
                </div>
              );
            })}
          </div>

          {/* 이번달 집계 */}
          <div className="mt-md pt-md border-t border-line space-y-xs">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-xs text-state-success">
                <CheckCircle2 size={12} /> SHOW
              </span>
              <span className="font-bold">{showCount}회</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-xs text-state-error">
                <XCircle size={12} /> NOSHOW
              </span>
              <span className="font-bold">{noshowCount}회</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-xs text-state-warning">
                <Clock size={12} /> 미처리
              </span>
              <span className="font-bold">{pendingCount}회</span>
            </div>
          </div>
        </div>

        {/* 전체 통계 요약 */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-md content-start">
          <div className="bg-surface rounded-xl border border-line p-md text-center">
            <p className="text-[11px] text-content-secondary mb-xs flex items-center justify-center gap-xs">
              <CalendarIcon size={11} /> 총 예약
            </p>
            <p className="text-[24px] font-bold text-content">{bookings.length}</p>
          </div>
          <div className="bg-surface rounded-xl border border-line p-md text-center">
            <p className="text-[11px] text-content-secondary mb-xs flex items-center justify-center gap-xs">
              <CheckCircle2 size={11} className="text-state-success" /> 전체 SHOW
            </p>
            <p className="text-[24px] font-bold text-state-success">
              {bookings.filter(b => b.status === "SHOW").length}
            </p>
          </div>
          <div className="bg-surface rounded-xl border border-line p-md text-center">
            <p className="text-[11px] text-content-secondary mb-xs flex items-center justify-center gap-xs">
              <XCircle size={11} className="text-state-error" /> 전체 NOSHOW
            </p>
            <p className="text-[24px] font-bold text-state-error">
              {bookings.filter(b => b.status === "NOSHOW").length}
            </p>
          </div>
        </div>
      </div>

      {/* 예약 테이블 */}
      <DataTable
        title="예약 이력"
        columns={columns}
        data={bookings}
        emptyMessage="예약 내역이 없습니다."
      />
    </div>
  );
}
