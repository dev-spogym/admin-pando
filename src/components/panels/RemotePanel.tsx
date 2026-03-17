import React, { useState } from "react";
import { Wifi, WifiOff, DoorOpen, RotateCcw, Monitor } from "lucide-react";
import { toast } from "sonner";

// ─── 기기 타입 ──────────────────────────────────────────────────────────────

interface Device {
  id: string;
  name: string;
  type: "kiosk" | "door" | "display";
  status: "online" | "offline";
  location: string;
}

// ─── Placeholder 기기 목록 ──────────────────────────────────────────────────

const MOCK_DEVICES: Device[] = [
  { id: "kiosk-01", name: "키오스크 1호",   type: "kiosk",   status: "online",  location: "입구" },
  { id: "kiosk-02", name: "키오스크 2호",   type: "kiosk",   status: "offline", location: "탈의실 앞" },
  { id: "door-01",  name: "출입문 A",       type: "door",    status: "online",  location: "정문" },
  { id: "door-02",  name: "출입문 B",       type: "door",    status: "online",  location: "비상구" },
  { id: "disp-01",  name: "안내 디스플레이", type: "display", status: "online",  location: "로비" },
];

// ─── 타입별 아이콘 ──────────────────────────────────────────────────────────

function DeviceIcon({ type, className }: { type: Device["type"]; className?: string }) {
  switch (type) {
    case "kiosk":   return <Monitor size={16} className={className} />;
    case "door":    return <DoorOpen size={16} className={className} />;
    case "display": return <Monitor size={16} className={className} />;
  }
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

const RemotePanel = () => {
  const [devices] = useState<Device[]>(MOCK_DEVICES);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  /** 문 열기 placeholder 동작 */
  const handleOpenDoor = (device: Device) => {
    setLoadingId(device.id + "-open");
    setTimeout(() => {
      setLoadingId(null);
      toast.success(`${device.name} 문 열기 신호를 전송했습니다.`);
    }, 800);
  };

  /** 재시작 placeholder 동작 */
  const handleRestart = (device: Device) => {
    setLoadingId(device.id + "-restart");
    setTimeout(() => {
      setLoadingId(null);
      toast.info(`${device.name} 재시작 명령을 전송했습니다.`);
    }, 1000);
  };

  const onlineCount  = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;

  return (
    <div className="flex flex-col h-full">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-md py-sm border-b border-line shrink-0">
        <div className="flex items-center gap-sm">
          <Wifi size={16} className="text-primary" />
          <span className="text-[14px] font-semibold text-content">원격제어</span>
        </div>
        {/* 연결 상태 뱃지 */}
        <div className="flex items-center gap-xs">
          <span className="flex items-center gap-[3px] text-[10px] font-semibold text-state-success bg-state-success/10 px-[6px] py-[2px] rounded-full">
            <span className="h-[5px] w-[5px] rounded-full bg-state-success inline-block" />
            온라인 {onlineCount}
          </span>
          {offlineCount > 0 && (
            <span className="flex items-center gap-[3px] text-[10px] font-semibold text-state-error bg-state-error/10 px-[6px] py-[2px] rounded-full">
              <span className="h-[5px] w-[5px] rounded-full bg-state-error inline-block" />
              오프라인 {offlineCount}
            </span>
          )}
        </div>
      </div>

      {/* 안내 메시지 (placeholder 표시) */}
      <div className="mx-md mt-md mb-sm bg-state-info/5 border border-state-info/20 rounded-lg px-sm py-xs shrink-0">
        <p className="text-[11px] text-state-info leading-relaxed">
          실시간 IoT 연동 준비 중입니다. 현재는 UI 미리보기 상태입니다.
        </p>
      </div>

      {/* 기기 목록 */}
      <div className="flex-1 overflow-y-auto px-md pb-md">
        <div className="space-y-sm">
          {devices.map((device) => {
            const isOnline    = device.status === "online";
            const isDoor      = device.type === "door";
            const loadingOpen = loadingId === device.id + "-open";
            const loadingRst  = loadingId === device.id + "-restart";

            return (
              <div
                key={device.id}
                className={`rounded-lg border p-md transition-colors ${
                  isOnline
                    ? "border-line bg-surface hover:border-primary/30"
                    : "border-line bg-surface-secondary opacity-60"
                }`}
              >
                {/* 기기 정보 행 */}
                <div className="flex items-center gap-sm mb-sm">
                  {/* 상태 인디케이터 + 아이콘 */}
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isOnline ? "bg-primary-light" : "bg-surface-tertiary"
                    }`}
                  >
                    <DeviceIcon
                      type={device.type}
                      className={isOnline ? "text-primary" : "text-content-tertiary"}
                    />
                  </div>

                  {/* 이름 + 위치 */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-content truncate">
                      {device.name}
                    </span>
                    <span className="text-[11px] text-content-tertiary">{device.location}</span>
                  </div>

                  {/* 온/오프라인 */}
                  <div className="flex items-center gap-[4px] shrink-0">
                    {isOnline ? (
                      <Wifi size={13} className="text-state-success" />
                    ) : (
                      <WifiOff size={13} className="text-state-error" />
                    )}
                    <span
                      className={`text-[10px] font-semibold ${
                        isOnline ? "text-state-success" : "text-state-error"
                      }`}
                    >
                      {isOnline ? "온라인" : "오프라인"}
                    </span>
                  </div>
                </div>

                {/* 제어 버튼 (온라인일 때만 활성) */}
                <div className="flex gap-xs">
                  {isDoor && (
                    <button
                      className="flex-1 h-[30px] flex items-center justify-center gap-xs rounded-lg bg-primary-light text-primary text-[12px] font-semibold hover:bg-primary/20 disabled:opacity-40 transition-colors"
                      disabled={!isOnline || loadingOpen}
                      onClick={() => handleOpenDoor(device)}
                    >
                      <DoorOpen size={13} />
                      {loadingOpen ? "전송중..." : "문 열기"}
                    </button>
                  )}
                  <button
                    className="flex-1 h-[30px] flex items-center justify-center gap-xs rounded-lg border border-line text-content-secondary text-[12px] font-medium hover:bg-surface-tertiary disabled:opacity-40 transition-colors"
                    disabled={!isOnline || loadingRst}
                    onClick={() => handleRestart(device)}
                  >
                    <RotateCcw size={12} />
                    {loadingRst ? "전송중..." : "재시작"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RemotePanel;
