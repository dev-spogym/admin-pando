
import React, { useState, useEffect } from "react";
import { 
  Save, 
  Settings, 
  Monitor, 
  Volume2, 
  Lock, 
  Image as ImageIcon, 
  Palette, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import FormSection from "@/components/FormSection";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// --- Types ---
type KioskStatus = "online" | "offline";
type TabKey = "basic" | "screen" | "tts" | "access";

interface BannerImage {
  id: string;
  url: string;
  name: string;
}

interface SettingsData {
  // Basic
  isActive: boolean;
  checkInMethods: string[];
  screenTimeout: number;
  autoLogout: number;
  adminPin: string;

  // Screen
  bgImage: string;
  logoImage: string;
  themeColor: string;
  welcomeMessage: string;
  showNotice: boolean;
  noticeContent: string;
  showWeather: boolean;
  showAdBanner: boolean;
  banners: BannerImage[];

  // TTS
  ttsMessages: {
    id: string;
    event: string;
    message: string;
    description: string;
  }[];

  // Access
  accessStartTime: string;
  accessEndTime: string;
  allowExpired: "allow" | "deny";
  expirationWarningDays: number;
  preventDuplicateCheckIn: boolean;
  duplicatePreventionMinutes: number;
  unpaidAccess: "allow" | "warn" | "deny";
}

// --- Constants ---
const TABS = [
  { key: "basic", label: "기본 설정", icon: Settings },
  { key: "screen", label: "화면 설정", icon: Monitor },
  { key: "tts", label: "TTS 설정", icon: Volume2 },
  { key: "access", label: "출입 규칙", icon: Lock },
];

const INITIAL_DATA: SettingsData = {
  isActive: true,
  checkInMethods: ["qr", "rfid"],
  screenTimeout: 30,
  autoLogout: 5,
  adminPin: "1234",
  bgImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1920",
  logoImage: "https://via.placeholder.com/200x60?text=FIT+CRM+LOGO",
  themeColor: "#FF7F6E",
  welcomeMessage: "오늘도 건강한 하루 되세요!",
  showNotice: true,
  noticeContent: "센터 내 마스크 착용은 권고 사항입니다. 수건은 1인 1장씩 사용 부탁드립니다.",
  showWeather: true,
  showAdBanner: true,
  banners: [
    { id: "1", url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800", name: "PT 특별 할인 이벤트" },
    { id: "2", url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=800", name: "여름 맞이 3+1 프로모션" },
  ],
  ttsMessages: [
    { id: "UI-020", event: "체크인 성공", message: "{이름}님 환영합니다.", description: "정상적으로 체크인이 완료되었을 때 안내합니다." },
    { id: "UI-021", event: "체크인 실패 (만료)", message: "{이름}님 이용권이 만료되었습니다.", description: "이용 기간이 종료된 회원이 태그했을 때 안내합니다." },
    { id: "UI-022", event: "체크인 실패 (미등록)", message: "등록된 회원 정보가 없습니다.", description: "DB에 없는 정보를 가진 수단이 태그되었을 때 안내합니다." },
    { id: "UI-023", event: "체크인 실패 (정지)", message: "{이름}님 이용이 정지된 계정입니다.", description: "관리자에 의해 일시 정지된 계정이 태그했을 때 안내합니다." },
    { id: "UI-024", event: "만료 임박 안내", message: "{이름}님 이용권이 {N}일 후 만료됩니다.", description: "만료 예정일이 얼마 남지 않았을 때 추가로 안내합니다." },
    { id: "UI-025", event: "생일 축하", message: "{이름}님 생일을 축하합니다.", description: "회원의 생일 당일 체크인 시 안내합니다." },
    { id: "UI-026", event: "출입 금지 시간", message: "현재 출입 가능 시간이 아닙니다.", description: "설정된 출입 가능 시간 외에 태그했을 때 안내합니다." },
    { id: "UI-027", event: "RFID 인식 실패", message: "밴드/카드를 다시 태그해주세요.", description: "인식 오류나 불완전한 태그 시 안내합니다." },
    { id: "UI-028", event: "대기 안내", message: "체크인할 QR 또는 밴드를 인식해주세요.", description: "대기 화면에서 정기적으로 재생될 수 있는 멘트입니다." },
    { id: "UI-029", event: "운영 종료", message: "오늘 운영이 종료되었습니다.", description: "센터 마감 시간 이후에 태그했을 때 안내합니다." },
  ],
  accessStartTime: "06:00",
  accessEndTime: "23:00",
  allowExpired: "deny",
  expirationWarningDays: 7,
  preventDuplicateCheckIn: true,
  duplicatePreventionMinutes: 10,
  unpaidAccess: "warn",
};

export default function KioskSettings() {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [settings, setSettings] = useState<SettingsData>(INITIAL_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<KioskStatus>("online");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 초기 로딩 시뮬레이션
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("키오스크 설정이 저장되었습니다. 실시간으로 기기에 반영됩니다.");
    }, 1000);
  };

  const playTTS = (text: string) => {
    // 실제 브라우저 TTS 활용
    const uttr = new SpeechSynthesisUtterance(
      text.replace("{이름}", "홍길동").replace("{N}", "3").replace("{만료일}", "2024-12-31").replace("{잔여일}", "10")
    );
    uttr.lang = "ko-KR";
    window.speechSynthesis.speak(uttr);
  };

  if (isLoading) {
    return (
      <AppLayout >
        <div className="flex flex-col gap-xl animate-pulse" >
          <div className="h-20 bg-3 rounded-card-normal border border-border-light" />
          <div className="h-12 bg-3 rounded-button border border-border-light" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg" >
            <div className="h-80 bg-3 rounded-card-normal border border-border-light" />
            <div className="h-80 bg-3 rounded-card-normal border border-border-light" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout >
      <div className="flex flex-col gap-lg" >
        {/* Header */}
        <PageHeader title="키오스크 설정" description="센터 내 무인 체크인 키오스크의 화면과 동작, 음성 안내를 관리합니다." actions={
            <div className="flex items-center gap-sm">
              <div className={cn(
                "flex items-center gap-xs px-md py-sm rounded-full text-Label",
                status === "online" ? "bg-bg-soft-mint text-secondary-mint" : "bg-[#FFEEEE] text-error"
              )}>
                <div className={cn("w-2 h-2 rounded-full animate-pulse", status === "online" ? "bg-secondary-mint" : "bg-error")} />
                {status === "online" ? "키오스크 연결됨" : "키오스크 오프라인"}
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-sm bg-primary-coral text-white px-lg py-md rounded-button font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? "저장 중..." : "설정 저장"}
              </button>
            </div>
          }/>

        {/* Offline Alert */}
        {status === "offline" && (
          <div className="flex items-center gap-md bg-error/10 border border-error/20 p-md rounded-card-normal text-error" >
            <AlertCircle size={20}/>
            <span className="text-Body 2 font-semibold" >키오스크와의 연결이 원활하지 않습니다. 설정을 변경해도 실제 기기에 즉시 반영되지 않을 수 있습니다.</span>
          </div>
        )}

        {/* Tabs */}
        <TabNav tabs={TABS} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabKey)}/>

        {/* Content */}
        <div className="mt-md" >
          {activeTab === "basic" && renderBasicSettings()}
          {activeTab === "screen" && renderScreenSettings()}
          {activeTab === "tts" && renderTTSSettings()}
          {activeTab === "access" && renderAccessRules()}
        </div>
      </div>
    </AppLayout>
  );

  // --- Render Sections ---

  function renderBasicSettings() {
    return (
      <div className="flex flex-col gap-lg" >
        <FormSection title="키오스크 운영 제어" columns={2}>
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >키오스크 활성화</label>
            <div className="flex items-center gap-md" >
              <button
                className={cn(
                  "relative w-14 h-8 rounded-full transition-colors duration-200 outline-none",
                  settings.isActive ? "bg-secondary-mint" : "bg-border-light"
                )} onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}>
                <div className={cn(
                  "absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 shadow-sm",
                  settings.isActive ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
              <span className="text-Body 1 font-medium" >{settings.isActive ? "현재 사용 중" : "사용 안 함"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >체크인 방식</label>
            <div className="flex flex-wrap gap-md" >
              {["qr", "rfid", "barcode"].map(method => (
                <label className="flex items-center gap-sm cursor-pointer group" key={method}>
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                    settings.checkInMethods.includes(method) ? "bg-primary-coral border-primary-coral" : "border-border-light group-hover:border-primary-coral/50"
                  )} onClick={() => {
                    const next = settings.checkInMethods.includes(method) 
                      ? settings.checkInMethods.filter(m => m !== method)
                      : [...settings.checkInMethods, method];
                    setSettings({ ...settings, checkInMethods: next });
                  }}>
                    {settings.checkInMethods.includes(method) && <CheckCircle2 className="text-white" size={14}/>}
                  </div>
                  <span className="text-Body 1 font-medium uppercase" >{method}</span>
                </label>
              ))}
            </div>
          </div>
        </FormSection>

        <FormSection title="시스템 대기 및 보안" columns={2}>
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >화면 대기 시간 (초)</label>
            <input
              className="w-full bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none" type="number" value={settings.screenTimeout} onChange={(e) => setSettings({ ...settings, screenTimeout: Number(e.target.value) })} placeholder="예: 30"/>
            <p className="text-[11px] text-text-grey-blue" >사용자가 없을 때 대기 화면으로 전환되는 시간입니다.</p>
          </div>

          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >자동 로그아웃 시간 (초)</label>
            <input
              className="w-full bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none" type="number" value={settings.autoLogout} onChange={(e) => setSettings({ ...settings, autoLogout: Number(e.target.value) })} placeholder="예: 5"/>
            <p className="text-[11px] text-text-grey-blue" >체크인 완료 문구 표시 후 초기화되는 시간입니다.</p>
          </div>

          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >관리자 PIN 번호</label>
            <div className="relative" >
              <input
                className="w-full bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none pl-11" type="password" value={settings.adminPin} onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })} placeholder="4~6자리 숫자"/>
              <Lock className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={18}/>
            </div>
          </div>
        </FormSection>
      </div>
    );
  }

  function renderScreenSettings() {
    return (
      <div className="flex flex-col gap-lg" >
        <FormSection title="브랜드 및 스타일" columns={2}>
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >테마 색상</label>
            <div className="flex items-center gap-md" >
              <input
                className="w-12 h-12 rounded-full border-none cursor-pointer overflow-hidden p-0" type="color" value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })}/>
              <span className="text-Body 1 font-bold font-mono" >{settings.themeColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >환영 문구</label>
            <input
              className="w-full bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none" type="text" value={settings.welcomeMessage} onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}/>
          </div>

          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-lg mt-md" >
            <div className="flex flex-col gap-sm" >
              <label className="text-Label text-text-grey-blue" >대기 화면 로고</label>
              <div className="aspect-[3/1] rounded-card-normal border-2 border-dashed border-border-light bg-bg-main-light-blue flex flex-col items-center justify-center p-lg relative overflow-hidden group" >
                <img className="max-h-12 object-contain" src={settings.logoImage} alt="logo"/>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-sm" >
                  <button className="bg-3 text-text-dark-grey p-sm rounded-full" ><Plus size={18}/></button>
                  <button className="bg-3 text-error p-sm rounded-full" ><Trash2 size={18}/></button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-sm" >
              <label className="text-Label text-text-grey-blue" >대기 화면 배경 이미지</label>
              <div className="aspect-[3/1] rounded-card-normal border-2 border-dashed border-border-light bg-bg-main-light-blue flex flex-col items-center justify-center relative overflow-hidden group" >
                <img className="w-full h-full object-cover" src={settings.bgImage} alt="bg"/>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-sm" >
                  <button className="bg-3 text-text-dark-grey p-sm rounded-full" ><Plus size={18}/></button>
                  <button className="bg-3 text-error p-sm rounded-full" ><Trash2 size={18}/></button>
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="부가 정보 표시" columns={2}>
          <div className="flex flex-col gap-sm" >
            <label className="text-Label text-text-grey-blue" >공지사항 노출</label>
            <div className="flex items-center gap-md" >
               <button
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors duration-200 outline-none",
                  settings.showNotice ? "bg-secondary-mint" : "bg-border-light"
                )} onClick={() => setSettings({ ...settings, showNotice: !settings.showNotice })}>
                <div className={cn(
                  "absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform duration-200",
                  settings.showNotice ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
              <span className="text-Body 2" >{settings.showNotice ? "표시함" : "표시 안 함"}</span>
            </div>
            {settings.showNotice && (
              <textarea
                className="w-full bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none mt-sm resize-none h-24" value={settings.noticeContent} onChange={(e) => setSettings({ ...settings, noticeContent: e.target.value })} placeholder="키오스크에 노출될 공지사항 입력"/>
            )}
          </div>

          <div className="flex flex-col gap-sm justify-start" >
             <label className="text-Label text-text-grey-blue" >날씨 정보 표시</label>
             <div className="flex items-center gap-md" >
                <button
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors duration-200 outline-none",
                    settings.showWeather ? "bg-secondary-mint" : "bg-border-light"
                  )} onClick={() => setSettings({ ...settings, showWeather: !settings.showWeather })}>
                  <div className={cn(
                    "absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform duration-200",
                    settings.showWeather ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
                <span className="text-Body 2" >{settings.showWeather ? "표시함" : "표시 안 함"}</span>
             </div>
             <p className="text-[11px] text-text-grey-blue mt-sm" >오픈웨더 API를 통해 실시간 기온과 날씨 정보를 표시합니다.</p>
          </div>
        </FormSection>

        <FormSection title="광고 배너 관리 (최대 5개)" columns={1}>
           <div className="flex items-center justify-between mb-sm" >
              <label className="text-Label text-text-grey-blue" >슬라이드 배너 활성화</label>
              <button
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors duration-200 outline-none",
                  settings.showAdBanner ? "bg-secondary-mint" : "bg-border-light"
                )} onClick={() => setSettings({ ...settings, showAdBanner: !settings.showAdBanner })}>
                <div className={cn(
                  "absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform duration-200",
                  settings.showAdBanner ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
           </div>
           
           {settings.showAdBanner && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-md" >
                {settings.banners.map((banner, idx) => (
                  <div className="group relative aspect-video rounded-card-normal border border-border-light bg-bg-main-light-blue overflow-hidden shadow-sm hover:shadow-md transition-all" key={banner.id}>
                    <img className="w-full h-full object-cover" src={banner.url} alt={banner.name}/>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-sm backdrop-blur-sm" >
                      <p className="text-[11px] text-white font-medium truncate" >{banner.name}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity" >
                      <button className="bg-3 text-error p-xs rounded-full shadow-sm" ><Trash2 size={14}/></button>
                    </div>
                    <div className="absolute top-2 left-2 bg-primary-coral text-white px-xs rounded text-[10px] font-bold" >
                      {idx + 1}
                    </div>
                  </div>
                ))}
                {settings.banners.length < 5 && (
                  <button className="aspect-video rounded-card-normal border-2 border-dashed border-border-light bg-bg-main-light-blue flex flex-col items-center justify-center text-text-grey-blue hover:bg-bg-soft-peach hover:text-primary-coral hover:border-primary-coral transition-all" >
                    <Plus size={32}/>
                    <span className="text-Label mt-xs" >배너 추가</span>
                  </button>
                )}
             </div>
           )}
        </FormSection>
      </div>
    );
  }

  function renderTTSSettings() {
    return (
      <div className="flex flex-col gap-lg" >
        <FormSection title="안내 메시지 편집" columns={1} description="이벤트별로 키오스크에서 안내될 메시지를 설정할 수 있습니다. {이름}, {N}, {만료일} 등 변수를 사용할 수 있습니다.">
           <div className="overflow-hidden border border-border-light rounded-card-normal" >
              <table className="w-full border-collapse" >
                <thead >
                  <tr className="bg-bg-main-light-blue text-left border-b border-border-light" >
                    <th className="p-md text-Label text-text-grey-blue font-bold uppercase tracking-wider" >이벤트명</th>
                    <th className="p-md text-Label text-text-grey-blue font-bold uppercase tracking-wider" >안내 메시지 (TTS)</th>
                    <th className="p-md text-Label text-text-grey-blue font-bold uppercase tracking-wider w-[120px]" >미리보기</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light bg-3" >
                  {settings.ttsMessages.map((item) => (
                    <tr className="hover:bg-bg-soft-peach/30 transition-colors group" key={item.id}>
                      <td className="p-md" >
                        <div className="flex flex-col" >
                          <span className="text-Body 1 font-semibold text-text-dark-grey" >{item.event}</span>
                          <span className="text-[11px] text-text-grey-blue mt-xs" >{item.description}</span>
                        </div>
                      </td>
                      <td className="p-md" >
                        <input
                          className="w-full bg-input-bg-light p-sm rounded-input border border-transparent focus:border-primary-coral/30 focus:bg-3 transition-all outline-none text-Body 2" type="text" value={item.message} onChange={(e) => {
                             const next = settings.ttsMessages.map(m => m.id === item.id ? { ...m, message: e.target.value } : m);
                             setSettings({ ...settings, ttsMessages: next });
                          }}/>
                      </td>
                      <td className="p-md text-center" >
                        <button
                          className="h-9 w-9 flex items-center justify-center rounded-full bg-bg-soft-mint text-secondary-mint hover:bg-secondary-mint hover:text-white transition-all shadow-sm" onClick={() => playTTS(item.message)} title="미리보기 재생">
                          <Play size={16} fill="currentColor"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </FormSection>
      </div>
    );
  }

  function renderAccessRules() {
    return (
      <div className="flex flex-col gap-lg" >
        <FormSection title="기본 출입 시간 및 규칙" columns={2}>
           <div className="flex flex-col gap-sm" >
             <label className="text-Label text-text-grey-blue" >출입 가능 시간 설정</label>
             <div className="flex items-center gap-sm" >
               <div className="relative flex-1" >
                 <input
                   className="w-full bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none" type="time" value={settings.accessStartTime} onChange={(e) => setSettings({ ...settings, accessStartTime: e.target.value })}/>
                 <Clock className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={16}/>
               </div>
               <span className="text-text-grey-blue" >~</span>
               <div className="relative flex-1" >
                  <input
                    className="w-full bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none" type="time" value={settings.accessEndTime} onChange={(e) => setSettings({ ...settings, accessEndTime: e.target.value })}/>
                  <Clock className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={16}/>
               </div>
             </div>
           </div>

           <div className="flex flex-col gap-sm" >
              <label className="text-Label text-text-grey-blue" >만료 회원 체크인 허용</label>
              <div className="flex p-[4px] bg-input-bg-light rounded-button w-fit" >
                {["allow", "deny"].map((val) => (
                  <button
                    className={cn(
                      "px-lg py-sm rounded-button text-Label font-bold transition-all",
                      settings.allowExpired === val ? "bg-3 text-primary-coral shadow-sm" : "text-text-grey-blue hover:text-text-dark-grey"
                    )} key={val} onClick={() => setSettings({ ...settings, allowExpired: val as any })}>
                    {val === "allow" ? "허용" : "거부"}
                  </button>
                ))}
              </div>
           </div>

           <div className="flex flex-col gap-sm" >
              <label className="text-Label text-text-grey-blue" >만료 임박 안내 시점</label>
              <div className="flex items-center gap-sm" >
                <input
                  className="w-24 bg-input-bg-light p-md rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none" type="number" value={settings.expirationWarningDays} onChange={(e) => setSettings({ ...settings, expirationWarningDays: Number(e.target.value) })}/>
                <span className="text-Body 2" >일 전부터 음성 안내</span>
              </div>
           </div>
        </FormSection>

        <FormSection title="고급 출입 규칙" columns={2}>
           <div className="flex flex-col gap-sm" >
              <label className="text-Label text-text-grey-blue" >중복 체크인 방지</label>
              <div className="flex items-center gap-md" >
                 <button
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors duration-200 outline-none",
                    settings.preventDuplicateCheckIn ? "bg-secondary-mint" : "bg-border-light"
                  )} onClick={() => setSettings({ ...settings, preventDuplicateCheckIn: !settings.preventDuplicateCheckIn })}>
                  <div className={cn(
                    "absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform duration-200",
                    settings.preventDuplicateCheckIn ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
                <span className="text-Body 2" >{settings.preventDuplicateCheckIn ? "활성화" : "비활성화"}</span>
              </div>
              {settings.preventDuplicateCheckIn && (
                 <div className="flex items-center gap-sm mt-sm" >
                    <input
                      className="w-20 bg-input-bg-light p-sm rounded-input border-none focus:ring-2 focus:ring-primary-coral/20 outline-none text-sm" type="number" value={settings.duplicatePreventionMinutes} onChange={(e) => setSettings({ ...settings, duplicatePreventionMinutes: Number(e.target.value) })}/>
                    <span className="text-Label" >분 이내 재체크인 차단</span>
                 </div>
              )}
           </div>

           <div className="flex flex-col gap-sm" >
              <label className="text-Label text-text-grey-blue" >미납 회원 출입 제어</label>
              <div className="flex p-[4px] bg-input-bg-light rounded-button w-fit" >
                {["allow", "warn", "deny"].map((val) => (
                  <button
                    className={cn(
                      "px-md py-sm rounded-button text-Label font-bold transition-all",
                      settings.unpaidAccess === val ? "bg-3 text-primary-coral shadow-sm" : "text-text-grey-blue hover:text-text-dark-grey"
                    )} key={val} onClick={() => setSettings({ ...settings, unpaidAccess: val as any })}>
                    {val === "allow" ? "허용" : val === "warn" ? "경고 후 허용" : "차단"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-grey-blue mt-xs" >
                {settings.unpaidAccess === "warn" && "체크인 시 미납 내역이 있음을 음성으로 안내하고 통과시킵니다."}
                {settings.unpaidAccess === "deny" && "미납 내역이 있는 경우 체크인을 실패 처리합니다."}
              </p>
           </div>
        </FormSection>
      </div>
    );
  }
}
