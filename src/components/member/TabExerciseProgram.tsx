// 운동 프로그램 탭 — 배정된 프로그램 카드 + 배정 모달
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getExercisePrograms,
  getMemberPrograms,
  assignProgram,
  unassignProgram,
  type ExerciseProgram,
  type MemberExerciseProgram,
} from "@/api/endpoints/exercisePrograms";

interface Props {
  memberId: number;
}

// 난이도 배지 색상
function levelVariant(level: string | null): "success" | "info" | "warning" | "error" | "default" {
  const map: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
    입문: "success",
    초급: "info",
    중급: "warning",
    고급: "error",
  };
  return map[level ?? ""] ?? "default";
}

export default function TabExerciseProgram({ memberId }: Props) {
  const [assigned, setAssigned] = useState<MemberExerciseProgram[]>([]);
  const [programs, setPrograms] = useState<ExerciseProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [unassignId, setUnassignId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const branchId = Number(localStorage.getItem("branchId") || "1");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [assignedData, programsData] = await Promise.all([
        getMemberPrograms(memberId),
        getExercisePrograms(branchId),
      ]);
      setAssigned(assignedData);
      setPrograms(programsData);
      setLoading(false);
    };
    load();
  }, [memberId, branchId]);

  const handleAssign = async () => {
    if (!selectedProgramId) { toast.error("프로그램을 선택하세요."); return; }
    setAssigning(true);
    try {
      await assignProgram(memberId, selectedProgramId, 0); // assignedBy=0 (현재 사용자 ID 미지원)
      // 다시 로드
      const updated = await getMemberPrograms(memberId);
      setAssigned(updated);
      toast.success("프로그램이 배정되었습니다.");
      setShowModal(false);
      setSelectedProgramId(null);
    } catch (e: unknown) {
      toast.error(`배정 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (unassignId == null) return;
    try {
      await unassignProgram(unassignId);
      setAssigned(prev => prev.filter(p => p.id !== unassignId));
      toast.success("프로그램 배정이 해제되었습니다.");
    } catch (e: unknown) {
      toast.error(`해제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setUnassignId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-xl text-content-secondary text-[13px]">로딩 중...</div>;
  }

  return (
    <div className="space-y-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-content">운동 프로그램 ({assigned.length}개 배정)</h3>
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          onClick={() => setShowModal(true)}
        >
          <Plus size={14} />
          프로그램 배정
        </button>
      </div>

      {/* 배정된 프로그램 카드 목록 */}
      {assigned.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-xxl text-content-secondary">
          <Dumbbell size={40} className="mb-sm opacity-20" />
          <p className="text-[13px]">배정된 운동 프로그램이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {assigned.map(item => (
            <div key={item.id} className="bg-surface rounded-xl border border-line p-lg relative">
              <button
                className="absolute top-md right-md p-xs rounded hover:bg-red-50 text-content-secondary hover:text-state-error transition-colors"
                onClick={() => setUnassignId(item.id)}
                title="배정 해제"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-start gap-md">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Dumbbell size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-content truncate pr-xl">{item.programName}</p>
                  <div className="flex items-center gap-sm mt-xs flex-wrap">
                    {item.category && <StatusBadge variant="info">{item.category}</StatusBadge>}
                    {item.level && <StatusBadge variant={levelVariant(item.level)}>{item.level}</StatusBadge>}
                    <StatusBadge variant={item.status === "ACTIVE" ? "success" : "default"} dot>
                      {item.status === "ACTIVE" ? "진행중" : item.status === "COMPLETED" ? "완료" : "취소"}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-content-secondary mt-sm">
                    배정일: {item.assignedAt ? item.assignedAt.slice(0, 10) : "-"}
                    {item.assignedByName && ` · 배정자: ${item.assignedByName}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 프로그램 배정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[520px] overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <Dumbbell size={16} className="text-primary" />
                운동 프로그램 배정
              </h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-sm max-h-[400px] overflow-y-auto">
              {programs.length === 0 ? (
                <div className="flex items-center justify-center py-xl text-content-secondary text-[13px]">
                  등록된 운동 프로그램이 없습니다.
                </div>
              ) : (
                programs.map(prog => (
                  <div
                    key={prog.id}
                    className={cn(
                      "flex items-center gap-md p-md rounded-lg border cursor-pointer transition-all",
                      selectedProgramId === prog.id
                        ? "border-primary bg-primary/5"
                        : "border-line hover:border-primary/40 hover:bg-surface-secondary/40"
                    )}
                    onClick={() => setSelectedProgramId(prog.id)}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      selectedProgramId === prog.id ? "border-primary bg-primary" : "border-line"
                    )}>
                      {selectedProgramId === prog.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-content">{prog.name}</p>
                      <div className="flex items-center gap-xs mt-xs">
                        {prog.category && <span className="text-[11px] text-content-secondary">{prog.category}</span>}
                        {prog.level && <StatusBadge variant={levelVariant(prog.level)}>{prog.level}</StatusBadge>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-lg py-sm border border-line text-content-secondary rounded-button text-[13px] hover:bg-surface-secondary transition-colors" onClick={() => setShowModal(false)}>취소</button>
              <button
                className={cn("px-lg py-sm bg-primary text-white rounded-button text-[13px] font-bold hover:bg-primary-dark transition-colors shadow-sm", (assigning || !selectedProgramId) && "opacity-60 cursor-not-allowed")}
                onClick={handleAssign}
                disabled={assigning || !selectedProgramId}
              >
                {assigning ? "배정 중..." : "배정"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={unassignId !== null}
        title="프로그램 배정 해제"
        description="이 운동 프로그램 배정을 해제하시겠습니까?"
        confirmLabel="해제"
        variant="danger"
        onConfirm={handleUnassign}
        onCancel={() => setUnassignId(null)}
      />
    </div>
  );
}
