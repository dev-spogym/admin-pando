'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import FormSection from '@/components/common/FormSection';
import Select from '@/components/ui/Select';
import Switch from '@/components/ui/Switch';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Save, Globe, Check, AlertTriangle, Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES, TRANSLATION_STATS } from '@/mocks/settings';
import { loadBranchSetting, saveBranchSetting } from '@/lib/branchSettings';

const TIMEZONES = [
  { value: 'Asia/Seoul', label: 'Asia/Seoul (UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
];
const DATE_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'];
const TIME_FORMATS = [
  { value: '24h', label: '24시간제' },
  { value: '12h', label: '12시간제' },
];
const CURRENCIES = [
  { value: 'KRW', label: '₩ KRW' },
  { value: 'USD', label: '$ USD' },
  { value: 'JPY', label: '¥ JPY' },
  { value: 'CNY', label: '¥ CNY' },
];

export default function LanguageSettingsPage() {
  const [adminLang, setAdminLang] = useState('ko');
  const [kioskLangs, setKioskLangs] = useState<string[]>(['ko', 'en']);
  const [kioskDefault, setKioskDefault] = useState('ko');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('24h');
  const [currency, setCurrency] = useState('KRW');
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [autoTranslate, setAutoTranslate] = useState(true);

  const [dirty, setDirty] = useState(false);
  const [showLeaveWarn, setShowLeaveWarn] = useState(false);
  const [tzConfirm, setTzConfirm] = useState<string | null>(null);
  const [autoTransConfirm, setAutoTransConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadBranchSetting('language_region_settings', {
      adminLang,
      kioskLangs,
      kioskDefault,
      dateFormat,
      timeFormat,
      currency,
      timezone,
      autoTranslate,
    }).then((saved: any) => {
      if (!mounted) return;
      setAdminLang(saved.adminLang ?? 'ko');
      setKioskLangs(saved.kioskLangs ?? ['ko', 'en']);
      setKioskDefault(saved.kioskDefault ?? 'ko');
      setDateFormat(saved.dateFormat ?? 'YYYY-MM-DD');
      setTimeFormat(saved.timeFormat ?? '24h');
      setCurrency(saved.currency ?? 'KRW');
      setTimezone(saved.timezone ?? 'Asia/Seoul');
      setAutoTranslate(saved.autoTranslate ?? true);
      setDirty(false);
    });
    return () => { mounted = false; };
  }, []);

  const markDirty = () => setDirty(true);

  const untranslated = useMemo(
    () => TRANSLATION_STATS.reduce((a, s) => a + (s.total - s.translated), 0),
    []
  );

  const toggleKioskLang = (code: string) => {
    if (kioskLangs.includes(code)) {
      // 기본 언어 비활성화 차단
      if (code === kioskDefault) {
        toast.error('기본 언어는 비활성화할 수 없습니다. 먼저 기본 언어를 변경하세요');
        return;
      }
      // 최소 1개 언어 필요
      if (kioskLangs.length === 1) {
        toast.error('키오스크 언어는 최소 1개가 필요합니다');
        return;
      }
      setKioskLangs((prev) => prev.filter((c) => c !== code));
    } else {
      setKioskLangs((prev) => [...prev, code]);
    }
    markDirty();
  };

  const handleSave = async () => {
    const error = await saveBranchSetting('language_region_settings', {
      adminLang,
      kioskLangs,
      kioskDefault,
      dateFormat,
      timeFormat,
      currency,
      timezone,
      autoTranslate,
    });
    if (error) {
      toast.error(`언어·지역 설정 저장 실패: ${error}`);
      return;
    }
    setDirty(false);
    toast.success('언어·지역 설정을 저장했습니다');
  };

  const applyTimezone = () => {
    if (tzConfirm) {
      setTimezone(tzConfirm);
      markDirty();
      setTzConfirm(null);
      toast.success('시간대를 변경했습니다');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="다국어 설정"
          description="관리자·키오스크 화면 표시 언어와 국가·지역 표시 형식을 설정합니다."
          actions={
            <button
              onClick={handleSave}
              disabled={!dirty}
              className="flex items-center gap-xs rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            >
              <Save size={15} /> 저장
            </button>
          }
        />

        {untranslated > 0 && (
          <div className="flex items-center gap-sm rounded-2xl border border-amber-200 bg-amber-50 px-lg py-md text-[13px] text-amber-700">
            <AlertTriangle size={16} /> {untranslated}개 키 미번역 — 키오스크 노출 전 번역 데이터를 보완하세요.
          </div>
        )}

        <div className="max-w-3xl space-y-lg">
          {/* 시스템 언어 */}
          <FormSection title="시스템 언어" columns={1}>
            <div className="col-span-full space-y-md">
              {/* 관리자 화면 언어 (단일) */}
              <div>
                <p className="mb-sm text-[12px] font-medium text-content-secondary">관리자 화면 언어 (단일 선택)</p>
                <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setAdminLang(lang.code); markDirty(); }}
                      className={cn(
                        'flex items-center justify-between rounded-2xl border-2 px-md py-sm text-left transition-all',
                        adminLang === lang.code ? 'border-primary bg-primary-light' : 'border-line/70 hover:border-primary/40'
                      )}
                    >
                      <span className="flex items-center gap-sm">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-[13px] font-medium text-content">{lang.name}</span>
                      </span>
                      {adminLang === lang.code && <Check size={15} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 키오스크 화면 언어 (복수) */}
              <div>
                <p className="mb-sm text-[12px] font-medium text-content-secondary">키오스크 화면 언어 (복수 선택)</p>
                <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const active = kioskLangs.includes(lang.code);
                    const isDefault = kioskDefault === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => toggleKioskLang(lang.code)}
                        className={cn(
                          'flex items-center justify-between rounded-2xl border-2 px-md py-sm text-left transition-all',
                          active ? 'border-accent bg-accent-light' : 'border-line/70 hover:border-accent/40'
                        )}
                      >
                        <span className="flex items-center gap-sm">
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-[13px] font-medium text-content">{lang.name}</span>
                        </span>
                        {isDefault ? <StatusBadge variant="mint" label="기본" /> : active && <Check size={15} className="text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 키오스크 기본 언어 */}
              <Select
                label="키오스크 기본 표시 언어"
                options={kioskLangs.map((code) => {
                  const l = SUPPORTED_LANGUAGES.find((x) => x.code === code)!;
                  return { value: code, label: `${l.flag} ${l.name}` };
                })}
                value={kioskDefault}
                onChange={(v) => { setKioskDefault(v); markDirty(); }}
              />
            </div>
          </FormSection>

          {/* 국가·지역 */}
          <FormSection title="국가·지역" columns={2}>
            <Select
              label="시간대"
              options={TIMEZONES}
              value={timezone}
              onChange={(v) => setTzConfirm(v)}
              hint="변경 시 기존 예약 시각이 재표시됩니다"
            />
            <div>
              <p className="mb-xs text-[12px] font-medium text-content-secondary">날짜 표시 형식</p>
              <div className="flex flex-wrap gap-xs">
                {DATE_FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setDateFormat(f); markDirty(); }}
                    className={cn(
                      'rounded-xl border px-md py-sm text-[12px] transition-all',
                      dateFormat === f ? 'border-primary bg-primary-light font-semibold text-primary' : 'border-line/70 text-content-secondary hover:bg-surface-secondary'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-xs text-[12px] font-medium text-content-secondary">시간 표시 형식</p>
              <div className="flex gap-xs">
                {TIME_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setTimeFormat(f.value); markDirty(); }}
                    className={cn(
                      'rounded-xl border px-md py-sm text-[12px] transition-all',
                      timeFormat === f.value ? 'border-primary bg-primary-light font-semibold text-primary' : 'border-line/70 text-content-secondary hover:bg-surface-secondary'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Select label="화폐 단위" options={CURRENCIES} value={currency} onChange={(v) => { setCurrency(v); markDirty(); }} />
              <p className="mt-xs text-[11px] text-content-tertiary">표시에만 영향을 주며 데이터는 변경되지 않습니다.</p>
            </div>
          </FormSection>

          {/* 자동 번역 */}
          <FormSection title="자동 번역" columns={1}>
            <div className="col-span-full flex items-center justify-between rounded-2xl bg-surface-secondary px-md py-sm">
              <div>
                <p className="text-[13px] font-medium text-content">공지사항 자동 번역</p>
                <p className="text-[12px] text-content-secondary">활성 시 외부 번역 서비스와 연동해 신규 공지를 번역합니다.</p>
              </div>
              <Switch
                checked={autoTranslate}
                onChange={(v) => {
                  if (!v) {
                    setAutoTransConfirm(true);
                  } else {
                    setAutoTranslate(true);
                    markDirty();
                  }
                }}
              />
            </div>
          </FormSection>

          {/* 번역 키 관리 */}
          <FormSection title="번역 키 관리" columns={1}>
            <div className="col-span-full overflow-hidden rounded-2xl border border-line/70">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line/70 bg-surface-secondary text-left text-[12px] text-content-secondary">
                    <th className="px-md py-sm font-medium">언어</th>
                    <th className="px-md py-sm font-medium">번역 / 전체</th>
                    <th className="px-md py-sm text-right font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSLATION_STATS.map((s) => {
                    const missing = s.total - s.translated;
                    return (
                      <tr key={s.language} className="border-b border-line/50 last:border-0">
                        <td className="px-md py-sm text-content">{s.language}</td>
                        <td className="px-md py-sm text-content-secondary">{s.translated} / {s.total}</td>
                        <td className="px-md py-sm text-right">
                          {missing === 0 ? <StatusBadge variant="success" label="완료" /> : <StatusBadge variant="warning" label={`${missing}개 미번역`} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </FormSection>

          <div className="flex items-start gap-xs rounded-2xl border border-blue-200 bg-blue-50 px-lg py-md text-[12px] text-state-info">
            <Globe size={14} className="mt-[2px] shrink-0" />
            관리자 화면 언어를 변경해 저장하면 i18n 번들이 새로 로드되며 화면이 선택한 언어로 전환됩니다. 키오스크 언어는 연결된 기기에 즉시 푸시됩니다.
          </div>
        </div>
      </div>

      {/* 타임존 변경 확인 */}
      <ConfirmDialog
        open={!!tzConfirm}
        title="시간대를 변경하시겠습니까?"
        description="기존 예약 시각이 새 시간대 기준으로 재표시됩니다."
        confirmLabel="변경"
        cancelLabel="취소"
        onConfirm={applyTimezone}
        onCancel={() => setTzConfirm(null)}
      />

      {/* 자동 번역 OFF 확인 */}
      <ConfirmDialog
        open={autoTransConfirm}
        title="자동 번역을 끄시겠습니까?"
        description="기존 번역본은 유지되지만 신규 공지는 번역되지 않습니다."
        confirmLabel="끄기"
        cancelLabel="취소"
        onConfirm={() => {
          setAutoTranslate(false);
          setAutoTransConfirm(false);
          markDirty();
        }}
        onCancel={() => setAutoTransConfirm(false)}
      />

      {/* DLG-080-001 미저장 경고 */}
      <ConfirmDialog
        open={showLeaveWarn}
        title="저장하지 않은 변경 사항이 있습니다"
        description={'변경한 설정이 저장되지 않았습니다.\n저장하지 않고 이동하시겠습니까?'}
        confirmLabel="이동"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => { setShowLeaveWarn(false); setDirty(false); }}
        onCancel={() => setShowLeaveWarn(false)}
      />

      {dirty && (
        <button
          onClick={() => setShowLeaveWarn(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-xs rounded-full border border-line bg-white px-md py-sm text-[12px] text-content-secondary shadow-card hover:bg-surface-secondary"
        >
          <Languages size={13} /> 변경 취소
        </button>
      )}
    </AppLayout>
  );
}
