import React, { useState, useEffect } from "react";
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
  Info,
  Mail,
  Building,
  Hash,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// 공통 컴포넌트
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";
import StatusBadge from "@/components/StatusBadge";

export default function MemberForm() {
  // --- 상태 관리 ---
  const [currentStep, setCurrentStep] = useState<"step1" | "step2">("step1");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    profileImage: null as string | null,
    name: "",
    gender: "" as "male" | "female" | "",
    phone: "",
    memberType: "일반",
    birthDate: "",
    trainer: "",
    fc: "",
    visitPath: "",
    exerciseGoal: "",
    nickname: "",
    email: "",
    address: "",
    addressDetail: "",
    company: "",
    marketingConsent: false,
    notes: "",
    attendanceNumber: ""
  });

  // 에러 상태
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneChecked, setPhoneChecked] = useState(false);

  // --- 초기화 (수정 모드 시뮬레이션) ---
  useEffect(() => {
    // 실제로는 URL 파라미터나 props로 ID를 받아오겠지만, 여기서는 시뮬레이션
    const path = window.location.pathname;
    if (path.includes("/edit")) {
      setIsEditMode(true);
      // Mock 데이터 로드
      setFormData(prev => ({
        ...prev,
        name: "김태희",
        gender: "female",
        phone: "01011112222",
        memberType: "일반",
        birthDate: "1990-05-20",
        trainer: "이현우 트레이너",
        visitPath: "SNS",
        attendanceNumber: "8822"
      }));
      setPhoneChecked(true);
    }
  }, []);

  // --- 핸들러 ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: val }));
    
    // 에러 제거
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === "phone") {
      setPhoneChecked(false);
    }
  };

  const handleGenderSelect = (gender: "male" | "female") => {
    setFormData(prev => ({ ...prev, gender }));
    if (errors.gender) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.gender;
        return newErrors;
      });
    }
  };

  const handlePhoneCheck = () => {
    if (!formData.phone || !/^010\d{7,8}$/.test(formData.phone)) {
      setErrors(prev => ({ ...prev, phone: "올바른 휴대폰 번호를 입력해주세요" }));
      return;
    }

    // 중복 확인 시뮬레이션
    if (formData.phone === "01012345678") {
      setErrors(prev => ({ ...prev, phone: "이미 등록된 전화번호입니다" }));
    } else {
      setPhoneChecked(true);
      alert("사용 가능한 번호입니다.");
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name || formData.name.length < 2) newErrors.name = "이름은 2글자 이상 입력해주세요";
    if (!formData.gender) newErrors.gender = "성별을 선택해주세요";
    if (!formData.phone || !/^010\d{7,8}$/.test(formData.phone)) newErrors.phone = "올바른 휴대폰 번호를 입력해주세요";
    if (!phoneChecked && !isEditMode) newErrors.phone = "중복확인이 필요합니다";
    if (!formData.memberType) newErrors.memberType = "회원구분을 선택해주세요";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    // Step 2는 필수값 없음 (이메일 형식 정도만 체크)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: "올바른 이메일 형식이 아닙니다" }));
      return;
    }

    setIsSubmitting(true);
    
    // 저장 시뮬레이션
    setTimeout(() => {
      setIsSubmitting(false);
      alert(isEditMode ? "회원 정보가 수정되었습니다." : "신규 회원이 등록되었습니다.");
      moveToPage(985); // 회원 상세로 이동
    }, 1500);
  };

  const handleReset = () => {
    if (confirm("입력한 내용을 모두 초기화하시겠습니까?")) {
      setFormData({
        profileImage: null,
        name: "",
        gender: "",
        phone: "",
        memberType: "일반",
        birthDate: "",
        trainer: "",
        fc: "",
        visitPath: "",
        exerciseGoal: "",
        nickname: "",
        email: "",
        address: "",
        addressDetail: "",
        company: "",
        marketingConsent: false,
        notes: "",
        attendanceNumber: ""
      });
      setErrors({});
      setPhoneChecked(false);
      setCurrentStep("step1");
    }
  };

  // --- UI 컴포넌트 ---
  
  // 입력 필드 래퍼
  const Field = ({ label, name, required = false, children, error }: { label: string, name: string, required?: boolean, children: React.ReactNode, error?: string }) => (
    <div className="flex flex-col gap-sm" >
      <label className="text-Label text-text-dark-grey flex items-center gap-xs" >
        {label}
        {required && <span className="text-error" >*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-error" >{error}</p>}
    </div>
  );

  return (
    <AppLayout >
      <div className="max-w-[680px] mx-auto pb-xxl" >
        {/* 헤더 */}
        <PageHeader title={isEditMode ? "회원 정보 수정" : "신규 회원 등록"} description={isEditMode ? "기존 회원의 정보를 수정합니다." : "새로운 회원을 시스템에 등록합니다."} actions={
            <div className="flex gap-sm" >
              <button 
                onClick={handleReset}
                className="flex items-center gap-xs px-md py-sm rounded-button text-text-grey-blue hover:bg-input-bg-light transition-colors"
              >
                <RotateCcw size={18}/>
                <span className="text-Label" >초기화</span>
              </button>
              <button 
                onClick={() => setShowCancelDialog(true)}
                className="flex items-center gap-xs px-md py-sm rounded-button border border-border-light text-text-grey-blue hover:bg-input-bg-light transition-colors"
              >
                <X size={18}/>
                <span className="text-Label" >취소</span>
              </button>
            </div>
          }/>

        {/* 스텝 네비게이션 */}
        <div className="mb-lg" >
          <TabNav tabs={[
              { key: "step1", label: "Step 1. 필수 정보", icon: User },
              { key: "step2", label: "Step 2. 추가 정보", icon: FileText }
            ]} activeTab={currentStep} onTabChange={(key) => {
              if (key === "step2" && !validateStep1()) return;
              setCurrentStep(key as any);
            }}/>
        </div>

        {/* 폼 본문 */}
        <div className="space-y-lg" >
          {currentStep === "step1" ? (
            <>
              {/* 프로필 이미지 */}
              <div className="flex justify-center mb-xl" >
                <div className="relative" >
                  <div className="w-[120px] h-[120px] rounded-full bg-input-bg-light border-2 border-dashed border-border-light flex flex-col items-center justify-center overflow-hidden group cursor-pointer hover:border-primary-coral transition-colors" >
                    {formData.profileImage ? (
                      <img className="w-full h-full object-cover" src={formData.profileImage} alt="Profile"/>
                    ) : (
                      <>
                        <Camera className="text-text-grey-blue group-hover:text-primary-coral transition-colors" size={32}/>
                        <span className="text-[10px] text-text-grey-blue mt-xs" >사진 등록</span>
                      </>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 p-sm bg-white rounded-full shadow-card-soft border border-border-light text-text-grey-blue hover:text-primary-coral" >
                    <Camera size={16}/>
                  </button>
                </div>
              </div>

              <FormSection title="기본 인적 사항" columns={2}>
                <Field label="이름" name="name" required="true" error={errors.name}>
                  <input
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="이름을 입력하세요"/>
                </Field>

                <Field label="성별" name="gender" required="true" error={errors.gender}>
                  <div className="flex gap-sm" >
                    <button
                      className={cn(
                        "flex-1 flex items-center justify-center gap-xs py-sm rounded-button border transition-all",
                        formData.gender === "male" 
                          ? "bg-bg-soft-mint border-secondary-mint text-secondary-mint font-bold" 
                          : "border-border-light text-text-grey-blue hover:bg-input-bg-light"
                      )} onClick={() => handleGenderSelect("male")}>
                      남성
                    </button>
                    <button
                      className={cn(
                        "flex-1 flex items-center justify-center gap-xs py-sm rounded-button border transition-all",
                        formData.gender === "female" 
                          ? "bg-bg-soft-peach border-primary-coral text-primary-coral font-bold" 
                          : "border-border-light text-text-grey-blue hover:bg-input-bg-light"
                      )} onClick={() => handleGenderSelect("female")}>
                      여성
                    </button>
                  </div>
                </Field>

                <Field label="휴대전화" name="phone" required="true" error={errors.phone}>
                  <div className="flex gap-sm" >
                    <input
                      className="flex-1 rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="01012345678"/>
                    <button
                      className={cn(
                        "px-md rounded-button text-Label transition-all",
                        phoneChecked 
                          ? "bg-success text-white cursor-default" 
                          : "bg-text-dark-grey text-white hover:bg-black active:scale-[0.98]"
                      )} onClick={handlePhoneCheck} disabled={phoneChecked}>
                      {phoneChecked ? <CheckCircle2 size={16}/> : "중복확인"}
                    </button>
                  </div>
                </Field>

                <Field label="회원구분" name="memberType" required="true" error={errors.memberType}>
                  <select
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1 appearance-none" name="memberType" value={formData.memberType} onChange={handleInputChange}>
                    <option value="일반">일반</option>
                    <option value="기명법인">기명법인</option>
                    <option value="무기명법인">무기명법인</option>
                  </select>
                </Field>

                <Field label="생년월일" name="birthDate" error={errors.birthDate}>
                  <div className="relative" >
                    <input
                      className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange}/>
                    <Calendar className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue pointer-events-none" size={18}/>
                  </div>
                </Field>
              </FormSection>

              <FormSection title="관리 정보" columns={2}>
                <Field label="담당 트레이너" name="trainer">
                  <select
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1 appearance-none" name="trainer" value={formData.trainer} onChange={handleInputChange}>
                    <option value="">선택 안함</option>
                    <option value="이현우 트레이너">이현우 트레이너</option>
                    <option value="김지수 트레이너">김지수 트레이너</option>
                    <option value="박성준 트레이너">박성준 트레이너</option>
                  </select>
                </Field>

                <Field label="담당 FC" name="fc">
                  <select
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1 appearance-none" name="fc" value={formData.fc} onChange={handleInputChange}>
                    <option value="">선택 안함</option>
                    <option value="정미라 FC">정미라 FC</option>
                    <option value="최윤석 FC">최윤석 FC</option>
                  </select>
                </Field>

                <Field label="방문 경로" name="visitPath">
                  <select
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1 appearance-none" name="visitPath" value={formData.visitPath} onChange={handleInputChange}>
                    <option value="">선택 안함</option>
                    <option value="지인추천">지인추천</option>
                    <option value="SNS">SNS (인스타그램/페이스북)</option>
                    <option value="인터넷검색">인터넷 검색</option>
                    <option value="전단지">전단지/현수막</option>
                    <option value="기타">기타</option>
                  </select>
                </Field>

                <Field label="운동 목적" name="exerciseGoal">
                  <select
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1 appearance-none" name="exerciseGoal" value={formData.exerciseGoal} onChange={handleInputChange}>
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
              <FormSection title="추가 연락 정보" columns={2}>
                <Field label="별칭/닉네임" name="nickname">
                  <input
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="text" name="nickname" value={formData.nickname} onChange={handleInputChange} placeholder="회원 별칭 입력"/>
                </Field>

                <Field label="이메일" name="email" error={errors.email}>
                  <div className="relative" >
                    <input
                      className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm pl-[40px] focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="example@email.com"/>
                    <Mail className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                  </div>
                </Field>

                <div className="md:col-span-2" >
                  <Field label="주소" name="address">
                    <div className="flex flex-col gap-sm" >
                      <div className="flex gap-sm" >
                        <input
                          className="flex-1 rounded-input bg-input-bg-light border-0 px-md py-sm outline-none text-Body 1" type="text" name="address" value={formData.address} readOnly="true" placeholder="우편번호 찾기를 클릭하세요"/>
                        <button
                          className="px-md rounded-button bg-bg-soft-mint text-secondary-mint border border-secondary-mint text-Label hover:bg-secondary-mint hover:text-white transition-all" onClick={() => {
                            setFormData(prev => ({ ...prev, address: "서울시 중구 세종대로 110" }));
                            alert("주소 검색 API 팝업 시뮬레이션");
                          }}>
                          주소 검색
                        </button>
                      </div>
                      <input
                        className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="text" name="addressDetail" value={formData.addressDetail} onChange={handleInputChange} placeholder="상세 주소를 입력하세요"/>
                    </div>
                  </Field>
                </div>

                <Field label="회사명" name="company">
                  <div className="relative" >
                    <input
                      className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm pl-[40px] focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="text" name="company" value={formData.company} onChange={handleInputChange} placeholder="소속 회사 이름"/>
                    <Building className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                  </div>
                </Field>

                <Field label="출석번호" name="attendanceNumber">
                  <div className="relative" >
                    <input
                      className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm pl-[40px] focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1" type="text" name="attendanceNumber" value={formData.attendanceNumber} onChange={handleInputChange} placeholder="미입력 시 자동 생성"/>
                    <Hash className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                  </div>
                </Field>
              </FormSection>

              <FormSection title="기타 설정" columns={1}>
                <div className="flex items-center gap-sm p-md bg-bg-soft-peach rounded-card-normal border border-border-light" >
                  <input
                    className="w-5 h-5 rounded-sm border-border-light text-primary-coral focus:ring-primary-coral" type="checkbox" id="marketingConsent" name="marketingConsent" checked={formData.marketingConsent} onChange={handleInputChange}/>
                  <label className="text-Body 2 text-text-dark-grey cursor-pointer select-none" htmlFor="marketingConsent">
                    광고성 정보 수신 동의 (SMS/알림톡 발송용)
                  </label>
                </div>

                <Field label="특이사항 및 메모" name="notes">
                  <textarea
                    className="w-full rounded-input bg-input-bg-light border-0 px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none text-Body 1 resize-none" name="notes" value={formData.notes} onChange={handleInputChange} rows={4} placeholder="회원의 건강 상태, 특이사항 등을 기록하세요 (최대 5,000자)"/>
                </Field>
              </FormSection>
            </>
          )}
        </div>

        {/* 하단 액션 버튼 */}
        <div className="mt-xl flex items-center justify-between" >
          <div >
            {currentStep === "step2" && (
              <button
                className="flex items-center gap-xs px-lg py-md rounded-button text-text-grey-blue hover:bg-input-bg-light transition-all" onClick={handlePrev}>
                <ArrowLeft size={20}/>
                <span className="text-Body 1 font-semibold" >이전 단계로</span>
              </button>
            )}
          </div>
          
          <div className="flex gap-sm" >
            {currentStep === "step1" ? (
              <button
                className="flex items-center gap-xs px-xl py-md rounded-button bg-text-dark-grey text-white hover:bg-black active:scale-[0.98] transition-all shadow-md" onClick={handleNext}>
                <span className="text-Body 1 font-semibold" >다음 단계</span>
                <ArrowRight size={20}/>
              </button>
            ) : (
              <button
                className={cn(
                  "flex items-center gap-xs px-xl py-md rounded-button text-white transition-all shadow-md",
                  isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-secondary-mint hover:bg-[#3dbdb8] active:scale-[0.98]"
                )} onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={20}/>
                )}
                <span className="text-Body 1 font-semibold" >{isEditMode ? "정보 수정 완료" : "회원 등록 완료"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 취소 확인 다이얼로그 */}
      <ConfirmDialog open={showCancelDialog} title="작성 취소" description="입력 중인 모든 내용이 사라집니다. 페이지를 나가시겠습니까?" confirmLabel="나가기" cancelLabel="계속 작성" variant="danger" onConfirm={() => moveToPage(967)} onCancel={() => setShowCancelDialog(false)}/>
    </AppLayout>
  );
}
