'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import TabNav from "@/components/common/TabNav";
import FormSection from "@/components/common/FormSection";
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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

interface ImpactItem {
  label: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
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

const ADDRESS_CANDIDATES = [
  '서울특별시 강남구 테헤란로 152 피트지니 타워',
  '서울특별시 송파구 올림픽로 300 피트지니 센터',
  '경기도 성남시 분당구 판교역로 235 판교 웰니스 빌딩',
  '부산광역시 해운대구 센텀중앙로 97 센텀 스포츠몰',
  '대구광역시 수성구 동대구로 95 메디핏 스퀘어',
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
  const branchId = getBranchId();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [tabDirty, setTabDirty] = useState<Record<string, boolean>>({});
  const isDirty = tabDirty[activeTab] ?? false;

  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const [centerInfo, setCenterInfo] = useState<CenterInfo>(EMPTY_CENTER);
  const [savedCenterInfo, setSavedCenterInfo] = useState<CenterInfo>(EMPTY_CENTER);
  const [notifications, setNotifications] = useState<NotificationSettings>(EMPTY_NOTIFICATIONS);
  const [savedNotifications, setSavedNotifications] = useState<NotificationSettings>(EMPTY_NOTIFICATIONS);
  const [theme, setTheme] = useState<ThemeSettings>(EMPTY_THEME);
  const [savedTheme, setSavedTheme] = useState<ThemeSettings>(EMPTY_THEME);
  const [supplies, setSupplies] = useState<SuppliesSettings>(EMPTY_SUPPLIES);
  const [savedSupplies, setSavedSupplies] = useState<SuppliesSettings>(EMPTY_SUPPLIES);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressKeyword, setAddressKeyword] = useState('');

  // Supabase 데이터 로드
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const [{ data: branch }, { data: settings }] = await Promise.all([
        supabase.from('branches').select('name, address, phone').eq('id', branchId).single(),
        supabase.from('settings').select('*').eq('branchId', branchId).single(),
      ]);

      const baseCenter = { ...EMPTY_CENTER };

      if (branch) {
        const nextCenter = {
          ...baseCenter,
          name: branch.name ?? baseCenter.name,
          address: branch.address ?? baseCenter.address,
          phone: branch.phone ?? baseCenter.phone,
        };
        setCenterInfo(nextCenter);
        setSavedCenterInfo(nextCenter);
      }

      if (settings) {
        const mergedCenter = {
          ...(branch ? {
            ...baseCenter,
            name: branch.name ?? baseCenter.name,
            address: branch.address ?? baseCenter.address,
            phone: branch.phone ?? baseCenter.phone,
          } : baseCenter),
        };
        const nextCenter = {
          ...mergedCenter,
          name: settings.centerName ?? mergedCenter.name,
          openTime: settings.businessHoursOpen ?? mergedCenter.openTime,
          closeTime: settings.businessHoursClose ?? mergedCenter.closeTime,
        };
        const nextNotifications = {
          pushEntrance: false,
          pushExpiry: settings.autoExpireNotify ?? false,
          pushPayment: false,
          pushReservation: false,
          emailWeeklyReport: false,
          emailExpiry: settings.autoExpireNotify ?? false,
          smsPayment: settings.smsEnabled ?? false,
          smsExpiry: settings.smsEnabled ?? false,
        };
        const nextTheme = {
          ...EMPTY_THEME,
          mode: (settings.theme as ThemeSettings['mode']) ?? EMPTY_THEME.mode,
        };
        setCenterInfo(nextCenter);
        setSavedCenterInfo(nextCenter);
        setNotifications(nextNotifications);
        setSavedNotifications(nextNotifications);
        setTheme(nextTheme);
        setSavedTheme(nextTheme);
        if (settings.supplies) {
          try {
            const parsed = typeof settings.supplies === 'string'
              ? JSON.parse(settings.supplies)
              : settings.supplies;
            const nextSupplies = { ...EMPTY_SUPPLIES, ...parsed };
            setSupplies(nextSupplies);
            setSavedSupplies(nextSupplies);
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
    if (activeTab === 'basic') setSavedCenterInfo(centerInfo);
    if (activeTab === 'notification') setSavedNotifications(notifications);
    if (activeTab === 'theme') setSavedTheme(theme);
    if (activeTab === 'supplies') setSavedSupplies(supplies);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDiscardAndSwitch = () => {
    if (pendingTab) {
      if (activeTab === 'basic') setCenterInfo(savedCenterInfo);
      if (activeTab === 'notification') setNotifications(savedNotifications);
      if (activeTab === 'theme') setTheme(savedTheme);
      if (activeTab === 'supplies') setSupplies(savedSupplies);
      setTabDirty(prev => ({ ...prev, [activeTab]: false }));
      setActiveTab(pendingTab as TabKey);
      setPendingTab(null);
    }
    setShowUnsavedWarning(false);
  };

  const filteredAddressCandidates = ADDRESS_CANDIDATES.filter((candidate) =>
    candidate.toLowerCase().includes(addressKeyword.trim().toLowerCase())
  );

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(typeof reader.result === 'string' ? reader.result : null);
      markDirty();
      toast.success('센터 로고 프리뷰가 적용되었습니다.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSelectAddress = (address: string) => {
    setCenterInfo((prev) => ({ ...prev, address }));
    markDirty();
    setIsAddressModalOpen(false);
    setAddressKeyword('');
    toast.success('센터 주소가 반영되었습니다.');
  };

  const activeImpactItems = (() => {
    if (activeTab === 'basic') {
      const items: ImpactItem[] = [];
      if (centerInfo.name !== savedCenterInfo.name) {
        items.push({ label: '센터명 변경', description: '대시보드, 영수증, 회원 안내 영역에 노출되는 센터명이 함께 바뀝니다.', severity: 'info' });
      }
      if (centerInfo.phone !== savedCenterInfo.phone || centerInfo.address !== savedCenterInfo.address) {
        items.push({ label: '연락처/주소 변경', description: '회원 안내 문구와 운영 문서의 기본 연락처 문맥이 갱신됩니다.', severity: 'info' });
      }
      if (centerInfo.openTime !== savedCenterInfo.openTime || centerInfo.closeTime !== savedCenterInfo.closeTime || centerInfo.weekendOpenTime !== savedCenterInfo.weekendOpenTime || centerInfo.weekendCloseTime !== savedCenterInfo.weekendCloseTime) {
        items.push({ label: '운영시간 변경', description: '출석 운영, 안내 문구, 예약 가능 시간 정책 검토가 필요합니다.', severity: 'warning' });
      }
      if (centerInfo.sectors.join('|') !== savedCenterInfo.sectors.join('|')) {
        items.push({ label: '업종 변경', description: '센터 소개, 기획 문맥, 상품/운영 분류 기준에 영향이 생길 수 있습니다.', severity: 'warning' });
      }
      return items;
    }

    if (activeTab === 'notification') {
      const enabledNow = Object.values(notifications).filter(Boolean).length;
      const enabledBefore = Object.values(savedNotifications).filter(Boolean).length;
      const changedKeys = Object.keys(notifications).filter((key) => notifications[key as keyof NotificationSettings] !== savedNotifications[key as keyof NotificationSettings]);
      return [
        ...(changedKeys.length > 0 ? [{
          label: '알림 정책 변경',
          description: `${changedKeys.length}개 항목이 바뀌며, 현재 활성 알림은 ${enabledNow}개입니다. 기존 ${enabledBefore}개와 차이를 확인하세요.`,
          severity: 'warning' as const,
        }] : []),
        ...((notifications.smsPayment !== savedNotifications.smsPayment || notifications.smsExpiry !== savedNotifications.smsExpiry) ? [{
          label: 'SMS 발송 영향',
          description: '자동 발송량과 발송 비용에 직접 영향을 주므로 운영 정책 확인이 필요합니다.',
          severity: 'warning' as const,
        }] : []),
      ];
    }

    if (activeTab === 'theme') {
      const items: ImpactItem[] = [];
      if (theme.mode !== savedTheme.mode) {
        items.push({ label: '테마 모드 변경', description: '전 직원의 관리자 화면 기본 모드가 달라집니다.', severity: 'info' });
      }
      if (theme.primaryColor !== savedTheme.primaryColor || theme.accentColor !== savedTheme.accentColor) {
        items.push({ label: '브랜드 색상 변경', description: '버튼, 배지, 선택 상태 등 핵심 액션 색상이 함께 바뀝니다.', severity: 'info' });
      }
      if (theme.fontSize !== savedTheme.fontSize) {
        items.push({ label: '글자 크기 변경', description: '운영자 전반의 가독성과 화면 밀도에 영향이 있습니다.', severity: 'info' });
      }
      return items;
    }

    const changedSupplyCount = (Object.keys(supplies) as (keyof SuppliesSettings)[]).filter((key) => {
      const current = supplies[key];
      const saved = savedSupplies[key];
      return current.stock !== saved.stock || current.dailyLimit !== saved.dailyLimit || current.remaining !== saved.remaining;
    }).length;

    return changedSupplyCount > 0 ? [
      {
        label: '물품 재고 변경',
        description: `${changedSupplyCount}개 품목의 재고 또는 일일 한도가 바뀌며, 현장 지급 기준과 재고 부족 경고에 영향이 있습니다.`,
        severity: 'warning' as const,
      },
    ] : [];
  })();

  // ── 기본정보 탭 ──
  const renderBasic = () => (
    <div className="space-y-lg">
      <FormSection title="센터 기본정보" description="센터의 대표 정보를 설정합니다." columns={2}>
        <div className="col-span-2 flex items-start gap-lg mb-md">
          <div className="relative group">
            <div className="w-[120px] h-[120px] bg-surface-secondary rounded-xl border border-dashed border-line flex flex-col items-center justify-center gap-xs overflow-hidden">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="센터 로고 프리뷰" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="text-content-secondary" size={28} />
                  <span className="text-Label text-content-secondary">센터 로고</span>
                </>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              variant="ghost"
              icon={<Plus size={22} />}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl"
              onClick={() => logoInputRef.current?.click()}
            />
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
              <Textarea
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
            <Button variant="outline" onClick={() => setIsAddressModalOpen(true)}>주소검색</Button>
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
                <div className="mb-lg rounded-2xl border border-line bg-surface-secondary/60 p-lg">
                  <div className="flex items-start justify-between gap-md">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Impact Preview</p>
                      <h2 className="mt-xs text-[18px] font-bold text-content">적용 영향도</h2>
                      <p className="mt-xs text-[13px] leading-relaxed text-content-secondary">
                        저장 전에 어떤 운영 흐름과 정책이 같이 바뀌는지 확인합니다.
                      </p>
                    </div>
                    <div className={cn(
                      "rounded-full px-sm py-xs text-[11px] font-semibold",
                      isDirty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {isDirty ? '변경 검토 필요' : '현재 저장본과 동일'}
                    </div>
                  </div>
                  <div className="mt-md space-y-sm">
                    {activeImpactItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-line bg-white/70 px-md py-md text-[13px] text-content-tertiary">
                        현재 탭에서 아직 운영 영향이 발생하는 변경은 없습니다.
                      </div>
                    ) : (
                      activeImpactItems.map((item) => (
                        <div key={item.label} className="rounded-xl border border-line bg-white/80 px-md py-md">
                          <div className="flex items-center gap-sm">
                            <span className={cn(
                              "rounded-full px-sm py-[3px] text-[11px] font-semibold",
                              item.severity === 'warning' ? "bg-amber-100 text-amber-700" :
                              item.severity === 'success' ? "bg-emerald-100 text-emerald-700" :
                              "bg-sky-100 text-sky-700"
                            )}>
                              {item.severity === 'warning' ? '검토' : item.severity === 'success' ? '안정' : '영향'}
                            </span>
                            <p className="text-[13px] font-semibold text-content">{item.label}</p>
                          </div>
                          <p className="mt-xs text-[12px] leading-relaxed text-content-secondary">{item.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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

      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setAddressKeyword('');
        }}
        title="주소 검색"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => {
              setIsAddressModalOpen(false);
              setAddressKeyword('');
            }}>
              닫기
            </Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="rounded-2xl border border-line bg-surface-secondary/60 p-md">
            <label className="text-Label text-content-secondary">도로명 또는 건물명을 입력하세요</label>
            <input
              className="mt-sm w-full rounded-input border border-line bg-white p-md outline-none transition-all focus:ring-1 focus:ring-accent"
              type="text"
              placeholder="예: 테헤란로 152"
              value={addressKeyword}
              onChange={(event) => setAddressKeyword(event.target.value)}
            />
          </div>
          <div className="space-y-sm">
            {filteredAddressCandidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface-secondary/40 px-md py-lg text-center text-sm text-content-secondary">
                검색 결과가 없습니다. 다른 키워드를 입력해 주세요.
              </div>
            ) : (
              filteredAddressCandidates.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => handleSelectAddress(candidate)}
                  className="w-full rounded-2xl border border-line bg-white px-md py-md text-left transition-colors hover:border-accent/40 hover:bg-accent-light/40"
                >
                  <p className="text-sm font-semibold text-content">주소 선택</p>
                  <p className="mt-xs text-sm text-content-secondary">{candidate}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
