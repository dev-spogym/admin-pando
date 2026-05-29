'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import TabNav from '@/components/common/TabNav';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Switch from '@/components/ui/Switch';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  HardDrive, Download, RotateCcw, Settings2, AlertTriangle, CheckCircle, ShieldAlert,
} from 'lucide-react';
import {
  BACKUP_RECORDS, RESTORE_RECORDS, type BackupRecord, type BackupStatus,
} from '@/mocks/settings';

// 권한 데모: 슈퍼관리자는 복원·다운로드, owner는 백업만(복원은 승인 필요)
type ViewerRole = 'super' | 'owner';

const STATUS_META: Record<BackupStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
  completed: { label: '완료', variant: 'success' },
  running: { label: '진행 중', variant: 'info' },
  failed: { label: '실패', variant: 'error' },
  corrupted: { label: '손상', variant: 'warning' },
};

const HISTORY_TABS = [
  { key: 'backup', label: '백업 이력' },
  { key: 'restore', label: '복원 이력' },
];
const PERIOD_TABS = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'custom', label: '사용자 지정' },
];

export default function BackupPage() {
  const [viewerRole, setViewerRole] = useState<ViewerRole>('super');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('ready');
  const [historyTab, setHistoryTab] = useState('backup');
  const [period, setPeriod] = useState('month');
  const [backingUp, setBackingUp] = useState(false);

  // 백업 설정 (DLG-089-002)
  const [showSettings, setShowSettings] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [runTime, setRunTime] = useState('03:30');
  const [retention, setRetention] = useState('90');
  const [autoOffConfirm, setAutoOffConfirm] = useState(false);

  // 복원 (DLG-089-001)
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [restoreReason, setRestoreReason] = useState('');

  const isSuper = viewerRole === 'super';
  const storageOver = false; // 100GB 초과 데모

  const handleBackupNow = () => {
    setBackingUp(true);
    toast.success('수동 백업을 시작했습니다. 완료되면 이력에 반영됩니다');
    setTimeout(() => setBackingUp(false), 1500);
  };

  const handleDownload = (rec: BackupRecord) => {
    if (!isSuper) {
      toast.error('백업 다운로드는 슈퍼관리자만 가능합니다');
      return;
    }
    toast.success('다운로드 링크를 발급했습니다. 1시간 후 만료됩니다');
  };

  const openRestore = (rec: BackupRecord) => {
    if (rec.status === 'corrupted') {
      toast.error('손상된 백업입니다. 다른 시점을 사용하세요');
      return;
    }
    if (!isSuper) {
      toast.info('복원은 슈퍼관리자 승인이 필요합니다. 승인 요청을 보냈습니다');
      return;
    }
    setRestoreReason('');
    setRestoreTarget(rec);
  };

  const confirmRestore = () => {
    if (!restoreReason.trim()) {
      toast.error('복원 사유를 입력해주세요');
      return;
    }
    toast.success('복원을 시작했습니다. 완료 후 자동으로 재시작됩니다');
    setRestoreTarget(null);
  };

  const saveSettings = () => {
    setShowSettings(false);
    toast.success('백업 설정을 저장했습니다');
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="데이터 백업·복원"
          description="센터 운영 데이터를 안전하게 보관하고 필요 시 이전 시점으로 복원합니다."
          actions={
            <div className="flex items-center gap-sm">
              <div className="flex items-center rounded-full border border-line/70 bg-white/70 p-[3px] text-[12px]">
                {(['super', 'owner'] as ViewerRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setViewerRole(r)}
                    className={cn(
                      'rounded-full px-3 py-1 font-semibold transition-all',
                      viewerRole === r ? 'bg-primary text-white' : 'text-content-secondary'
                    )}
                  >
                    {r === 'super' ? '슈퍼관리자' : 'Owner(지점장)'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-xs rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary"
              >
                <Settings2 size={15} /> 백업 설정
              </button>
              <button
                onClick={handleBackupNow}
                disabled={backingUp}
                className="flex items-center gap-xs rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              >
                <HardDrive size={15} /> {backingUp ? '백업 중...' : '지금 백업'}
              </button>
            </div>
          }
        />

        {!isSuper && (
          <div className="flex items-center gap-sm rounded-2xl border border-amber-200 bg-amber-50 px-lg py-md text-[13px] text-amber-700">
            <ShieldAlert size={16} /> Owner(지점장)은 백업 조회·수동 백업만 가능합니다. 복원과 다운로드는 슈퍼관리자 승인이 필요합니다.
          </div>
        )}

        {storageOver && (
          <div className="flex items-center gap-sm rounded-2xl border border-red-200 bg-red-50 px-lg py-md text-[13px] text-state-error">
            <AlertTriangle size={16} /> 스토리지 용량 경고: 100GB를 초과했습니다. 보관 기간을 단축하거나 불필요한 파일을 삭제하세요.
          </div>
        )}

        {!autoBackup && (
          <div className="flex items-center gap-sm rounded-2xl border border-line/70 bg-surface-secondary px-lg py-md text-[13px] text-content-secondary">
            자동 백업이 꺼져 있습니다. 수동 백업과 복원 이력은 유지되지만 자동 실행 예정 정보는 표시되지 않습니다.
          </div>
        )}

        <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
          <StatCard label="마지막 백업" value="오늘 03:30" icon={<CheckCircle />} variant="mint" />
          <StatCard label="백업 파일 수" value="30개" icon={<HardDrive />} />
          <StatCard label="총 백업 용량" value="82GB" icon={<HardDrive />} variant="peach" />
          <StatCard label="보관 기간" value={`${retention}일`} icon={<RotateCcw />} />
        </div>

        {/* 이력 */}
        <section className="relative overflow-hidden rounded-[24px] border border-line/70 bg-white/82 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-sm border-b border-line/70 px-lg py-md">
            <TabNav tabs={HISTORY_TABS} activeTab={historyTab} onTabChange={setHistoryTab} className="border-0 bg-transparent p-0 shadow-none" />
            <TabNav tabs={PERIOD_TABS} activeTab={period} onTabChange={setPeriod} className="border-0 bg-surface-secondary p-1" />
          </div>

          {loadState === 'loading' ? (
            <div className="space-y-sm p-lg">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-secondary" />
              ))}
            </div>
          ) : loadState === 'error' ? (
            <EmptyState
              icon={AlertTriangle}
              title="이력을 불러오지 못했습니다"
              description="일시적으로 처리하지 못했습니다. 다시 시도해주세요."
              action={{ label: '다시 시도', onClick: () => setLoadState('ready') }}
            />
          ) : historyTab === 'backup' ? (
            BACKUP_RECORDS.length === 0 ? (
              <EmptyState
                icon={HardDrive}
                title="백업 이력이 없습니다"
                description="첫 백업을 실행해 데이터를 안전하게 보관하세요."
                action={{ label: '지금 백업 실행', onClick: handleBackupNow }}
              />
            ) : (
              <div className="divide-y divide-line/50">
                {BACKUP_RECORDS.map((rec) => {
                  const meta = STATUS_META[rec.status];
                  const restorable = rec.status === 'completed';
                  return (
                    <div key={rec.id} className="flex items-center justify-between gap-md px-lg py-md">
                      <div className="flex items-center gap-md">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-tertiary text-content-secondary">
                          <HardDrive size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-xs">
                            <p className="font-semibold text-content">{rec.name}</p>
                            <StatusBadge variant={rec.type === 'auto' ? 'default' : 'info'} label={rec.type === 'auto' ? '자동' : '수동'} />
                            <StatusBadge variant={meta.variant} label={meta.label} />
                          </div>
                          <p className="mt-xs text-[12px] text-content-secondary">{rec.createdAt} · {rec.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-xs">
                        <button
                          onClick={() => handleDownload(rec)}
                          className="flex items-center gap-xs rounded-button px-sm py-xs text-[12px] text-content-secondary hover:bg-surface-secondary hover:text-primary"
                        >
                          <Download size={14} /> 다운로드
                        </button>
                        <button
                          onClick={() => openRestore(rec)}
                          disabled={!restorable}
                          className="flex items-center gap-xs rounded-button px-sm py-xs text-[12px] text-content-secondary hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                          title={rec.status === 'corrupted' ? '손상된 백업은 복원할 수 없습니다' : undefined}
                        >
                          <RotateCcw size={14} /> 복원
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : RESTORE_RECORDS.length === 0 ? (
            <EmptyState icon={RotateCcw} title="복원 이력이 없습니다" description="과거 복원 실행 내역이 여기에 표시됩니다." />
          ) : (
            <div className="divide-y divide-line/50">
              {RESTORE_RECORDS.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between gap-md px-lg py-md">
                  <div className="flex items-center gap-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-tertiary text-content-secondary">
                      <RotateCcw size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-content">복원 실행 · {rec.restoredAt}</p>
                      <p className="mt-xs text-[12px] text-content-secondary">복원 시점: {rec.backupPoint} · 실행자: {rec.executor}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-start gap-xs rounded-2xl border border-amber-200 bg-amber-50 px-lg py-md text-[12px] text-amber-700">
          <AlertTriangle size={14} className="mt-[2px] shrink-0" />
          복원은 현재 데이터를 덮어쓰는 되돌릴 수 없는 작업입니다. 진행 중 트랜잭션이 있으면 취소될 수 있습니다.
        </div>
      </div>

      {/* DLG-089-002 백업 설정 */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="백업 설정"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button onClick={() => setShowSettings(false)} className="rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary">
              취소
            </button>
            <button onClick={saveSettings} className="rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white hover:opacity-90">
              저장
            </button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-md py-sm">
            <div>
              <p className="text-[13px] font-medium text-content">자동 백업</p>
              <p className="text-[12px] text-content-secondary">정해진 주기에 자동으로 백업을 실행합니다.</p>
            </div>
            <Switch
              checked={autoBackup}
              onChange={(v) => {
                if (!v) setAutoOffConfirm(true);
                else setAutoBackup(true);
              }}
            />
          </div>
          <Select
            label="백업 주기"
            options={[
              { value: 'daily', label: '매일' },
              { value: 'weekly', label: '매주' },
              { value: 'monthly', label: '매월' },
            ]}
            value={frequency}
            onChange={setFrequency}
            disabled={!autoBackup}
          />
          <Input label="백업 실행 시각" type="time" value={runTime} onChange={(e) => setRunTime(e.target.value)} disabled={!autoBackup} />
          <Select
            label="보관 기간"
            options={[
              { value: '30', label: '30일' },
              { value: '90', label: '90일' },
              { value: '180', label: '180일' },
              { value: '0', label: '무제한' },
            ]}
            value={retention}
            onChange={(v) => {
              if (Number(v) > 0 && Number(v) < Number(retention)) {
                toast.warning('보관 기간 단축 시 초과 백업 파일이 즉시 삭제됩니다');
              }
              setRetention(v);
            }}
          />
        </div>
      </Modal>

      {/* 자동 백업 OFF 경고 */}
      <ConfirmDialog
        open={autoOffConfirm}
        title="자동 백업을 끄시겠습니까?"
        description="자동 백업을 끄면 데이터 손실 위험이 커집니다. 계속하시겠습니까?"
        confirmLabel="끄기"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => { setAutoBackup(false); setAutoOffConfirm(false); }}
        onCancel={() => setAutoOffConfirm(false)}
      />

      {/* DLG-089-001 데이터 복원 확인 */}
      <Modal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="데이터를 복원하시겠습니까?"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button onClick={() => setRestoreTarget(null)} className="rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary">
              취소
            </button>
            <button onClick={confirmRestore} className="rounded-button bg-state-error px-lg py-sm text-[13px] font-bold text-white hover:opacity-90">
              복원 진행
            </button>
          </div>
        }
      >
        {restoreTarget && (
          <div className="space-y-md">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-md py-sm text-[12px] text-amber-700">
              <p className="font-semibold">복원 대상: {restoreTarget.createdAt}</p>
              <p className="mt-xs">복원하면 현재 데이터를 덮어쓰며 되돌릴 수 없습니다. 진행 중인 트랜잭션이 있으면 취소됩니다.</p>
            </div>
            <Input
              label="복원 사유 (필수)"
              value={restoreReason}
              onChange={(e) => setRestoreReason(e.target.value)}
              placeholder="복원 사유를 입력하세요"
            />
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
