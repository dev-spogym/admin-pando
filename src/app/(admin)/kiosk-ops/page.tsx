'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, MonitorCog, Power, RefreshCw, WifiOff } from 'lucide-react';

type KioskStatus = '정상' | '오프라인' | '오류';

interface KioskDevice {
  name: string;
  branch: string;
  status: KioskStatus;
  lastSeen: string;
  mode: string;
  issue: string;
}

const kiosks: KioskDevice[] = [
  { name: '1층 입구 키오스크', branch: '강남점', status: '정상', lastSeen: '방금 전', mode: '출입+출석', issue: '-' },
  { name: 'PT존 태블릿', branch: '강남점', status: '오프라인', lastSeen: '18분 전', mode: '수업 체크인', issue: '네트워크 끊김' },
  { name: '골프존 키오스크', branch: '잠실점', status: '오류', lastSeen: '5분 전', mode: '타석 체크인', issue: '앱 업데이트 실패' },
  { name: '프런트 보조 태블릿', branch: '분당점', status: '정상', lastSeen: '1분 전', mode: '수동 출석', issue: '-' },
];

const statusStyle: Record<string, string> = {
  정상: 'bg-emerald-100 text-emerald-700',
  오프라인: 'bg-slate-100 text-slate-600',
  오류: 'bg-red-100 text-red-700',
};

const statusIcon: Record<string, React.ReactNode> = {
  정상: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  오프라인: <WifiOff className="h-4 w-4 text-slate-500" />,
  오류: <AlertTriangle className="h-4 w-4 text-red-600" />,
};

export default function KioskOpsPage() {
  const [filter, setFilter] = useState('전체');
  const [devices, setDevices] = useState(kiosks);
  const [selectedDevice, setSelectedDevice] = useState<KioskDevice | null>(null);
  const [deviceToRestart, setDeviceToRestart] = useState<KioskDevice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const filtered = filter === '전체' ? devices : devices.filter((kiosk) => kiosk.status === filter);

  const refreshStatuses = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((device) => {
          if (device.status === '오프라인') {
            return { ...device, lastSeen: '2분 전', issue: '네트워크 재연결 확인 필요' };
          }
          if (device.status === '오류') {
            return { ...device, lastSeen: '방금 전', issue: '업데이트 재시도 대기' };
          }
          return { ...device, lastSeen: '방금 전' };
        })
      );
      setIsRefreshing(false);
      toast.success('키오스크 상태를 새로고침했습니다.');
    }, 500);
  };

  const handleRestart = () => {
    if (!deviceToRestart) return;
    setDevices((prev) =>
      prev.map((device) =>
        device.name === deviceToRestart.name && device.branch === deviceToRestart.branch
          ? { ...device, status: '정상', issue: '-', lastSeen: '방금 전' }
          : device
      )
    );
    setSelectedDevice((prev) =>
      prev && prev.name === deviceToRestart.name && prev.branch === deviceToRestart.branch
        ? { ...prev, status: '정상', issue: '-', lastSeen: '방금 전' }
        : prev
    );
    toast.success(`${deviceToRestart.name} 원격 재시작을 완료했습니다.`);
    setDeviceToRestart(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="키오스크 운영 현황"
        description="현장 키오스크와 태블릿의 온라인 상태, 오류, 운영 모드를 확인합니다"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />} onClick={refreshStatuses}>
            상태 새로고침
          </Button>
        }
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        퍼블리싱 완료 / 데이터 미연동: 실제 기기 heartbeat와 장애 이벤트는 후속 연동 대상입니다.
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: '전체 기기', value: devices.length, icon: MonitorCog, tone: 'text-blue-600 bg-blue-50' },
          { label: '정상', value: devices.filter((kiosk) => kiosk.status === '정상').length, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: '오프라인', value: devices.filter((kiosk) => kiosk.status === '오프라인').length, icon: WifiOff, tone: 'text-slate-600 bg-slate-50' },
          { label: '오류', value: devices.filter((kiosk) => kiosk.status === '오류').length, icon: AlertTriangle, tone: 'text-red-600 bg-red-50' },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setFilter(card.label === '전체 기기' ? '전체' : card.label)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              (filter === '전체' && card.label === '전체 기기') || filter === card.label
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`mb-3 inline-flex rounded-lg p-2 ${card.tone}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}대</p>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">기기 상태 목록</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-5 py-3 text-left font-medium">기기명</th>
              <th className="px-5 py-3 text-left font-medium">지점</th>
              <th className="px-5 py-3 text-left font-medium">상태</th>
              <th className="px-5 py-3 text-left font-medium">운영 모드</th>
              <th className="px-5 py-3 text-left font-medium">최근 신호</th>
              <th className="px-5 py-3 text-left font-medium">조치</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((kiosk) => (
              <tr key={`${kiosk.branch}-${kiosk.name}`} className={kiosk.status !== '정상' ? 'bg-red-50/40' : undefined}>
                <td className="px-5 py-4 font-semibold text-gray-900">
                  <button type="button" onClick={() => setSelectedDevice(kiosk)} className="text-left hover:text-blue-700">
                    {kiosk.name}
                  </button>
                </td>
                <td className="px-5 py-4 text-gray-700">{kiosk.branch}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[kiosk.status]}`}>
                    {statusIcon[kiosk.status]} {kiosk.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">{kiosk.mode}</td>
                <td className="px-5 py-4 text-gray-500">{kiosk.lastSeen}</td>
                <td className="px-5 py-4">
                  <button type="button" onClick={() => setDeviceToRestart(kiosk)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    <Power className="h-3.5 w-3.5" /> 원격 재시작
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Modal
        isOpen={selectedDevice !== null}
        onClose={() => setSelectedDevice(null)}
        title="기기 상세 현황"
        size="lg"
        footer={
          selectedDevice ? (
            <div className="flex justify-end gap-sm">
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>닫기</Button>
              <Button icon={<Power className="h-4 w-4" />} onClick={() => setDeviceToRestart(selectedDevice)}>원격 재시작</Button>
            </div>
          ) : null
        }
      >
        {selectedDevice && (
          <div className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
                <p className="text-xs text-content-secondary">기기명</p>
                <p className="mt-xs text-sm font-semibold text-content">{selectedDevice.name}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
                <p className="text-xs text-content-secondary">지점</p>
                <p className="mt-xs text-sm font-semibold text-content">{selectedDevice.branch}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
                <p className="text-xs text-content-secondary">운영 모드</p>
                <p className="mt-xs text-sm font-semibold text-content">{selectedDevice.mode}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
                <p className="text-xs text-content-secondary">최근 신호</p>
                <p className="mt-xs text-sm font-semibold text-content">{selectedDevice.lastSeen}</p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white p-md">
              <p className="text-xs text-content-secondary">장애/운영 메모</p>
              <p className="mt-sm text-sm text-content">{selectedDevice.issue === '-' ? '현재 등록된 장애 이슈가 없습니다.' : selectedDevice.issue}</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={deviceToRestart !== null}
        onClose={() => setDeviceToRestart(null)}
        title="원격 재시작 확인"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setDeviceToRestart(null)}>취소</Button>
            <Button onClick={handleRestart}>재시작 실행</Button>
          </div>
        }
      >
        <p className="text-sm text-content-secondary">
          {deviceToRestart ? `${deviceToRestart.branch} ${deviceToRestart.name} 기기를 원격 재시작합니다. 재시작 후 상태는 정상으로 갱신됩니다.` : ''}
        </p>
      </Modal>
    </AppLayout>
  );
}
