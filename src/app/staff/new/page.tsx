'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  FileCheck2,
  Check,
  ShieldCheck,
  KeyRound,
  BadgeCheck,
  Lock,
  Upload,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import FormSection from "@/components/common/FormSection";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { supabase } from "@/lib/supabase";
import { staffFormSchema, formatPhone } from "@/lib/validations";
import {
  findLinkedUser,
  generateTemporaryPassword,
  mapStaffFormRoleToUserRole,
  upsertStaffUserAccount,
  type StaffAccountStatus,
  type StaffFormRole,
} from "@/lib/staffAccountSync";

type StaffFormData = {
  name: string;
  role: StaffFormRole;
  position: string;
  contact: string;
  joinDate: string;
  email: string;
  username: string;
  memo: string;
  salary: string;
  accountStatus: Exclude<StaffAccountStatus, "RESIGNED">;
  temporaryPassword: string;
  forcePasswordChange: boolean;
};

type ExistingStaffRecord = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  position: string | null;
  hireDate: string | null;
  salary: number | null;
  branchId: number | null;
};

type StaffDocumentRecord = {
  id: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: string;
  uploadedBy: string | null;
  status: string;
};

const CONTRACT_MAX_BYTES = 10 * 1024 * 1024;
const CONTRACT_ACCEPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const ROLE_PERMISSIONS: Record<StaffFormRole, { label: string; desc: string; perms: string[] }> = {
  owner: {
    label: "센터장",
    desc: "지점 운영, 직원, 매출, 설정 전반을 통합 관리합니다.",
    perms: ["회원 전체 관리", "직원/권한 관리", "매출·환불 관리", "센터 설정"],
  },
  manager: {
    label: "매니저",
    desc: "운영 전반을 수행하지만 민감 설정과 최고 권한은 제외됩니다.",
    perms: ["회원 관리", "수업·스케줄 관리", "매출 통계 조회", "직원 조회"],
  },
  fc: {
    label: "FC",
    desc: "상담, 재등록, 결제 중심으로 CRM을 사용합니다.",
    perms: ["회원 상담", "결제 처리", "예약 확인", "담당 회원 관리"],
  },
  trainer: {
    label: "트레이너",
    desc: "담당 회원과 수업 스케줄 중심의 업무를 수행합니다.",
    perms: ["담당 회원 조회", "수업 스케줄 관리", "출석 확인", "수업 메모"],
  },
  staff: {
    label: "스태프",
    desc: "현장 접수, 출석, 기본 운영 업무를 처리합니다.",
    perms: ["회원 조회", "출석 확인", "현장 안내", "기본 POS 보조"],
  },
};

const ROLE_DB_TO_KEY: Record<string, StaffFormRole> = {
  센터장: "owner",
  매니저: "manager",
  FC: "fc",
  트레이너: "trainer",
  스태프: "staff",
  프론트: "staff",
};

const ROLE_KEY_TO_DB: Record<StaffFormRole, string> = {
  owner: "센터장",
  manager: "매니저",
  fc: "FC",
  trainer: "트레이너",
  staff: "스태프",
};

const DEFAULT_POSITION_BY_ROLE: Record<StaffFormRole, string> = {
  owner: "센터장",
  manager: "운영 매니저",
  fc: "FC",
  trainer: "트레이너",
  staff: "운영 스태프",
};

function inferAccountStatus(user: { isActive: boolean; lockedUntil: string | null } | null): "ACTIVE" | "LOCKED" {
  if (!user) return "ACTIVE";
  const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) return "LOCKED";
  return user.isActive ? "ACTIVE" : "LOCKED";
}

const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

const getOperatorName = () => {
  if (typeof window === "undefined") return "관리자";
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return "관리자";
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed.name || "관리자";
  } catch {
    return "관리자";
  }
};

function StaffForm() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id") ?? null;
  const isEditMode = Boolean(editId);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingStaff, setExistingStaff] = useState<ExistingStaffRecord | null>(null);
  const [linkedUserId, setLinkedUserId] = useState<number | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractDocuments, setContractDocuments] = useState<StaffDocumentRecord[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

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
      position: DEFAULT_POSITION_BY_ROLE.trainer,
      contact: "",
      joinDate: new Date().toISOString().split("T")[0],
      email: "",
      username: "",
      memo: "",
      salary: "",
      accountStatus: "ACTIVE",
      temporaryPassword: generateTemporaryPassword(),
      forcePasswordChange: true,
    },
    mode: "onBlur",
  });

  const watchedRole = watch("role");
  const watchedStatus = watch("accountStatus");
  const watchedForcePasswordChange = watch("forcePasswordChange");
  const roleInfo = ROLE_PERMISSIONS[watchedRole] || ROLE_PERMISSIONS.staff;
  const securitySummary = useMemo(
    () => [
      `${roleInfo.label} 권한 템플릿 연결`,
      `로그인 계정 상태: ${watchedStatus === "LOCKED" ? "잠금" : "활성"}`,
      watchedForcePasswordChange ? "첫 로그인 후 비밀번호 변경 강제" : "최초 비밀번호 유지",
    ],
    [roleInfo.label, watchedForcePasswordChange, watchedStatus]
  );

  const fetchStaffDocuments = async (staffId: number) => {
    setIsLoadingDocuments(true);
    const { data, error } = await supabase
      .from("staff_documents")
      .select("id, fileName, filePath, fileUrl, mimeType, fileSize, uploadedAt, uploadedBy, status")
      .eq("staffId", staffId)
      .eq("docType", "employment_contract")
      .order("uploadedAt", { ascending: false });
    setIsLoadingDocuments(false);

    if (error) {
      toast.error("근로계약서 첨부 이력을 불러오지 못했습니다.");
      return;
    }

    setContractDocuments((data ?? []).map((doc: Record<string, unknown>) => ({
      id: String(doc.id),
      fileName: String(doc.fileName ?? ""),
      filePath: String(doc.filePath ?? ""),
      fileUrl: String(doc.fileUrl ?? ""),
      mimeType: doc.mimeType == null ? null : String(doc.mimeType),
      fileSize: doc.fileSize == null ? null : Number(doc.fileSize),
      uploadedAt: String(doc.uploadedAt ?? ""),
      uploadedBy: doc.uploadedBy == null ? null : String(doc.uploadedBy),
      status: String(doc.status ?? "uploaded"),
    })));
  };

  const handleContractFileChange = (file: File | null) => {
    if (!file) {
      setContractFile(null);
      return;
    }
    if (!CONTRACT_ACCEPT_TYPES.includes(file.type)) {
      toast.error("근로계약서는 이미지(JPG/PNG/WebP) 또는 PDF만 첨부할 수 있습니다.");
      return;
    }
    if (file.size > CONTRACT_MAX_BYTES) {
      toast.error("근로계약서 파일은 10MB 이하만 첨부할 수 있습니다.");
      return;
    }
    setContractFile(file);
  };

  const uploadContractDocument = async (staffId: number, branchId: number, staffName: string, file: File) => {
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const path = `staff-contracts/${branchId}/${staffId}/${Date.now()}_${safeName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("files")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = supabase.storage.from("files").getPublicUrl(uploadData.path);
    const fileUrl = urlData.publicUrl;
    const { error: insertError } = await supabase.from("staff_documents").insert({
      staffId,
      branchId,
      docType: "employment_contract",
      fileName: file.name,
      filePath: uploadData.path,
      fileUrl,
      mimeType: file.type || null,
      fileSize: file.size,
      status: "uploaded",
      memo: `${staffName} 근로계약서 첨부`,
      uploadedBy: getOperatorName(),
    });

    if (insertError) return { error: insertError.message };
    return { url: fileUrl };
  };

  const handleDeleteContractDocument = async (doc: StaffDocumentRecord) => {
    const { error } = await supabase
      .from("staff_documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      toast.error("근로계약서 첨부 삭제에 실패했습니다.");
      return;
    }

    if (doc.filePath) {
      await supabase.storage.from("files").remove([doc.filePath]);
    }

    setContractDocuments(prev => prev.filter(item => item.id !== doc.id));
    toast.success("근로계약서 첨부를 삭제했습니다.");
  };

  useEffect(() => {
    const currentPosition = watch("position");
    if (!currentPosition || currentPosition === DEFAULT_POSITION_BY_ROLE[watchedRole]) {
      setValue("position", DEFAULT_POSITION_BY_ROLE[watchedRole], { shouldValidate: true });
    }
  }, [setValue, watch, watchedRole]);

  useEffect(() => {
    if (isEditMode) return;
    setValue("temporaryPassword", generateTemporaryPassword(), { shouldValidate: true });
  }, [isEditMode, setValue]);

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

      const staff = data as ExistingStaffRecord;
      setExistingStaff(staff);

      const branchId = Number(staff.branchId ?? 1);
      const linkedUser = await findLinkedUser({
        name: staff.name,
        email: staff.email ?? null,
        branchId,
      });

      setLinkedUserId(linkedUser?.id ?? null);

      reset({
        name: staff.name ?? "",
        role: ROLE_DB_TO_KEY[staff.role] ?? "staff",
        position: staff.position ?? DEFAULT_POSITION_BY_ROLE.staff,
        contact: staff.phone ?? "",
        joinDate: staff.hireDate ? staff.hireDate.slice(0, 10) : new Date().toISOString().split("T")[0],
        email: staff.email ?? "",
        username: linkedUser?.username ?? "",
        memo: "",
        salary: staff.salary ? String(staff.salary) : "",
        accountStatus: inferAccountStatus(linkedUser),
        temporaryPassword: "",
        forcePasswordChange: linkedUser?.forcePasswordChange ?? false,
      });

      void fetchStaffDocuments(staff.id);
    };

    void fetchStaff();
  }, [editId, reset]);

  const onSubmit = async (formData: StaffFormData) => {
    if (!isEditMode && !formData.temporaryPassword.trim()) {
      toast.error("신규 직원 계정의 임시 비밀번호를 입력하세요.");
      return;
    }

    setIsSaving(true);
    const branchId = Number(localStorage.getItem("branchId") ?? "1") || 1;
    const normalizedRole = ROLE_KEY_TO_DB[formData.role] || formData.role;

    const staffPayload = {
      name: formData.name.trim(),
      phone: formData.contact,
      email: formData.email.trim(),
      role: normalizedRole,
      position: formData.position.trim(),
      hireDate: formData.joinDate ? new Date(formData.joinDate).toISOString() : null,
      salary: formData.salary ? Number(formData.salary) : null,
      branchId,
      isActive: true,
      staffStatus: formData.accountStatus === "LOCKED" ? "LOCKED" : "ACTIVE",
    };

    let savedStaffId: number | null = null;

    try {
      if (isEditMode) {
        const { data: updatedStaff, error: updateError } = await supabase
          .from("staff")
          .update(staffPayload)
          .eq("id", editId)
          .select("id")
          .single();

        if (updateError) throw updateError;
        savedStaffId = Number(updatedStaff?.id ?? editId);
      } else {
        const { data: insertedStaff, error: insertError } = await supabase
          .from("staff")
          .insert(staffPayload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        savedStaffId = Number(insertedStaff?.id);
      }

      const accountResult = await upsertStaffUserAccount({
        existingUserId: linkedUserId,
        username: formData.username,
        password: formData.temporaryPassword || undefined,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        branchId,
        accountStatus: formData.accountStatus,
        forcePasswordChange: formData.forcePasswordChange,
      });

      let contractUploadNote = "";
      if (savedStaffId && contractFile) {
        const uploadResult = await uploadContractDocument(savedStaffId, branchId, formData.name.trim(), contractFile);
        if ("error" in uploadResult) {
          toast.error("직원 정보는 저장됐지만 근로계약서 첨부에 실패했습니다.", {
            description: uploadResult.error,
          });
        } else {
          contractUploadNote = " · 근로계약서 첨부 완료";
          setContractFile(null);
        }
      }

      const roleForPermission = mapStaffFormRoleToUserRole(formData.role);
      const successMessage = isEditMode
        ? "직원 정보와 로그인 계정이 함께 수정되었습니다."
        : "직원 등록과 로그인 계정 생성이 완료되었습니다.";

      toast.success(successMessage, {
        description: `${accountResult.user.username} · ${roleForPermission} · ${formData.accountStatus === "LOCKED" ? "잠금" : "활성"}${contractUploadNote}`,
      });

      if (!accountResult.authSynced) {
        toast.warning(
          "Supabase Auth 사용자 동기화는 건너뛰었습니다. SUPABASE_SERVICE_ROLE_KEY 설정을 확인하세요."
        );
      }

      if (!isEditMode && formData.forcePasswordChange) {
        toast.info("첫 로그인 후 비밀번호 변경이 강제됩니다.");
      }

      moveToPage(974);
    } catch (error) {
      if (!isEditMode && savedStaffId) {
        await supabase.from("staff").delete().eq("id", savedStaffId);
      }

      const message = error instanceof Error ? error.message : "직원 저장 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title={isEditMode ? "직원 정보 수정" : "직원 등록"}
        description={
          isEditMode
            ? "직원 정보, 로그인 계정, 권한 연결 상태를 함께 수정합니다."
            : "직원 등록과 동시에 로그인 계정을 생성하고 권한 템플릿을 연결합니다."
        }
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
              {isSaving ? "저장 중..." : isEditMode ? "수정 저장" : "직원 등록"}
            </button>
          </div>
        }
      />

      <div className="space-y-lg pb-xxl max-w-[960px]">
        <FormSection title="기본 정보" description="직원의 인사 정보와 운영 역할을 입력합니다.">
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
              <option value="owner">센터장</option>
              <option value="manager">매니저</option>
              <option value="fc">FC</option>
              <option value="trainer">트레이너</option>
              <option value="staff">스태프</option>
            </select>
            {errors.role && <p role="alert" className="text-Label text-state-error">{errors.role.message}</p>}
            <div className="mt-sm p-md bg-primary-light border border-primary/20 rounded-input">
              <div className="flex items-center gap-xs mb-xs">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-Label font-semibold text-primary">{roleInfo.label} 권한</span>
              </div>
              <p className="text-Label text-content-secondary mb-sm">{roleInfo.desc}</p>
              <div className="flex flex-wrap gap-xs">
                {roleInfo.perms.map((permission) => (
                  <span key={permission} className="flex items-center gap-[3px] text-[11px] text-primary bg-white border border-primary/20 px-xs py-[2px] rounded-full">
                    <Check size={10} />
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              직책 <span className="text-state-error">*</span>
            </label>
            <input
              {...register("position")}
              placeholder="운영 매니저"
              aria-required="true"
              aria-invalid={!!errors.position}
              className={cn(
                "w-full px-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                errors.position ? "border-state-error focus:ring-state-error/30" : "border-line"
              )}
            />
            {errors.position && <p role="alert" className="text-Label text-state-error">{errors.position.message}</p>}
          </div>

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
                  void trigger("contact");
                }}
                onBlur={() => void trigger("contact")}
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

        <FormSection title="로그인 계정" description="직원 등록과 동시에 로그인 계정을 1:1로 발급합니다.">
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              로그인 ID <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                {...register("username")}
                placeholder="manager.gangnam"
                aria-required="true"
                aria-invalid={!!errors.username}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.username ? "border-state-error focus:ring-state-error/30" : "border-line"
                )}
              />
            </div>
            <p className="text-[11px] text-content-secondary">영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.</p>
            {errors.username && <p role="alert" className="text-Label text-state-error">{errors.username.message}</p>}
          </div>

          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              이메일 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                {...register("email")}
                type="email"
                placeholder="manager@center.com"
                aria-invalid={!!errors.email}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.email ? "border-state-error focus:ring-state-error/30" : "border-line"
                )}
              />
            </div>
            {errors.email && <p role="alert" className="text-Label text-state-error">{errors.email.message}</p>}
          </div>

          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              {isEditMode ? "임시 비밀번호 재발급" : "임시 비밀번호"} {!isEditMode && <span className="text-state-error">*</span>}
            </label>
            <div className="relative">
              <Lock className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                {...register("temporaryPassword")}
                type="text"
                placeholder={isEditMode ? "비워두면 기존 비밀번호 유지" : "임시 비밀번호 자동 생성"}
                className="w-full pl-[40px] pr-md py-md bg-surface-secondary border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-content-secondary">
              <span>{isEditMode ? "재발급 시 직원의 기존 비밀번호가 교체됩니다." : "저장 후 직원에게 전달할 첫 로그인용 비밀번호입니다."}</span>
              <button
                type="button"
                className="text-primary font-medium"
                onClick={() => setValue("temporaryPassword", generateTemporaryPassword(), { shouldValidate: true })}
              >
                새 비밀번호 생성
              </button>
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              계정 상태 <span className="text-state-error">*</span>
            </label>
            <select
              {...register("accountStatus")}
              className="w-full px-md py-md bg-surface-secondary border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="ACTIVE">활성</option>
              <option value="LOCKED">잠금</option>
            </select>
            <p className="text-[11px] text-content-secondary">잠금 상태는 저장 즉시 로그인 차단으로 반영됩니다.</p>
          </div>

          <div className="rounded-input border border-line bg-surface-secondary p-md">
            <label className="flex items-start gap-sm cursor-pointer">
              <input type="checkbox" className="mt-[2px]" {...register("forcePasswordChange")} />
              <div className="space-y-[2px]">
                <span className="text-Label font-semibold text-content">첫 로그인 후 비밀번호 변경 강제</span>
                <p className="text-[11px] text-content-secondary">
                  임시 비밀번호 유출 위험을 줄이기 위해 신규 계정은 기본적으로 첫 로그인 후 비밀번호를 다시 설정하게 합니다.
                </p>
              </div>
            </label>
          </div>

          <div className="rounded-card border border-primary/20 bg-primary-light/50 p-md">
            <div className="flex items-center gap-xs mb-xs">
              <BadgeCheck size={14} className="text-primary" />
              <span className="text-Label font-semibold text-primary">보안/접근 요약</span>
            </div>
            <div className="flex flex-wrap gap-xs">
              {securitySummary.map((item) => (
                <span key={item} className="rounded-full border border-primary/20 bg-white px-sm py-[3px] text-[11px] text-primary">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-sm text-[11px] text-content-secondary">
              권한 상세는 <span className="font-medium text-content">설정 &gt; 권한 설정</span>에서 템플릿별로 조정하고, 직원 등록 화면에서는 해당 템플릿을 사용할 직원 계정만 발급합니다.
            </p>
          </div>
        </FormSection>

        <FormSection title="근로계약서 (선택)" description="서명된 근로계약서 이미지 또는 PDF를 직원 인사 파일로 보관합니다.">
          <div className="space-y-md md:col-span-2">
            <div className="rounded-input border border-line bg-surface-secondary p-md">
              <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-xs">
                    <FileCheck2 size={16} className="text-primary" />
                    <p className="text-Label font-semibold text-content">계약서 파일 첨부</p>
                  </div>
                  <p className="mt-xs text-[11px] text-content-secondary">
                    JPG, PNG, WebP, PDF 파일을 10MB 이하로 첨부할 수 있습니다. 자동 발송은 정책 확정 전이므로 파일 보관만 처리합니다.
                  </p>
                </div>
                <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-[13px] font-semibold text-content-secondary transition-colors hover:bg-surface-tertiary">
                  <Upload size={15} />
                  파일 선택
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => handleContractFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {contractFile && (
                <div className="mt-md flex flex-col gap-sm rounded-card border border-primary/20 bg-white p-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-content">{contractFile.name}</p>
                    <p className="text-[11px] text-content-secondary">{formatFileSize(contractFile.size)} · 저장 버튼 클릭 시 업로드</p>
                  </div>
                  <button
                    type="button"
                    className="self-start rounded-button px-sm py-xs text-[12px] font-semibold text-state-error hover:bg-red-50 sm:self-auto"
                    onClick={() => setContractFile(null)}
                  >
                    선택 취소
                  </button>
                </div>
              )}
            </div>

            {isEditMode && (
              <div className="rounded-input border border-line bg-surface p-md">
                <div className="mb-sm flex items-center justify-between">
                  <p className="text-Label font-semibold text-content">기존 첨부 이력</p>
                  <span className="text-[11px] text-content-secondary">
                    {isLoadingDocuments ? "불러오는 중" : `${contractDocuments.length}건`}
                  </span>
                </div>
                {contractDocuments.length === 0 ? (
                  <p className="rounded-card bg-surface-secondary px-md py-sm text-[12px] text-content-secondary">
                    저장된 근로계약서 첨부가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-sm">
                    {contractDocuments.map((doc) => (
                      <div key={doc.id} className="flex flex-col gap-sm rounded-card border border-line bg-surface-secondary p-md sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-content">{doc.fileName}</p>
                          <p className="text-[11px] text-content-secondary">
                            {formatFileSize(doc.fileSize)} · {doc.uploadedAt ? doc.uploadedAt.slice(0, 10) : "-"} · {doc.uploadedBy ?? "관리자"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-xs">
                          <button
                            type="button"
                            className="inline-flex items-center gap-[4px] rounded-button border border-line bg-surface px-sm py-xs text-[12px] font-semibold text-content-secondary hover:bg-white"
                            onClick={() => window.open(doc.fileUrl, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink size={13} />
                            보기
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-[4px] rounded-button border border-state-error/30 bg-red-50 px-sm py-xs text-[12px] font-semibold text-state-error hover:bg-red-100"
                            onClick={() => handleDeleteContractDocument(doc)}
                          >
                            <Trash2 size={13} />
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="추가 정보" description="운영 메모를 남길 수 있습니다.">
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

          {existingStaff && (
            <div className="rounded-input border border-line bg-surface-secondary p-md text-[11px] text-content-secondary">
              기존 직원 데이터: {existingStaff.name} · 지점 {existingStaff.branchId ?? "-"} · 기존 연결 계정 {linkedUserId ? "존재" : "미확인"}
            </div>
          )}
        </FormSection>
      </div>

      <ConfirmDialog
        open={showCancelDialog}
        title={isEditMode ? "수정 취소" : "등록 취소"}
        description="입력 중인 내용이 저장되지 않습니다. 정말 취소하시겠습니까?"
        confirmLabel="네, 취소합니다"
        cancelLabel="계속 작성하기"
        variant="danger"
        onConfirm={() => {
          setShowCancelDialog(false);
          moveToPage(974);
        }}
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
