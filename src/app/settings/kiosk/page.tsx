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
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import SimpleTable from '@/components/common/SimpleTable';
import Input from '@/components/ui/Input';
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type KioskStatus = "online" | "offline";
type TabKey = "basic" | "screen" | "tts" | "access" | "locker";
type CheckInMethod = "qr" | "rfid" | "face" | "pin" | "barcode";
type Language = "ko" | "en" | "ja" | "zh";
type PostCheckInPolicy =
  | "attendance_only"
  | "manual_locker_assignment"
  | "auto_locker_assignment";

interface BannerImage {
  id: string;
  url: string;
  name: string;
}

interface KioskFeatureToggles {
  passInfo: boolean;
  reservations: boolean;
  lockerLookup: boolean;
  notices: boolean;
  shop: boolean;
}

interface SettingsData {
  isActive: boolean;
  kioskType: "typeA" | "typeB";
  checkInMethods: CheckInMethod[];
  defaultCheckInMethod: CheckInMethod;
  staffAttendance: boolean;
  useFaceRecognition: boolean;

  language: Language;
  bgImage: string;
  logoImage: string;
  themeColor: string;
  welcomeMessage: string;
  completionMessage: string;
  showNotice: boolean;
  noticeContent: string;
  showWeather: boolean;
  showAdBanner: boolean;
  banners: BannerImage[];

  features: KioskFeatureToggles;

  ttsMessages: { id: string; event: string; message: string; description: string }[];

  accessStartTime: string;
  accessEndTime: string;
  allowExpired: "allow" | "deny";
  expirationWarningDays: number;
  preventDuplicateCheckIn: boolean;
  duplicatePreventionMinutes: number;
  unpaidAccess: "allow" | "warn" | "deny";

  postCheckInPolicy: PostCheckInPolicy;
  autoAssignZones: string[];
  unassignedGuideMessage: string;

  screenTimeout: number;
  autoLogout: number;
  adminPin: string;
}

const TABS = [
  { key: "basic", label: "기본 설정", icon: Settings },
  { key: "screen", label: "화면 설정", icon: Monitor },
  { key: "tts", label: "TTS 설정", icon: Volume2 },
  { key: "access", label: "출입 규칙", icon: Lock },
  { key: "locker", label: "락커 후처리", icon: ImageIcon },
];

const ALL_ZONES = ["A", "B", "C", "D"];

const INITIAL_DATA: SettingsData = {
  isActive: true,
  kioskType: "typeB",
  checkInMethods: ["qr", "rfid", "face"],
  defaultCheckInMethod: "qr",
  staffAttendance: true,
  useFaceRecognition: true,

  language: "ko",
  screenTimeout: 30,
  autoLogout: 5,
  adminPin: "1234",
  bgImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1920",
  logoImage: "",
  themeColor: "#3B82F6",
  welcomeMessage: "오늘도 건강한 하루 되세요!",
  completionMessage: "체크인이 완료되었습니다.",
  showNotice: true,
  noticeContent: "센터 내 수건은 1인 1장씩 사용 부탁드립니다.",
  showWeather: true,
  showAdBanner: true,
  banners: [
    { id: "1", url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800", name: "PT 특별 할인 이벤트" },
    { id: "2", url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=800", name: "여름 맞이 3+1 프로모션" },
  ],
  features: {
    passInfo: true,
    reservations: true,
    lockerLookup: true,
    notices: true,
    shop: true,
  },
  ttsMessages: [
    { id: "1", event: "체크인 성공", message: "{이름}님 환영합니다.", description: "정상적으로 체크인 완료 시 안내" },
    { id: "2", event: "체크인 실패 (만료)", message: "{이름}님 이용권이 만료되었습니다.", description: "이용 기간 종료 회원 태그 시 안내" },
    { id: "3", event: "체크인 실패 (미등록)", message: "등록된 회원 정보가 없습니다.", description: "미등록 수단 태그 시 안내" },
    { id: "4", event: "만료 임박 안내", message: "{이름}님 이용권이 {N}일 후 만료됩니다.", description: "만료 임박 회원 체크인 시 추가 안내" },
    { id: "5", event: "생일 축하", message: "{이름}님 생일을 축하합니다.", description: "생일 당일 체크인 시 안내" },
    { id: "6", event: "대기 안내", message: "QR 또는 밴드를 인식해주세요.", description: "대기 화면에서 반복 재생" },
    { id: "7", event: "락커 자동 배정", message: "{N}번 락커를 사용해주세요.", description: "출석 후 자동 배정 성공 시 안내" },
    { id: "8", event: "락커 미배정", message: "프론트 데스크에서 락커를 배정받아주세요.", description: "자동 배정 실패 또는 수동 배정 정책일 때 안내" },
  ],
  accessStartTime: "06:00",
  accessEndTime: "23:00",
  allowExpired: "deny",
  expirationWarningDays: 7,
  preventDuplicateCheckIn: true,
  duplicatePreventionMinutes: 10,
  unpaidAccess: "warn",

  postCheckInPolicy: "attendance_only",
  autoAssignZones: [],
  unassignedGuideMessage: "프론트 데스크에서 락커를 배정받아주세요.",
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
      if (parsed?.kioskType) {
        // 신규 필드 누락 시 기본값으로 보정 (마이그레이션)
        return {
          ...INITIAL_DATA,
          ...parsed,
          features: { ...INITIAL_DATA.features, ...(parsed.features ?? {}) },
        };
      }
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
            <div className="col-span-full space-y-md">
              <div className="grid grid-cols-3 gap-sm">
                {[
                  { value: "qr" as const, label: "QR 코드" },
                  { value: "rfid" as const, label: "RFID/NFC" },
                  { value: "face" as const, label: "얼굴 인식" },
                  { value: "pin" as const, label: "전화번호 입력" },
                  { value: "barcode" as const, label: "바코드" },
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
                        // 기본 출석 방식이 빠지면 첫 번째 활성 수단으로 변경
                        const def = next.includes(settings.defaultCheckInMethod)
                          ? settings.defaultCheckInMethod
                          : (next[0] ?? "qr");
                        setSettings({ ...settings, checkInMethods: next, defaultCheckInMethod: def });
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="text-Label text-content-secondary">기본 출석 방식</label>
                  <Select
                    options={settings.checkInMethods.map(m => ({
                      value: m,
                      label: ({
                        qr: "QR 코드",
                        rfid: "RFID/NFC",
                        face: "얼굴 인식",
                        pin: "전화번호 입력",
                        barcode: "바코드",
                      } as const)[m],
                    }))}
                    value={settings.defaultCheckInMethod}
                    onChange={(v) => setSettings({ ...settings, defaultCheckInMethod: v as CheckInMethod })}
                  />
                  <p className="text-[11px] text-content-secondary">키오스크 첫 화면에서 우선 표시되는 인증 방식</p>
                </div>

                <div className="flex items-center justify-between p-md rounded-xl bg-surface-secondary">
                  <div>
                    <p className="text-Body-2 font-medium text-content">직원 출퇴근 허용</p>
                    <p className="text-Label text-content-secondary">직원이 키오스크로 출퇴근을 기록할 수 있도록 허용합니다</p>
                  </div>
                  <ToggleSwitch
                    checked={settings.staffAttendance}
                    onChange={() => setSettings({ ...settings, staffAttendance: !settings.staffAttendance })}
                  />
                </div>

                <div className="flex items-center justify-between p-md rounded-xl bg-surface-secondary md:col-span-2">
                  <div>
                    <p className="text-Body-2 font-medium text-content">얼굴 인식 모듈 사용</p>
                    <p className="text-Label text-content-secondary">얼굴 인식 카메라와 AI 엔진을 활성화합니다</p>
                  </div>
                  <ToggleSwitch
                    checked={settings.useFaceRecognition}
                    onChange={() => setSettings({ ...settings, useFaceRecognition: !settings.useFaceRecognition })}
                  />
                </div>
              </div>
            </div>
          </FormSection>

          {/* 얼굴 인식 설정 (face 체크인 활성 시) */}
          {settings.checkInMethods.includes("face") && (
            <FormSection title="얼굴 인식 설정" description="AI 기반 얼굴 인식 출입 시스템 설정 (브로제이 참고)" columns={2}>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">인식 모드</label>
                <Select
                  options={[
                    { value: 'single', label: '단일 인식 (1명씩)' },
                    { value: 'multi', label: '다중 인식 (최대 10명 동시)' },
                  ]}
                  value="single"
                  onChange={() => {}}
                />
                <p className="text-[11px] text-content-secondary">브로제이: 10명 동시 인식 가능</p>
              </div>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">인식 민감도</label>
                <Select
                  options={[
                    { value: 'high', label: '높음 (정확도 우선)' },
                    { value: 'medium', label: '보통' },
                    { value: 'low', label: '낮음 (속도 우선)' },
                  ]}
                  value="high"
                  onChange={() => {}}
                />
              </div>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">병행 인증 수단</label>
                <Select
                  options={[
                    { value: 'none', label: '얼굴만' },
                    { value: 'phone', label: '전화번호 입력 병행' },
                    { value: 'qr', label: 'QR 코드 병행' },
                  ]}
                  value="none"
                  onChange={() => {}}
                />
                <p className="text-[11px] text-content-secondary">인식 실패 시 대체 수단</p>
              </div>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">자동 등록</label>
                <Select
                  options={[
                    { value: 'manual', label: '수동 등록 (관리자 촬영)' },
                    { value: 'first_visit', label: '첫 방문 시 자동 촬영' },
                  ]}
                  value="manual"
                  onChange={() => {}}
                />
              </div>
              <div className="col-span-2 p-md bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-[12px] text-blue-700 font-medium">카메라 연동 필요</p>
                <p className="text-[11px] text-blue-600 mt-xs">얼굴 인식 사용을 위해 IoT 설정에서 카메라 장치를 등록하세요. 입장/퇴실 자동 체크가 가능합니다.</p>
              </div>
            </FormSection>
          )}

          <FormSection title="시스템 설정" columns={2}>
            <div className="space-y-xs">
              <Input
                label="화면 대기 시간 (초)"
                type="number"
                value={String(settings.screenTimeout)}
                onChange={e => setSettings({ ...settings, screenTimeout: Number(e.target.value) })}
                hint="미사용 시 대기 화면 전환 시간"
              />
            </div>
            <div className="space-y-xs">
              <Input
                label="자동 초기화 시간 (초)"
                type="number"
                value={String(settings.autoLogout)}
                onChange={e => setSettings({ ...settings, autoLogout: Number(e.target.value) })}
                hint="체크인 완료 후 초기화 대기"
              />
            </div>
            <div className="space-y-xs">
              <Input
                label="관리자 PIN"
                type="password"
                value={settings.adminPin}
                onChange={e => setSettings({ ...settings, adminPin: e.target.value })}
                placeholder="4~6자리 숫자"
                leftIcon={<Lock size={16} />}
              />
            </div>
          </FormSection>

          <FormSection title="키오스크 회원 기능" description="회원이 키오스크에서 사용할 수 있는 부가 기능을 설정합니다." columns={1}>
            <div className="col-span-full space-y-md">
              {(
                [
                  { key: "passInfo", label: "이용권 잔여 조회", desc: "잔여 일수/세션을 회원이 직접 조회할 수 있습니다", typeBOnly: false },
                  { key: "reservations", label: "수업 예약 조회", desc: "예약된 수업 목록을 표시합니다", typeBOnly: false },
                  { key: "lockerLookup", label: "락커 번호 확인", desc: "회원이 자신에게 배정된 락커 번호를 조회할 수 있습니다", typeBOnly: false },
                  { key: "notices", label: "공지사항 조회", desc: "지점 공지사항을 키오스크에서 표시합니다", typeBOnly: false },
                  { key: "shop", label: "상품 구매", desc: "타입B 키오스크에서 상품 결제 메뉴를 노출합니다", typeBOnly: true },
                ] as const
              ).map(item => {
                const disabled = item.typeBOnly && settings.kioskType !== "typeB";
                return (
                  <div
                    key={item.key}
                    className={cn(
                      "flex items-center justify-between p-md rounded-xl bg-surface-secondary",
                      disabled && "opacity-60",
                    )}
                  >
                    <div>
                      <p className="text-Body-2 font-medium text-content">
                        {item.label}
                        {item.typeBOnly && (
                          <span className="ml-xs text-[11px] text-content-secondary">· 타입 B 전용</span>
                        )}
                      </p>
                      <p className="text-Label text-content-secondary">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={!disabled && settings.features[item.key]}
                      onChange={() => {
                        if (disabled) return;
                        setSettings({
                          ...settings,
                          features: { ...settings.features, [item.key]: !settings.features[item.key] },
                        });
                      }}
                    />
                  </div>
                );
              })}
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
          <Input
            label="환영 문구"
            type="text"
            value={settings.welcomeMessage}
            onChange={e => setSettings({ ...settings, welcomeMessage: e.target.value })}
          />
        </div>

        <div className="space-y-sm">
          <Input
            label="출석 완료 메시지"
            type="text"
            value={settings.completionMessage}
            onChange={e => setSettings({ ...settings, completionMessage: e.target.value })}
            hint="체크인 성공 화면 상단에 표시되는 문구"
          />
        </div>

        <div className="space-y-sm">
          <label className="text-Label text-content-secondary">키오스크 표시 언어</label>
          <Select
            options={[
              { value: "ko", label: "한국어" },
              { value: "en", label: "English" },
              { value: "ja", label: "日本語" },
              { value: "zh", label: "中文" },
            ]}
            value={settings.language}
            onChange={(v) => setSettings({ ...settings, language: v as Language })}
          />
          <p className="text-[11px] text-content-secondary">키오스크 회원 화면의 기본 언어 (en/ja/zh는 일부 문구만 번역)</p>
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
            <Textarea
              value={settings.noticeContent}
              onChange={e => setSettings({ ...settings, noticeContent: e.target.value })}
              placeholder="키오스크 공지사항 입력"
              rows={3}
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
        <div className="col-span-full">
          <SimpleTable
            columns={[
              { key: 'event', header: '이벤트', width: 180, render: (v: string, row: typeof settings.ttsMessages[0]) => (
                <div>
                  <span className="text-Body-2 font-semibold text-content">{v}</span>
                  <p className="text-[11px] text-content-secondary mt-[2px]">{row.description}</p>
                </div>
              )},
              { key: 'message', header: '안내 메시지', render: (v: string, row: typeof settings.ttsMessages[0]) => (
                <Input
                  type="text"
                  size="sm"
                  value={v}
                  onChange={e => {
                    const next = settings.ttsMessages.map(m => m.id === row.id ? { ...m, message: e.target.value } : m);
                    setSettings({ ...settings, ttsMessages: next });
                  }}
                />
              )},
              { key: 'actions', header: '재생', width: 80, align: 'center', render: (_: unknown, row: typeof settings.ttsMessages[0]) => (
                <button
                  className="w-9 h-9 flex items-center justify-center mx-auto rounded-full bg-accent-light text-accent hover:bg-accent hover:text-white transition-all shadow-sm"
                  onClick={() => playTTS(row.message)}
                >
                  <Play size={14} fill="currentColor" />
                </button>
              )},
            ]}
            data={settings.ttsMessages}
          />
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
            <Input
              type="time"
              value={settings.accessStartTime}
              onChange={e => setSettings({ ...settings, accessStartTime: e.target.value })}
              rightIcon={<Clock size={14} />}
            />
            <span className="text-content-secondary">~</span>
            <Input
              type="time"
              value={settings.accessEndTime}
              onChange={e => setSettings({ ...settings, accessEndTime: e.target.value })}
              rightIcon={<Clock size={14} />}
            />
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
            <Input
              type="number"
              value={String(settings.expirationWarningDays)}
              onChange={e => setSettings({ ...settings, expirationWarningDays: Number(e.target.value) })}
              className="w-24"
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
              <Input
                type="number"
                size="sm"
                value={String(settings.duplicatePreventionMinutes)}
                onChange={e => setSettings({ ...settings, duplicatePreventionMinutes: Number(e.target.value) })}
                className="w-20"
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

  // ── 락커 후처리 ──
  const renderLocker = () => (
    <div className="flex flex-col gap-lg">
      <FormSection title="출석 후 처리 정책" description="회원이 체크인을 완료한 직후 락커 처리 방식을 지정합니다." columns={1}>
        <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-md">
          {([
            {
              value: "attendance_only" as const,
              label: "출석만 완료",
              desc: "락커 처리는 키오스크에서 하지 않음",
            },
            {
              value: "manual_locker_assignment" as const,
              label: "수동 배정 대기",
              desc: "프론트에서 수동으로 락커를 배정하도록 안내",
            },
            {
              value: "auto_locker_assignment" as const,
              label: "자동 배정 시도",
              desc: "선택한 존에서 빈 락커를 자동으로 배정",
            },
          ]).map(opt => {
            const active = settings.postCheckInPolicy === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSettings({ ...settings, postCheckInPolicy: opt.value })}
                className={cn(
                  "flex flex-col items-start gap-xs p-lg rounded-xl border-2 text-left transition-all",
                  active
                    ? "border-accent bg-accent-light"
                    : "border-line bg-surface hover:border-accent/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "text-Body-1 font-bold",
                      active ? "text-accent" : "text-content",
                    )}
                  >
                    {opt.label}
                  </span>
                  {active && <CheckCircle2 className="text-accent" size={18} />}
                </div>
                <p className="text-Label text-content-secondary">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </FormSection>

      {settings.postCheckInPolicy === "auto_locker_assignment" && (
        <FormSection
          title="자동 배정 존"
          description="자동 배정 시 탐색할 락커 존을 선택합니다."
          columns={1}
        >
          <div className="col-span-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
              {ALL_ZONES.map(zone => {
                const active = settings.autoAssignZones.includes(zone);
                return (
                  <button
                    key={zone}
                    onClick={() => {
                      const next = active
                        ? settings.autoAssignZones.filter(z => z !== zone)
                        : [...settings.autoAssignZones, zone];
                      setSettings({ ...settings, autoAssignZones: next });
                    }}
                    className={cn(
                      "flex items-center justify-center gap-sm p-md rounded-xl border-2 transition-all",
                      active
                        ? "border-accent bg-accent-light text-accent"
                        : "border-line bg-surface text-content hover:border-accent/40",
                    )}
                  >
                    <span className="text-Body-2 font-bold">{zone} 존</span>
                    {active && <CheckCircle2 size={16} />}
                  </button>
                );
              })}
            </div>
            {settings.autoAssignZones.length === 0 && (
              <p className="mt-sm text-[11px] text-state-warning">
                존을 선택하지 않으면 자동 배정이 실패하고 미배정 안내가 표시됩니다.
              </p>
            )}
          </div>
        </FormSection>
      )}

      <FormSection
        title="미배정 안내 문구"
        description="락커가 배정되지 않을 때 키오스크 화면에 노출되는 메시지입니다."
        columns={1}
      >
        <div className="col-span-full">
          <Textarea
            value={settings.unassignedGuideMessage}
            onChange={e => setSettings({ ...settings, unassignedGuideMessage: e.target.value })}
            rows={3}
          />
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
          {activeTab === "locker" && renderLocker()}
        </div>
      </div>
    </AppLayout>
  );
}
