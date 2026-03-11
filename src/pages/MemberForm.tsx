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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";

// ────────────────────────────────────────────────────────────
// Mock 데이터
// ────────────────────────────────────────────────────────────

const MOCK_FC_LIST = [
  { value: "", label: "선택 안함" },
  { value: "정미라 FC", label: "정미라 FC" },
  { value: "최윤석 FC", label: "최윤석 FC" },
  { value: "이수빈 FC", label: "이수빈 FC" },
];

const MOCK_TRAINER_LIST = [
  { value: "", label: "선택 안함" },
  { value: "이현우 트레이너", label: "이현우 트레이너" },
  { value: "김지수 트레이너", label: "김지수 트레이너" },
  { value: "박성준 트레이너", label: "박성준 트레이너" },
];

const MOCK_ADDRESSES = [
  { postcode: "04524", address: "서울시 중구 세종대로 110" },
  { postcode: "06236", address: "서울시 강남구 테헤란로 123" },
  { postcode: "03181", address: "서울시 종로구 종로 1" },
  { postcode: "07328", address: "서울시 영등포구 여의대로 108" },
  { postcode: "04539", address: "서울시 중구 남대문로 81" },
];

// ────────────────────────────────────────────────────────────
// 유효성 검사 헬퍼
// ────────────────────────────────────────────────────────────

// 한글 2~20자
const isValidName = (v: string) => /^[가-힣]{2,20}$/.test(v.trim());

// 010-xxxx-xxxx 자동 포맷
const formatPhone = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const isValidPhone = (v: string) => /^010-\d{4}-\d{4}$/.test(v);

const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isValidBirthDate = (v: string) => {
  if (!v) return true; // 선택
  const d = new Date(v);
  return !isNaN(d.getTime()) && d < new Date();
};

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
        <p className="flex items-center gap-xs text-[11px] text-state-error">
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

export default function MemberForm() {
  const [currentStep, setCurrentStep] = useState<"step1" | "step2">("step1");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState({
    profileImage: null as string | null,
    name: "",                       // UI-028 이름
    gender: "" as "male" | "female" | "", // UI-029 성별
    birthDate: "",                  // UI-030 생년월일
    phone: "",                      // UI-031 연락처
    email: "",                      // UI-032 이메일
    address: "",                    // UI-033 주소
    addressDetail: "",
    notes: "",                      // UI-034 메모
    fc: "",                         // UI-035 담당자(FC)
    trainer: "",
    memberType: "일반",
    visitPath: "",
    exerciseGoal: "",
    nickname: "",
    company: "",
    marketingConsent: false,
    attendanceNumber: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [phoneChecked, setPhoneChecked] = useState(false);

  // 주소 검색 모달
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<{ postcode: string; address: string }[]>([]);

  // ── 초기화 (수정 모드 시뮬레이션) ──
  useEffect(() => {
    if (window.location.pathname.includes("/edit")) {
      setIsEditMode(true);
      setFormData(prev => ({
        ...prev,
        name: "김태희",
        gender: "female",
        phone: "010-1111-2222",
        memberType: "일반",
        birthDate: "1990-05-20",
        trainer: "이현우 트레이너",
        visitPath: "SNS",
        attendanceNumber: "8822",
      }));
      setPhoneChecked(true);
    }
  }, []);

  // ── 핸들러 ──
  const markDirty = () => setIsDirty(true);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    if (name === "phone") {
      const formatted = formatPhone(value);
      setFormData(prev => ({ ...prev, phone: formatted }));
      if (phoneChecked) setPhoneChecked(false);
      if (touched.phone) validateField("phone", formatted as string);
      markDirty();
      return;
    }

    setFormData(prev => ({ ...prev, [name]: val }));
    if (touched[name]) validateField(name, val as string);
    markDirty();
  };

  const handleGender = (g: "male" | "female") => {
    setFormData(prev => ({ ...prev, gender: g }));
    setTouched(prev => ({ ...prev, gender: true }));
    validateField("gender", g);
    markDirty();
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, formData[name as keyof typeof formData] as string);
  };

  // 단일 필드 즉시 검증
  const validateField = (name: string, value: string | boolean) => {
    let msg = "";
    if (name === "name") {
      if (!String(value).trim()) msg = "이름을 입력하세요";
      else if (!isValidName(String(value))) msg = "한글 2~20자로 입력하세요";
    }
    if (name === "gender" && !value) msg = "성별을 선택하세요";
    if (name === "birthDate") {
      if (value && !isValidBirthDate(String(value))) msg = "올바른 날짜를 입력하세요";
    }
    if (name === "phone") {
      if (!String(value)) msg = "연락처를 입력하세요";
      else if (!isValidPhone(String(value))) msg = "올바른 연락처를 입력하세요 (010-xxxx-xxxx)";
    }
    if (name === "email" && value && !isValidEmail(String(value))) {
      msg = "올바른 이메일을 입력하세요";
    }
    if (name === "address" && value && String(value).length < 5) {
      msg = "주소를 5자 이상 입력하세요";
    }
    if (name === "notes" && String(value).length > 500) {
      msg = "500자 이내로 입력하세요";
    }

    setErrors(prev => {
      if (msg) return { ...prev, [name]: msg };
      const next = { ...prev };
      delete next[name];
      return next;
    });

    return !msg;
  };

  // Step1 전체 검증
  const validateStep1 = () => {
    const fields = ["name", "gender", "phone"] as const;
    let valid = true;
    const newTouched: Record<string, boolean> = {};
    fields.forEach(f => {
      newTouched[f] = true;
      if (!validateField(f, formData[f] as string)) valid = false;
    });
    if (!isEditMode && !phoneChecked) {
      setErrors(prev => ({ ...prev, phone: "중복확인이 필요합니다" }));
      valid = false;
    }
    if (!formData.memberType) {
      setErrors(prev => ({ ...prev, memberType: "회원구분을 선택하세요" }));
      valid = false;
    }
    setTouched(prev => ({ ...prev, ...newTouched }));
    return valid;
  };

  // Step2 전체 검증
  const validateStep2 = () => {
    let valid = true;
    if (!validateField("email", formData.email)) valid = false;
    if (formData.address && !validateField("address", formData.address)) valid = false;
    if (!validateField("notes", formData.notes)) valid = false;
    return valid;
  };

  const handlePhoneCheck = () => {
    setTouched(prev => ({ ...prev, phone: true }));
    if (!isValidPhone(formData.phone)) {
      setErrors(prev => ({ ...prev, phone: "올바른 연락처를 입력하세요 (010-xxxx-xxxx)" }));
      return;
    }
    // Mock: 01012345678 = 중복
    if (formData.phone === "010-1234-5678") {
      setErrors(prev => ({ ...prev, phone: "이미 등록된 전화번호입니다" }));
    } else {
      setPhoneChecked(true);
      setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
      alert("사용 가능한 번호입니다.");
    }
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep("step2");
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    setCurrentStep("step1");
    window.scrollTo(0, 0);
  };

  const handleSave = () => {
    if (!validateStep2()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsDirty(false);
      alert(isEditMode ? "회원 정보가 수정되었습니다." : "신규 회원이 등록되었습니다.");
      moveToPage(985);
    }, 1200);
  };

  const handleReset = () => {
    if (confirm("입력한 내용을 모두 초기화하시겠습니까?")) {
      setFormData({
        profileImage: null, name: "", gender: "", phone: "", memberType: "일반",
        birthDate: "", trainer: "", fc: "", visitPath: "", exerciseGoal: "",
        nickname: "", email: "", address: "", addressDetail: "", company: "",
        marketingConsent: false, notes: "", attendanceNumber: "",
      });
      setErrors({});
      setTouched({});
      setPhoneChecked(false);
      setCurrentStep("step1");
      setIsDirty(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) setShowCancelDialog(true);
    else moveToPage(967);
  };

  // 주소 검색
  const handleAddressSearch = () => {
    if (!addressQuery.trim()) return;
    const q = addressQuery.toLowerCase();
    const res = MOCK_ADDRESSES.filter(a => a.address.toLowerCase().includes(q));
    setAddressResults(res.length > 0 ? res : [{ postcode: "00000", address: "검색 결과가 없습니다." }]);
  };

  const handleAddressSelect = (item: { postcode: string; address: string }) => {
    if (item.postcode === "00000") return;
    setFormData(prev => ({ ...prev, address: `[${item.postcode}] ${item.address}` }));
    markDirty();
    setIsAddressModalOpen(false);
    setAddressQuery("");
    setAddressResults([]);
  };

  // ── 저장 버튼 활성화 조건 ──
  // Step1: 이름·성별·연락처 + 중복확인 완료
  const step1CanNext =
    isValidName(formData.name) &&
    !!formData.gender &&
    isValidPhone(formData.phone) &&
    (isEditMode || phoneChecked) &&
    !!formData.memberType;

  // Step2: 선택 필드 — 이메일 형식만 OK이면 언제나 활성
  const step2CanSave = isValidEmail(formData.email) && formData.notes.length <= 500;

  // 글자수 카운터 색상
  const notesColor = formData.notes.length > 450
    ? formData.notes.length > 500 ? "text-state-error" : "text-state-warning"
    : "text-content-secondary";

  // ── 공통 입력 클래스 ──
  const inputCls = (field: string) =>
    cn(
      "w-full rounded-input border px-md py-sm text-[13px] text-content outline-none focus:ring-2 transition-all",
      touched[field] && errors[field]
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
                onClick={handleReset}
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
            onTabChange={key => {
              if (key === "step2" && !validateStep1()) return;
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
                  <div className="w-[120px] h-[120px] rounded-full bg-surface-secondary border-2 border-dashed border-line flex flex-col items-center justify-center overflow-hidden group cursor-pointer hover:border-primary transition-colors">
                    {formData.profileImage ? (
                      <img className="w-full h-full object-cover" src={formData.profileImage} alt="프로필" />
                    ) : (
                      <>
                        <Camera className="text-content-tertiary group-hover:text-primary transition-colors" size={30} />
                        <span className="text-[10px] text-content-tertiary mt-xs">사진 등록</span>
                      </>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 p-sm bg-surface rounded-full shadow-card border border-line text-content-secondary hover:text-primary transition-colors">
                    <Camera size={14} />
                  </button>
                </div>
              </div>

              {/* UI-028~031: 기본 인적사항 */}
              <FormSection title="기본 인적 사항" columns={2}>
                {/* UI-028 이름 */}
                <Field label="이름" required error={touched.name ? errors.name : undefined} hint="한글 2~20자">
                  <input
                    className={inputCls("name")}
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => handleBlur("name")}
                    placeholder="이름을 입력하세요"
                    maxLength={20}
                  />
                </Field>

                {/* UI-029 성별 */}
                <Field label="성별" required error={touched.gender ? errors.gender : undefined}>
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
                          formData.gender === opt.value
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
                <Field label="연락처" required error={touched.phone ? errors.phone : undefined} hint="010-xxxx-xxxx 형식">
                  <div className="flex gap-sm">
                    <input
                      className={cn(inputCls("phone"), "flex-1")}
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={() => handleBlur("phone")}
                      placeholder="010-0000-0000"
                      maxLength={13}
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
                <Field label="회원구분" required error={touched.memberType ? errors.memberType : undefined}>
                  <select
                    className={inputCls("memberType")}
                    name="memberType"
                    value={formData.memberType}
                    onChange={handleChange}
                    onBlur={() => handleBlur("memberType")}
                  >
                    <option value="일반">일반</option>
                    <option value="기명법인">기명법인</option>
                    <option value="무기명법인">무기명법인</option>
                  </select>
                </Field>

                {/* UI-030 생년월일 */}
                <Field
                  label="생년월일"
                  error={touched.birthDate ? errors.birthDate : undefined}
                  hint="미래 날짜 입력 불가"
                >
                  <div className="relative">
                    <input
                      className={inputCls("birthDate")}
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      onBlur={() => handleBlur("birthDate")}
                      max={new Date().toISOString().split("T")[0]}
                    />
                    <Calendar className="absolute right-md top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" size={16} />
                  </div>
                </Field>
              </FormSection>

              {/* 관리 정보 */}
              <FormSection title="관리 정보" columns={2}>
                {/* UI-035 담당자(FC) */}
                <Field label="담당 FC">
                  <select
                    className={inputCls("fc")}
                    name="fc"
                    value={formData.fc}
                    onChange={handleChange}
                  >
                    {MOCK_FC_LIST.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="담당 트레이너">
                  <select
                    className={inputCls("trainer")}
                    name="trainer"
                    value={formData.trainer}
                    onChange={handleChange}
                  >
                    {MOCK_TRAINER_LIST.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="방문 경로">
                  <select className={inputCls("visitPath")} name="visitPath" value={formData.visitPath} onChange={handleChange}>
                    <option value="">선택 안함</option>
                    <option value="지인추천">지인추천</option>
                    <option value="SNS">SNS (인스타그램/페이스북)</option>
                    <option value="인터넷검색">인터넷 검색</option>
                    <option value="전단지">전단지/현수막</option>
                    <option value="기타">기타</option>
                  </select>
                </Field>

                <Field label="운동 목적">
                  <select className={inputCls("exerciseGoal")} name="exerciseGoal" value={formData.exerciseGoal} onChange={handleChange}>
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
                    className={inputCls("nickname")}
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    placeholder="회원 별칭 (선택)"
                  />
                </Field>

                {/* UI-032 이메일 */}
                <Field
                  label="이메일"
                  error={touched.email ? errors.email : undefined}
                  hint="선택 입력"
                >
                  <div className="relative">
                    <Mail className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                    <input
                      className={cn(inputCls("email"), "pl-[36px]")}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur("email")}
                      placeholder="example@email.com"
                    />
                  </div>
                </Field>

                {/* UI-033 주소 */}
                <div className="md:col-span-2">
                  <Field
                    label="주소"
                    error={touched.address ? errors.address : undefined}
                    hint="선택 입력 (최소 5자)"
                  >
                    <div className="flex flex-col gap-sm">
                      <div className="flex gap-sm">
                        <input
                          className={cn(inputCls("address"), "flex-1")}
                          type="text"
                          name="address"
                          value={formData.address}
                          readOnly
                          placeholder="주소 검색 버튼을 클릭하세요"
                          onBlur={() => handleBlur("address")}
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
                        className={inputCls("addressDetail")}
                        type="text"
                        name="addressDetail"
                        value={formData.addressDetail}
                        onChange={handleChange}
                        placeholder="상세 주소를 입력하세요"
                      />
                    </div>
                  </Field>
                </div>

                <Field label="회사명">
                  <div className="relative">
                    <Building className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                    <input
                      className={cn(inputCls("company"), "pl-[36px]")}
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="소속 회사 이름"
                    />
                  </div>
                </Field>

                <Field label="출석번호">
                  <div className="relative">
                    <Hash className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
                    <input
                      className={cn(inputCls("attendanceNumber"), "pl-[36px]")}
                      type="text"
                      name="attendanceNumber"
                      value={formData.attendanceNumber}
                      onChange={handleChange}
                      placeholder="미입력 시 자동 생성"
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
                    name="marketingConsent"
                    checked={formData.marketingConsent}
                    onChange={handleChange}
                  />
                  <label className="text-[13px] text-content cursor-pointer select-none" htmlFor="marketingConsent">
                    광고성 정보 수신 동의 (SMS/알림톡 발송용)
                  </label>
                </div>

                {/* UI-034 메모 (최대 500자 + 카운터) */}
                <Field
                  label="특이사항 및 메모"
                  error={touched.notes ? errors.notes : undefined}
                >
                  <div className="relative">
                    <textarea
                      className={cn(
                        "w-full rounded-input border px-md py-sm text-[13px] text-content outline-none focus:ring-2 transition-all resize-none",
                        touched.notes && errors.notes
                          ? "border-state-error bg-red-50 focus:ring-state-error/20"
                          : "border-line bg-surface-secondary focus:ring-primary/20"
                      )}
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      onBlur={() => handleBlur("notes")}
                      rows={4}
                      placeholder="회원의 건강 상태, 특이사항 등을 기록하세요 (최대 500자)"
                      maxLength={520}
                    />
                    <div className={cn("absolute bottom-sm right-md text-[11px]", notesColor)}>
                      {formData.notes.length} / 500
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
