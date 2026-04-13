'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, User, Phone, Mail, Calendar, FileText, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import FormSection from "@/components/common/FormSection";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { supabase } from "@/lib/supabase";
import { staffFormSchema, formatPhone } from "@/lib/validations";

// 폼 내부에서 사용하는 타입 - optional 필드를 string으로 확정
type StaffFormData = {
  name: string;
  role: string;
  contact: string;
  joinDate: string;
  email: string;
  memo: string;
  salary: string;
};

// 역할별 권한 미리보기
const ROLE_PERMISSIONS: Record<string, { label: string; desc: string; perms: string[] }> = {
  owner:   { label: "센터장",   desc: "지점 내 전체 데이터 접근 및 관리",         perms: ["회원 전체 관리", "직원 관리", "급여 확정", "매출 통계", "설정 변경"] },
  manager: { label: "매니저",   desc: "운영 전반 관리 및 주요 기능 접근",         perms: ["회원 관리", "스케줄 관리", "매출 통계 조회", "직원 조회"] },
  fc:      { label: "FC",       desc: "상담·결제 및 매출 통계 접근",             perms: ["회원 상담", "결제 처리", "매출 통계 조회"] },
  trainer: { label: "트레이너", desc: "담당 회원 관리 및 수업 스케줄 관리",       perms: ["담당 회원 조회", "수업 스케줄 관리", "출석 체크"] },
  staff:   { label: "스태프",   desc: "기본 회원 조회 및 출석 확인",             perms: ["회원 조회", "출석 확인"] },
};

// DB role 한글 → 폼 영문 키 매핑
const ROLE_DB_TO_KEY: Record<string, string> = {
  센터장: "owner", 매니저: "manager", FC: "fc", 트레이너: "trainer", 스태프: "staff",
};

function StaffForm() {
  // URL 쿼리 파라미터로 수정 모드 감지
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id") ?? null;
  const isEditMode = !!editId;

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<StaffFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(staffFormSchema) as any,
    defaultValues: {
      name: "",
      role: "trainer",
      contact: "",
      joinDate: new Date().toISOString().split("T")[0],
      email: "",
      memo: "",
    },
    mode: "onBlur",
  });

  const watchedRole = watch("role");

  // 수정 모드: 기존 직원 데이터 로드
  useEffect(() => {
    if (!editId) return;
    const fetchStaff = async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", editId)
        .single();
      if (error || !data) {
        toast.error("직원 정보를 불러오지 못했습니다.");
        return;
      }
      reset({
        name: data.name ?? "",
        role: ROLE_DB_TO_KEY[data.role] ?? data.role ?? "staff",
        contact: data.phone ?? "",
        joinDate: data.hireDate ? data.hireDate.slice(0, 10) : new Date().toISOString().split("T")[0],
        email: data.email ?? "",
        memo: "",
      });
    };
    fetchStaff();
  }, [editId, reset]);

  const onSubmit = async (formData: StaffFormData) => {
    setIsSaving(true);
    const branchId = getBranchId();
    // 폼 영문 키 → DB 한글 역할명 매핑
    const ROLE_MAP: Record<string, string> = {
      owner: "센터장", manager: "매니저", fc: "FC", trainer: "트레이너", staff: "스태프",
    };
    const staffData = {
      name: formData.name,
      phone: formData.contact,
      email: formData.email || null,
      role: ROLE_MAP[formData.role] || formData.role,
      hireDate: formData.joinDate ? new Date(formData.joinDate).toISOString() : null,
      salary: formData.salary ? Number(formData.salary) : null,
      branchId,
    };

    if (isEditMode) {
      // 수정 모드: 기존 레코드 업데이트
      const { error } = await supabase
        .from("staff")
        .update(staffData)
        .eq("id", editId);
      setIsSaving(false);
      if (error) { toast.error("수정 실패: " + error.message); return; }
      toast.success("직원 정보가 수정되었습니다.");
    } else {
      // 등록 모드: 새 레코드 삽입
      const { error } = await supabase.from("staff").insert(staffData);
      setIsSaving(false);
      if (error) { toast.error("저장 실패: " + error.message); return; }
      toast.success("직원이 성공적으로 등록되었습니다.");
    }
    moveToPage(974);
  };

  const roleInfo = ROLE_PERMISSIONS[watchedRole] || ROLE_PERMISSIONS.staff;

  return (
    <AppLayout>
      <PageHeader
        title={isEditMode ? "직원 정보 수정" : "직원 등록"}
        description={isEditMode ? "직원의 정보를 수정하고 저장합니다." : "새로운 직원 정보를 입력하고 역할을 설정합니다."}
        actions={
          <div className="flex gap-sm">
            <button
              className="px-lg py-sm rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium"
              onClick={() => setShowCancelDialog(true)}
            >
              취소
            </button>
            <button
              className="flex items-center gap-xs px-lg py-sm rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
            >
              <Save size={16} />
              {isSaving ? "저장 중..." : isEditMode ? "수정 저장" : "저장하기"}
            </button>
          </div>
        }
      />

      <div className="space-y-lg pb-xxl max-w-[860px]">
        {/* 기본 정보 */}
        <FormSection title="기본 정보" description="직원의 이름, 역할, 연락처를 입력합니다.">
          {/* 이름 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              이름 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                {...register("name")}
                placeholder="홍길동"
                aria-required="true"
                aria-invalid={!!errors.name}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.name ? "border-state-error focus:ring-state-error/30" : "border-line"
                )}
              />
            </div>
            {errors.name && <p role="alert" className="text-Label text-state-error">{errors.name.message}</p>}
          </div>

          {/* 역할 선택 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              역할 <span className="text-state-error">*</span>
            </label>
            <select
              {...register("role")}
              aria-required="true"
              aria-invalid={!!errors.role}
              className={cn(
                "w-full px-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer",
                errors.role ? "border-state-error" : "border-line"
              )}
            >
              <option value="">역할 선택</option>
              <option value="owner">센터장</option>
              <option value="manager">매니저</option>
              <option value="fc">FC</option>
              <option value="trainer">트레이너</option>
              <option value="staff">스태프</option>
            </select>
            {errors.role && <p role="alert" className="text-Label text-state-error">{errors.role.message}</p>}
            {/* 역할 권한 미리보기 */}
            {watchedRole && (
              <div className="mt-sm p-md bg-primary-light border border-primary/20 rounded-input">
                <div className="flex items-center gap-xs mb-xs">
                  <ShieldCheck size={14} className="text-primary" />
                  <span className="text-Label font-semibold text-primary">{roleInfo.label} 권한</span>
                </div>
                <p className="text-Label text-content-secondary mb-sm">{roleInfo.desc}</p>
                <div className="flex flex-wrap gap-xs">
                  {roleInfo.perms.map(p => (
                    <span key={p} className="flex items-center gap-[3px] text-[11px] text-primary bg-white border border-primary/20 px-xs py-[2px] rounded-full">
                      <Check size={10} />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 연락처 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              연락처 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                value={watch("contact")}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setValue("contact", formatted);
                  trigger("contact");
                }}
                onBlur={() => trigger("contact")}
                placeholder="010-0000-0000"
                maxLength={13}
                aria-required="true"
                aria-invalid={!!errors.contact}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.contact ? "border-state-error focus:ring-state-error/30" : "border-line"
                )}
              />
            </div>
            {errors.contact && <p role="alert" className="text-Label text-state-error">{errors.contact.message}</p>}
          </div>

          {/* 입사일 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              입사일 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                {...register("joinDate")}
                type="date"
                aria-required="true"
                aria-invalid={!!errors.joinDate}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.joinDate ? "border-state-error focus:ring-state-error/30" : "border-line"
                )}
              />
            </div>
            {errors.joinDate && <p role="alert" className="text-Label text-state-error">{errors.joinDate.message}</p>}
          </div>

          {/* 기본급 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">기본급</label>
            <input
              {...register("salary")}
              type="number"
              placeholder="원 단위"
              className="w-full px-md py-md bg-surface-secondary border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </FormSection>

        {/* 추가 정보 (선택) */}
        <FormSection title="추가 정보" description="이메일과 메모는 선택 항목입니다.">
          {/* 이메일 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">이메일</label>
            <div className="relative">
              <Mail className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                {...register("email")}
                type="email"
                placeholder="example@center.com"
                aria-invalid={!!errors.email}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.email ? "border-state-error focus:ring-state-error/30" : "border-line"
                )}
              />
            </div>
            {errors.email && <p role="alert" className="text-Label text-state-error">{errors.email.message}</p>}
          </div>

          {/* 메모 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">메모</label>
            <div className="relative">
              <FileText className="absolute left-md top-[14px] text-content-secondary" size={16} />
              <textarea
                {...register("memo")}
                placeholder="특이사항이나 참고 내용을 입력하세요"
                rows={3}
                className="w-full pl-[40px] pr-md py-md bg-surface-secondary border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
            </div>
            {errors.memo && <p className="text-Label text-state-error">{errors.memo.message}</p>}
          </div>
        </FormSection>
      </div>

      <ConfirmDialog
        open={showCancelDialog}
        title={isEditMode ? "수정 취소" : "등록 취소"}
        description="입력 중인 내용이 저장되지 않습니다. 정말 취소하시겠습니까?"
        confirmLabel="네, 취소합니다"
        cancelLabel="계속 작성하기"
        variant="danger"
        onConfirm={() => { setShowCancelDialog(false); moveToPage(974); }}
        onCancel={() => setShowCancelDialog(false)}
      />
    </AppLayout>
  );
}

export default function StaffFormPage() {
  return (
    <React.Suspense>
      <StaffForm />
    </React.Suspense>
  );
}
