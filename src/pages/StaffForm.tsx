import React, { useState } from 'react';
import { 
  Save, 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar as CalendarIcon, 
  CreditCard, 
  ShieldCheck,
  Plus,
  Trash2,
  Camera,
  Check
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import FormSection from '@/components/FormSection';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

export default function StaffForm() {
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    gender: 'male',
    address: '',
    role: 'trainer',
    employmentType: 'full-time',
    joinDate: new Date().toISOString().split('T')[0],
    department: 'PT팀',
    baseSalary: '',
    incentiveRate: '',
    bank: '',
    accountNumber: '',
    username: '',
    password: '',
    permissionGroup: 'trainer_standard',
    status: 'active'
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 핸들러들
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Mock 저장 로직
    setTimeout(() => {
      setIsSaving(false);
      alert('직원 정보가 성공적으로 저장되었습니다.');
      moveToPage(974); // 직원 목록으로 이동
    }, 1000);
  };

  const handleCancel = () => {
    setShowConfirm(true);
  };

  const confirmCancel = () => {
    setShowConfirm(false);
    moveToPage(974);
  };

  return (
    <AppLayout >
      <PageHeader title="직원 등록" description="새로운 직원을 시스템에 등록하고 권한을 설정합니다." actions={
          <div className="flex gap-sm">
            <button 
              onClick={handleCancel}
              className="px-lg py-sm rounded-button border border-border-light bg-white text-text-grey-blue hover:bg-bg-main-light-blue transition-all font-medium"
            >
              취소
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-xs px-lg py-sm rounded-button bg-primary-coral text-white hover:bg-opacity-90 transition-all font-medium shadow-sm disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        }/>

      <div className="space-y-lg pb-xxl" >
        {/* 프로필 요약 카드 (선택사항) */}
        <div className="flex flex-col md:flex-row gap-lg" >
          <div className="w-full md:w-[300px] flex flex-col gap-md" >
            <div className="rounded-card-normal border border-border-light bg-white p-lg flex flex-col items-center shadow-card-soft" >
              <div className="relative mb-md" >
                <div className="w-[120px] h-[120px] rounded-full bg-bg-main-light-blue flex items-center justify-center overflow-hidden border-2 border-border-light" >
                  <User className="text-text-grey-blue" size={64}/>
                </div>
                <button className="absolute bottom-0 right-0 p-sm bg-secondary-mint text-white rounded-full shadow-md hover:scale-105 transition-transform" >
                  <Camera size={16}/>
                </button>
              </div>
              <h3 className="text-Heading 2 text-text-dark-grey font-bold" >{formData.name || '이름 없음'}</h3>
              <p className="text-Body 2 text-text-grey-blue mb-md" >{formData.role === 'trainer' ? '트레이너' : '매니저'}</p>
              <StatusBadge label="등록 대기" variant="default" dot="true"/>
            </div>

            <div className="rounded-card-normal border border-border-light bg-white p-md shadow-card-soft" >
              <h4 className="text-Label text-text-grey-blue mb-sm" >참고 사항</h4>
              <p className="text-Body 2 text-text-grey-blue leading-relaxed" >
                직원 등록 시 입력한 아이디와 초기 비밀번호로 시스템 접속이 가능합니다. 
                권한 설정에 따라 접근 가능한 메뉴가 제한될 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-lg" >
            {/* 섹션 1: 인적 사항 */}
            <FormSection title="인적 사항" description="직원의 기본적인 연락처 및 개인 정보를 입력합니다.">
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >이름 <span className="text-error" >*</span></label>
                <div className="relative" >
                  <User className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                  <input
                    className="w-full pl-[44px] pr-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="name" value={formData.name} onChange={handleChange} placeholder="홍길동"/>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >연락처 <span className="text-error" >*</span></label>
                <div className="relative" >
                  <Phone className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                  <input
                    className="w-full pl-[44px] pr-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="phone" value={formData.phone} onChange={handleChange} placeholder="010-1234-5678"/>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >이메일</label>
                <div className="relative" >
                  <Mail className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                  <input
                    className="w-full pl-[44px] pr-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@wellness.com"/>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >생년월일</label>
                <input
                  className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange}/>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >성별</label>
                <div className="flex gap-sm" >
                  <button
                    className={cn(
                      "flex-1 py-md rounded-input border transition-all font-medium",
                      formData.gender === 'male' 
                        ? "bg-bg-soft-peach border-primary-coral text-primary-coral" 
                        : "bg-white border-border-light text-text-grey-blue"
                    )} onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}>
                    남성
                  </button>
                  <button
                    className={cn(
                      "flex-1 py-md rounded-input border transition-all font-medium",
                      formData.gender === 'female' 
                        ? "bg-bg-soft-peach border-primary-coral text-primary-coral" 
                        : "bg-white border-border-light text-text-grey-blue"
                    )} onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}>
                    여성
                  </button>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >주소</label>
                <div className="relative" >
                  <MapPin className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
                  <input
                    className="w-full pl-[44px] pr-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="address" value={formData.address} onChange={handleChange} placeholder="서울시 강남구..."/>
                </div>
              </div>
            </FormSection>

            {/* 섹션 2: 근무 정보 */}
            <FormSection title="근무 정보" description="직책, 소속 및 근무 형태를 설정합니다.">
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >직책 <span className="text-error" >*</span></label>
                <select
                  className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none cursor-pointer" name="role" value={formData.role} onChange={handleChange}>
                  <option value="trainer">트레이너</option>
                  <option value="manager">매니저</option>
                  <option value="reception">안내데스크</option>
                  <option value="admin">슈퍼관리자</option>
                </select>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >고용 형태</label>
                <select
                  className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none cursor-pointer" name="employmentType" value={formData.employmentType} onChange={handleChange}>
                  <option value="full-time">정규직</option>
                  <option value="part-time">계약직/파트타임</option>
                  <option value="freelancer">프리랜서</option>
                </select>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >입사일 <span className="text-error" >*</span></label>
                <input
                  className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="joinDate" type="date" value={formData.joinDate} onChange={handleChange}/>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >소속 부서/팀</label>
                <input
                  className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="department" value={formData.department} onChange={handleChange} placeholder="예: PT팀, FC팀"/>
              </div>
            </FormSection>

            {/* 섹션 3: 급여 및 정산 */}
            <FormSection title="급여 및 정산" description="급여 기준과 정산 계좌 정보를 등록합니다.">
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >기본급 (월)</label>
                <div className="relative" >
                  <input
                    className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none text-right pr-xl" name="baseSalary" type="number" value={formData.baseSalary} onChange={handleChange} placeholder="0"/>
                  <span className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue" >원</span>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >인센티브 요율</label>
                <div className="relative" >
                  <input
                    className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none text-right pr-xl" name="incentiveRate" type="number" value={formData.incentiveRate} onChange={handleChange} placeholder="0"/>
                  <span className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue" >%</span>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >지급 은행</label>
                <select
                  className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none cursor-pointer" name="bank" value={formData.bank} onChange={handleChange}>
                  <option value="">은행 선택</option>
                  <option value="shinhan">신한은행</option>
                  <option value="kb">국민은행</option>
                  <option value="woori">우리은행</option>
                  <option value="hana">하나은행</option>
                  <option value="kakao">카카오뱅크</option>
                </select>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >계좌번호</label>
                <input
                  className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="'-' 제외하고 입력"/>
              </div>
            </FormSection>

            {/* 섹션 4: 계정 및 권한 */}
            <FormSection title="계정 및 권한" description="시스템 접속 계정과 접근 권한을 설정합니다." columns={1}>
              <div className="grid grid-cols-2 gap-md" >
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue font-semibold" >아이디 (ID) <span className="text-error" >*</span></label>
                  <input
                    className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="username" value={formData.username} onChange={handleChange} placeholder="영문, 숫자 조합"/>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue font-semibold" >비밀번호 <span className="text-error" >*</span></label>
                  <input
                    className="w-full px-md py-md bg-input-bg-light border-none rounded-input focus:ring-2 focus:ring-secondary-mint outline-none transition-all" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="초기 비밀번호 설정"/>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue font-semibold" >접근 권한 그룹 <span className="text-error" >*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-sm" >
                  {[
                    { key: 'trainer_standard', label: '트레이너 표준', desc: '담당 회원 관리 및 스케줄 관리' },
                    { key: 'sales_standard', label: '영업/FC 표준', desc: '상담, 결제 및 매출 통계 접근' },
                    { key: 'manager_full', label: '지점 관리자', desc: '지점 내 모든 데이터 관리' }
                  ].map((group) => (
                    <div
                      className={cn(
                        "p-md rounded-input border cursor-pointer transition-all",
                        formData.permissionGroup === group.key 
                          ? "bg-bg-soft-mint border-secondary-mint ring-1 ring-secondary-mint" 
                          : "bg-white border-border-light hover:border-secondary-mint/50"
                      )} key={group.key} onClick={() => setFormData(prev => ({ ...prev, permissionGroup: group.key }))}>
                      <div className="flex justify-between items-center mb-xs" >
                        <span className={cn(
                          "text-Body 1 font-bold",
                          formData.permissionGroup === group.key ? "text-secondary-mint" : "text-text-dark-grey"
                        )} >
                          {group.label}
                        </span>
                        {formData.permissionGroup === group.key && <Check className="text-secondary-mint" size={16}/>}
                      </div>
                      <p className="text-Label text-text-grey-blue" >{group.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FormSection>
          </div>
        </div>
      </div>

      {/* 취소 확인 다이얼로그 */}
      <ConfirmDialog open={showConfirm} title="등록 취소" description="입력 중인 정보가 저장되지 않고 사라집니다. 정말 취소하시겠습니까?" confirmLabel="네, 취소합니다" cancelLabel="계속 작성하기" variant="danger" onConfirm={confirmCancel} onCancel={() => setShowConfirm(false)}/>
    </AppLayout>
  );
}
