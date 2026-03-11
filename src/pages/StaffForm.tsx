import React, { useState } from "react";
import { Save, User, Phone, Mail, Calendar, FileText, Check, ShieldCheck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// 역할별 권한 미리보기
const ROLE_PERMISSIONS: Record<string, { label: string; desc: string; perms: string[] }> = {
  owner:   { label: "센터장",   desc: "지점 내 전체 데이터 접근 및 관리",         perms: ["회원 전체 관리", "직원 관리", "급여 확정", "매출 통계", "설정 변경"] },
  manager: { label: "매니저",   desc: "운영 전반 관리 및 주요 기능 접근",         perms: ["회원 관리", "스케줄 관리", "매출 통계 조회", "직원 조회"] },
  fc:      { label: "FC",       desc: "상담·결제 및 매출 통계 접근",             perms: ["회원 상담", "결제 처리", "매출 통계 조회"] },
  trainer: { label: "트레이너", desc: "담당 회원 관리 및 수업 스케줄 관리",       perms: ["담당 회원 조회", "수업 스케줄 관리", "출석 체크"] },
  staff:   { label: "스태프",   desc: "기본 회원 조회 및 출석 확인",             perms: ["회원 조회", "출석 확인"] },
};

export default function StaffForm() {
  const [formData, setFormData] = useState({
    name: "",
    role: "trainer",
    contact: "",
    joinDate: new Date().toISOString().split("T")[0],
    email: "",
    memo: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // 연락처 자동 하이픈 포맷
    if (name === "contact") {
      const digits = value.replace(/\D/g, "");
      let formatted = digits;
      if (digits.length <= 3) {
        formatted = digits;
      } else if (digits.length <= 7) {
        formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      } else {
        formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
      }
      setFormData(prev => ({ ...prev, contact: formatted }));
      if (errors.contact) setErrors(prev => ({ ...prev, contact: "" }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim())    newErrors.name    = "이름을 입력하세요";
    if (!formData.role)           newErrors.role    = "역할을 선택하세요";
    if (!formData.joinDate)       newErrors.joinDate = "입사일을 입력하세요";
    if (formData.contact && !/^010-\d{4}-\d{4}$/.test(formData.contact)) {
      newErrors.contact = "올바른 연락처를 입력하세요";
    }
    if (!formData.contact.trim()) newErrors.contact = "연락처를 입력하세요";
    return newErrors;
  };

  const handleSave = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    alert("직원이 성공적으로 등록되었습니다.");
    moveToPage(974);
  };

  const roleInfo = ROLE_PERMISSIONS[formData.role] || ROLE_PERMISSIONS.staff;

  return (
    <AppLayout>
      <PageHeader
        title="직원 등록"
        description="새로운 직원 정보를 입력하고 역할을 설정합니다."
        actions={
          <div className="flex gap-sm">
            <button
              className="px-lg py-sm rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-secondary transition-all text-Label font-medium"
              onClick={() => setShowCancelDialog(true)}
            >
              취소
            </button>
            <button
              className="flex items-center gap-xs px-lg py-sm rounded-button bg-primary text-white hover:opacity-90 transition-all text-Label font-semibold shadow-sm"
              onClick={handleSave}
            >
              <Save size={16} />
              저장하기
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
              이름 <span className="text-error">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="홍길동"
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.name ? "border-error focus:ring-error/30" : "border-line"
                )}
              />
            </div>
            {errors.name && <p className="text-Label text-error">{errors.name}</p>}
          </div>

          {/* 역할 선택 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              역할 <span className="text-error">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={cn(
                "w-full px-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer",
                errors.role ? "border-error" : "border-line"
              )}
            >
              <option value="">역할 선택</option>
              <option value="owner">센터장</option>
              <option value="manager">매니저</option>
              <option value="fc">FC</option>
              <option value="trainer">트레이너</option>
              <option value="staff">스태프</option>
            </select>
            {errors.role && <p className="text-Label text-error">{errors.role}</p>}
            {/* 역할 권한 미리보기 */}
            {formData.role && (
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
              연락처 <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="010-0000-0000"
                maxLength={13}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.contact ? "border-error focus:ring-error/30" : "border-line"
                )}
              />
            </div>
            {errors.contact && <p className="text-Label text-error">{errors.contact}</p>}
          </div>

          {/* 입사일 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">
              입사일 <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                name="joinDate"
                type="date"
                value={formData.joinDate}
                onChange={handleChange}
                className={cn(
                  "w-full pl-[40px] pr-md py-md bg-surface-secondary border rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.joinDate ? "border-error focus:ring-error/30" : "border-line"
                )}
              />
            </div>
            {errors.joinDate && <p className="text-Label text-error">{errors.joinDate}</p>}
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
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@center.com"
                className="w-full pl-[40px] pr-md py-md bg-surface-secondary border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">메모</label>
            <div className="relative">
              <FileText className="absolute left-md top-[14px] text-content-secondary" size={16} />
              <textarea
                name="memo"
                value={formData.memo}
                onChange={handleChange}
                placeholder="특이사항이나 참고 내용을 입력하세요"
                rows={3}
                className="w-full pl-[40px] pr-md py-md bg-surface-secondary border border-line rounded-input text-Body-2 outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
            </div>
          </div>
        </FormSection>
      </div>

      <ConfirmDialog
        open={showCancelDialog}
        title="등록 취소"
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
