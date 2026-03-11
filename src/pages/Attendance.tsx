
import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  BellOff, 
  ChevronLeft, 
  ChevronRight,
  User,
  LogOut,
  MapPin,
  Clock,
  CreditCard,
  Smartphone,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// 공통 컴포넌트 임포트
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { SearchFilter } from "@/components/SearchFilter";

/**
 * SCR-006: 출석 관리 (Attendance)
 * 회원의 방문(입퇴장) 이력을 관리하고 실시간 입장 알림을 제공하는 화면입니다.
 */

// --- Mock Data ---
const MOCK_ATTENDANCE_DATA = [
  {
    id: 1,
    type: "회원",
    status: "성공",
    category: "입장 출석",
    door: "정문 게이트 #1",
    memberName: "김철수",
    memberId: 101,
    presence: "재실",
    gender: "남",
    tel: "010-1234-5678",
    inTime: "09:12:45",
    outTime: "-",
    visitCount: 24,
    passInfo: "헬스 3개월권 (잔여 12일)",
    expiryDate: "2026-03-02",
    lockerNo: "A-12",
    isOtherBranch: false,
    address: "서울시 종로구"
  },
  {
    id: 2,
    type: "직원",
    status: "성공",
    category: "출근",
    door: "직원 전용 통로",
    memberName: "이영희 (트레이너)",
    memberId: 201,
    presence: "재실",
    gender: "여",
    tel: "010-9876-5432",
    inTime: "08:55:02",
    outTime: "-",
    visitCount: 156,
    passInfo: "직원 근태 관리",
    expiryDate: "-",
    lockerNo: "-",
    isOtherBranch: false,
    address: "서울시 강남구"
  },
  {
    id: 3,
    type: "회원",
    status: "실패",
    category: "입장 거부",
    door: "정문 게이트 #2",
    memberName: "박지민",
    memberId: 105,
    presence: "부재",
    gender: "여",
    tel: "010-5555-4444",
    inTime: "10:05:30",
    outTime: "10:05:31",
    visitCount: 12,
    passInfo: "요가 10회권 (잔여 0회)",
    expiryDate: "2026-02-10",
    lockerNo: "-",
    isOtherBranch: true,
    address: "수원시 팔달구"
  },
  {
    id: 4,
    type: "회원",
    status: "성공",
    category: "입장 출석",
    door: "정문 게이트 #1",
    memberName: "최강호",
    memberId: 110,
    presence: "부재",
    gender: "남",
    tel: "010-1111-2222",
    inTime: "07:30:15",
    outTime: "09:00:22",
    visitCount: 45,
    passInfo: "프리미엄 연간회원",
    expiryDate: "2026-12-31",
    lockerNo: "B-05",
    isOtherBranch: false,
    address: "서울시 중구"
  },
  {
    id: 5,
    type: "회원",
    status: "성공",
    category: "입장 출석",
    door: "정문 게이트 #2",
    memberName: "한소희",
    memberId: 120,
    presence: "재실",
    gender: "여",
    tel: "010-9999-8888",
    inTime: "14:20:00",
    outTime: "-",
    visitCount: 8,
    passInfo: "필라테스 패키지",
    expiryDate: "2026-05-20",
    lockerNo: "C-21",
    isOtherBranch: false,
    address: "서울시 서대문구"
  }
];

export default function Attendance() {
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState(MOCK_ATTENDANCE_DATA);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isRealtimePopupEnabled, setIsRealtimePopupEnabled] = useState(true);
  const [popups, setPopups] = useState<any[]>([]);

  // 실시간 팝업 추가 핸들러 (데모용)
  const addMockPopup = () => {
    if (!isRealtimePopupEnabled) return;
    
    const newPopup = {
      id: Date.now(),
      name: "한소희",
      status: "입장 성공",
      pass: "필라테스 패키지",
      remainDays: 92,
      photo: "/images/attendance-welcome-3d?sid=70", // 디자인 가이드 이미지 활용
    };

    setPopups(prev => [newPopup, ...prev]);

    // 5초 후 자동 닫기
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 5000);
  };

  const handleClosePopup = (id: number) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      key: "no",
      header: "No",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      key: "type",
      header: "사용자 유형",
      width: 100,
      render: (val: string) => (
        <StatusBadge variant={val === "회원" ? "default" : "warning"} label={val}/>
      )
    },
    {
      key: "status",
      header: "출석 여부",
      width: 100,
      render: (val: string) => (
        <StatusBadge variant={val === "성공" ? "success" : "error"} label={val} dot={true}/>
      )
    },
    { key: "category", header: "출석 구분", width: 120 },
    { key: "door", header: "출입문", width: 140 },
    {
      key: "memberName",
      header: "회원명",
      width: 150,
      render: (val: string, row: any) => (
        <button 
          className="font-semibold text-primary-coral hover:underline text-left" onClick={() => moveToPage(985)}>
          {val}
        </button>
      )
    },
    {
      key: "presence",
      header: "재실 여부",
      width: 100,
      render: (val: string) => (
        <StatusBadge variant={val === "재실" ? "info" : "default"} label={val}/>
      )
    },
    { key: "gender", header: "성별", width: 60, align: "center" as const },
    { key: "tel", header: "연락처", width: 130 },
    { key: "inTime", header: "입장 시간", width: 100, align: "center" as const },
    { key: "outTime", header: "퇴장 시간", width: 100, align: "center" as const },
    { key: "visitCount", header: "방문 회차", width: 80, align: "center" as const },
    { key: "passInfo", header: "이용권 내역", width: 180 },
    { key: "expiryDate", header: "만료일", width: 100 },
    { key: "lockerNo", header: "락커 번호", width: 80, align: "center" as const },
    {
      key: "isOtherBranch",
      header: "타지점",
      width: 80,
      align: "center" as const,
      render: (val: boolean) => val ? <StatusBadge variant="warning" label="Y"/> : "-"
    },
    { key: "address", header: "주소", width: 150 },
  ];

  return (
    <AppLayout >
      <div className={cn(
        "flex flex-col gap-lg transition-colors duration-500 min-h-screen",
        isNightMode ? "bg-slate-900 -m-lg p-lg text-slate-100" : "bg-2"
      )} >
        {/* 페이지 헤더 */}
        <PageHeader title="출석 관리" description="실시간 회원 입퇴장 현황과 출석 이력을 관리합니다." actions={
            <div className="flex items-center gap-md">
              <div className="flex items-center gap-sm bg-2 p-sm rounded-button shadow-sm">
                <button 
                  className="p-xs hover:bg-2 rounded-md transition-colors text-5"
                  onClick={() => {/* 날짜 -1 로직 */}}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-xs px-sm font-semibold text-5">
                  <CalendarIcon size={18} className="text-primary-coral" />
                  <span className="text-Data-Monospace-Tabular">{selectedDate}</span>
                </div>
                <button 
                  className="p-xs hover:bg-2 rounded-md transition-colors text-5"
                  onClick={() => {/* 날짜 +1 로직 */}}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center gap-xs bg-2 p-[4px] rounded-button shadow-sm">
                <button 
                  className={cn(
                    "flex items-center gap-xs px-md py-sm rounded-button text-Label transition-all",
                    !isNightMode ? "bg-0 text-white shadow-md" : "text-5 hover:bg-2"
                  )}
                  onClick={() => setIsNightMode(false)}
                >
                  <Sun size={14} /> 데이
                </button>
                <button 
                  className={cn(
                    "flex items-center gap-xs px-md py-sm rounded-button text-Label transition-all",
                    isNightMode ? "bg-indigo-600 text-white shadow-md" : "text-5 hover:bg-2"
                  )}
                  onClick={() => setIsNightMode(true)}
                >
                  <Moon size={14} /> 나이트
                </button>
              </div>

              <button 
                className={cn(
                  "flex items-center gap-xs px-md py-md rounded-button text-Label font-bold transition-all border",
                  isRealtimePopupEnabled ? "bg-bg-soft-mint border-secondary-mint text-secondary-mint" : "bg-2 border-7 text-5"
                )}
                onClick={() => setIsRealtimePopupEnabled(!isRealtimePopupEnabled)}
              >
                {isRealtimePopupEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                실시간 팝업 {isRealtimePopupEnabled ? "ON" : "OFF"}
              </button>

              <button 
                className="p-md bg-2 border border-7 rounded-button text-5 hover:text-primary-coral transition-colors shadow-sm"
                onClick={addMockPopup} // 데모용
              >
                <ArrowRight size={20} />
              </button>
            </div>
          }/>

        {/* 요약 카드 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg" >
          <StatCard label="조회일 총 출석" value="128건" icon={<User />} description="전일 대비 12건 증가" change={{ value: 10.3, label: "증가" }}/>
          <StatCard label="출석 성공" value="122건" variant="mint" icon={<CheckCircle2 />} description="전체 시도의 95.3%"/>
          <StatCard label="출석 실패" value="6건" variant="peach" icon={<XCircle />} description="기간 내 거부된 건수" change={{ value: -2.1, label: "감소" }}/>
        </div>

        {/* 검색 및 필터 영역 */}
        <SearchFilter searchPlaceholder="회원명, 연락처, 이용권명 검색" filters={[
            {
              key: "type",
              label: "사용자 유형",
              type: "select",
              options: [
                { value: "member", label: "회원" },
                { value: "staff", label: "직원" }
              ]
            },
            {
              key: "status",
              label: "출석 구분",
              type: "select",
              options: [
                { value: "entry", label: "입장 출석" },
                { value: "work", label: "출근" },
                { value: "deny", label: "입장 거부" }
              ]
            }
          ]}/>

        {/* 데이터 테이블 */}
        <DataTable columns={columns} data={attendanceRecords} loading={loading} selectable={true} title="출석 이력 목록" pagination={{
            page: 1,
            pageSize: 10,
            total: 128
          }} onDownloadExcel={() => alert("Excel 다운로드 준비 중...")}/>

        {/* 실시간 입장 팝업 (Portal 형태가 아니므로 이 컴포넌트 내에서 우측 하단 고정) */}
        <div className="fixed bottom-lg right-lg flex flex-col gap-md z-50 pointer-events-none" >
          {popups.map(popup => (
            <div
              className="pointer-events-auto w-[320px] bg-2 rounded-card-strong shadow-5 border-2 border-secondary-mint animate-in slide-in-from-right duration-300 overflow-hidden" key={popup.id}>
              <div className="flex p-md gap-md" >
                <div className="w-[80px] h-[80px] rounded-card-normal overflow-hidden flex-shrink-0 bg-bg-soft-mint" >
                  <img className="w-full h-full object-cover" src={popup.photo} alt={popup.name}/>
                </div>
                <div className="flex-1" >
                  <div className="flex justify-between items-start" >
                    <h4 className="text-Page-Title text-5 font-bold" >{popup.name}</h4>
                    <button
                      className="text-7 hover:text-4" onClick={() => handleClosePopup(popup.id)}>
                      <XCircle size={18}/>
                    </button>
                  </div>
                  <div className="mt-xs" >
                    <StatusBadge variant="success" label={popup.status} dot={true}/>
                  </div>
                  <div className="mt-sm space-y-xs" >
                    <p className="text-Body-Primary-KR text-5 flex items-center gap-xs" >
                      <CreditCard size={14}/> {popup.pass}
                    </p>
                    <p className="text-Label text-secondary-mint font-bold" >
                      만료 D-{popup.remainDays}일
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-bg-soft-mint px-md py-sm border-t border-secondary-mint/20 flex items-center gap-sm" >
                <Smartphone className="text-secondary-mint" size={14}/>
                <span className="text-Data-Monospace-Tabular text-[11px] text-5 font-medium" >AI 음성 안내: "반갑습니다. 즐거운 운동 되세요!"</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
