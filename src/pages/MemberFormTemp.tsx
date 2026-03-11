import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  Save, 
  X, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Tag, 
  FileText, 
  Plus,
  Trash2,
  AlertCircle,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// 공통 컴포넌트 임포트
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FormSection from "@/components/FormSection";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * 회원 등록/수정 (MemberForm) 뷰
 * - memberId가 있으면 수정 모드, 없으면 등록 모드
 */
export default function MemberForm({ memberId }: { memberId?: string }) {
  const isEditMode = !!memberId;
  
  // --- 상태 관리 ---
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birthDate: "",
    gender: "male",
    joinDate: new Date().toISOString().split('T')[0],
    staffId: "",
    address: "",
    memo: "",
    source: "walk-in", // 유입 경로
  });

  // 이용권 정보 (수정 모드 시 예시 데이터)
  const [memberTickets, setMemberTickets] = useState<any[]>([]);
  
  // 모달 상태
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- 초기 데이터 로드 (수정 모드일 경우) ---
  useEffect(() => {
    if (isEditMode) {
      // Mock 데이터 로드
      setFormData({
        name: "김철수",
        phone: "010-1234-5678",
        birthDate: "1990-05-15",
        gender: "male",
        joinDate: "2023-10-01",
        staffId: "1", // 담당 직원 ID
        address: "서울시 중구 세종대로 110",
        memo: "허리 통증이 있으니 스쿼트 시 주의 요망.",
        source: "instagram",
      });

      setMemberTickets([
        { id: 1, name: "헬스 12개월권", status: "active", expiryDate: "2024-09-30", remainingCount: null },
        { id: 2, name: "PT 20회권", status: "active", expiryDate: "2024-03-15", remainingCount: 12 },
      ]);
    }
  }, [isEditMode, memberId]);

  // --- 이벤트 핸들러 ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // 유효성 검사
    if (!formData.name || !formData.phone) {
      alert("이름과 연락처는 필수 입력 항목입니다.");
      return;
    }

    setIsSaving(true);
    // 실제 저장 로직 (Mock)
    setTimeout(() => {
      setIsSaving(false);
      alert(isEditMode ? "회원 정보가 수정되었습니다." : "새 회원이 등록되었습니다.");
      moveToPage(967); // 회원 목록으로 이동
    }, 800);
  };

  const handleCancel = () => {
    setIsCancelModalOpen(true);
  };

  const confirmCancel = () => {
    moveToPage(isEditMode ? 985 : 967); // 상세 또는 목록으로 이동
  };

  // --- 렌더링 헬퍼 ---
  const inputClass = "w-full rounded-input border border-border-light bg-input-bg-light px-md py-sm text-Body-2 focus:border-secondary-mint focus:outline-none transition-all";
  const labelClass = "mb-sm block text-Label text-text-grey-blue";

  return (
    <AppLayout >
      <div className="mx-auto max-w-[1000px]" >
        {/* 상단 헤더 */}
        <PageHeader title={isEditMode ? "회원 정보 수정" : "회원 등록"} description={isEditMode ? `회원번호: ${memberId}` : "센터의 새로운 회원을 등록합니다."} actions={
            <div className="flex gap-sm">
              <button 
                onClick={handleCancel}
                className="flex items-center gap-xs rounded-button border border-border-light bg-3 px-lg py-sm text-Label text-text-grey-blue hover:bg-input-bg-light transition-all"
              >
                <X size={16} />
                취소
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-xs rounded-button bg-primary-coral px-lg py-sm text-Label text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]",
                  isSaving && "opacity-70 cursor-not-allowed"
                )}
              >
                <Save size={16} />
                {isSaving ? "저장 중..." : "정보 저장"}
              </button>
            </div>
          }/>

        <div className="space-y-lg" >
          {/* 1. 기본 정보 */}
          <FormSection title="기본 정보" collapsible={false}>
            <div className="space-y-md" >
              <div >
                <label className={labelClass} >이름 <span className="text-error" >*</span></label>
                <div className="relative" >
                  <input
                    className={inputClass} type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="회원 이름 입력"/>
                  <User className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue opacity-50" size={16}/>
                </div>
              </div>
              
              <div >
                <label className={labelClass} >연락처 <span className="text-error" >*</span></label>
                <div className="relative" >
                  <input
                    className={inputClass} type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="010-0000-0000"/>
                  <Phone className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue opacity-50" size={16}/>
                </div>
              </div>

              <div >
                <label className={labelClass} >성별</label>
                <div className="flex gap-sm" >
                  {["male", "female"].map((g) => (
                    <button
                      className={cn(
                        "flex-1 rounded-button py-sm text-Label transition-all border",
                        formData.gender === g 
                          ? "border-secondary-mint bg-bg-soft-mint text-secondary-mint font-bold" 
                          : "border-border-light bg-input-bg-light text-text-grey-blue"
                      )} key={g} type="button" onClick={() => setFormData(prev => ({ ...prev, gender: g }))}>
                      {g === "male" ? "남성" : "여성"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-md" >
              <div >
                <label className={labelClass} >생년월일</label>
                <input
                  className={inputClass} type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange}/>
              </div>

              <div >
                <label className={labelClass} >가입일</label>
                <input
                  className={inputClass} type="date" name="joinDate" value={formData.joinDate} onChange={handleInputChange}/>
              </div>

              <div >
                <label className={labelClass} >담당 직원</label>
                <select
                  className={inputClass} name="staffId" value={formData.staffId} onChange={handleInputChange}>
                  <option value="">담당자 없음</option>
                  <option value="1">홍길동 트레이너</option>
                  <option value="2">이영희 강사</option>
                  <option value="3">박철수 원장</option>
                </select>
              </div>
            </div>
          </FormSection>

          {/* 2. 이용권 정보 (수정 모드에서만 상세 노출, 등록 시에는 안내만) */}
          <FormSection title="이용권 정보" description={isEditMode ? "회원이 보유한 이용권 목록입니다." : "회원 등록 후 [회원 상세]에서 이용권을 결제/부여할 수 있습니다."} columns={1}>
            {isEditMode ? (
              <div className="space-y-sm" >
                {memberTickets.length > 0 ? (
                  memberTickets.map((ticket) => (
                    <div 
                      className="flex items-center justify-between rounded-card-normal border border-border-light bg-bg-main-light-blue p-md" key={ticket.id}>
                      <div className="flex items-center gap-md" >
                        <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-3 text-secondary-mint shadow-sm" >
                          <Tag size={18}/>
                        </div>
                        <div >
                          <p className="text-Body-1 font-bold text-text-dark-grey" >{ticket.name}</p>
                          <p className="text-Label text-text-grey-blue" >
                            만료일: {ticket.expiryDate} 
                            {ticket.remainingCount !== null && ` | 잔여: ${ticket.remainingCount}회`}
                          </p>
                        </div>
                      </div>
                      <StatusBadge variant={ticket.status === "active" ? "success" : "default"} label={ticket.status === "active" ? "이용중" : "만료"} dot={true}/>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-xl text-text-grey-blue" >
                    <AlertCircle className="mb-sm opacity-20" size={32}/>
                    <p className="text-Body-2" >보유 중인 이용권이 없습니다.</p>
                  </div>
                )}
                
                <button // POS로 이동
                  className="flex w-full items-center justify-center gap-xs rounded-button border border-dashed border-secondary-mint py-md text-Label text-secondary-mint hover:bg-bg-soft-mint transition-all" type="button" onClick={() => moveToPage(971)}>
                  <Plus size={16}/>
                  새 이용권 추가/결제
                </button>
              </div>
            ) : (
              <div className="rounded-card-normal bg-bg-soft-peach p-md text-center" >
                <p className="text-Body-2 text-primary-coral font-medium" >
                  회원 등록 완료 후 바로 결제 화면으로 이동하시겠습니까?
                </p>
                <div className="mt-md flex justify-center gap-sm" >
                  <StatusBadge variant="info" label="등록 후 POS 이동 가능"/>
                </div>
              </div>
            )}
          </FormSection>

          {/* 3. 상세 및 기타 정보 */}
          <FormSection title="상세 정보" columns={1}>
            <div className="space-y-md" >
              <div >
                <label className={labelClass} >주소</label>
                <div className="relative" >
                  <input
                    className={inputClass} type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="주소 검색 및 입력"/>
                  <MapPin className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue opacity-50" size={16}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md" >
                <div >
                  <label className={labelClass} >유입 경로</label>
                  <select
                    className={inputClass} name="source" value={formData.source} onChange={handleInputChange}>
                    <option value="walk-in">직접 방문</option>
                    <option value="instagram">인스타그램</option>
                    <option value="blog">블로그</option>
                    <option value="referral">지인 추천</option>
                    <option value="etc">기타</option>
                  </select>
                </div>
                <div >
                  <label className={labelClass} >운동 목적</label>
                  <input
                    className={inputClass} type="text" placeholder="예: 다이어트, 체형 교정"/>
                </div>
              </div>

              <div >
                <label className={labelClass} >관리자 메모</label>
                <textarea
                  className={cn(inputClass, "resize-none")} name="memo" value={formData.memo} onChange={handleInputChange} rows={4} placeholder="상담 내용이나 특이 사항을 입력하세요."/>
              </div>
            </div>
          </FormSection>
        </div>

        {/* 하단 취소 안내 문구 */}
        <p className="mt-xl text-center text-Body-2 text-text-grey-blue" >
          입력하신 정보는 센터 운영 및 마케팅 목적으로 활용될 수 있습니다.
        </p>
      </div>

      {/* 취소 확인 다이얼로그 */}
      <ConfirmDialog open={isCancelModalOpen} title="작성 취소" description="입력 중인 내용이 저장되지 않고 사라집니다. 정말 취소하시겠습니까?" confirmLabel="취소하고 나가기" cancelLabel="계속 작성" variant="danger" onConfirm={confirmCancel} onCancel={() => setIsCancelModalOpen(false)}/>
    </AppLayout>
  );
}
