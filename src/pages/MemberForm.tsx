import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  X,
  CheckCircle2,
  Camera,
  Mail,
  Building,
  Hash,
  FileText,
  Search,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { useCreateMember } from "@/api/hooks/useMembers";
import { supabase } from "@/lib/supabase";
import { checkDuplicateMember } from "@/lib/businessLogic";
import { uploadFile } from "@/lib/uploadFile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  memberFormSchema,
  type MemberFormData,
  formatPhone,
} from "@/lib/validations";

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";

// ────────────────────────────────────────────────────────────
// 주소 Mock (DB에 없으므로 하드코딩 유지)
// ────────────────────────────────────────────────────────────

const SAMPLE_ADDRESSES = [
  { postcode: "04524", address: "서울시 중구 세종대로 110" },
  { postcode: "06236", address: "서울시 강남구 테헤란로 123" },
  { postcode: "03181", address: "서울시 종로구 종로 1" },
  { postcode: "07328", address: "서울시 영등포구 여의대로 108" },
  { postcode: "04539", address: "서울시 중구 남대문로 81" },
];

// ────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────────────────────

function Field({
  label,
  required = false,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="text-[13px] font-semibold text-content flex items-center gap-xs">
        {label}
        {required && <span className="text-state-error">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-content-secondary">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-center gap-xs text-[11px] text-state-error">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────

interface StaffOption {
  value: string;
  label: string;
}

export default function MemberForm() {
  const createMember = useCreateMember();
  const [currentStep, setCurrentStep] = useState<"step1" | "step2">("step1");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [fcList, setFcList] = useState<StaffOption[]>([{ value: "", label: "선택 안함" }]);
  const [trainerList, setTrainerList] = useState<StaffOption[]>([{ value: "", label: "선택 안함" }]);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 주소 검색 모달
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<{ postcode: string; address: string }[]>([]);

  // ── react-hook-form 설정 ──
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors, isDirty },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema) as import('react-hook-form').Resolver<MemberFormData>,
    defaultValues: {
      profileImage: null,
      name: "",
      gender: undefined,
      birthDate: "",
      height: "",
      phone: "",
      email: "",
      address: "",
      addressDetail: "",
      notes: "",
      fc: "",
      trainer: "",
      memberType: "일반",
      visitPath: "",
      exerciseGoal: "",
      nickname: "",
      company: "",
      marketingConsent: false,
      attendanceNumber: "",
    },
    mode: "onBlur",
  });

  const watchedValues = watch();
  const notesLength = watchedValues.notes?.length ?? 0;

  // staff 목록 로드
  useEffect(() => {
    const fetchStaff = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('branchId', getBranchId());
      if (!error && data) {
        const fcs = data
          .filter((s: Record<string, unknown>) => s.role === 'FC')
          .map((s: Record<string, unknown>) => ({ value: String(s.name), label: String(s.name) }));
        const trainers = data
          .filter((s: Record<string, unknown>) => s.role === '트레이너')
          .map((s: Record<string, unknown>) => ({ value: String(s.name), label: String(s.name) }));
        setFcList([{ value: "", label: "선택 안함" }, ...fcs]);
        setTrainerList([{ value: "", label: "선택 안함" }, ...trainers]);
      }
    };
    fetchStaff();
  }, []);

  // ── 수정 모드: URL에서 memberId 추출 후 실제 DB 데이터 로드 ──
  const urlMemberId = new URLSearchParams(window.location.search).get('id');
  useEffect(() => {
    if (!window.location.pathname.includes("/edit") || !urlMemberId) return;
    setIsEditMode(true);
    const fetchMember = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', urlMemberId)
        .single();
      if (error || !data) {
        toast.error("회원 정보를 불러올 수 없습니다.");
        return;
      }
      reset({
        name: data.name ?? "",
        gender: data.gender === 'M' ? 'male' : data.gender === 'F' ? 'female' : undefined,
        phone: data.phone ?? "",
        memberType: data.membershipType ?? "일반",
        birthDate: data.birthDate ? data.birthDate.slice(0, 10) : "",
        height: data.height ? String(data.height) : "",
        email: data.email ?? "",
        notes: data.memo ?? "",
        profileImage: null,
        address: "",
        addressDetail: "",
        fc: "",
        trainer: "",
        visitPath: "",
        exerciseGoal: "",
        nickname: "",
        company: "",
        marketingConsent: false,
        attendanceNumber: "",
      });
      setPhoneChecked(true);
    };
    fetchMember();
  }, [urlMemberId, reset]);

  // ── 핸들러 ──

  const handleGender = (g: "male" | "female") => {
    setValue("gender", g, { shouldDirty: true });
    trigger("gender");
  };

  const handlePhoneCheck = async () => {
    const phone = watchedValues.phone;
    const isPhoneValid = await trigger("phone");
    if (!isPhoneValid) return;

    // 실제 Supabase 중복 조회
    let query = supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .is('deletedAt', null);
    // 수정 모드일 때 자기 자신 제외
    if (isEditMode && urlMemberId) {
      query = query.neq('id', urlMemberId);
    }
    const { data, error } = await query;
    if (error) {
      toast.error("중복확인 중 오류가 발생했습니다.");
      return;
    }
    if (data && data.length > 0) {
      // 필드 에러를 수동으로 표시하기 위해 trigger 후 에러 상태는 phoneChecked로 관리
      toast.error("이미 등록된 전화번호입니다.");
    } else {
      setPhoneChecked(true);
      toast.success("사용 가능한 번호입니다.");
    }
  };

  const handleNext = async () => {
    const step1Fields: (keyof MemberFormData)[] = ["name", "gender", "phone", "memberType", "birthDate", "height"];
    const valid = await trigger(step1Fields);
    if (!valid) return;
    if (!isEditMode && !phoneChecked) {
      toast.error("전화번호 중복확인이 필요합니다.");
      return;
    }
    setCurrentStep("step2");
    window.scrollTo(0, 0);
  };

  const handlePrev = () => {
    setCurrentStep("step1");
    window.scrollTo(0, 0);
  };

  const handleSave = handleSubmit(async (data) => {
    setIsSubmitting(true);

    // 전화번호 중복 확인
    const dupCheck = await checkDuplicateMember(data.phone, isEditMode && urlMemberId ? Number(urlMemberId) : undefined);
    if (dupCheck.isDuplicate) {
      toast.error(`이미 등록된 전화번호입니다. (${dupCheck.existingName})`);
      setIsSubmitting(false);
      return;
    }

    const memberPayload = {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      gender: data.gender === "male" ? "M" : "F",
      birthDate: data.birthDate || null,
      membershipType: data.memberType,
      height: data.height ? parseFloat(data.height) : null,
      memo: data.notes || null,
    };

    try {
      if (isEditMode && urlMemberId) {
        const { error } = await supabase
          .from('members')
          .update(memberPayload)
          .eq('id', urlMemberId);
        if (error) throw new Error(error.message);
        toast.success("회원 정보가 수정되었습니다.");
        moveToPage(985, { id: urlMemberId });
      } else {
        createMember.mutate(
          {
            name: memberPayload.name,
            phone: memberPayload.phone,
            email: memberPayload.email || undefined,
            gender: memberPayload.gender as "M" | "F",
            birthDate: memberPayload.birthDate || undefined,
            membershipType: memberPayload.membershipType,
            memo: memberPayload.memo || undefined,
            height: memberPayload.height ?? undefined,
            status: "ACTIVE",
          },
          {
            onSuccess: (res) => {
              if (res.success) {
                const newId = res.data?.id;
                toast.success("신규 회원이 등록되었습니다.", {
                  action: {
                    label: "바로 결제",
                    onClick: () => moveToPage(972, { memberId: newId }),
                  },
                  duration: 5000,
                });
                moveToPage(985, { id: newId });
              } else {
                toast.error(res.message ?? "저장에 실패했습니다.");
              }
            },
            onError: (err: unknown) => {
              const msg = err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.";
              toast.error(msg);
            },
          }
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleResetClick = () => {
    if (!isDirty && !phoneChecked) return;
    setShowResetDialog(true);
  };

  const handleResetConfirm = () => {
    reset({
      profileImage: null, name: "", gender: undefined, phone: "", memberType: "일반",
      birthDate: "", height: "", trainer: "", fc: "", visitPath: "", exerciseGoal: "",
      nickname: "", email: "", address: "", addressDetail: "", company: "",
      marketingConsent: false, notes: "", attendanceNumber: "",
    });
    setPhoneChecked(false);
    setCurrentStep("step1");
    setShowResetDialog(false);
    toast.success("입력 내용이 초기화되었습니다.");
  };

  const handleCancelClick = () => {
    if (isDirty) setShowCancelDialog(true);
    else moveToPage(967);
  };

  // 프로필 이미지 업로드
  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    const branchId = getBranchId();
    const timestamp = Date.now();
    const path = `members/${branchId}/${timestamp}_${file.name}`;

    setIsUploadingImage(true);
    const result = await uploadFile('profiles', path, file);
    setIsUploadingImage(false);

    if ('error' in result) {
      toast.error(`이미지 업로드 실패: ${result.error}`);
    } else {
      setValue('profileImage', result.url, { shouldDirty: true });
      toast.success('프로필 이미지가 등록되었습니다.');
    }

    // input 초기화 (같은 파일 재선택 허용)
    e.target.value = '';
  };

  // 주소 검색
  const handleAddressSearch = () => {
    if (!addressQuery.trim()) return;
    const q = addressQuery.toLowerCase();
    const res = SAMPLE_ADDRESSES.filter(a => a.address.toLowerCase().includes(q));
    setAddressResults(res.length > 0 ? res : [{ postcode: "00000", address: "검색 결과가 없습니다." }]);
  };

  const handleAddressSelect = (item: { postcode: string; address: string }) => {
    if (item.postcode === "00000") return;
    setValue("address", `[${item.postcode}] ${item.address}`, { shouldDirty: true });
    setIsAddressModalOpen(false);
    setAddressQuery("");
    setAddressResults([]);
  };

  // ── 저장 버튼 활성화 조건 ──
  const step1CanNext =
    !errors.name &&
    !errors.gender &&
    !errors.phone &&
    !errors.memberType &&
    watchedValues.name &&
    watchedValues.gender &&
    watchedValues.phone &&
    watchedValues.memberType &&
    (isEditMode || phoneChecked);

  const step2CanSave = !errors.email && !errors.notes && notesLength <= 500;

  // 글자수 카운터 색상
  const notesColor = notesLength > 450
    ? notesLength > 500 ? "text-state-error" : "text-state-warning"
    : "text-content-secondary";

  // ── 공통 입력 클래스 ──
  const inputCls = (hasError: boolean) =>
    cn(
      "w-full rounded-input border px-md py-sm text-[13px] text-content outline-none focus:ring-2 transition-all",
      hasError
        ? "border-state-error bg-red-50 focus:ring-state-error/20"
        : "border-line bg-surface-secondary focus:ring-primary/20"
    );

  return (
    <AppLayout>
      <div className="max-w-[720px] mx-auto pb-xxl">
        {/* 헤더 */}
        <PageHeader
          title={isEditMode ? "회원 정보 수정" : "신규 회원 등록"}
          description={isEditMode ? "기존 회원의 정보를 수정합니다." : "새로운 회원을 시스템에 등록합니다."}
          actions={
            <div className="flex gap-sm">
              <button
                onClick={handleResetClick}
                className="flex items-center gap-xs px-md py-sm rounded-button text-content-secondary hover:bg-surface-secondary border border-line transition-colors text-[13px]"
              >
                <RotateCcw size={15} />
                초기화
              </button>
              <button
                onClick={handleCancelClick}
                className="flex items-center gap-xs px-md py-sm rounded-button border border-line text-content-secondary hover:bg-surface-secondary transition-colors text-[13px]"
              >
                <X size={15} />
                {/* UI-037 취소 버튼: 변경사항 있을 시 확인 */}
                취소
              </button>
            </div>
          }
        />

        {/* 스텝 네비게이션 */}
        <div className="mb-lg">
          <TabNav
            tabs={[
              { key: "step1", label: "Step 1. 필수 정보", icon: User },
              { key: "step2", label: "Step 2. 추가 정보", icon: FileText },
            ]}
            activeTab={currentStep}
            onTabChange={async (key) => {
              if (key === "step2") {
                const step1Fields: (keyof MemberFormData)[] = ["name", "gender", "phone", "memberType", "birthDate", "height"];
                const valid = await trigger(step1Fields);
                if (!valid) return;
                if (!isEditMode && !phoneChecked) return;
              }
              setCurrentStep(key as "step1" | "step2");
            }}
          />
        </div>

        {/* 폼 본문 */}
        <div className="space-y-lg">
          {currentStep === "step1" ? (
            <>
              {/* 프로필 이미지 */}
              <div className="flex justify-center mb-xl">
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                  <div
                    className="w-[120px] h-[120px] rounded-full bg-surface-secondary border-2 border-dashed border-line flex flex-col items-center justify-center overflow-hidden group cursor-pointer hover:border-primary transition-colors"
                    onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="text-primary animate-spin" size={30} />
                    ) : watchedValues.profileImage ? (
                      <img className="w-full h-full object-cover" src={watchedValues.profileImage} alt="프로필" />
                    ) : (
                      <>
                        <Camera className="text-content-tertiary group-hover:text-primary transition-colors" size={30} />
                        <span className="text-[10px] text-content-tertiary mt-xs">사진 등록</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-sm bg-surface rounded-full shadow-card border border-line text-content-secondary hover:text-primary transition-colors"
                    onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    <Camera size={14} />
                  </button>
                </div>
              </div>

              {/* UI-028~031: 기본 인적사항 */}
              <FormSection title="기본 인적 사항" columns={2}>
                {/* UI-028 이름 */}
                <Field label="이름" required error={errors.name?.message} hint="한글/영문/한자 2~20자">
                  <input
                    className={inputCls(!!errors.name)}
                    type="text"
                    placeholder="이름을 입력하세요"
                    maxLength={20}
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                </Field>

                {/* UI-029 성별 */}
                <Field label="성별" required error={errors.gender?.message}>
                  <div className="flex gap-sm">
                    {[
                      { value: "male", label: "남성" },
                      { value: "female", label: "여성" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          "flex-1 py-sm rounded-button border text-[13px] font-medium transition-all",
                          watchedValues.gender === opt.value
                            ? "bg-primary text-white border-primary"
                            : "border-line text-content-secondary hover:bg-surface-secondary"
                        )}
                        onClick={() => handleGender(opt.value as "male" | "female")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* UI-031 연락처 */}
                <Field label="연락처" required error={errors.phone?.message} hint="010-xxxx-xxxx 형식">
                  <div className="flex gap-sm">
                    <input
                      className={cn(inputCls(!!errors.phone), "flex-1")}
                      type="tel"
                      placeholder="010-0000-0000"
                      maxLength={13}
                      aria-required="true"
                      aria-invalid={!!errors.phone}
                      {...register("phone", {
                        onChange: (e) => {
                          const formatted = formatPhone(e.target.value);
                          setValue("phone", formatted, { shouldDirty: true });
                          if (phoneChecked) setPhoneChecked(false);
                        },
                      })}
                    />
                    <button
                      type="button"
                      className={cn(
                        "px-md rounded-button text-[12px] font-semibold transition-all shrink-0",
                        phoneChecked
                          ? "bg-state-success text-white cursor-default"
                          : "bg-content text-white hover:bg-black active:scale-95"
                      )}
                      onClick={handlePhoneCheck}
                      disabled={phoneChecked}
                    >
                      {phoneChecked ? <CheckCircle2 size={16} /> : "중복확인"}
                    </button>
                  </div>
                </Field>

                {/* 회원구분 */}
                <Field label="회원구분" required error={errors.memberType?.message}>
                  <select
                    className={inputCls(!!errors.memberType)}
                    aria-required="true"
                    aria-invalid={!!errors.memberType}
                    {...register("memberType")}
                  >
                    <option value="일반">일반</option>
                    <option value="기명법인">기명법인</option>
                    <option value="무기명법인">무기명법인</option>
                  </select>
                </Field>

                {/* UI-030 생년월일 */}
                <Field
                  label="생년월일"
                  error={errors.birthDate?.message}
                  hint="미래 날짜 입력 불가"
                >
                  <div className="relative">
                    <input
                      className={inputCls(!!errors.birthDate)}
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      aria-invalid={!!errors.birthDate}
                      {...register("birthDate")}
                    />
                    <Calendar className="absolute right-md top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" size={16} />
                  </div>
                </Field>

                {/* 키 (cm) */}
                <Field label="키" error={errors.height?.message} hint="100~250cm">
                  <div className="relative">
                    <input
                      className={inputCls(!!errors.height)}
                      type="number"
                      placeholder="예: 175"
                      min={100}
                      max={250}
                      step={0.1}
                      aria-invalid={!!errors.height}
                      {...register("height")}
                    />
                    <span className="absolute right-md top-1/2 -translate-y-1/2 text-content-tertiary text-[13px] pointer-events-none">cm</span>
                  </div>
                </Field>
              </FormSection>

              {/* 관리 정보 */}
              <FormSection title="관리 정보" columns={2}>
                {/* UI-035 담당자(FC) */}
                <Field label="담당 FC">
                  <select
                    className={inputCls(false)}
                    {...register("fc")}
                  >
                    {fcList.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="담당 트레이너">
                  <select
                    className={inputCls(false)}
                    {...register("trainer")}
                  >
                    {trainerList.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="방문 경로">
                  <select className={inputCls(false)} {...register("visitPath")}>
                    <option value="">선택 안함</option>
                    <option value="지인추천">지인추천</option>
                    <option value="SNS">SNS (인스타그램/페이스북)</option>
                    <option value="인터넷검색">인터넷 검색</option>
                    <option value="전단지">전단지/현수막</option>
                    <option value="기타">기타</option>
                  </select>
                </Field>

                <Field label="운동 목적">
                  <select className={inputCls(false)} {...register("exerciseGoal")}>
                    <option value="">선택 안함</option>
                    <option value="다이어트">다이어트</option>
                    <option value="근력증진">근력 증진</option>
                    <option value="재활운동">재활/체형교정</option>
                    <option value="체력관리">체력 관리</option>
                    <option value="바디프로필">바디프로필</option>
                  </select>
                </Field>
              </FormSection>
            </>
          ) : (
            <>
              {/* Step 2 */}
              <FormSection title="추가 연락 정보" columns={2}>
                <Field label="별칭 / 닉네임">
                  <input
                    className={inputCls(false)}
                    type="text"
                    placeholder="회원 별칭 (선택)"
                    {...register("nickname")}
                  />
                </Field>

                {/* UI-032 이메일 */}
                <Field
                  label="이메일"
                  error={errors.email?.message}
                  hint="선택 입력"
                >
                  <div className="relative">
                    <Mail className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                    <input
                      className={cn(inputCls(!!errors.email), "pl-[36px]")}
                      type="email"
                      placeholder="example@email.com"
                      aria-invalid={!!errors.email}
                      {...register("email")}
                    />
                  </div>
                </Field>

                {/* UI-033 주소 */}
                <div className="md:col-span-2">
                  <Field
                    label="주소"
                    error={errors.address?.message}
                    hint="선택 입력 (최소 5자)"
                  >
                    <div className="flex flex-col gap-sm">
                      <div className="flex gap-sm">
                        <input
                          className={cn(inputCls(!!errors.address), "flex-1")}
                          type="text"
                          readOnly
                          placeholder="주소 검색 버튼을 클릭하세요"
                          {...register("address")}
                        />
                        <button
                          type="button"
                          className="px-md rounded-button bg-accent-light text-accent border border-accent/30 text-[13px] font-medium hover:bg-accent hover:text-white transition-all flex items-center gap-xs shrink-0"
                          onClick={() => setIsAddressModalOpen(true)}
                        >
                          <MapPin size={13} />
                          주소 검색
                        </button>
                      </div>
                      <input
                        className={inputCls(false)}
                        type="text"
                        placeholder="상세 주소를 입력하세요"
                        {...register("addressDetail")}
                      />
                    </div>
                  </Field>
                </div>

                <Field label="회사명">
                  <div className="relative">
                    <Building className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                    <input
                      className={cn(inputCls(false), "pl-[36px]")}
                      type="text"
                      placeholder="소속 회사 이름"
                      {...register("company")}
                    />
                  </div>
                </Field>

                <Field label="출석번호">
                  <div className="relative">
                    <Hash className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                    <input
                      className={cn(inputCls(false), "pl-[36px]")}
                      type="text"
                      placeholder="미입력 시 자동 생성"
                      {...register("attendanceNumber")}
                    />
                  </div>
                </Field>
              </FormSection>

              <FormSection title="기타 설정" columns={1}>
                {/* 광고 수신 동의 */}
                <div className="flex items-center gap-sm p-md bg-primary-light rounded-lg border border-line">
                  <input
                    className="w-4 h-4 rounded border-line accent-primary"
                    type="checkbox"
                    id="marketingConsent"
                    {...register("marketingConsent")}
                  />
                  <label className="text-[13px] text-content cursor-pointer select-none" htmlFor="marketingConsent">
                    광고성 정보 수신 동의 (SMS/알림톡 발송용)
                  </label>
                </div>

                {/* UI-034 메모 (최대 500자 + 카운터) */}
                <Field
                  label="메모"
                  error={errors.notes?.message}
                >
                  <div className="relative">
                    <textarea
                      className={cn(
                        "w-full rounded-input border px-md py-sm text-[13px] text-content outline-none focus:ring-2 transition-all resize-none",
                        errors.notes
                          ? "border-state-error bg-red-50 focus:ring-state-error/20"
                          : "border-line bg-surface-secondary focus:ring-primary/20"
                      )}
                      rows={4}
                      placeholder="회원의 건강 상태, 메모 등을 기록하세요 (최대 500자)"
                      maxLength={500}
                      aria-invalid={!!errors.notes}
                      {...register("notes")}
                    />
                    <div className={cn("absolute bottom-sm right-md text-[11px]", notesColor)}>
                      {notesLength} / 500
                    </div>
                  </div>
                </Field>
              </FormSection>
            </>
          )}
        </div>

        {/* 하단 액션 버튼 */}
        <div className="mt-xl flex items-center justify-between">
          <div>
            {currentStep === "step2" && (
              <button
                className="flex items-center gap-xs px-lg py-md rounded-button text-content-secondary hover:bg-surface-secondary border border-line transition-all text-[13px]"
                onClick={handlePrev}
              >
                <ArrowLeft size={18} />
                이전 단계로
              </button>
            )}
          </div>

          <div className="flex gap-sm">
            {currentStep === "step1" ? (
              /* UI-036 다음 버튼: 필수값 채워야 활성 */
              <button
                className={cn(
                  "flex items-center gap-xs px-xl py-md rounded-button text-white font-semibold text-[13px] transition-all shadow-md",
                  step1CanNext
                    ? "bg-content hover:bg-black active:scale-95"
                    : "bg-surface-tertiary text-content-tertiary cursor-not-allowed"
                )}
                onClick={handleNext}
                disabled={!step1CanNext}
              >
                다음 단계
                <ArrowRight size={18} />
              </button>
            ) : (
              /* UI-036 저장 버튼 */
              <button
                className={cn(
                  "flex items-center gap-xs px-xl py-md rounded-button text-white font-semibold text-[13px] transition-all shadow-md",
                  isSubmitting || !step2CanSave
                    ? "bg-surface-tertiary text-content-tertiary cursor-not-allowed"
                    : "bg-state-success hover:opacity-90 active:scale-95"
                )}
                onClick={handleSave}
                disabled={isSubmitting || !step2CanSave}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isEditMode ? "정보 수정 완료" : "회원 등록 완료"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* UI-037 취소 확인 다이얼로그 */}
      <ConfirmDialog
        open={showCancelDialog}
        title="작성 취소"
        description="저장하지 않고 나가시겠습니까? 입력 중인 모든 내용이 사라집니다."
        confirmLabel="나가기"
        cancelLabel="계속 작성"
        variant="danger"
        onConfirm={() => moveToPage(967)}
        onCancel={() => setShowCancelDialog(false)}
      />

      {/* 초기화 확인 다이얼로그 */}
      <ConfirmDialog
        open={showResetDialog}
        title="입력 초기화"
        description="입력한 내용을 모두 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="초기화"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetDialog(false)}
      />

      {/* 주소 검색 모달 */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl border border-line shadow-lg w-full max-w-[480px] mx-md overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <div className="flex items-center gap-sm">
                <MapPin className="text-accent" size={16} />
                <h2 className="text-Section-Title text-content font-bold">주소 검색</h2>
              </div>
              <button
                className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors"
                onClick={() => { setIsAddressModalOpen(false); setAddressQuery(""); setAddressResults([]); }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-lg border-b border-line">
              <div className="flex gap-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={14} />
                  <input
                    className="w-full rounded-input border border-line bg-surface-secondary pl-[34px] pr-md py-sm focus:ring-2 focus:ring-primary/20 outline-none text-[13px]"
                    type="text"
                    placeholder="도로명, 지번, 건물명으로 검색"
                    value={addressQuery}
                    onChange={e => setAddressQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddressSearch(); }}
                    autoFocus
                  />
                </div>
                <button
                  className="px-md rounded-button bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition-all"
                  onClick={handleAddressSearch}
                >
                  검색
                </button>
              </div>
              <p className="text-[11px] text-content-tertiary mt-xs">* 실제 서비스에서는 Kakao 주소 API가 연동됩니다.</p>
            </div>

            <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
              {addressResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-xxl text-content-secondary">
                  <MapPin size={32} className="mb-sm opacity-20" />
                  <p className="text-[13px]">주소를 검색해주세요</p>
                  <p className="text-[11px] mt-xs">예: 세종대로, 강남구, 테헤란로</p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {addressResults.map((item, idx) => (
                    <li key={idx}>
                      <button
                        className="w-full text-left px-lg py-md hover:bg-surface-secondary/50 transition-colors flex items-start gap-sm"
                        onClick={() => handleAddressSelect(item)}
                        disabled={item.postcode === "00000"}
                      >
                        {item.postcode !== "00000" && (
                          <span className="text-[11px] bg-accent-light text-accent px-xs py-[2px] rounded font-mono shrink-0 mt-[2px]">
                            {item.postcode}
                          </span>
                        )}
                        <span className={cn("text-[13px]", item.postcode === "00000" ? "text-content-secondary" : "text-content font-medium")}>
                          {item.address}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
