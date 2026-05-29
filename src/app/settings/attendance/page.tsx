'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import FormSection from '@/components/common/FormSection';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Switch from '@/components/ui/Switch';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Save, AlertTriangle, ShieldAlert, Wifi, Undo2 } from 'lucide-react';

// 권한 데모: owner는 수정, manager는 조회 전용
type ViewerRole = 'owner' | 'manager';

interface AttendanceSettings {
  // 출석 인정 시간 (미설정 허용 → 빈 문자열)
  recognizeBefore: string;
  recognizeAfter: string;
  weekendHoliday: boolean;
  // 수업/회원 지각
  classLate: string;
  lateNoticeCount: string;
  lateNoticeReceiver: string;
  noShowGrace: string;
  // 직원 근태
  staffLateAllow: string; // 필수, 기본 10
  staffLateNoticeCount: string;
  staffLateReceiver: string;
  // QR
  qrEnabled: boolean;
  kioskQrShow: boolean;
  // 자동 출석
  autoAttendance: boolean;
  freeEntryAttendance: boolean;
  duplicatePolicy: string;
  // 보관
  retentionMonths: string; // 최소 12
}

const INITIAL: AttendanceSettings = {
  recognizeBefore: '10',
  recognizeAfter: '15',
  weekendHoliday: true,
  classLate: '10',
  lateNoticeCount: '3',
  lateNoticeReceiver: 'manager',
  noShowGrace: '30',
  staffLateAllow: '10',
  staffLateNoticeCount: '3',
  staffLateReceiver: 'owner',
  qrEnabled: true,
  kioskQrShow: true,
  autoAttendance: true,
  freeEntryAttendance: true,
  duplicatePolicy: 'first',
  retentionMonths: '24',
};

const RECEIVER_OPTIONS = [
  { value: 'member', label: '회원' },
  { value: 'manager', label: '관리자' },
  { value: 'owner', label: 'Owner(지점장)' },
];
const STAFF_RECEIVER_OPTIONS = [
  { value: 'owner', label: 'Owner(지점장)' },
  { value: 'manager', label: '매니저' },
  { value: 'self', label: '직원 본인' },
];
const DUP_OPTIONS = [
  { value: 'first', label: '첫 입장만 인정' },
  { value: 'each', label: '매 입장마다 인정' },
];

export default function AttendanceSettingsPage() {
  const [viewerRole, setViewerRole] = useState<ViewerRole>('owner');
  const [iotConnected] = useState(false); // IoT 미연결 데모
  const [settings, setSettings] = useState<AttendanceSettings>(INITIAL);
  const [dirty, setDirty] = useState(false);
  const [showLeaveWarn, setShowLeaveWarn] = useState(false);

  const canEdit = viewerRole === 'owner';
  const update = <K extends keyof AttendanceSettings>(key: K, value: AttendanceSettings[K]) => {
    setSettings((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  // ── 검증 ──
  const errors = useMemo(() => {
    const e: Partial<Record<keyof AttendanceSettings, string>> = {};
    const after = Number(settings.recognizeAfter);
    // 인정 시간 역순: 두 값 모두 있을 때만
    if (settings.recognizeBefore !== '' && settings.recognizeAfter !== '' && after < 0) {
      e.recognizeAfter = '인정 마감 > 시작 이어야 합니다';
    }
    // 수업 지각 > 인정 마감
    if (settings.classLate !== '' && settings.recognizeAfter !== '' && Number(settings.classLate) > after) {
      e.classLate = '수업 지각 판단 시간은 인정 마감 이내여야 합니다';
    }
    // 직원 지각 허용 시간 필수 + 음수
    if (settings.staffLateAllow === '') {
      e.staffLateAllow = '직원 지각 허용 시간을 입력해주세요';
    } else if (Number(settings.staffLateAllow) < 0) {
      e.staffLateAllow = '0분 이상 입력해주세요';
    }
    // 보관 기간 12개월 미만
    if (settings.retentionMonths !== '' && Number(settings.retentionMonths) < 12) {
      e.retentionMonths = '법정 최소 12개월 이상이어야 합니다';
    }
    return e;
  }, [settings]);

  const hasError = Object.keys(errors).length > 0;

  const handleSave = () => {
    if (!canEdit) {
      toast.error('이 작업을 수행할 권한이 없습니다');
      return;
    }
    if (hasError) {
      toast.error('입력값을 확인해주세요');
      return;
    }
    setDirty(false);
    toast.success('출석 관리 설정을 저장했습니다');
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="출석 관리 설정"
          description="회원·수업 출석 인정 기준과 직원 근태 자동 분류 기준을 설정합니다."
          actions={
            <div className="flex items-center gap-sm">
              <div className="flex items-center rounded-full border border-line/70 bg-white/70 p-[3px] text-[12px]">
                {(['owner', 'manager'] as ViewerRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setViewerRole(r)}
                    className={cn(
                      'rounded-full px-3 py-1 font-semibold transition-all',
                      viewerRole === r ? 'bg-primary text-white' : 'text-content-secondary'
                    )}
                  >
                    {r === 'owner' ? 'Owner(지점장)' : 'manager'}
                  </button>
                ))}
              </div>
              {canEdit && (
                <button
                  onClick={handleSave}
                  disabled={!dirty || hasError}
                  className="flex items-center gap-xs rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                >
                  <Save size={15} /> 저장
                </button>
              )}
            </div>
          }
        />

        {!canEdit && (
          <div className="flex items-center gap-sm rounded-2xl border border-amber-200 bg-amber-50 px-lg py-md text-[13px] text-amber-700">
            <ShieldAlert size={16} /> 매니저는 조회만 가능합니다. 설정 수정은 Owner(지점장)만 할 수 있습니다.
          </div>
        )}

        {settings.autoAttendance && !iotConnected && (
          <div className="flex items-center justify-between gap-sm rounded-2xl border border-amber-200 bg-amber-50 px-lg py-md text-[13px] text-amber-700">
            <span className="flex items-center gap-sm">
              <Wifi size={16} /> IoT 미연결: 자동 출석은 IoT 출입 기기 연결 후 동작합니다.
            </span>
            <a href="/settings/iot" className="font-semibold underline">
              IoT 출입 관리로 이동
            </a>
          </div>
        )}

        <div className={cn('max-w-3xl space-y-lg', !canEdit && 'pointer-events-none opacity-70')}>
          {/* 출석 인정 시간 */}
          <FormSection
            title="출석 인정 시간"
            description="회원·수업 출석 기준값은 미설정을 허용합니다. 미설정 항목은 자동 분류·자동 알림·자동 노쇼에서 제외되어 수동 처리 대상으로 남습니다."
            columns={2}
          >
            <div>
              <Input
                label="출석 인정 시작 (수업 시작 N분 전)"
                type="number"
                value={settings.recognizeBefore}
                onChange={(e) => update('recognizeBefore', e.target.value)}
                placeholder="미설정"
                hint="비워두면 자동 인정 보류"
              />
              {settings.recognizeBefore === '' && <StatusBadge className="mt-xs" variant="default" label="미설정" />}
            </div>
            <div>
              <Input
                label="출석 인정 마감 (수업 시작 N분 후)"
                type="number"
                value={settings.recognizeAfter}
                onChange={(e) => update('recognizeAfter', e.target.value)}
                placeholder="미설정"
                error={errors.recognizeAfter}
              />
              {settings.recognizeAfter === '' && !errors.recognizeAfter && (
                <StatusBadge className="mt-xs" variant="default" label="미설정" />
              )}
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-md py-sm md:col-span-2">
              <div>
                <p className="text-[13px] font-medium text-content">주말·공휴일 출석 인정</p>
                <p className="text-[12px] text-content-secondary">공휴일 캘린더 연동 정책에 따라 자동 출석 처리 여부를 결정합니다.</p>
              </div>
              <Switch checked={settings.weekendHoliday} onChange={(v) => update('weekendHoliday', v)} />
            </div>
          </FormSection>

          {/* 수업/회원 지각 기준 */}
          <FormSection title="수업·회원 지각 기준" columns={2}>
            <div>
              <Input
                label="수업 지각 판단 시간 (시작 후 N분)"
                type="number"
                value={settings.classLate}
                onChange={(e) => update('classLate', e.target.value)}
                placeholder="미설정"
                error={errors.classLate}
              />
            </div>
            <div>
              <Input
                label="지각 누적 알림 기준 (집계 기간 내 N회 초과)"
                type="number"
                value={settings.lateNoticeCount}
                onChange={(e) => update('lateNoticeCount', e.target.value)}
                placeholder="미설정"
              />
            </div>
            <div>
              <Select
                label="지각 알림 수신자"
                options={RECEIVER_OPTIONS}
                value={settings.lateNoticeReceiver}
                onChange={(v) => update('lateNoticeReceiver', v)}
              />
            </div>
            <div>
              <Input
                label="노쇼 판단 유예 (인정 마감 후 N분)"
                type="number"
                value={settings.noShowGrace}
                onChange={(e) => update('noShowGrace', e.target.value)}
                placeholder="미설정"
                hint="기본 30분, 미설정 시 자동 노쇼 보류"
              />
            </div>
          </FormSection>

          {/* 직원 근태 기준 */}
          <FormSection
            title="직원 근태 기준"
            description="저장 이후 신규 출퇴근 기록부터 적용되며 과거 기록은 소급 변경하지 않습니다. D07 직원 근태 관리의 자동 분류 기준과 연동됩니다."
            columns={2}
          >
            <div>
              <Input
                label="직원 지각 허용 시간 (분, 필수)"
                type="number"
                value={settings.staffLateAllow}
                onChange={(e) => update('staffLateAllow', e.target.value)}
                error={errors.staffLateAllow}
                hint="기본 10분. 정규 출근 + 허용시간 초과부터 지각"
              />
              {!settings.staffLateAllow && !errors.staffLateAllow && (
                <p className="mt-xs flex items-center gap-xs text-[11px] text-state-error">
                  <AlertTriangle size={12} /> 직원 지각 자동 분류가 보류됩니다.
                </p>
              )}
            </div>
            <div>
              <Input
                label="직원 지각 누적 알림 기준 (기간 내 N회 초과)"
                type="number"
                value={settings.staffLateNoticeCount}
                onChange={(e) => update('staffLateNoticeCount', e.target.value)}
              />
            </div>
            <div>
              <Select
                label="직원 지각 알림 수신자"
                options={STAFF_RECEIVER_OPTIONS}
                value={settings.staffLateReceiver}
                onChange={(v) => update('staffLateReceiver', v)}
              />
            </div>
          </FormSection>

          {/* QR 출석 설정 */}
          <FormSection
            title="QR 출석"
            description="QR 출석은 출석 수단 옵션과 노출 여부만 관리합니다. 발급·토큰 만료·검증 정책은 이 화면에서 다루지 않습니다."
            columns={2}
          >
            <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-md py-sm">
              <p className="text-[13px] font-medium text-content">QR 출석 사용</p>
              <Switch
                checked={settings.qrEnabled}
                onChange={(v) => {
                  update('qrEnabled', v);
                  if (!v) update('kioskQrShow', false);
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-md py-sm">
              <div>
                <p className="text-[13px] font-medium text-content">키오스크 QR 표시</p>
                {!settings.qrEnabled && <p className="text-[11px] text-content-secondary">QR 출석 사용을 먼저 켜주세요</p>}
              </div>
              <Switch checked={settings.kioskQrShow} onChange={(v) => update('kioskQrShow', v)} disabled={!settings.qrEnabled} />
            </div>
          </FormSection>

          {/* 자동 출석 규칙 */}
          <FormSection title="자동 출석 규칙" columns={2}>
            <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-md py-sm">
              <div>
                <p className="text-[13px] font-medium text-content">자동 출석 처리</p>
                <p className="text-[12px] text-content-secondary">IoT 출입 기록 기반 자동 출석 인정</p>
              </div>
              <Switch checked={settings.autoAttendance} onChange={(v) => update('autoAttendance', v)} />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-md py-sm">
              <div>
                <p className="text-[13px] font-medium text-content">자유 이용 입장 출석 인정</p>
                <p className="text-[12px] text-content-secondary">수업 없이 입장 시에도 출석으로 인정</p>
              </div>
              <Switch checked={settings.freeEntryAttendance} onChange={(v) => update('freeEntryAttendance', v)} />
            </div>
            <div className="md:col-span-2">
              <Select
                label="동일 회원 출석 중복 처리"
                options={DUP_OPTIONS}
                value={settings.duplicatePolicy}
                onChange={(v) => update('duplicatePolicy', v)}
              />
            </div>
          </FormSection>

          {/* 보관 설정 */}
          <FormSection title="출석 기록 보관" columns={2}>
            <div>
              <Input
                label="출석 이력 보관 기간 (개월)"
                type="number"
                value={settings.retentionMonths}
                onChange={(e) => update('retentionMonths', e.target.value)}
                error={errors.retentionMonths}
                hint="법정 최소 12개월"
              />
            </div>
          </FormSection>
        </div>
      </div>

      {/* DLG-080-001 미저장 경고 */}
      <ConfirmDialog
        open={showLeaveWarn}
        title="저장하지 않은 변경 사항이 있습니다"
        description={'변경한 설정이 저장되지 않았습니다.\n저장하지 않고 이동하시겠습니까?'}
        confirmLabel="이동"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => {
          setShowLeaveWarn(false);
          setDirty(false);
        }}
        onCancel={() => setShowLeaveWarn(false)}
      />

      {/* 미저장 상태 데모 트리거 (페이지 이탈 가드 대체) */}
      {dirty && (
        <button
          onClick={() => setShowLeaveWarn(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-xs rounded-full border border-line bg-white px-md py-sm text-[12px] text-content-secondary shadow-card hover:bg-surface-secondary"
        >
          <Undo2 size={13} /> 변경 취소
        </button>
      )}
    </AppLayout>
  );
}
