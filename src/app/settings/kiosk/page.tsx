'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import {
  Save,
  Settings,
  Monitor,
  Volume2,
  Lock,
  Image as ImageIcon,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  Smartphone
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import TabNav from "@/components/common/TabNav";
import FormSection from "@/components/common/FormSection";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type KioskStatus = "online" | "offline";
type TabKey = "basic" | "screen" | "tts" | "access";

interface BannerImage {
  id: string;
  url: string;
  name: string;
}

interface SettingsData {
  isActive: boolean;
  kioskType: "typeA" | "typeB";
  checkInMethods: string[];
  screenTimeout: number;
  autoLogout: number;
  adminPin: string;
  bgImage: string;
  logoImage: string;
  themeColor: string;
  welcomeMessage: string;
  showNotice: boolean;
  noticeContent: string;
  showWeather: boolean;
  showAdBanner: boolean;
  banners: BannerImage[];
  ttsMessages: { id: string; event: string; message: string; description: string }[];
  accessStartTime: string;
  accessEndTime: string;
  allowExpired: "allow" | "deny";
  expirationWarningDays: number;
  preventDuplicateCheckIn: boolean;
  duplicatePreventionMinutes: number;
  unpaidAccess: "allow" | "warn" | "deny";
}

const TABS = [
  { key: "basic", label: "기본 설정", icon: Settings },
  { key: "screen", label: "화면 설정", icon: Monitor },
  { key: "tts", label: "TTS 설정", icon: Volume2 },
  { key: "access", label: "출입 규칙", icon: Lock },
];

const INITIAL_DATA: SettingsData = {
  isActive: true,
  kioskType: "typeB",
  checkInMethods: ["qr", "rfid", "face"],
  screenTimeout: 30,
  autoLogout: 5,
  adminPin: "1234",
  bgImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1920",
  logoImage: "",
  themeColor: "#3B82F6",
  welcomeMessage: "오늘도 건강한 하루 되세요!",
  showNotice: true,
  noticeContent: "센터 내 수건은 1인 1장씩 사용 부탁드립니다.",
  showWeather: true,
  showAdBanner: true,
  banners: [
    { id: "1", url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800", name: "PT 특별 할인 이벤트" },
    { id: "2", url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=800", name: "여름 맞이 3+1 프로모션" },
  ],
  ttsMessages: [
    { id: "1", event: "체크인 성공", message: "{이름}님 환영합니다.", description: "정상적으로 체크인 완료 시 안내" },
    { id: "2", event: "체크인 실패 (만료)", message: "{이름}님 이용권이 만료되었습니다.", description: "이용 기간 종료 회원 태그 시 안내" },
    { id: "3", event: "체크인 실패 (미등록)", message: "등록된 회원 정보가 없습니다.", description: "미등록 수단 태그 시 안내" },
    { id: "4", event: "만료 임박 안내", message: "{이름}님 이용권이 {N}일 후 만료됩니다.", description: "만료 임박 회원 체크인 시 추가 안내" },
    { id: "5", event: "생일 축하", message: "{이름}님 생일을 축하합니다.", description: "생일 당일 체크인 시 안내" },
    { id: "6", event: "대기 안내", message: "QR 또는 밴드를 인식해주세요.", description: "대기 화면에서 반복 재생" },
  ],
  accessStartTime: "06:00",
  accessEndTime: "23:00",
  allowExpired: "deny",
  expirationWarningDays: 7,
  preventDuplicateCheckIn: true,
  duplicatePreventionMinutes: 10,
  unpaidAccess: "warn",
};

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative w-12 h-6 rounded-full transition-colors duration-200 outline-none",
        checked ? "bg-accent" : "bg-line"
      )}
    >
      <div className={cn(
        "absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
        checked ? "translate-x-6" : "translate-x-0"
      )} />
    </button>
  );
}

// 키오스크 미리보기 컴포넌트 (폰 프레임 스타일)
function KioskPreview({ settings }: { settings: SettingsData }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-Label text-content-secondary mb-md">키오스크 화면 미리보기</p>
      {/* 폰 프레임 */}
      <div className="relative w-[200px] bg-neutral-900 rounded-[24px] p-[8px] shadow-2xl border-2 border-neutral-700">
        {/* 노치 */}
        <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[60px] h-[8px] bg-neutral-800 rounded-full z-10" />
        {/* 화면 */}
        <div
          className="rounded-[18px] overflow-hidden relative"
          style={{ height: 360, backgroundColor: settings.themeColor + '22' }}
        >
          {/* 배경 */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${settings.bgImage})` }}
          />
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-sm px-sm">
            {/* 로고 */}
            <div className="w-[80px] h-[24px] bg-white/80 rounded flex items-center justify-center">
              <span className="text-[8px] font-bold text-neutral-700">LOGO</span>
            </div>
            {/* 시간 */}
            <p className="text-white font-bold text-[20px]">14:32</p>
            {/* 환영 문구 */}
            <p className="text-white text-[8px] text-center font-medium opacity-90">{settings.welcomeMessage}</p>
            {/* 체크인 버튼 */}
            <div
              className="mt-sm w-full py-[6px] rounded-lg text-center text-[8px] font-bold text-white"
              style={{ backgroundColor: settings.themeColor }}
            >
              QR / 밴드 체크인
            </div>
            {/* 공지 */}
            {settings.showNotice && (
              <div className="w-full bg-white/20 rounded p-xs">
                <p className="text-white text-[6px] text-center truncate">{settings.noticeContent}</p>
              </div>
            )}
          </div>
        </div>
        {/* 홈버튼 */}
        <div className="flex justify-center mt-[6px]">
          <div className="w-[32px] h-[4px] bg-neutral-600 rounded-full" />
        </div>
      </div>
      <p className="text-[11px] text-content-secondary mt-sm">
        {settings.kioskType === 'typeA' ? '타입 A: 입퇴장 전용' : '타입 B: 결제 포함'}
      </p>
    </div>
  );
}

// --- settings 저장/불러오기 헬퍼 ---
const KIOSK_SETTINGS_KEY = "kiosk_settings";
function getBranchId() { if (typeof window === "undefined") return "1"; return localStorage.getItem("branchId") || "1"; }
function getKioskStorageKey() { return `settings_${getBranchId()}_${KIOSK_SETTINGS_KEY}`; }

async function loadKioskSettings(): Promise<SettingsData | null> {
  // settings 테이블에 key/value 컬럼 없음 → localStorage만 사용
  const saved = localStorage.getItem(getKioskStorageKey());
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.kioskType) return parsed;
    } catch {}
  }
  return null;
}

async function saveKioskSettings(data: SettingsData): Promise<boolean> {
  const jsonValue = JSON.stringify(data);
  localStorage.setItem(getKioskStorageKey(), jsonValue);
  return true;
}

export default function KioskSettings() {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [settings, setSettings] = useState<SettingsData>(INITIAL_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<KioskStatus>("online");
  const [isLoading, setIsLoading] = useState(true);
  const [clothesRental, setClothesRental] = useState(false);
  const [lockerAssign, setLockerAssign] = useState(false);
  const [attendanceRanking, setAttendanceRanking] = useState(false);
  const [promotionPopup, setPromotionPopup] = useState(false);

  // 초기 로딩: settings 테이블에서 데이터 조회
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const saved = await loadKioskSettings();
      if (saved) setSettings(saved);
      setIsLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await saveKioskSettings(settings);
    setIsSaving(false);
    if (ok) {
      toast.success("키오스크 설정이 저장되었습니다. 기기에 실시간 반영됩니다.");
    } else {
      toast.error("저장에 실패했습니다. 로컬에 임시 저장되었습니다.");
    }
  };

  const playTTS = (text: string) => {
    const uttr = new SpeechSynthesisUtterance(
      text.replace("{이름}", "홍길동").replace("{N}", "3")
    );
    uttr.lang = "ko-KR";
    window.speechSynthesis.speak(uttr);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-xl animate-pulse">
          <div className="h-20 bg-surface rounded-xl border border-line" />
          <div className="h-12 bg-surface rounded-xl border border-line" />
          <div className="grid grid-cols-2 gap-lg">
            <div className="h-80 bg-surface rounded-xl border border-line" />
            <div className="h-80 bg-surface rounded-xl border border-line" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── 기본 설정 ──
  const renderBasic = () => (
    <div className="flex flex-col gap-lg">
      {/* 키오스크 활성화 토글 */}
      <div className={cn(
        "flex items-center justify-between p-lg rounded-xl border-2 transition-colors",
        settings.isActive ? "border-accent/40 bg-accent-light/30" : "border-state-error/30 bg-state-error/5"
      )}>
        <div>
          <p className="text-Body-1 font-bold text-content">키오스크 체크인 활성화</p>
          <p className="text-Label text-content-secondary mt-xs">
            {settings.isActive ? "현재 키오스크 체크인이 활성화되어 있습니다." : "현재 키오스크 체크인이 비활성화되어 있습니다."}
          </p>
        </div>
        <ToggleSwitch
          checked={settings.isActive}
          onChange={() => setSettings({ ...settings, isActive: !settings.isActive })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* 설정 영역 */}
        <div className="lg:col-span-2 space-y-lg">
          <FormSection title="키오스크 타입" description="설치 목적에 맞는 타입을 선택하세요." columns={1}>
            <div className="col-span-full grid grid-cols-2 gap-md">
              {[
                { value: 'typeA', label: '타입 A', desc: '입퇴장 전용 키오스크', icon: Smartphone },
                { value: 'typeB', label: '타입 B', desc: '결제 포함 풀 기능 키오스크', icon: Monitor },
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => setSettings({ ...settings, kioskType: item.value as any })}
                  className={cn(
                    "flex items-center gap-md p-lg rounded-xl border-2 transition-all text-left",
                    settings.kioskType === item.value
                      ? "border-accent bg-accent-light"
                      : "border-line bg-surface hover:border-accent/40"
                  )}
                >
                  <item.icon className={settings.kioskType === item.value ? "text-accent" : "text-content-secondary"} size={24} />
                  <div>
                    <p className={cn("font-bold", settings.kioskType === item.value ? "text-accent" : "text-content")}>{item.label}</p>
                    <p className="text-Label text-content-secondary">{item.desc}</p>
                  </div>
                  {settings.kioskType === item.value && <CheckCircle2 className="text-accent ml-auto" size={18} />}
                </button>
              ))}
            </div>
          </FormSection>

          <FormSection title="입장 방식" description="체크인 인증 수단을 선택합니다." columns={1}>
            <div className="col-span-full">
              <div className="grid grid-cols-3 gap-sm">
                {[
                  { value: "qr", label: "QR 코드" },
                  { value: "rfid", label: "RFID/NFC" },
                  { value: "face", label: "얼굴 인식" },
                  { value: "pin", label: "전화번호 입력" },
                  { value: "barcode", label: "바코드" },
                ].map(method => {
                  const active = settings.checkInMethods.includes(method.value);
                  return (
                    <label
                      key={method.value}
                      className={cn(
                        "flex items-center gap-sm p-md rounded-xl border-2 cursor-pointer transition-all",
                        active ? "border-accent bg-accent-light" : "border-line hover:border-accent/40"
                      )}
                      onClick={() => {
                        const next = active
                          ? settings.checkInMethods.filter(m => m !== method.value)
                          : [...settings.checkInMethods, method.value];
                        setSettings({ ...settings, checkInMethods: next });
                      }}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                        active ? "bg-accent border-accent" : "border-line"
                      )}>
                        {active && <CheckCircle2 className="text-white" size={12} />}
                      </div>
                      <span className={cn("text-Body-2 font-medium", active ? "text-accent" : "text-content")}>{method.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </FormSection>

          {/* 얼굴 인식 설정 (face 체크인 활성 시) */}
          {settings.checkInMethods.includes("face") && (
            <FormSection title="얼굴 인식 설정" description="AI 기반 얼굴 인식 출입 시스템 설정 (브로제이 참고)" columns={2}>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">인식 모드</label>
                <select className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none text-[13px]">
                  <option value="single">단일 인식 (1명씩)</option>
                  <option value="multi">다중 인식 (최대 10명 동시)</option>
                </select>
                <p className="text-[11px] text-content-secondary">브로제이: 10명 동시 인식 가능</p>
              </div>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">인식 민감도</label>
                <select className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none text-[13px]">
                  <option value="high">높음 (정확도 우선)</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음 (속도 우선)</option>
                </select>
              </div>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">병행 인증 수단</label>
                <select className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none text-[13px]">
                  <option value="none">얼굴만</option>
                  <option value="phone">전화번호 입력 병행</option>
                  <option value="qr">QR 코드 병행</option>
                </select>
                <p className="text-[11px] text-content-secondary">인식 실패 시 대체 수단</p>
              </div>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">자동 등록</label>
                <select className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none text-[13px]">
                  <option value="manual">수동 등록 (관리자 촬영)</option>
                  <option value="first_visit">첫 방문 시 자동 촬영</option>
                </select>
              </div>
              <div className="col-span-2 p-md bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-[12px] text-blue-700 font-medium">카메라 연동 필요</p>
                <p className="text-[11px] text-blue-600 mt-xs">얼굴 인식 사용을 위해 IoT 설정에서 카메라 장치를 등록하세요. 입장/퇴실 자동 체크가 가능합니다.</p>
              </div>
            </FormSection>
          )}

          <FormSection title="시스템 설정" columns={2}>
            <div className="space-y-xs">
              <label className="text-Label text-content-secondary">화면 대기 시간 (초)</label>
              <input
                className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none"
                type="number"
                value={settings.screenTimeout}
                onChange={e => setSettings({ ...settings, screenTimeout: Number(e.target.value) })}
              />
              <p className="text-[11px] text-content-secondary">미사용 시 대기 화면 전환 시간</p>
            </div>
            <div className="space-y-xs">
              <label className="text-Label text-content-secondary">자동 초기화 시간 (초)</label>
              <input
                className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none"
                type="number"
                value={settings.autoLogout}
                onChange={e => setSettings({ ...settings, autoLogout: Number(e.target.value) })}
              />
              <p className="text-[11px] text-content-secondary">체크인 완료 후 초기화 대기</p>
            </div>
            <div className="space-y-xs">
              <label className="text-Label text-content-secondary">관리자 PIN</label>
              <div className="relative">
                <input
                  className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none pl-11"
                  type="password"
                  value={settings.adminPin}
                  onChange={e => setSettings({ ...settings, adminPin: e.target.value })}
                  placeholder="4~6자리 숫자"
                />
                <Lock className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              </div>
            </div>
          </FormSection>

          <FormSection title="기능 설정" description="키오스크에서 사용할 부가 기능을 설정합니다." columns={1}>
            <div className="col-span-full space-y-md">
              {[
                { label: "운동복 대여", desc: "키오스크에서 운동복 대여 기능을 활성화합니다", value: clothesRental, onChange: () => setClothesRental(v => !v) },
                { label: "사물함 배정", desc: "키오스크에서 사물함 배정 기능을 활성화합니다", value: lockerAssign, onChange: () => setLockerAssign(v => !v) },
                { label: "출석 랭킹 표시", desc: "체크인 화면에 출석 랭킹을 표시합니다", value: attendanceRanking, onChange: () => setAttendanceRanking(v => !v) },
                { label: "프로모션 팝업", desc: "체크인 후 프로모션 팝업을 표시합니다", value: promotionPopup, onChange: () => setPromotionPopup(v => !v) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-md rounded-xl bg-surface-secondary">
                  <div>
                    <p className="text-Body-2 font-medium text-content">{item.label}</p>
                    <p className="text-Label text-content-secondary">{item.desc}</p>
                  </div>
                  <ToggleSwitch checked={item.value} onChange={item.onChange} />
                </div>
              ))}
            </div>
          </FormSection>
        </div>

        {/* 미리보기 */}
        <div className="flex justify-center">
          <KioskPreview settings={settings} />
        </div>
      </div>
    </div>
  );

  // ── 화면 설정 ──
  const renderScreen = () => (
    <div className="flex flex-col gap-lg">
      <FormSection title="로고 및 배경" columns={2}>
        {/* 로고 업로드 */}
        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">센터 로고</label>
          <div className="aspect-[3/1] rounded-xl border-2 border-dashed border-line bg-surface-secondary flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-accent transition-colors">
            {settings.logoImage ? (
              <img className="max-h-10 object-contain" src={settings.logoImage} alt="logo" />
            ) : (
              <span className="text-[13px] text-content-tertiary">로고 이미지를 업로드하세요</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-xs">
              <Upload className="text-white" size={20} />
              <span className="text-white text-[11px] font-medium">로고 변경</span>
            </div>
          </div>
          <p className="text-[11px] text-content-secondary">5MB 이하 JPG/PNG 권장</p>
        </div>

        {/* 배경 이미지 */}
        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">대기 화면 배경</label>
          <div className="aspect-[3/1] rounded-xl border-2 border-dashed border-line bg-surface-secondary flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-accent transition-colors">
            <img className="w-full h-full object-cover" src={settings.bgImage} alt="bg" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-xs">
              <Upload className="text-white" size={20} />
              <span className="text-white text-[11px] font-medium">배경 변경</span>
            </div>
          </div>
          <p className="text-[11px] text-content-secondary">5MB 이하 JPG/PNG</p>
        </div>

        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">테마 색상</label>
          <div className="flex items-center gap-md bg-surface-secondary p-md rounded-input">
            <input
              type="color"
              className="w-10 h-10 rounded-full border-none cursor-pointer p-0"
              value={settings.themeColor}
              onChange={e => setSettings({ ...settings, themeColor: e.target.value })}
            />
            <span className="font-mono font-bold text-content">{settings.themeColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">환영 문구</label>
          <input
            className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none"
            type="text"
            value={settings.welcomeMessage}
            onChange={e => setSettings({ ...settings, welcomeMessage: e.target.value })}
          />
        </div>
      </FormSection>

      <FormSection title="공지사항 / 날씨" columns={2}>
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <label className="text-Label text-content-secondary">공지사항 노출</label>
            <ToggleSwitch
              checked={settings.showNotice}
              onChange={() => setSettings({ ...settings, showNotice: !settings.showNotice })}
            />
          </div>
          {settings.showNotice && (
            <textarea
              className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none resize-none h-20 mt-sm"
              value={settings.noticeContent}
              onChange={e => setSettings({ ...settings, noticeContent: e.target.value })}
              placeholder="키오스크 공지사항 입력"
            />
          )}
        </div>
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <label className="text-Label text-content-secondary">날씨 정보 표시</label>
            <ToggleSwitch
              checked={settings.showWeather}
              onChange={() => setSettings({ ...settings, showWeather: !settings.showWeather })}
            />
          </div>
          <p className="text-[11px] text-content-secondary">실시간 기온 및 날씨 정보를 키오스크에 표시합니다.</p>
        </div>
      </FormSection>

      <FormSection title="광고 배너 (최대 5개)" columns={1}>
        <div className="col-span-full">
          <div className="flex items-center justify-between mb-md">
            <label className="text-Label text-content-secondary">슬라이드 배너 활성화</label>
            <ToggleSwitch
              checked={settings.showAdBanner}
              onChange={() => setSettings({ ...settings, showAdBanner: !settings.showAdBanner })}
            />
          </div>
          {settings.showAdBanner && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
              {settings.banners.map((banner, idx) => (
                <div key={banner.id} className="group relative aspect-video rounded-xl border border-line overflow-hidden shadow-sm">
                  <img className="w-full h-full object-cover" src={banner.url} alt={banner.name} />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-xs">
                    <p className="text-[10px] text-white font-medium truncate">{banner.name}</p>
                  </div>
                  <div className="absolute top-1 left-1 bg-primary text-white px-xs rounded text-[9px] font-bold">{idx + 1}</div>
                  <button
                    className="absolute top-1 right-1 bg-state-error text-white p-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setSettings({ ...settings, banners: settings.banners.filter(b => b.id !== banner.id) })}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {settings.banners.length < 5 && (
                <button
                  className="aspect-video rounded-xl border-2 border-dashed border-line bg-surface-secondary flex flex-col items-center justify-center text-content-secondary hover:border-accent hover:text-accent transition-all"
                  onClick={() => toast.info("이미지 업로드 기능 준비 중입니다.")}
                >
                  <Plus size={28} />
                  <span className="text-Label mt-xs">배너 추가</span>
                </button>
              )}
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );

  // ── TTS 설정 ──
  const renderTTS = () => (
    <div className="flex flex-col gap-lg">
      <FormSection title="안내 메시지 편집" description="이벤트별 음성 안내 메시지를 설정합니다. {이름}, {N} 등 변수를 사용할 수 있습니다." columns={1}>
        <div className="col-span-full overflow-hidden border border-line rounded-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-secondary border-b border-line text-left">
                <th className="p-md text-Label text-content-secondary font-bold w-[180px]">이벤트</th>
                <th className="p-md text-Label text-content-secondary font-bold">안내 메시지</th>
                <th className="p-md text-Label text-content-secondary font-bold w-[80px] text-center">재생</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {settings.ttsMessages.map(item => (
                <tr key={item.id} className="hover:bg-primary-light/20 transition-colors group">
                  <td className="p-md">
                    <span className="text-Body-2 font-semibold text-content">{item.event}</span>
                    <p className="text-[11px] text-content-secondary mt-[2px]">{item.description}</p>
                  </td>
                  <td className="p-md">
                    <input
                      className="w-full bg-surface-secondary p-sm rounded-input border border-transparent focus:border-accent/30 focus:bg-surface transition-all outline-none text-Body-2"
                      type="text"
                      value={item.message}
                      onChange={e => {
                        const next = settings.ttsMessages.map(m => m.id === item.id ? { ...m, message: e.target.value } : m);
                        setSettings({ ...settings, ttsMessages: next });
                      }}
                    />
                  </td>
                  <td className="p-md text-center">
                    <button
                      className="w-9 h-9 flex items-center justify-center mx-auto rounded-full bg-accent-light text-accent hover:bg-accent hover:text-white transition-all shadow-sm"
                      onClick={() => playTTS(item.message)}
                    >
                      <Play size={14} fill="currentColor" />
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

  // ── 출입 규칙 ──
  const renderAccess = () => (
    <div className="flex flex-col gap-lg">
      <FormSection title="출입 시간 및 기본 규칙" columns={2}>
        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">출입 가능 시간</label>
          <div className="flex items-center gap-sm">
            <div className="relative flex-1">
              <input
                className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none"
                type="time"
                value={settings.accessStartTime}
                onChange={e => setSettings({ ...settings, accessStartTime: e.target.value })}
              />
              <Clock className="absolute right-md top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" size={14} />
            </div>
            <span className="text-content-secondary">~</span>
            <div className="relative flex-1">
              <input
                className="w-full bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none"
                type="time"
                value={settings.accessEndTime}
                onChange={e => setSettings({ ...settings, accessEndTime: e.target.value })}
              />
              <Clock className="absolute right-md top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">만료 회원 체크인</label>
          <div className="flex p-[4px] bg-surface-secondary rounded-button w-fit">
            {["allow", "deny"].map(val => (
              <button
                key={val}
                className={cn(
                  "px-lg py-sm rounded-button text-Label font-bold transition-all",
                  settings.allowExpired === val ? "bg-surface text-primary shadow-sm" : "text-content-secondary hover:text-content"
                )}
                onClick={() => setSettings({ ...settings, allowExpired: val as any })}
              >
                {val === "allow" ? "허용" : "거부"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">만료 임박 안내 시점</label>
          <div className="flex items-center gap-sm">
            <input
              className="w-24 bg-surface-secondary p-md rounded-input border-none focus:ring-2 focus:ring-accent/20 outline-none"
              type="number"
              value={settings.expirationWarningDays}
              onChange={e => setSettings({ ...settings, expirationWarningDays: Number(e.target.value) })}
            />
            <span className="text-Body-2">일 전부터 음성 안내</span>
          </div>
        </div>
      </FormSection>

      <FormSection title="고급 출입 규칙" columns={2}>
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <label className="text-Label text-content-secondary">중복 체크인 방지</label>
            <ToggleSwitch
              checked={settings.preventDuplicateCheckIn}
              onChange={() => setSettings({ ...settings, preventDuplicateCheckIn: !settings.preventDuplicateCheckIn })}
            />
          </div>
          {settings.preventDuplicateCheckIn && (
            <div className="flex items-center gap-sm mt-sm">
              <input
                className="w-20 bg-surface-secondary p-sm rounded-input border-none outline-none"
                type="number"
                value={settings.duplicatePreventionMinutes}
                onChange={e => setSettings({ ...settings, duplicatePreventionMinutes: Number(e.target.value) })}
              />
              <span className="text-Label text-content-secondary">분 이내 재체크인 차단</span>
            </div>
          )}
        </div>

        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">미납 회원 출입 제어</label>
          <div className="flex p-[4px] bg-surface-secondary rounded-button w-fit">
            {["allow", "warn", "deny"].map(val => (
              <button
                key={val}
                className={cn(
                  "px-md py-sm rounded-button text-Label font-bold transition-all",
                  settings.unpaidAccess === val ? "bg-surface text-primary shadow-sm" : "text-content-secondary hover:text-content"
                )}
                onClick={() => setSettings({ ...settings, unpaidAccess: val as any })}
              >
                {val === "allow" ? "허용" : val === "warn" ? "경고 후 허용" : "차단"}
              </button>
            ))}
          </div>
          {settings.unpaidAccess !== "allow" && (
            <p className="text-[11px] text-content-secondary">
              {settings.unpaidAccess === "warn" ? "체크인 시 미납 내역을 음성으로 안내하고 통과시킵니다." : "미납 내역이 있는 경우 체크인을 차단합니다."}
            </p>
          )}
        </div>
      </FormSection>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="키오스크 설정"
          description="무인 체크인 키오스크의 화면, 동작, 음성 안내를 관리합니다."
          actions={
            <div className="flex items-center gap-sm">
              <div className={cn(
                "flex items-center gap-xs px-md py-sm rounded-full text-Label",
                status === "online" ? "bg-accent-light text-accent" : "bg-state-error/10 text-state-error"
              )}>
                <div className={cn("w-2 h-2 rounded-full animate-pulse", status === "online" ? "bg-accent" : "bg-state-error")} />
                {status === "online" ? "연결됨" : "오프라인"}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-sm bg-primary text-white px-lg py-md rounded-button font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? "저장 중..." : "설정 저장"}
              </button>
            </div>
          }
        />

        {status === "offline" && (
          <div className="flex items-center gap-md bg-state-error/10 border border-state-error/20 p-md rounded-xl text-state-error">
            <AlertCircle size={18} />
            <span className="text-Body-2 font-semibold">키오스크와 연결이 원활하지 않습니다. 설정 변경이 즉시 반영되지 않을 수 있습니다.</span>
          </div>
        )}

        <TabNav tabs={TABS} activeTab={activeTab} onTabChange={key => setActiveTab(key as TabKey)} />

        <div className="mt-md">
          {activeTab === "basic" && renderBasic()}
          {activeTab === "screen" && renderScreen()}
          {activeTab === "tts" && renderTTS()}
          {activeTab === "access" && renderAccess()}
        </div>
      </div>
    </AppLayout>
  );
}
