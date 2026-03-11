import React, { useState } from "react";
import { 
  Menu, 
  Search, 
  Plus, 
  Bell, 
  QrCode, 
  Globe, 
  Moon, 
  Sun, 
  ChevronDown, 
  Grid,
  Megaphone,
  X
} from "lucide-react";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  branchName?: string;
  userName?: string;
  notificationCount?: number;
}

const AppHeader = ({
  onToggleSidebar,
  branchName = "스포짐 종각점",
  userName = "관리자",
  notificationCount = 3,
}: AppHeaderProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<"KO" | "EN">("KO");
  const [showNotice, setShowNotice] = useState(true);

  return (
    <div className="flex flex-col w-full sticky top-0 z-50 shadow-1" >
      {/* 1. 공지사항 바 (Top Notice Bar) */}
      {showNotice && (
        <div className="bg-2 px-lg py-1.5 flex items-center justify-between border-b border-7" >
          <div className="flex items-center gap-sm" >
            <Megaphone className="text-5" size={14}/>
            <span className="text-[12px] text-5 font-medium" >
              [공지] 다음 주 월요일(15일) 센터 정기 소독으로 인해 오후 2시부터 4시까지 운영이 일시 중단됩니다.
            </span>
          </div>
          <button
            className="text-5 hover:text-4 transition-colors" onClick={() => setShowNotice(false)}>
            <X size={14}/>
          </button>
        </div>
      )}

      {/* 2. 메인 헤더 영역 */}
      <header className="flex h-[56px] items-center justify-between border-b border-7 bg-3 px-lg" >
        
        {/* Left: 메뉴, 로고, 지점 선택 */}
        <div className="flex items-center gap-lg" >
          {/* 로고 */}
          <div 
            className="flex items-center gap-[10px] cursor-pointer shrink-0" onClick={() => moveToPage(966)}>
            <div className="h-8 w-8 rounded-2 bg-4 flex items-center justify-center text-3 font-bold italic shadow-sm shrink-0" >F</div>
            <span className="text-[20px] text-4 tracking-tight font-bold whitespace-nowrap" >Fit CRM</span>
          </div>

          {/* 사이드바 토글 버튼 (로고 옆으로 이동) */}
          <button 
            className="flex h-9 w-9 items-center justify-center rounded-2 text-4 hover:bg-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0" onClick={onToggleSidebar}>
            <Menu size={20}/>
          </button>

          {/* 지점 선택 */}
          <div className="flex items-center gap-sm rounded-2 bg-2 px-md py-[4px] border border-7 hover:border-4/20 transition-all cursor-pointer group shrink-0" >
            <div className="flex flex-col" >
              <span className="text-[10px] font-bold text-5 uppercase tracking-widest font-['DM_Mono']" >Branch</span>
              <div className="flex items-center gap-xs" >
                <span className="text-[13px] font-semibold text-4" >{branchName}</span>
                <ChevronDown className="text-5 group-hover:text-4" size={14}/>
              </div>
            </div>
          </div>
        </div>

        {/* Center: 회원 검색 */}
        <div className="flex-1 max-w-[480px] px-xl" >
          <div className="relative group" >
            <input 
              className="h-10 w-full rounded-2 border border-7 bg-2 pl-11 pr-md text-[14px] text-4 placeholder:text-5 focus:ring-2 focus:ring-4/10 transition-all outline-none" type="text" placeholder="회원 이름, 연락처 검색..."/>
            <Search className="absolute left-md top-1/2 -translate-y-1/2 text-5 group-focus-within:text-4 transition-colors" size={18}/>
          </div>
        </div>

        {/* Right: 유틸리티, 알림, 프로필, 등록 버튼 */}
        <div className="flex items-center gap-md" >
          
          {/* 서비스 & 유틸리티 아이콘 그룹 */}
          <div className="flex items-center gap-sm pr-md border-r border-7" >
            {/* 서비스 선택 */}
            <button className="h-9 w-9 flex items-center justify-center rounded-2 text-4 hover:bg-2 transition-all" title="서비스 선택">
              <Grid size={18}/>
            </button>
            
            {/* QR 코드 */}
            <button className="h-9 w-9 flex items-center justify-center rounded-2 text-4 hover:bg-2 transition-all" title="QR 출석/인증">
              <QrCode size={18}/>
            </button>

            {/* 다크모드 토글 */}
            <button
              className="h-9 w-9 flex items-center justify-center rounded-2 text-4 hover:bg-2 transition-all" onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? "라이트 모드" : "다크 모드"}>
              {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>

            {/* 언어 전환 */}
            <button
              className="flex items-center gap-xs px-sm h-9 rounded-2 text-4 hover:bg-2 transition-all" onClick={() => setLanguage(language === "KO" ? "EN" : "KO")} title="언어 전환">
              <Globe size={16}/>
              <span className="text-[11px] font-bold font-['DM_Mono']" >{language}</span>
            </button>
          </div>

          {/* 알림 벨 */}
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-2 text-4 hover:bg-2 hover:text-4 transition-colors" >
            <Bell size={18}/>
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-0 text-[10px] font-bold text-3 ring-2 ring-3 font-['DM_Mono']" >
                {notificationCount}
              </span>
            )}
          </button>

          {/* 사용자 프로필 */}
          <div className="flex items-center gap-sm pl-sm cursor-pointer group" >
            <div className="h-8 w-8 rounded-full bg-2 flex items-center justify-center text-4 font-bold text-[14px] border border-7 group-hover:bg-4 group-hover:text-3 transition-all shadow-sm" >
              {userName.substring(0, 1)}
            </div>
            <div className="hidden lg:flex flex-col" >
              <span className="text-[13px] font-bold text-4 leading-tight" >{userName}</span>
              <span className="text-[10px] text-5 font-medium uppercase tracking-wider" >Super Admin</span>
            </div>
            <ChevronDown className="text-5 group-hover:text-4" size={14}/>
          </div>

          {/* 회원 등록 버튼 */}
          <button
            className="ml-sm h-10 rounded-2 bg-4 px-lg flex items-center gap-sm text-[14px] font-bold text-3 shadow-sm hover:bg-4/90 active:scale-95 transition-all" onClick={() => moveToPage(986)}>
            <Plus size={18}/>
            <span >회원등록</span>
          </button>

        </div>
      </header>
    </div>
  );
};

export default AppHeader;