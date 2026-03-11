import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Clock, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Tag as TagIcon,
  ChevronRight,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
  CreditCard,
  Banknote,
  CalendarDays,
  Infinite,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// 공통 컴포넌트 임포트
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FormSection from "@/components/FormSection";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import TabNav from "@/components/TabNav";

/**
 * SCR-011: 상품 등록/수정 (ProductForm)
 */
export default function ProductForm() {
  // --- 상태 관리 ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [showTypeSelection, setShowTypeSelection] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    // 섹션 01: 기본 정보
    category: "",
    subCategory: "",
    itemType: "",
    name: "",
    priceCash: "",
    priceCard: "",
    description: "",
    tags: "",
    image: null,

    // 섹션 02: 이용기간 / 횟수 설정
    period: "1",
    periodUnit: "month", // month, day
    totalEntries: "0",
    isTotalInfinite: true,
    dailyEntries: "0",
    isDailyInfinite: true,
    weeklyEntries: "0",
    isWeeklyInfinite: true,
    monthlyEntries: "0",
    isMonthlyInfinite: true,

    // 섹션 03: 추가 설정
    isHoldingEnabled: false,
    holdingMaxDays: "0",
    holdingMaxCount: "0",
    isHoldingInfinite: false,
    
    useTimeRanges: [
      { day: "월~금", startTime: "06:00", endTime: "23:00", is24h: false },
      { day: "토~일", startTime: "10:00", endTime: "20:00", is24h: false }
    ],

    mileageAmount: "0",
    mileageUnit: "percent", // percent, won
    
    doorAccess: [] as string[],
    isKioskExposed: true,
    isNewCustomerBuyable: true,
    isExistingCustomerBuyable: true,
    isNonMemberBuyable: false,
    discountItems: [] as string[],
    isUsed: true
  });

  // 에러 상태
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- 초기화 ---
  useEffect(() => {
    // URL 등을 통해 수정 모드 여부 판단 (Mock)
    const path = window.location.pathname;
    if (path.includes("/edit") || path.endsWith("/123")) { // Mock ID 123
      setIsEditMode(true);
      setShowTypeSelection(false);
      // 기존 데이터 로드 (Mock)
      setFormData(prev => ({
        ...prev,
        category: "시설이용",
        subCategory: "헬스",
        itemType: "헬스 이용권",
        name: "스포짐 종각점 프리미엄 12개월권",
        priceCash: "720000",
        priceCard: "792000",
        period: "12",
        isTotalInfinite: true,
      }));
    }
  }, []);

  // --- 핸들러 ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));

    // 에러 제거
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleToggle = (name: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name as keyof typeof prev]
    }));
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setFormData(prev => ({ ...prev, itemType: type }));
    setShowTypeSelection(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.category) newErrors.category = "카테고리를 선택해주세요";
    if (!formData.name) newErrors.name = "상품명을 입력해주세요";
    if (!formData.priceCash) newErrors.priceCash = "현금가를 입력해주세요";
    if (!formData.priceCard) newErrors.priceCard = "카드가를 입력해주세요";
    if (!formData.period) newErrors.period = "이용기간을 입력해주세요";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    setIsSaving(true);
    // Mock API 호출
    setTimeout(() => {
      setIsSaving(false);
      alert(isEditMode ? "상품이 수정되었습니다." : "상품이 등록되었습니다.");
      moveToPage(972); // 상품 관리 목록으로 이동
    }, 1000);
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  // --- 상수 ---
  const PRODUCT_TYPES = [
    { id: "membership", label: "회원권", desc: "헬스/골프 기간 이용권", icon: UserCheck, color: "text-primary-coral" },
    { id: "lesson", label: "수강권", desc: "PT/그룹수업 횟수권", icon: CalendarDays, color: "text-secondary-mint" },
    { id: "locker", label: "락커", desc: "락커 대여권", icon: Lock, color: "text-information" },
    { id: "uniform", label: "운동복", desc: "운동복 대여권", icon: CheckCircle2, color: "text-warning" },
    { id: "general", label: "일반", desc: "기타 소모품 및 상품", icon: Plus, color: "text-text-grey-blue" },
  ];

  const CATEGORIES = ["시설이용", "1:1수업", "그룹수업", "옵션"];
  const SUB_CATEGORIES: Record<string, string[]> = {
    "시설이용": ["헬스", "골프", "수영", "사우나"],
    "1:1수업": ["PT", "필라테스", "골프레슨"],
    "그룹수업": ["G.X", "요가", "스피닝", "그룹필라테스"],
    "옵션": ["락커", "운동복", "주차", "기타"]
  };

  // --- UI 렌더링 ---

  // 1. 유형 선택 화면
  if (showTypeSelection && !isEditMode) {
    return (
      <AppLayout >
        <div className="flex flex-col items-center justify-center py-xxl animate-in fade-in slide-in-from-bottom-4 duration-500" >
          <div className="text-center mb-xl" >
            <h1 className="text-Heading 1 text-text-dark-grey" >새 상품 등록</h1>
            <p className="mt-md text-Body 1 text-text-grey-blue" >등록하실 상품의 유형을 선택해주세요.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg w-full max-w-[900px]" >
            {PRODUCT_TYPES.map((type) => (
              <button
                className="group flex flex-col items-start p-xl bg-white rounded-card-strong border border-border-light shadow-card-soft hover:border-primary-coral hover:shadow-lg transition-all text-left" key={type.id} onClick={() => handleTypeSelect(type.label)}>
                <div className={cn("p-md rounded-card-normal mb-lg transition-colors group-hover:bg-bg-soft-peach", "bg-bg-main-light-blue")} >
                  <type.icon className={cn("w-xl h-xl", type.color)} />
                </div>
                <h3 className="text-Heading 2 text-text-dark-grey group-hover:text-primary-coral transition-colors" >{type.label}</h3>
                <p className="mt-sm text-Body 2 text-text-grey-blue" >{type.desc}</p>
                <div className="mt-xl flex items-center text-Label font-bold text-primary-coral opacity-0 group-hover:opacity-100 transition-opacity" >
                  선택하기 <ChevronRight className="ml-xs" size={16}/>
                </div>
              </button>
            ))}
          </div>

          <button
            className="mt-xxl text-Body 2 text-text-grey-blue hover:text-text-dark-grey flex items-center gap-xs transition-colors" onClick={() => moveToPage(972)}>
            <ArrowLeft size={16}/> 취소하고 목록으로 돌아가기
          </button>
        </div>
      </AppLayout>
    );
  }

  // 2. 메인 폼 화면
  return (
    <AppLayout >
      <PageHeader title={isEditMode ? "상품 정보 수정" : `${formData.itemType} 등록`} description={isEditMode ? "상품의 상세 정보를 수정하고 저장할 수 있습니다." : "새로운 상품의 정보를 입력하여 등록을 완료해주세요."} actions={
          <div className="flex items-center gap-sm" >
            <button
              onClick={handleCancel}
              className="flex items-center gap-xs px-lg py-md rounded-button border border-border-light bg-white text-text-grey-blue hover:bg-bg-main-light-blue transition-all"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-xs px-lg py-md rounded-button bg-primary-coral text-white hover:bg-primary-coral/90 shadow-md shadow-primary-coral/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {isEditMode ? "수정사항 저장" : "상품 등록 완료"}
            </button>
          </div>
        }/>

      <div className="space-y-xl pb-[100px]" >
        {/* 섹션 01: 상품 기본 정보 */}
        <FormSection title="상품 기본 정보" description="상품의 카테고리와 가격 등 기본적인 정보를 입력합니다." columns={2}>
          {/* 카테고리 */}
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-dark-grey font-semibold" >
              카테고리 <span className="text-error" >*</span>
            </label>
            <select
              className={cn(
                "w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all",
                errors.category && "border-error ring-1 ring-error"
              )} name="category" value={formData.category} onChange={handleInputChange}>
              <option value="">선택해주세요</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            {errors.category && <p className="text-[12px] text-error" >{errors.category}</p>}
          </div>

          {/* 하위분류 */}
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-dark-grey font-semibold" >
              하위분류 <span className="text-error" >*</span>
            </label>
            <select
              className="w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all disabled:opacity-50" name="subCategory" value={formData.subCategory} onChange={handleInputChange} disabled={!formData.category}>
              <option value="">선택해주세요</option>
              {formData.category && SUB_CATEGORIES[formData.category].map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* 종목선택 - Mock으로 처리 */}
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-dark-grey font-semibold" >종목 선택</label>
            <select className="w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all" >
              <option >헬스</option>
              <option >PT</option>
              <option >G.X</option>
              <option >필라테스</option>
            </select>
          </div>

          {/* 상품명 */}
          <div className="flex flex-col gap-sm md:col-span-1" >
            <label className="text-Label text-text-dark-grey font-semibold" >
              상품명 <span className="text-error" >*</span>
            </label>
            <input
              className={cn(
                "w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all",
                errors.name && "border-error ring-1 ring-error"
              )} type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="예: 프리미엄 12개월권"/>
            {errors.name && <p className="text-[12px] text-error" >{errors.name}</p>}
          </div>

          {/* 상품가격 (현금) */}
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-dark-grey font-semibold" >
              상품가격 (현금) <span className="text-error" >*</span>
            </label>
            <div className="relative" >
              <Banknote className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
              <input
                className={cn(
                  "w-full pl-[44px] pr-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all",
                  errors.priceCash && "border-error ring-1 ring-error"
                )} type="number" name="priceCash" value={formData.priceCash} onChange={handleInputChange} placeholder="0"/>
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-Body 2 text-text-grey-blue" >원</span>
            </div>
          </div>

          {/* 상품가격 (카드) */}
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-dark-grey font-semibold" >
              상품가격 (카드) <span className="text-error" >*</span>
            </label>
            <div className="relative" >
              <CreditCard className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
              <input
                className={cn(
                  "w-full pl-[44px] pr-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all",
                  errors.priceCard && "border-error ring-1 ring-error"
                )} type="number" name="priceCard" value={formData.priceCard} onChange={handleInputChange} placeholder="0"/>
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-Body 2 text-text-grey-blue" >원</span>
            </div>
          </div>

          {/* 상품 설명 */}
          <div className="flex flex-col gap-sm md:col-span-2" >
            <label className="text-Label text-text-dark-grey font-semibold" >상품 설명</label>
            <textarea
              className="w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all resize-none" name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="회원들에게 노출될 상세한 상품 설명을 입력하세요."/>
          </div>

          {/* 태그 */}
          <div className="flex flex-col gap-sm md:col-span-1" >
            <label className="text-Label text-text-dark-grey font-semibold" >태그</label>
            <div className="relative" >
              <TagIcon className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
              <input
                className="w-full pl-[44px] pr-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all" type="text" name="tags" value={formData.tags} onChange={handleInputChange} placeholder="#헬스 #인기상품"/>
            </div>
          </div>

          {/* 상품 이미지 업로드 Mock */}
          <div className="flex flex-col gap-sm md:col-span-1" >
            <label className="text-Label text-text-dark-grey font-semibold" >상품 이미지</label>
            <div className="flex items-center gap-md" >
              <div className="w-[80px] h-[80px] rounded-card-normal bg-bg-main-light-blue border border-dashed border-border-light flex flex-col items-center justify-center text-text-grey-blue hover:text-primary-coral hover:border-primary-coral transition-all cursor-pointer" >
                <Plus size={24}/>
                <span className="text-[10px] mt-xs" >이미지 추가</span>
              </div>
              <div className="text-Body 2 text-text-grey-blue" >
                <p >권장 사이즈: 800x800px</p>
                <p >JPG, PNG 형식 지원</p>
              </div>
            </div>
          </div>
        </FormSection>

        {/* 섹션 02: 이용기간 / 횟수 설정 */}
        <FormSection title="이용기간 / 횟수 설정" description="상품의 유효 기간과 입장 제한 횟수를 설정합니다." columns={2}>
          {/* 이용 기간 */}
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-dark-grey font-semibold" >
              이용 기간 <span className="text-error" >*</span>
            </label>
            <div className="flex gap-sm" >
              <div className="relative flex-1" >
                <input
                  className={cn(
                    "w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all",
                    errors.period && "border-error ring-1 ring-error"
                  )} type="number" name="period" value={formData.period} onChange={handleInputChange} min="1"/>
              </div>
              <select
                className="w-[100px] px-md py-sm rounded-input border border-border-light bg-white text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="periodUnit" value={formData.periodUnit} onChange={handleInputChange}>
                <option value="month">개월</option>
                <option value="day">일</option>
              </select>
            </div>
          </div>

          {/* 총 입장 가능 횟수 */}
          <div className="flex flex-col gap-sm" >
            <div className="flex items-center justify-between" >
              <label className="text-Label text-text-dark-grey font-semibold" >총 입장 가능 횟수</label>
              <div className="flex items-center gap-xs" >
                <span className="text-Label text-text-grey-blue" >무제한</span>
                <input
                  className="w-4 h-4 rounded border-border-light accent-primary-coral" type="checkbox" checked={formData.isTotalInfinite} onChange={() => handleToggle("isTotalInfinite")}/>
              </div>
            </div>
            <div className="relative" >
              <input
                className="w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all disabled:opacity-50" type="number" name="totalEntries" disabled={formData.isTotalInfinite} value={formData.totalEntries} onChange={handleInputChange}/>
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-Body 2 text-text-grey-blue" >회</span>
            </div>
          </div>

          {/* 일일 입장 가능 횟수 */}
          <div className="flex flex-col gap-sm" >
            <div className="flex items-center justify-between" >
              <label className="text-Label text-text-dark-grey font-semibold" >일일 입장 가능 횟수</label>
              <div className="flex items-center gap-xs" >
                <span className="text-Label text-text-grey-blue" >무제한</span>
                <input
                  className="w-4 h-4 rounded border-border-light accent-primary-coral" type="checkbox" checked={formData.isDailyInfinite} onChange={() => handleToggle("isDailyInfinite")}/>
              </div>
            </div>
            <div className="relative" >
              <input
                className="w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light text-Body 1 focus:ring-2 focus:ring-secondary-mint outline-none transition-all disabled:opacity-50" type="number" name="dailyEntries" disabled={formData.isDailyInfinite} value={formData.dailyEntries} onChange={handleInputChange}/>
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-Body 2 text-text-grey-blue" >회</span>
            </div>
          </div>

          {/* 주간/월간 등 추가 설정 가능... (생략 및 대표적인 것만 표시) */}
          <div className="flex items-center gap-md col-span-2 pt-md border-t border-border-light" >
             <p className="text-Body 2 text-text-grey-blue" >* 입장 횟수 제한을 통해 기간 내 이용 가능한 총 횟수를 제어할 수 있습니다.</p>
          </div>
        </FormSection>

        {/* 섹션 03: 추가 설정 (접기/펼치기) */}
        <FormSection title="상세 추가 설정" description="홀딩, 이용 시간, 출입 권한 등 상품의 세부적인 정책을 설정합니다." columns={1} collapsible={true} defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl" >
            
            {/* 홀딩 제한 설정 */}
            <div className="p-md bg-bg-main-light-blue/30 rounded-card-normal border border-border-light" >
              <div className="flex items-center justify-between mb-md" >
                <div className="flex items-center gap-sm" >
                  <CalendarDays className="text-primary-coral" size={20}/>
                  <h4 className="text-Body 1 font-bold text-text-dark-grey" >홀딩 제한 설정</h4>
                </div>
                <div className="flex items-center gap-sm" >
                  <span className="text-Label text-text-grey-blue" >사용 여부</span>
                  <input
                    className="w-5 h-5 rounded-full accent-secondary-mint" type="checkbox" checked={formData.isHoldingEnabled} onChange={() => handleToggle("isHoldingEnabled")}/>
                </div>
              </div>
              
              <div className={cn("space-y-md transition-opacity", !formData.isHoldingEnabled && "opacity-40 pointer-events-none")} >
                <div className="flex items-center justify-between gap-md" >
                  <label className="text-Body 2 text-text-dark-grey" >최대 홀딩 일수</label>
                  <div className="flex items-center gap-xs" >
                    <input className="w-[80px] px-sm py-xs rounded-input border border-border-light text-right" type="number" name="holdingMaxDays" value={formData.holdingMaxDays} onChange={handleInputChange}/>
                    <span className="text-Body 2 text-text-grey-blue" >일</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-md" >
                  <label className="text-Body 2 text-text-dark-grey" >최대 홀딩 횟수</label>
                  <div className="flex items-center gap-xs" >
                    <input className="w-[80px] px-sm py-xs rounded-input border border-border-light text-right" type="number" name="holdingMaxCount" value={formData.holdingMaxCount} onChange={handleInputChange}/>
                    <span className="text-Body 2 text-text-grey-blue" >회</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 입장 시간 구간 설정 */}
            <div className="p-md bg-bg-main-light-blue/30 rounded-card-normal border border-border-light" >
              <div className="flex items-center justify-between mb-md" >
                <div className="flex items-center gap-sm" >
                  <Clock className="text-information" size={20}/>
                  <h4 className="text-Body 1 font-bold text-text-dark-grey" >이용 가능 시간</h4>
                </div>
                <button className="text-[12px] font-bold text-primary-coral flex items-center gap-xs" >
                  <Plus size={14}/> 구간 추가
                </button>
              </div>
              
              <div className="space-y-sm" >
                {formData.useTimeRanges.map((range, idx) => (
                  <div className="flex items-center gap-sm bg-white p-sm rounded-button border border-border-light shadow-sm" key={idx}>
                    <span className="text-Label bg-bg-main-light-blue px-sm py-[2px] rounded-full w-[50px] text-center" >{range.day}</span>
                    <div className="flex items-center gap-xs text-Body 2" >
                      <input className="border-none p-0 w-[65px] outline-none" type="time" defaultValue={range.startTime}/>
                      <span >~</span>
                      <input className="border-none p-0 w-[65px] outline-none" type="time" defaultValue={range.endTime}/>
                    </div>
                    <button className="ml-auto text-text-grey-blue hover:text-error transition-colors" >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 판매 노출 및 구매 권한 */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-md" >
              <div className="p-md bg-white border border-border-light rounded-card-normal shadow-sm" >
                <div className="flex items-center justify-between" >
                  <span className="text-Body 2 font-medium text-text-dark-grey" >키오스크 판매 노출</span>
                  <input className="w-5 h-5 accent-primary-coral" type="checkbox" checked={formData.isKioskExposed} onChange={() => handleToggle("isKioskExposed")}/>
                </div>
                <p className="mt-xs text-[12px] text-text-grey-blue" >키오스크 상품 목록에 카드가로 노출됩니다.</p>
              </div>
              <div className="p-md bg-white border border-border-light rounded-card-normal shadow-sm" >
                <div className="flex items-center justify-between" >
                  <span className="text-Body 2 font-medium text-text-dark-grey" >신규 고객 구매 가능</span>
                  <input className="w-5 h-5 accent-secondary-mint" type="checkbox" checked={formData.isNewCustomerBuyable} onChange={() => handleToggle("isNewCustomerBuyable")}/>
                </div>
                <p className="mt-xs text-[12px] text-text-grey-blue" >회원 가입과 동시에 구매가 가능합니다.</p>
              </div>
              <div className="p-md bg-white border border-border-light rounded-card-normal shadow-sm" >
                <div className="flex items-center justify-between" >
                  <span className="text-Body 2 font-medium text-text-dark-grey" >사용 여부</span>
                  <div className="relative inline-flex items-center cursor-pointer" onClick={() => handleToggle("isUsed")}>
                    <div className={cn("w-11 h-6 bg-gray-200 rounded-full transition-colors", formData.isUsed && "bg-secondary-mint")} />
                    <div className={cn("absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform shadow-sm", formData.isUsed && "translate-x-full")} />
                  </div>
                </div>
                <p className="mt-xs text-[12px] text-text-grey-blue" >미사용 설정 시 상품 목록에서 숨겨집니다.</p>
              </div>
            </div>
          </div>
        </FormSection>
      </div>

      {/* 하단 플로팅 액션 바 (반응형) */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[260px] bg-white/80 backdrop-blur-md border-t border-border-light p-md px-lg flex items-center justify-between z-10" >
        <div className="hidden md:flex items-center gap-md" >
           <StatusBadge variant={formData.isUsed ? "success" : "default"} dot="true" label={formData.isUsed ? "판매중" : "판매중지"}/>
           <span className="text-Body 2 text-text-grey-blue" >| {formData.itemType || "상품 유형 미지정"}</span>
        </div>
        <div className="flex items-center gap-sm w-full md:w-auto" >
           <button
             className="flex-1 md:flex-none px-xl py-md rounded-button border border-border-light text-text-dark-grey font-bold hover:bg-bg-main-light-blue transition-all" onClick={handleCancel}>
             취소
           </button>
           <button
             className="flex-1 md:flex-none flex items-center justify-center gap-sm px-xxl py-md rounded-button bg-primary-coral text-white font-bold hover:bg-primary-coral/90 shadow-lg shadow-primary-coral/20 transition-all disabled:opacity-50" onClick={handleSave} disabled={isSaving}>
             {isSaving && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
             {isEditMode ? "상품 수정하기" : "상품 등록하기"}
           </button>
        </div>
      </div>

      {/* 취소 확인 다이얼로그 */}
      <ConfirmDialog open={showCancelConfirm} title="작업 취소" description="입력 중인 정보가 저장되지 않고 사라집니다. 목록으로 돌아가시겠습니까?" confirmLabel="돌아가기" cancelLabel="계속 작성" variant="danger" onConfirm={() => moveToPage(972)} onCancel={() => setShowCancelConfirm(false)}/>
    </AppLayout>
  );
}
