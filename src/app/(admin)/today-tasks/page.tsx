'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Filter,
  ListTodo,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import StatusBadge from "@/components/common/StatusBadge";
import TabNav from "@/components/common/TabNav";
import { useAuthStore } from "@/stores/authStore";
import { getTodayTasks, type TodayTask } from "@/lib/todayTasks";
import { cn } from "@/lib/utils";
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { loadBranchSetting, saveBranchSetting } from '@/lib/branchSettings';

type StatusFilter = "all" | "대기" | "진행중" | "완료";
type EditableTask = TodayTask & { source: "hq" };

const SETTINGS_KEY = "today_tasks_custom";

const CATEGORY_OPTIONS: TodayTask["category"][] = ["상담", "재등록", "출석회복", "PT관리", "운영", "매출", "수업"];
const PRIORITY_OPTIONS: TodayTask["priority"][] = ["긴급", "높음", "보통"];
const STATUS_OPTIONS: TodayTask["status"][] = ["대기", "진행중", "완료"];

function priorityVariant(priority: TodayTask["priority"]): "success" | "info" | "default" | "error" {
  if (priority === "긴급") return "error";
  if (priority === "높음") return "info";
  return "default";
}

function roleToTaskRole(role: string, isSuperAdmin: boolean): TodayTask["assigneeRole"] {
  if (isSuperAdmin) return "hq";
  switch (role) {
    case "OWNER":
    case "MANAGER":
    case "primary":
    case "owner":
    case "manager":
      return "branch";
    case "TRAINER":
      return "trainer";
    case "STAFF":
    case "RECEPTIONIST":
      return "staff";
    case "fc":
      return "fc";
    default:
      return "branch";
  }
}

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "운영" as TodayTask["category"],
  priority: "보통" as TodayTask["priority"],
  status: "대기" as TodayTask["status"],
  dueLabel: "오늘 17:00",
  memberName: "",
};

export default function TodayTasks() {
  const authUser = useAuthStore((s) => s.user);
  const isSuperAdmin = authUser?.isSuperAdmin ?? false;
  const taskRole = roleToTaskRole(authUser?.role ?? "MANAGER", isSuperAdmin);
  const dateKey = new Date().toISOString().slice(0, 10);
  const randomTasks = useMemo(
    () =>
      getTodayTasks({
        dateKey,
        branchName: authUser?.branchName,
        role: authUser?.role ?? "MANAGER",
        isSuperAdmin: authUser?.isSuperAdmin ?? false,
      }),
    [authUser?.branchName, authUser?.isSuperAdmin, authUser?.role, dateKey]
  );

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [customTasks, setCustomTasks] = useState<EditableTask[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadBranchSetting<EditableTask[]>(SETTINGS_KEY, []).then((saved) => {
      if (!mounted) return;
      if (Array.isArray(saved)) setCustomTasks(saved);
      setSettingsReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    void saveBranchSetting(SETTINGS_KEY, customTasks);
  }, [customTasks, settingsReady]);

  const visibleCustomTasks = useMemo(
    () =>
      customTasks.filter((task) => {
        const branchMatch = isSuperAdmin || task.branchName === authUser?.branchName;
        const roleMatch = isSuperAdmin || task.assigneeRole === taskRole || task.assigneeRole === "branch";
        return branchMatch && roleMatch;
      }),
    [authUser?.branchName, customTasks, isSuperAdmin, taskRole]
  );

  const allTasks = [...visibleCustomTasks, ...randomTasks];
  const tasks = filter === "all" ? allTasks : allTasks.filter((task) => task.status === filter);
  const waitingCount = allTasks.filter((task) => task.status === "대기").length;
  const progressCount = allTasks.filter((task) => task.status === "진행중").length;
  const doneCount = allTasks.filter((task) => task.status === "완료").length;
  const urgentTasks = tasks.filter((task) => task.priority === "긴급" && task.status !== "완료");
  const memberLinkedTasks = tasks.filter((task) => Boolean(task.memberName) && task.status !== "완료");
  const automationCandidateCount = tasks.filter((task) => ["재등록", "출석회복", "매출"].includes(task.category) && task.status === "대기").length;

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!isSuperAdmin) return;
    if (!form.title.trim()) return;

    const payload: EditableTask = {
      id: editingId ?? `custom-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim() || "본사에서 직접 등록한 업무입니다.",
      category: form.category,
      priority: form.priority,
      status: form.status,
      assigneeRole: "branch",
      branchName: authUser?.branchName || "전체 지점",
      dueLabel: form.dueLabel.trim() || "오늘",
      memberName: form.memberName.trim() || undefined,
      source: "hq",
    };

    setCustomTasks((prev) =>
      editingId ? prev.map((task) => (task.id === editingId ? payload : task)) : [payload, ...prev]
    );
    resetForm();
  };

  const handleEdit = (task: EditableTask) => {
    if (!isSuperAdmin) return;
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      status: task.status,
      dueLabel: task.dueLabel,
      memberName: task.memberName ?? "",
    });
  };

  const handleDelete = (id: string) => {
    if (!isSuperAdmin) return;
    setCustomTasks((prev) => prev.filter((task) => task.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Today Tasks"
        description="본사 업무 풀 100개 중 오늘 날짜, 지점, 역할 기준으로 랜덤 배정된 업무를 확인합니다."
        actions={
          <div className="flex items-center gap-sm">
            <span className="inline-flex items-center gap-[6px] rounded-full bg-primary/10 px-md py-[6px] text-[12px] font-semibold text-primary">
              <Filter size={13} />
              배정 기준: 날짜 + 지점 + 역할
            </span>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-[6px] rounded-full bg-accent-light px-md py-[6px] text-[12px] font-semibold text-accent">
                <Plus size={13} />
                최고관리자 편집 가능
              </span>
            )}
          </div>
        }
      />

      <StatCardGrid cols={4}>
        <StatCard label="오늘 배정" value={`${allTasks.length}건`} description="본사 업무 풀 기준" icon={<ListTodo />} />
        <StatCard label="대기" value={`${waitingCount}건`} description="즉시 처리 필요 업무" icon={<CircleAlert />} variant="peach" />
        <StatCard label="진행중" value={`${progressCount}건`} description="현재 처리 중" icon={<Clock3 />} variant="mint" />
        <StatCard label="완료" value={`${doneCount}건`} description="오늘 처리 완료" icon={<CheckCircle2 />} />
      </StatCardGrid>

      <div className="mt-lg">
        <TabNav
          tabs={[
            { key: "all", label: "전체", count: allTasks.length },
            { key: "대기", label: "대기", count: waitingCount },
            { key: "진행중", label: "진행중", count: progressCount },
            { key: "완료", label: "완료", count: doneCount },
          ]}
          activeTab={filter}
          onTabChange={(key) => setFilter(key as StatusFilter)}
        />
      </div>

      <div className="mt-lg grid gap-md xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
        <section className="rounded-2xl border border-line bg-surface p-lg">
          <div className="flex items-start justify-between gap-md">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Focus Queue</p>
              <h2 className="mt-xs text-[18px] font-bold text-content">오늘 집중 업무</h2>
              <p className="mt-xs text-[13px] leading-relaxed text-content-secondary">
                긴급도와 회원 영향도를 기준으로 우선 처리해야 할 업무를 먼저 모았습니다.
              </p>
            </div>
          </div>

          <div className="mt-md grid gap-md md:grid-cols-3">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-md">
              <p className="text-[12px] font-semibold text-content">긴급 태스크</p>
              <p className="mt-sm text-[24px] font-bold text-rose-700">{urgentTasks.length}건</p>
              <p className="mt-xs text-[12px] leading-relaxed text-content-secondary">
                {urgentTasks[0] ? `${urgentTasks[0].title} 외 ${Math.max(urgentTasks.length - 1, 0)}건` : '현재 긴급 업무가 없습니다.'}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-md">
              <p className="text-[12px] font-semibold text-content">회원 직접 대응</p>
              <p className="mt-sm text-[24px] font-bold text-sky-700">{memberLinkedTasks.length}건</p>
              <p className="mt-xs text-[12px] leading-relaxed text-content-secondary">
                {memberLinkedTasks[0] ? `${memberLinkedTasks[0].memberName} 관련 업무가 대기 중입니다.` : '회원 직접 대응 업무가 없습니다.'}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-md">
              <p className="text-[12px] font-semibold text-content">자동화 후보</p>
              <p className="mt-sm text-[24px] font-bold text-amber-700">{automationCandidateCount}건</p>
              <p className="mt-xs text-[12px] leading-relaxed text-content-secondary">
                반복되는 리마인드·재등록 업무는 자동화 정책 후보로 볼 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-line bg-surface p-lg">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Action Shortcuts</p>
            <h2 className="mt-xs text-[18px] font-bold text-content">관련 화면 이동</h2>
            <p className="mt-xs text-[13px] leading-relaxed text-content-secondary">
              오늘 업무를 처리할 때 가장 자주 여는 운영 화면입니다.
            </p>
          </div>
          <div className="mt-md space-y-sm">
            {[
              { label: "회원 목록", desc: "재등록·이탈·상담 대상 확인", onClick: () => window.location.assign("/members") },
              { label: "매출 현황", desc: "미수·환불 관련 태스크 처리", onClick: () => window.location.assign("/sales") },
              { label: "자동 알림", desc: "반복 메시지 태스크 자동화", onClick: () => window.location.assign("/message/auto-alarm") },
              { label: "캘린더", desc: "수업·예약 관련 당일 업무 확인", onClick: () => window.location.assign("/calendar") },
            ].map((item) => (
              <button
                key={item.label}
                className="flex w-full items-start gap-sm rounded-2xl border border-line bg-white/80 px-md py-md text-left transition-colors hover:border-primary/30 hover:bg-primary-light/20"
                onClick={item.onClick}
              >
                <div className="mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                  <ArrowRight size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-content">{item.label}</p>
                  <p className="mt-[2px] text-[12px] leading-relaxed text-content-secondary">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {isSuperAdmin && (
        <div className="mt-lg rounded-xl border border-line bg-surface p-lg">
          <div className="mb-md flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-content">업무 직접 입력</h3>
              <p className="mt-[4px] text-[12px] text-content-secondary">최고관리자만 Today Tasks를 추가, 수정, 삭제할 수 있습니다.</p>
            </div>
            {editingId && (
              <button
                className="rounded-button border border-line px-md py-sm text-[12px] text-content-secondary hover:bg-surface-secondary"
                onClick={resetForm}
              >
                입력 초기화
              </button>
            )}
          </div>

          <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
            <input
              className="rounded-input border border-line bg-surface-secondary px-md py-sm text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="업무 제목"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              className="rounded-input border border-line bg-surface-secondary px-md py-sm text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="마감 표기 예: 오늘 17:00"
              value={form.dueLabel}
              onChange={(e) => setForm((prev) => ({ ...prev, dueLabel: e.target.value }))}
            />
            <input
              className="rounded-input border border-line bg-surface-secondary px-md py-sm text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="대상 회원 이름"
              value={form.memberName}
              onChange={(e) => setForm((prev) => ({ ...prev, memberName: e.target.value }))}
            />
            <Select
              value={form.category}
              onChange={(v) => setForm((prev) => ({ ...prev, category: v as TodayTask["category"] }))}
              options={CATEGORY_OPTIONS.map((o) => ({ value: o, label: o }))}
            />
            <Select
              value={form.priority}
              onChange={(v) => setForm((prev) => ({ ...prev, priority: v as TodayTask["priority"] }))}
              options={PRIORITY_OPTIONS.map((o) => ({ value: o, label: o }))}
            />
            <Select
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v as TodayTask["status"] }))}
              options={STATUS_OPTIONS.map((o) => ({ value: o, label: o }))}
            />
          </div>

          <Textarea
            className="mt-md w-full rounded-input border border-line bg-surface-secondary px-md py-sm text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
            rows={3}
            placeholder="업무 설명"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="mt-md flex justify-end">
            <button
              className="flex items-center gap-xs rounded-button bg-primary px-lg py-sm text-[13px] font-semibold text-white hover:bg-primary-dark"
              onClick={handleSubmit}
            >
              <Plus size={14} />
              {editingId ? "업무 수정" : "업무 추가"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-lg grid gap-md">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-line bg-surface p-lg">
            <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-sm flex flex-wrap items-center gap-xs">
                  <StatusBadge variant={priorityVariant(task.priority)}>{task.priority}</StatusBadge>
                  <StatusBadge variant="default">{task.category}</StatusBadge>
                  <StatusBadge variant={task.status === "완료" ? "success" : task.status === "진행중" ? "info" : "default"}>
                    {task.status}
                  </StatusBadge>
                </div>
                <h3 className="text-[16px] font-semibold text-content">{task.title}</h3>
                <p className="mt-[6px] text-[13px] leading-6 text-content-secondary">{task.description}</p>
                <div className="mt-md flex flex-wrap items-center gap-md text-[12px] text-content-tertiary">
                  <span>지점: {task.branchName}</span>
                  <span>마감: {task.dueLabel}</span>
                  {task.memberName && <span>대상 회원: {task.memberName}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-sm">
                {"source" in task && isSuperAdmin && (
                  <>
                    <button
                      className="rounded-button border border-line px-md py-sm text-[13px] font-medium text-content-secondary hover:bg-surface-secondary"
                      onClick={() => handleEdit(task as EditableTask)}
                    >
                      <span className="inline-flex items-center gap-xs"><Pencil size={13} />수정</span>
                    </button>
                    <button
                      className="rounded-button border border-red-200 px-md py-sm text-[13px] font-medium text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(task.id)}
                    >
                      <span className="inline-flex items-center gap-xs"><Trash2 size={13} />삭제</span>
                    </button>
                  </>
                )}
                <button
                  className={cn(
                    "rounded-button border px-md py-sm text-[13px] font-medium transition-colors",
                    task.status === "완료"
                      ? "border-line text-content-tertiary cursor-default"
                      : task.status === "진행중"
                      ? "border-state-success/40 text-state-success hover:bg-state-success hover:text-white"
                      : "border-primary/30 text-primary hover:bg-primary hover:text-white"
                  )}
                  disabled={task.status === "완료"}
                  onClick={() => {
                    if (task.status === "완료") return;
                    const nextStatus: TodayTask["status"] = task.status === "대기" ? "진행중" : "완료";
                    if ("source" in task) {
                      setCustomTasks(prev =>
                        prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t)
                      );
                    } else {
                      // 랜덤 배정 태스크는 DB 설정에 오버라이드로 저장
                      setCustomTasks(prev => {
                        const exists = prev.find(t => t.id === task.id);
                        if (exists) {
                          return prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t);
                        }
                        return [{ ...task, status: nextStatus, source: "hq" as const }, ...prev];
                      });
                    }
                  }}
                >
                  {task.status === "완료" ? "완료됨" : task.status === "진행중" ? "완료 처리" : "처리 시작"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="mt-xl rounded-xl border border-line bg-surface p-xl text-center text-[13px] text-content-secondary">
          해당 상태의 업무가 없습니다.
        </div>
      )}

      <div className="mt-lg rounded-xl border border-line bg-surface-secondary/50 p-lg">
        <div className="mb-sm flex items-center gap-sm text-primary">
          <Sparkles size={16} />
          <span className="text-[13px] font-semibold">배정 로직</span>
        </div>
        <p className="text-[12px] leading-6 text-content-secondary">
          AI 없이 본사 업무 풀 100개를 기준으로, 오늘 날짜와 현재 지점/역할을 조합해 랜덤 배정합니다.
          직접 추가·수정·상태 변경한 업무는 DB 설정에 저장되어 새로고침 후에도 유지됩니다.
        </p>
      </div>
    </AppLayout>
  );
}
