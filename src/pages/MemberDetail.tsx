import React, { useState } from "react";
import { 
  User, 
  Phone, 
  Calendar as CalendarIcon, 
  Mail, 
  MapPin, 
  CreditCard, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  MessageSquare,
  ClipboardList,
  Star,
  ShoppingBag,
  History,
  TrendingUp,
  BarChart3,
  Dumbbell,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage, stackPage } from "@/internal";

// 공통 컴포넌트 임포트
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * MemberDetail - 회원 상세 페이지
 * SCR-004 설계서 기준 구현
 */
export default function MemberDetail() {
  // 상태 관리
  const [activeTab, setActiveTab] = useState("info");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock 데이터 - 회원 정보
  const member = {
    id: "M-12345",
    name: "김민수",
    attendanceNo: "8823",
    gender: "남",
    birthDate: "1992-05-14",
    phone: "010-1234-5678",
    email: "minsoo.kim@example.com",
    status: "active", // active, holding, expired, warning
    dDay: 45,
    recentVisit: "2026-02-18 14:30",
    joinDate: "2025-01-10",
    trainer: "이지은 (Jenny)",
    fc: "박상준 (Leo)",
    address: "서울시 강남구 테헤란로 123, 온핏 타워 8층",
    company: "(주)온핏테크",
    marketingAgreed: true,
    appLinked: true,
    appAccount: "minsoo_92",
    purpose: "다이어트 및 근력 강화",
    source: "인스타그램 광고",
    memo: "좌측 무릎 부상 이력 있음 (2년 전 수술). 하체 운동 시 가동 범위 주의 필요. 식단 관리 철저히 요청함.",
  };

  // Mock 데이터 - 이용권 목록
  const tickets = [
    {
      id: 1,
      name: "퍼스널 트레이닝 30회 (1:1)",
      type: "수강권",
      status: "active",
      period: "2026.01.10 ~ 2026.07.10",
      usage: "12 / 30회",
      price: "1,800,000원",
    },
    {
      id: 2,
      name: "헬스 회원권 6개월 (전지점 이용)",
      type: "회원권",
      status: "active",
      period: "2026.01.10 ~ 2026.07.10",
      usage: "D-142",
      price: "660,000원",
    },
    {
      id: 3,
      name: "운동복 & 수건 대여 (6개월)",
      type: "대여권",
      status: "active",
      period: "2026.01.10 ~ 2026.07.10",
      usage: "D-142",
      price: "55,000원",
    }
  ];

  // 탭 구성
  const tabs = [
    { key: "info", label: "회원정보", icon: User },
    { key: "tickets", label: "이용권·계약", icon: CreditCard, count: tickets.length },
    { key: "rentals", label: "대여권", icon: ShoppingBag },
    { key: "attendance", label: "출석 이력", icon: History },
    { key: "body", label: "신체·체성분", icon: Activity },
    { key: "coupons", label: "쿠폰·마일리지", icon: Star },
    { key: "program", label: "운동프로그램", icon: Dumbbell },
    { key: "consulting", label: "상담·메모", icon: MessageSquare },
    { key: "reservation", label: "예약 이력", icon: ClipboardList },
    { key: "evaluation", label: "종합평가", icon: BarChart3 },
    { key: "survey", label: "설문", icon: FileText },
    { key: "analysis", label: "분석", icon: TrendingUp },
  ];

  // 이용권 테이블 컬럼
  const ticketColumns = [
    { 
      key: "name", 
      header: "상품명",
      render: (val: string, row: any) => (
        <div className="flex flex-col" >
          <span className="font-semibold text-text-dark-grey" >{val}</span>
          <span className="text-xs text-text-grey-blue" >{row.type}</span>
        </div>
      )
    },
    { 
      key: "status", 
      header: "상태",
      render: (val: string) => {
        const variants: Record<string, any> = {
          active: { label: "이용중", variant: "success" },
          holding: { label: "홀딩", variant: "info" },
          expired: { label: "만료", variant: "error" },
          warning: { label: "임박", variant: "warning" },
        };
        const s = variants[val] || { label: val, variant: "default" };
        return <StatusBadge variant={s.variant} dot="true">{s.label}</StatusBadge>;
      }
    },
    { key: "period", header: "이용 기간" },
    { key: "usage", header: "잔여/사용" },
    { key: "price", header: "결제 금액", align: "right" as const },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: () => (
        <button className="p-xs hover:bg-bg-main-light-blue rounded-full transition-colors" >
          <MoreVertical className="text-text-grey-blue" size={16}/>
        </button>
      )
    }
  ];

  // 핸들러
  const handleAttendance = () => {
    alert(`${member.name} 회원의 출석이 처리되었습니다.`);
  };

  const handleDeleteMember = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    alert("회원이 삭제되었습니다.");
    setIsDeleteDialogOpen(false);
    moveToPage(967); // 회원 목록으로 이동
  };

  // 렌더링 - 회원정보 탭
  const renderInfoTab = () => (
    <div className="space-y-lg" >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md" >
        <StatCard label="최근 방문일" value={member.recentVisit.split(' ')[0]} description={member.recentVisit.split(' ')[1] + " 방문"} icon={<Clock />}/>
        <StatCard label="담당 트레이너" value={member.trainer} icon={<Users />} variant="peach"/>
        <StatCard label="담당 FC" value={member.fc} icon={<User />} variant="mint"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg" >
        <FormSection title="기본 정보" collapsible="true">
          <div className="space-y-md" >
            <InfoItem label="휴대전화" value={member.phone} icon={<Phone size={16} />}/>
            <InfoItem label="최근 방문일" value={member.recentVisit.split(' ')[0]} icon={<History size={16} />} onClick={() => moveToPage(968)}/>
            <InfoItem label="생년월일" value={`${member.birthDate} (${member.gender})`} icon={<CalendarIcon size={16} />}/>
            <InfoItem label="이메일" value={member.email} icon={<Mail size={16} />}/>
            <InfoItem label="주소" value={member.address} icon={<MapPin size={16} />}/>
          </div>
          <div className="space-y-md" >
            <InfoItem label="회원번호" value={member.id}/>
            <InfoItem label="출석번호" value={member.attendanceNo}/>
            <InfoItem label="가입일" value={member.joinDate}/>
            <InfoItem label="앱 연동" value={member.appLinked ? `연동됨 (${member.appAccount})` : "미연동"} badge={member.appLinked ? "success" : "default"}/>
          </div>
        </FormSection>

        <FormSection title="운영 정보" collapsible="true">
          <div className="space-y-md" >
            <InfoItem label="유입경로" value={member.source}/>
            <InfoItem label="운동목적" value={member.purpose}/>
            <InfoItem label="소속 회사" value={member.company}/>
            <InfoItem label="광고 수신" value={member.marketingAgreed ? "동의" : "미동의"} badge={member.marketingAgreed ? "success" : "error"}/>
          </div>
          <div className="space-y-md" >
            <div className="flex flex-col gap-xs" >
              <span className="text-Label text-text-grey-blue" >특이사항 및 메모</span>
              <div className="p-md bg-bg-main-light-blue/30 rounded-card-normal text-Body 2 text-text-dark-grey min-h-[100px] whitespace-pre-wrap" >
                {member.memo}
              </div>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );

  // 렌더링 - 이용권 탭
  const renderTicketsTab = () => (
    <div className="space-y-lg" >
      <DataTable title="보유 이용권 및 계약 내역" columns={ticketColumns} data={tickets} onDownloadExcel={() => {}}/>
      <div className="flex justify-center p-xl bg-white rounded-card-normal border border-dashed border-border-light" >
        <button
          className="flex items-center gap-sm px-xl py-md bg-bg-soft-peach text-primary-coral rounded-button font-bold hover:bg-primary-coral hover:text-white transition-all shadow-sm" onClick={() => moveToPage(971)}>
          <Plus size={20}/>
          신규 이용권/상품 구매하기
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout >
      <div className="p-lg" >
        {/* 상단 회원 요약 헤더 */}
        <div className="bg-white rounded-card-normal border border-border-light p-xl mb-lg shadow-card-soft" >
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-xl" >
            {/* 프로필 이미지 */}
            <div className="relative" >
              <div className="w-[120px] h-[120px] rounded-full bg-bg-main-light-blue flex items-center justify-center border-[4px] border-bg-soft-peach overflow-hidden" >
                <User className="text-text-grey-blue" size={64}/>
              </div>
              <button
                className={cn(
                  "absolute bottom-0 right-0 p-sm rounded-full shadow-md transition-all",
                  isFavorite ? "bg-primary-coral text-white" : "bg-white text-text-grey-blue hover:text-primary-coral"
                )} onClick={() => setIsFavorite(!isFavorite)}>
                <Star size={18} fill={isFavorite ? "currentColor" : "none"}/>
              </button>
            </div>

            {/* 회원 기본 정보 */}
            <div className="flex-1 text-center lg:text-left" >
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-sm mb-xs" >
                <h1 className="text-Heading 1 text-text-dark-grey font-bold" >{member.name}</h1>
                <span className="text-Body 1 text-text-grey-blue" >({member.attendanceNo})</span>
                <StatusBadge variant="success" dot="true">정상 이용중</StatusBadge>
                <StatusBadge variant="warning">D-{member.dDay}</StatusBadge>
              </div>
              <p className="text-Body 1 text-text-grey-blue mb-md" >{member.gender} · {member.phone} · {member.email}</p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-sm" >
                <button
                  className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white rounded-button font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleAttendance}>
                  <CheckCircle2 size={16}/>
                  수동 출석
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-bg-main-light-blue text-text-dark-grey rounded-button font-semibold hover:bg-border-light transition-all" onClick={() => moveToPage(986)}>
                  <Edit size={16}/>
                  수정
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-bg-soft-mint text-secondary-mint rounded-button font-semibold hover:bg-secondary-mint hover:text-white transition-all" onClick={() => moveToPage(971)}>
                  <ShoppingBag size={16}/>
                  상품 구매
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm border border-error text-error rounded-button font-semibold hover:bg-error hover:text-white transition-all" onClick={handleDeleteMember}>
                  <Trash2 size={16}/>
                  삭제
                </button>
              </div>
            </div>

            {/* 퀵 지표 (오른쪽 정렬) */}
            <div className="hidden xl:flex flex-col gap-sm min-w-[200px]" >
              <div className="flex justify-between items-center p-sm bg-bg-main-light-blue/20 rounded-md" >
                <span className="text-Label text-text-grey-blue" >미수금</span>
                <span className="text-Body 2 font-bold text-error" >0원</span>
              </div>
              <div className="flex justify-between items-center p-sm bg-bg-main-light-blue/20 rounded-md" >
                <span className="text-Label text-text-grey-blue" >마일리지</span>
                <span className="text-Body 2 font-bold text-secondary-mint" >1,250P</span>
              </div>
              <div className="flex justify-between items-center p-sm bg-bg-main-light-blue/20 rounded-md" >
                <span className="text-Label text-text-grey-blue" >쿠폰</span>
                <span className="text-Body 2 font-bold text-primary-coral" >2장</span>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-card-normal border border-border-light shadow-card-soft overflow-hidden" >
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>
          
          <div className="p-xl bg-bg-main-light-blue/5 min-h-[500px]" >
            {activeTab === "info" && renderInfoTab()}
            {activeTab === "tickets" && renderTicketsTab()}
            
            {/* 다른 탭들은 현재 구현 범위 외 (Placeholder) */}
            {!["info", "tickets"].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-xxl text-text-grey-blue" >
                <Activity className="mb-md opacity-20" size={48}/>
                <p className="text-Heading 2 font-medium" >준비 중인 탭입니다</p>
                <p className="text-Body 2 mt-xs mb-lg" >{tabs.find(t => t.key === activeTab)?.label} 데이터를 준비하고 있습니다.</p>
                
                {/* 특정 탭에 대한 명시적 이동 버튼 제공 */}
                {activeTab === "body" && (
                  <button 
                    className="flex items-center gap-sm px-xl py-md bg-secondary-mint text-white rounded-button font-bold hover:scale-[1.02] transition-all shadow-sm" onClick={() => moveToPage(990)}>
                    <Activity size={20}/>
                    신체·체성분 상세 페이지로 이동
                  </button>
                )}
                {activeTab === "coupons" && (
                  <div className="flex gap-md" >
                    <button 
                      className="flex items-center gap-sm px-xl py-md bg-primary-coral text-white rounded-button font-bold hover:scale-[1.02] transition-all shadow-sm" onClick={() => moveToPage(993)}>
                      <Star size={20}/>
                      쿠폰 관리
                    </button>
                    <button 
                      className="flex items-center gap-sm px-xl py-md bg-bg-main-light-blue text-text-dark-grey rounded-button font-bold hover:scale-[1.02] transition-all shadow-sm" onClick={() => moveToPage(981)}>
                      <CreditCard size={20}/>
                      마일리지 관리
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 회원 삭제 확인 다이얼로그 */}
      <ConfirmDialog open={isDeleteDialogOpen} title="회원 삭제 확인" description={`${member.name} 회원의 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?`} confirmLabel="삭제하기" variant="danger" confirmationText="삭제" onConfirm={confirmDelete} onCancel={() => setIsDeleteDialogOpen(false)}/>
    </AppLayout>
  );
}

// 헬퍼 컴포넌트
function InfoItem({ 
  label, 
  value, 
  icon, 
  badge,
  onClick
}: { 
  label: string; 
  value: string | number; 
  icon?: React.ReactNode;
  badge?: "success" | "error" | "default";
  onClick?: () => void;
}) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between py-xs border-b border-border-light/50 last:border-0",
        onClick && "cursor-pointer hover:bg-bg-main-light-blue/50 px-xs -mx-xs transition-colors"
      )} onClick={onClick}>
      <div className="flex items-center gap-sm" >
        {icon && <span className="text-text-grey-blue" >{icon}</span>}
        <span className="text-Body 2 text-text-grey-blue font-medium" >{label}</span>
      </div>
      {badge ? (
        <StatusBadge variant={badge}>{String(value)}</StatusBadge>
      ) : (
        <span className={cn(
          "text-Body 2 font-semibold",
          onClick ? "text-primary-coral underline underline-offset-4" : "text-text-dark-grey"
        )} >{value}</span>
      )}
    </div>
  );
}
