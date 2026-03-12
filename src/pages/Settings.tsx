import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Info,
  Bell,
  Palette,
  Clock,
  Phone,
  Building2,
  Image as ImageIcon,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  Package
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import FormSection from '@/components/FormSection';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import { supabase } from '@/lib/supabase';

type TabKey = 'basic' | 'notification' | 'theme' | 'supplies';

interface CenterInfo {
  name: string;
  description: string;
  address: string;
  businessNumber: string;
  phone: string;
  openTime: string;
  closeTime: string;
  weekendOpenTime: string;
  weekendCloseTime: string;
  sectors: string[];
}

interface NotificationSettings {
  pushEntrance: boolean;
  pushExpiry: boolean;
  pushPayment: boolean;
  pushReservation: boolean;
  emailWeeklyReport: boolean;
  emailExpiry: boolean;
  smsPayment: boolean;
  smsExpiry: boolean;
}

interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontSize: 'sm' | 'md' | 'lg';
}

const EMPTY_CENTER: CenterInfo = {
  name: '',
  description: '',
  address: '',
  businessNumber: '',
  phone: '',
  openTime: '09:00',
  closeTime: '22:00',
  weekendOpenTime: '09:00',
  weekendCloseTime: '20:00',
  sectors: [],
};

const EMPTY_NOTIFICATIONS: NotificationSettings = {
  pushEntrance: false,
  pushExpiry: false,
  pushPayment: false,
  pushReservation: false,
  emailWeeklyReport: false,
  emailExpiry: false,
  smsPayment: false,
  smsExpiry: false,
};

const EMPTY_THEME: ThemeSettings = {
  mode: 'light',
  primaryColor: '#3B82F6',
  accentColor: '#10B981',
  fontSize: 'md',
};

interface SupplyItem {
  stock: number;
  dailyLimit: number;
  remaining: number;
}

interface SuppliesSettings {
  towelLarge: SupplyItem;
  towelSmall: SupplyItem;
  uniformTop: SupplyItem;
  uniformBottom: SupplyItem;
}

const EMPTY_SUPPLY_ITEM: SupplyItem = { stock: 0, dailyLimit: 0, remaining: 0 };

const EMPTY_SUPPLIES: SuppliesSettings = {
  towelLarge: { ...EMPTY_SUPPLY_ITEM },
  towelSmall: { ...EMPTY_SUPPLY_ITEM },
  uniformTop: { ...EMPTY_SUPPLY_ITEM },
  uniformBottom: { ...EMPTY_SUPPLY_ITEM },
};

const SUPPLY_LABELS: Record<keyof SuppliesSettings, string> = {
  towelLarge: '수건 (대)',
  towelSmall: '수건 (소)',
  uniformTop: '운동복 (상의)',
  uniformBottom: '운동복 (하의)',
};

const TABS = [
  { key: 'basic', label: '기본정보', icon: Info },
  { key: 'notification', label: '알림설정', icon: Bell },
  { key: 'theme', label: '테마설정', icon: Palette },
  { key: 'supplies', label: '물품 관리', icon: Package },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative w-12 h-6 rounded-full transition-colors duration-200 outline-none focus:ring-2 focus:ring-accent/30",
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

export default function Settings() {
  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [tabDirty, setTabDirty] = useState<Record<string, boolean>>({});
  const isDirty = tabDirty[activeTab] ?? false;

  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const [centerInfo, setCenterInfo] = useState<CenterInfo>(EMPTY_CENTER);
  const [notifications, setNotifications] = useState<NotificationSettings>(EMPTY_NOTIFICATIONS);
  const [theme, setTheme] = useState<ThemeSettings>(EMPTY_THEME);
  const [supplies, setSupplies] = useState<SuppliesSettings>(EMPTY_SUPPLIES);

  // Supabase 데이터 로드
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const [{ data: branch }, { data: settings }] = await Promise.all([
        supabase.from('branches').select('name, address, phone').eq('id', branchId).single(),
        supabase.from('settings').select('*').eq('branchId', branchId).single(),
      ]);

      if (branch) {
        setCenterInfo(prev => ({
          ...prev,
          name: branch.name ?? prev.name,
          address: branch.address ?? prev.address,
          phone: branch.phone ?? prev.phone,
        }));
      }

      if (settings) {
        setCenterInfo(prev => ({
          ...prev,
          name: settings.centerName ?? prev.name,
          openTime: settings.businessHoursOpen ?? prev.openTime,
          closeTime: settings.businessHoursClose ?? prev.closeTime,
        }));
        setNotifications({
          pushEntrance: false,
          pushExpiry: settings.autoExpireNotify ?? false,
          pushPayment: false,
          pushReservation: false,
          emailWeeklyReport: false,
          emailExpiry: settings.autoExpireNotify ?? false,
          smsPayment: settings.smsEnabled ?? false,
          smsExpiry: settings.smsEnabled ?? false,
        });
        setTheme(prev => ({
          ...prev,
          mode: (settings.theme as ThemeSettings['mode']) ?? prev.mode,
        }));
        if (settings.supplies) {
          try {
            const parsed = typeof settings.supplies === 'string'
              ? JSON.parse(settings.supplies)
              : settings.supplies;
            setSupplies(prev => ({ ...prev, ...parsed }));
          } catch { /* 파싱 실패 시 기본값 유지 */ }
        }
      }
      setIsLoading(false);
    };

    fetchSettings();
  }, [branchId]);

  useEffect(() => {
    const hasAnyDirty = Object.values(tabDirty).some(Boolean);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tabDirty]);

  const markDirty = useCallback(() => {
    setTabDirty(prev => ({ ...prev, [activeTab]: true }));
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    if (isDirty) { setPendingTab(tab); setShowUnsavedWarning(true); }
    else setActiveTab(tab as TabKey);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload: Record<string, unknown> = {};

    if (activeTab === 'basic') {
      payload.centerName = centerInfo.name;
      payload.businessHoursOpen = centerInfo.openTime;
      payload.businessHoursClose = centerInfo.closeTime;
      // branch 정보도 동기화
      await supabase.from('branches').update({ name: centerInfo.name, address: centerInfo.address, phone: centerInfo.phone }).eq('id', branchId);
    } else if (activeTab === 'notification') {
      payload.smsEnabled = notifications.smsPayment || notifications.smsExpiry;
      payload.autoExpireNotify = notifications.pushExpiry || notifications.emailExpiry;
    } else if (activeTab === 'theme') {
      payload.theme = theme.mode;
    } else if (activeTab === 'supplies') {
      payload.supplies = supplies;
    }

    await supabase.from('settings').update(payload).eq('branchId', branchId);

    setIsSaving(false);
    setSaveSuccess(true);
    setTabDirty(prev => ({ ...prev, [activeTab]: false }));
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDiscardAndSwitch = () => {
    if (pendingTab) {
      setTabDirty(prev => ({ ...prev, [activeTab]: false }));
      setActiveTab(pendingTab as TabKey);
      setPendingTab(null);
    }
    setShowUnsavedWarning(false);
  };

  // ── 기본정보 탭 ──
  const renderBasic = () => (
    <div className="space-y-lg">
      <FormSection title="센터 기본정보" description="센터의 대표 정보를 설정합니다." columns={2}>
        <div className="col-span-2 flex items-start gap-lg mb-md">
          <div className="relative group">
            <div className="w-[120px] h-[120px] bg-surface-secondary rounded-xl border border-dashed border-line flex flex-col items-center justify-center gap-xs overflow-hidden">
              <ImageIcon className="text-content-secondary" size={28} />
              <span className="text-Label text-content-secondary">센터 로고</span>
            </div>
            <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl">
              <Plus size={22} />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <label className="text-Label text-content">센터명 <span className="text-state-error">*</span></label>
              <input
                className="w-full bg-surface-secondary p-md rounded-input focus:ring-1 focus:ring-accent outline-none border border-transparent transition-all"
                type="text"
                value={centerInfo.name}
                onChange={e => { setCenterInfo({ ...centerInfo, name: e.target.value }); markDirty(); }}
              />
            </div>
            <div className="space-y-xs">
              <label className="text-Label text-content">사업자등록번호</label>
              <input
                className="w-full bg-surface-secondary p-md rounded-input outline-none border border-transparent"
                type="text"
                value={centerInfo.businessNumber}
                onChange={() => markDirty()}
              />
            </div>
            <div className="col-span-2 space-y-xs">
              <label className="text-Label text-content">센터 소개</label>
              <textarea
                className="w-full bg-surface-secondary p-md rounded-input focus:ring-1 focus:ring-accent outline-none border border-transparent resize-none"
                rows={2}
                value={centerInfo.description}
                onChange={e => { setCenterInfo({ ...centerInfo, description: e.target.value }); markDirty(); }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-xs">
          <label className="text-Label text-content flex items-center gap-xs"><Phone size={13} /> 대표 연락처</label>
          <input
            className="w-full bg-surface-secondary p-md rounded-input focus:ring-1 focus:ring-accent outline-none border border-transparent"
            type="text"
            value={centerInfo.phone}
            onChange={e => { setCenterInfo({ ...centerInfo, phone: e.target.value }); markDirty(); }}
          />
        </div>

        <div className="space-y-xs">
          <label className="text-Label text-content flex items-center gap-xs"><Building2 size={13} /> 주소</label>
          <div className="flex gap-sm">
            <input
              className="flex-1 bg-surface-secondary p-md rounded-input outline-none border border-transparent"
              type="text"
              readOnly
              value={centerInfo.address}
            />
            <button className="bg-accent-light text-accent px-lg rounded-button text-Body-2 font-semibold whitespace-nowrap">
              주소검색
            </button>
          </div>
        </div>

        <div className="col-span-2 space-y-xs pt-sm">
          <label className="text-Label text-content flex items-center gap-xs"><Building2 size={13} /> 업종 선택</label>
          <div className="flex flex-wrap gap-sm">
            {['헬스', '필라테스', 'PT샵', '골프', '요가', '태권도', '크로스핏', '복싱', '수영', '사우나', '기타'].map(sector => (
              <label key={sector} className="flex items-center gap-xs bg-surface-secondary px-md py-sm rounded-full cursor-pointer hover:bg-primary-light transition-colors">
                <input
                  className="accent-primary"
                  type="checkbox"
                  checked={centerInfo.sectors.includes(sector)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...centerInfo.sectors, sector]
                      : centerInfo.sectors.filter(s => s !== sector);
                    setCenterInfo({ ...centerInfo, sectors: next });
                    markDirty();
                  }}
                />
                <span className="text-Body-2">{sector}</span>
              </label>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="영업시간 설정" description="평일 및 주말 영업시간을 설정합니다." columns={2}>
        <div className="space-y-xs">
          <label className="text-Label text-content flex items-center gap-xs"><Clock size={13} /> 평일 오픈~마감</label>
          <div className="flex items-center gap-sm">
            <input
              className="flex-1 bg-surface-secondary p-md rounded-input outline-none border border-transparent focus:ring-1 focus:ring-accent"
              type="time"
              value={centerInfo.openTime}
              onChange={e => { setCenterInfo({ ...centerInfo, openTime: e.target.value }); markDirty(); }}
            />
            <span className="text-content-secondary">~</span>
            <input
              className="flex-1 bg-surface-secondary p-md rounded-input outline-none border border-transparent focus:ring-1 focus:ring-accent"
              type="time"
              value={centerInfo.closeTime}
              onChange={e => { setCenterInfo({ ...centerInfo, closeTime: e.target.value }); markDirty(); }}
            />
          </div>
        </div>
        <div className="space-y-xs">
          <label className="text-Label text-content flex items-center gap-xs"><Clock size={13} /> 주말/공휴일 오픈~마감</label>
          <div className="flex items-center gap-sm">
            <input
              className="flex-1 bg-surface-secondary p-md rounded-input outline-none border border-transparent focus:ring-1 focus:ring-accent"
              type="time"
              value={centerInfo.weekendOpenTime}
              onChange={e => { setCenterInfo({ ...centerInfo, weekendOpenTime: e.target.value }); markDirty(); }}
            />
            <span className="text-content-secondary">~</span>
            <input
              className="flex-1 bg-surface-secondary p-md rounded-input outline-none border border-transparent focus:ring-1 focus:ring-accent"
              type="time"
              value={centerInfo.weekendCloseTime}
              onChange={e => { setCenterInfo({ ...centerInfo, weekendCloseTime: e.target.value }); markDirty(); }}
            />
          </div>
        </div>
      </FormSection>
    </div>
  );

  // ── 알림설정 탭 ──
  const renderNotification = () => {
    const sections = [
      {
        title: '푸시 알림',
        description: '모바일 앱 및 웹 푸시 알림을 설정합니다.',
        items: [
          { key: 'pushEntrance' as keyof NotificationSettings, label: '실시간 입장 알림', desc: '회원이 센터 입장 시 관리자 앱으로 푸시 알림' },
          { key: 'pushExpiry' as keyof NotificationSettings, label: '회원 만료 임박 알림', desc: '이용권 만료 D-7 이내 발생 시 알림' },
          { key: 'pushPayment' as keyof NotificationSettings, label: '결제 완료 알림', desc: '새로운 결제 발생 시 알림' },
          { key: 'pushReservation' as keyof NotificationSettings, label: '수업 예약/취소 알림', desc: '수업 예약 또는 취소 발생 시 강사에게 알림' },
        ]
      },
      {
        title: '이메일 알림',
        description: '이메일로 전송되는 리포트 및 알림을 설정합니다.',
        items: [
          { key: 'emailWeeklyReport' as keyof NotificationSettings, label: '주간 리포트', desc: '매주 월요일 오전 지난 주 운영 통계 메일 발송' },
          { key: 'emailExpiry' as keyof NotificationSettings, label: '만료 예정 안내 메일', desc: '이용권 만료 D-30 회원 목록 메일 발송' },
        ]
      },
      {
        title: 'SMS 알림',
        description: '회원에게 발송되는 SMS 알림을 설정합니다.',
        items: [
          { key: 'smsPayment' as keyof NotificationSettings, label: '결제 완료 SMS', desc: '결제 완료 시 회원에게 SMS 발송' },
          { key: 'smsExpiry' as keyof NotificationSettings, label: '만료 임박 SMS', desc: '이용권 만료 D-7 회원에게 SMS 자동 발송' },
        ]
      }
    ];

    return (
      <div className="space-y-xl">
        {sections.map(section => (
          <FormSection key={section.title} title={section.title} description={section.description} columns={1}>
            <div className="col-span-full space-y-sm">
              {section.items.map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-lg bg-surface-secondary/50 rounded-xl border border-line hover:border-accent/30 transition-colors"
                >
                  <div className="space-y-xs">
                    <p className="text-Body-1 font-semibold text-content">{item.label}</p>
                    <p className="text-Body-2 text-content-secondary">{item.desc}</p>
                  </div>
                  <ToggleSwitch
                    checked={notifications[item.key] as boolean}
                    onChange={() => {
                      setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }));
                      markDirty();
                    }}
                  />
                </div>
              ))}
            </div>
          </FormSection>
        ))}
      </div>
    );
  };

  // ── 물품 관리 탭 ──
  const renderSupplies = () => (
    <div className="space-y-lg">
      <FormSection title="수건/운동복 발급 관리" description="각 물품의 재고, 1일 발급량, 현재 잔여량을 설정합니다." columns={1}>
        <div className="col-span-full space-y-sm">
          <div className="grid grid-cols-4 gap-md px-lg py-sm bg-surface-secondary rounded-xl">
            <span className="text-Label text-content-secondary font-semibold">물품명</span>
            <span className="text-Label text-content-secondary font-semibold text-center">재고 수량</span>
            <span className="text-Label text-content-secondary font-semibold text-center">1일 발급량</span>
            <span className="text-Label text-content-secondary font-semibold text-center">현재 잔여량</span>
          </div>
          {(Object.keys(SUPPLY_LABELS) as (keyof SuppliesSettings)[]).map(key => (
            <div key={key} className="grid grid-cols-4 gap-md items-center px-lg py-md bg-surface-secondary/50 rounded-xl border border-line hover:border-accent/30 transition-colors">
              <span className="text-Body-1 font-semibold text-content">{SUPPLY_LABELS[key]}</span>
              {(['stock', 'dailyLimit', 'remaining'] as (keyof SupplyItem)[]).map(field => (
                <input
                  key={field}
                  type="number"
                  min={0}
                  className="w-full bg-surface p-md rounded-input text-center outline-none border border-line focus:ring-1 focus:ring-accent transition-all"
                  value={supplies[key][field]}
                  onChange={e => {
                    const val = Math.max(0, Number(e.target.value));
                    setSupplies(prev => ({
                      ...prev,
                      [key]: { ...prev[key], [field]: val },
                    }));
                    markDirty();
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </FormSection>
    </div>
  );

  // ── 테마설정 탭 ──
  const renderTheme = () => (
    <div className="space-y-xl">
      <FormSection title="다크모드 설정" description="화면 테마 모드를 선택합니다." columns={1}>
        <div className="col-span-full grid grid-cols-3 gap-md">
          {[
            { value: 'light', label: '라이트 모드', icon: Sun, desc: '밝은 배경' },
            { value: 'dark', label: '다크 모드', icon: Moon, desc: '어두운 배경' },
            { value: 'system', label: '시스템 설정', icon: Monitor, desc: '기기 설정 따름' },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => { setTheme(prev => ({ ...prev, mode: item.value as any })); markDirty(); }}
              className={cn(
                "flex flex-col items-center gap-md p-xl rounded-xl border-2 transition-all",
                theme.mode === item.value
                  ? "border-accent bg-accent-light"
                  : "border-line bg-surface hover:border-accent/40"
              )}
            >
              <item.icon className={theme.mode === item.value ? "text-accent" : "text-content-secondary"} size={28} />
              <div className="text-center">
                <p className={cn("text-Body-1 font-bold", theme.mode === item.value ? "text-accent" : "text-content")}>{item.label}</p>
                <p className="text-Label text-content-secondary">{item.desc}</p>
              </div>
              {theme.mode === item.value && (
                <CheckCircle2 className="text-accent" size={18} />
              )}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title="색상 설정" description="브랜드 색상을 커스터마이징합니다." columns={2}>
        <div className="space-y-xs">
          <label className="text-Label text-content">메인 컬러 (Primary)</label>
          <div className="flex items-center gap-md bg-surface-secondary p-md rounded-input">
            <input
              type="color"
              className="w-10 h-10 rounded-full border-none cursor-pointer p-0 overflow-hidden"
              value={theme.primaryColor}
              onChange={e => { setTheme(prev => ({ ...prev, primaryColor: e.target.value })); markDirty(); }}
            />
            <span className="font-mono text-Body-1 text-content font-semibold">{theme.primaryColor.toUpperCase()}</span>
          </div>
        </div>
        <div className="space-y-xs">
          <label className="text-Label text-content">보조 컬러 (Accent)</label>
          <div className="flex items-center gap-md bg-surface-secondary p-md rounded-input">
            <input
              type="color"
              className="w-10 h-10 rounded-full border-none cursor-pointer p-0 overflow-hidden"
              value={theme.accentColor}
              onChange={e => { setTheme(prev => ({ ...prev, accentColor: e.target.value })); markDirty(); }}
            />
            <span className="font-mono text-Body-1 text-content font-semibold">{theme.accentColor.toUpperCase()}</span>
          </div>
        </div>
      </FormSection>

      <FormSection title="글자 크기" columns={1}>
        <div className="col-span-full flex gap-md">
          {[
            { value: 'sm', label: '작게', sample: 'text-sm' },
            { value: 'md', label: '기본', sample: 'text-base' },
            { value: 'lg', label: '크게', sample: 'text-lg' },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => { setTheme(prev => ({ ...prev, fontSize: item.value as any })); markDirty(); }}
              className={cn(
                "flex-1 flex flex-col items-center gap-sm p-lg rounded-xl border-2 transition-all",
                theme.fontSize === item.value
                  ? "border-accent bg-accent-light"
                  : "border-line bg-surface hover:border-accent/40"
              )}
            >
              <span className={cn(item.sample, "font-semibold", theme.fontSize === item.value ? "text-accent" : "text-content")}>가나다</span>
              <span className="text-Label text-content-secondary">{item.label}</span>
            </button>
          ))}
        </div>
      </FormSection>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-surface-secondary">
        <PageHeader
          title="센터 설정"
          description="기본정보, 알림, 테마 설정을 관리합니다."
          actions={
            <div className="flex items-center gap-md">
              {isDirty && !saveSuccess && (
                <div className="flex items-center gap-xs text-amber-600 bg-amber-600/10 px-lg py-md rounded-button animate-in fade-in">
                  <AlertTriangle size={16} />
                  <span className="text-Body-2 font-medium">저장되지 않은 변경사항이 있습니다</span>
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-xs text-accent bg-accent-light px-lg py-md rounded-button animate-in fade-in">
                  <CheckCircle2 size={18} />
                  <span className="text-Body-2 font-bold">변경사항이 저장되었습니다.</span>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className={cn(
                  "flex items-center gap-sm bg-accent text-white px-xl py-md rounded-button shadow-card transition-all",
                  isSaving ? "animate-pulse" : "hover:opacity-90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Save size={18} />
                <span className="text-Body-1 font-bold">{isSaving ? '저장 중...' : '설정 저장'}</span>
              </button>
            </div>
          }
        />

        <div className="flex-1 overflow-hidden flex flex-col px-xl pb-xl">
          <div className="bg-surface rounded-xl shadow-card flex flex-col h-full overflow-hidden border border-line">
            <TabNav
              className="px-lg pt-lg border-b border-line"
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
            <div className="flex-1 overflow-y-auto p-xl scrollbar-hide">
              <div className="max-w-[900px] mx-auto">
                {activeTab === 'basic' && renderBasic()}
                {activeTab === 'notification' && renderNotification()}
                {activeTab === 'theme' && renderTheme()}
                {activeTab === 'supplies' && renderSupplies()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 미저장 경고 모달 */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
          <div className="w-full max-w-sm bg-surface rounded-modal shadow-card p-xl">
            <div className="flex items-center gap-md mb-lg">
              <div className="w-[48px] h-[48px] bg-amber-600/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="text-Heading-2 text-content">저장되지 않은 변경사항</h3>
                <p className="text-Body-2 text-content-secondary mt-xs">탭을 이동하면 변경사항이 사라집니다.</p>
              </div>
            </div>
            <div className="flex justify-end gap-sm">
              <button
                className="px-lg py-sm text-content-secondary hover:bg-surface-secondary rounded-button transition-colors text-Body-2"
                onClick={() => setShowUnsavedWarning(false)}
              >
                취소
              </button>
              <button
                className="px-lg py-sm bg-accent text-white rounded-button text-Body-2 font-semibold hover:opacity-90"
                onClick={() => {
                  if (pendingTab) {
                    handleSave();
                    setActiveTab(pendingTab as TabKey);
                    setPendingTab(null);
                  }
                  setShowUnsavedWarning(false);
                }}
              >
                저장 후 이동
              </button>
              <button
                className="px-lg py-sm bg-state-error text-white rounded-button text-Body-2 font-semibold hover:opacity-90"
                onClick={handleDiscardAndSwitch}
              >
                저장 안 함
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
