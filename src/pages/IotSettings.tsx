import React, { useState, useEffect, useCallback } from "react";
import {
  DoorOpen,
  Cpu,
  ClipboardList,
  Settings2,
  Plus,
  RotateCw,
  RefreshCw,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Loader2,
  X
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/exportExcel";

type DeviceType = "출입문" | "체성분" | "키오스크" | "RFID" | "카메라";
type DeviceStatus = "온라인" | "오프라인" | "오류";

interface IotDevice {
  id: number;
  name: string;
  type: DeviceType;
  ip: string;
  port: number;
  serial: string;
  firmware: string;
  status: DeviceStatus;
  lastComm: string;
}

interface TestResult {
  deviceId: number;
  status: "loading" | "success" | "fail";
}

const INITIAL_DEVICES: IotDevice[] = [
  { id: 1, name: "메인 출입구 RFID", type: "출입문", ip: "192.168.0.101", port: 8080, serial: "SN-99201-01", firmware: "v2.1.0", status: "온라인", lastComm: "2026-03-11 14:20" },
  { id: 2, name: "InBody 체성분 분석기", type: "체성분", ip: "192.168.0.110", port: 9090, serial: "SN-IB-045", firmware: "v3.2.1", status: "온라인", lastComm: "2026-03-11 13:55" },
  { id: 3, name: "로비 키오스크", type: "키오스크", ip: "192.168.0.120", port: 8443, serial: "SN-KS-012", firmware: "v1.8.3", status: "오프라인", lastComm: "2026-03-10 22:10" },
  { id: 4, name: "탈의실 출입 RFID", type: "출입문", ip: "192.168.0.102", port: 8080, serial: "SN-99201-05", firmware: "v2.1.0", status: "오류", lastComm: "2026-03-11 12:05" },
];

const DEVICE_TYPE_COLORS: Record<DeviceType, string> = {
  "출입문": "text-primary bg-primary-light",
  "체성분": "text-accent bg-accent-light",
  "키오스크": "text-information bg-information/10",
  "RFID": "text-primary bg-primary-light",
  "카메라": "text-content-secondary bg-surface-secondary",
};

const tabs = [
  { key: "gate", label: "게이트 관리", icon: DoorOpen },
  { key: "iot", label: "IoT 기기", icon: Cpu },
  { key: "log", label: "출입 로그", icon: ClipboardList },
  { key: "rule", label: "출입 규칙", icon: Settings2 },
  { key: "power", label: "자동 전원", icon: Cpu },
];

// --- settings 저장/불러오기 헬퍼 ---
const IOT_SETTINGS_KEY = "iot_settings";
function getBranchId() { return localStorage.getItem("branchId") || "1"; }
function getIotStorageKey() { return `settings_${getBranchId()}_${IOT_SETTINGS_KEY}`; }

interface IotSettingsData {
  devices: IotDevice[];
  accessRules?: {
    gate: string;
    days: string[];
    startTime: string;
    endTime: string;
  }[];
}

async function loadIotSettings(): Promise<IotSettingsData | null> {
  // settings 테이블에 key/value 컬럼 없음 → localStorage만 사용
  const saved = localStorage.getItem(getIotStorageKey());
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.devices) return parsed;
    } catch {}
  }
  return null;
}

async function saveIotSettings(data: IotSettingsData): Promise<boolean> {
  const jsonValue = JSON.stringify(data);
  localStorage.setItem(getIotStorageKey(), jsonValue);
  return true;
}

export default function IotSettings() {
  const [activeTab, setActiveTab] = useState("iot");
  const [devices, setDevices] = useState<IotDevice[]>(INITIAL_DEVICES);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; variant?: "default" | "danger"; onConfirm: () => void;
  }>({ title: "", description: "", onConfirm: () => {} });
  const [loading, setLoading] = useState(true);

  // 출입 규칙 상태
  const [accessRules, setAccessRules] = useState<{
    gate: string; days: string[]; startTime: string; endTime: string;
  }[]>([{ gate: "메인 출입구", days: ["월","화","수","목","금","토","일"], startTime: "06:00", endTime: "23:00" }]);

  const [newDevice, setNewDevice] = useState({
    name: "", type: "출입문" as DeviceType, ip: "", port: 8080,
  });

  // 자동 전원 제어 스케줄 (레슨북 참고: 오픈/마감 시 키오스크·프로젝터 자동 제어)
  const [powerSchedules, setPowerSchedules] = useState([
    { id: 1, deviceName: "로비 키오스크", powerOnTime: "05:50", powerOffTime: "23:10", enabled: true },
    { id: 2, deviceName: "프로젝터 (타석1)", powerOnTime: "06:00", powerOffTime: "23:00", enabled: true },
    { id: 3, deviceName: "프로젝터 (타석2)", powerOnTime: "06:00", powerOffTime: "23:00", enabled: true },
    { id: 4, deviceName: "메인 출입구 RFID", powerOnTime: "05:55", powerOffTime: "23:05", enabled: true },
  ]);

  // 초기 로딩
  useEffect(() => {
    (async () => {
      setLoading(true);
      const saved = await loadIotSettings();
      if (saved) {
        setDevices(saved.devices);
        if (saved.accessRules) setAccessRules(saved.accessRules);
      }
      setLoading(false);
    })();
  }, []);

  // 저장 헬퍼
  const persistIot = useCallback(async (newDevices: IotDevice[], newRules?: typeof accessRules) => {
    const ok = await saveIotSettings({
      devices: newDevices,
      accessRules: newRules ?? accessRules,
    });
    if (!ok) toast.error("저장에 실패했습니다. 로컬에 임시 저장되었습니다.");
  }, [accessRules]);

  const [openingGateName, setOpeningGateName] = useState<string | null>(null);

  const handleRemoteOpen = (gateName: string) => {
    setConfirmConfig({
      title: "원격 게이트 개방",
      description: `"${gateName}" 게이트를 원격으로 개방하시겠습니까?`,
      onConfirm: () => {
        setConfirmOpen(false);
        setOpeningGateName(gateName);
        setTimeout(() => {
          toast.success(`${gateName} 게이트가 개방되었습니다.`);
          setTimeout(() => setOpeningGateName(null), 3000);
        }, 400);
      },
    });
    setConfirmOpen(true);
  };


  const handleConnectionTest = (deviceId: number) => {
    setTestResults(prev => ({ ...prev, [deviceId]: { deviceId, status: "loading" } }));
    setTimeout(() => {
      const device = devices.find(d => d.id === deviceId);
      const result = device?.status === "오프라인" ? "fail" : "success";
      setTestResults(prev => ({ ...prev, [deviceId]: { deviceId, status: result } }));
      // 3초 후 결과 초기화
      setTimeout(() => setTestResults(prev => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      }), 3000);
    }, 1800);
  };

  const handleDeleteDevice = (device: IotDevice) => {
    setConfirmConfig({
      title: "기기 삭제",
      description: `"${device.name}" 기기를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      variant: "danger",
      onConfirm: () => {
        const newDevices = devices.filter(d => d.id !== device.id);
        setDevices(newDevices);
        persistIot(newDevices);
        toast.success("기기가 삭제되었습니다.");
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const handleAddDevice = () => {
    if (!newDevice.name || !newDevice.ip) return;
    const d: IotDevice = {
      id: Date.now(),
      name: newDevice.name,
      type: newDevice.type,
      ip: newDevice.ip,
      port: newDevice.port,
      serial: `SN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      firmware: "v1.0.0",
      status: "오프라인",
      lastComm: "-",
    };
    const newDevices = [...devices, d];
    setDevices(newDevices);
    persistIot(newDevices);
    toast.success("기기가 등록되었습니다.");
    setIsAddDeviceOpen(false);
    setNewDevice({ name: "", type: "출입문", ip: "", port: 8080 });
  };

  // ── IoT 기기 탭 (카드 뷰) ──
  const renderIotDevices = () => (
    <div className="space-y-lg">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-Heading-2 text-content">IoT 기기 목록</h3>
          <p className="text-Body-2 text-content-secondary mt-xs">센터 내 연동된 모든 IoT 기기 상태를 확인하고 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsAddDeviceOpen(true)}
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-Label font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> 기기 추가
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-md">
        {devices.map(device => {
          const testResult = testResults[device.id];
          const isOnline = device.status === "온라인";
          const isError = device.status === "오류";

          return (
            <div
              key={device.id}
              className={cn(
                "bg-surface rounded-xl border shadow-card p-lg transition-all",
                isOnline ? "border-line" : isError ? "border-state-error/30 bg-state-error/5" : "border-line opacity-75"
              )}
            >
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-md">
                <div className="flex items-center gap-sm">
                  <div className={cn("p-sm rounded-lg", DEVICE_TYPE_COLORS[device.type])}>
                    <Cpu size={18} />
                  </div>
                  <div>
                    <p className="text-Body-1 font-bold text-content">{device.name}</p>
                    <span className={cn(
                      "text-[11px] font-semibold px-xs py-[1px] rounded",
                      DEVICE_TYPE_COLORS[device.type]
                    )}>
                      {device.type}
                    </span>
                  </div>
                </div>
                {/* 연결 상태 */}
                <div className={cn(
                  "flex items-center gap-xs px-sm py-xs rounded-full text-[11px] font-bold",
                  isOnline ? "bg-accent-light text-accent" : isError ? "bg-state-error/10 text-state-error" : "bg-line text-content-secondary"
                )}>
                  {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {device.status}
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="space-y-xs text-Body-2 mb-lg">
                <div className="flex justify-between">
                  <span className="text-content-secondary">IP 주소</span>
                  <span className="font-mono text-content">{device.ip}:{device.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">시리얼</span>
                  <span className="font-mono text-content text-[11px]">{device.serial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">펌웨어</span>
                  <span className="text-content">{device.firmware}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">마지막 통신</span>
                  <span className="text-content">{device.lastComm}</span>
                </div>
              </div>

              {/* 연결 테스트 결과 */}
              {testResult && (
                <div className={cn(
                  "flex items-center gap-xs px-md py-sm rounded-lg mb-md text-Body-2 font-semibold",
                  testResult.status === "loading" ? "bg-surface-secondary text-content-secondary" :
                  testResult.status === "success" ? "bg-accent-light text-accent" :
                  "bg-state-error/10 text-state-error"
                )}>
                  {testResult.status === "loading" && <Loader2 size={14} className="animate-spin" />}
                  {testResult.status === "success" && <CheckCircle2 size={14} />}
                  {testResult.status === "fail" && <XCircle size={14} />}
                  {testResult.status === "loading" ? "연결 테스트 중..." :
                   testResult.status === "success" ? "연결 성공" : "연결 실패"}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex items-center gap-sm">
                <button
                  onClick={() => handleConnectionTest(device.id)}
                  disabled={!!testResult && testResult.status === "loading"}
                  className="flex-1 flex items-center justify-center gap-xs py-sm bg-primary-light text-primary rounded-button text-Label font-semibold hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                >
                  {testResult?.status === "loading"
                    ? <><Loader2 size={14} className="animate-spin" /> 테스트 중</>
                    : <><RefreshCw size={14} /> 연결 테스트</>
                  }
                </button>
                <button
                  className="p-sm text-content-secondary hover:text-primary transition-colors"
                  title="수정"
                  onClick={() => toast.info(`"${device.name}" 기기 수정 기능 준비 중입니다.`)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteDevice(device)}
                  className="p-sm text-content-secondary hover:text-state-error transition-colors"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── 게이트 관리 탭 ──
  const renderGateManagement = () => {
    const columns = [
      { key: "id", header: "No", width: 60, align: "center" as const },
      { key: "name", header: "게이트명", sortable: true },
      { key: "type", header: "유형", render: (val: string) => <StatusBadge variant="default" label={val} /> },
      { key: "device", header: "연동 기기" },
      { key: "room", header: "연동 운동룸" },
      {
        key: "status", header: "상태",
        render: (val: string) => (
          <StatusBadge
            variant={val === "정상" ? "success" : val === "오류" ? "error" : "default"}
            label={val}
            dot
          />
        )
      },
      { key: "lastComm", header: "마지막 통신" },
      {
        key: "menu", header: "관리", align: "right" as const,
        render: (_: any, row: any) => (
          <div className="flex items-center justify-end gap-sm">
            <button
              className="p-xs text-content-secondary hover:text-primary transition-colors"
              title="수정"
              onClick={() => toast.info(`"${row.name}" 게이트 수정 기능 준비 중입니다.`)}
            >
              <Edit2 size={16} />
            </button>
            <button
              className="p-xs text-content-secondary hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="원격 개방"
              onClick={() => handleRemoteOpen(row.name)}
              disabled={openingGateName === row.name}
            >
              {openingGateName === row.name ? (
                <span className="text-xs">개방 중...</span>
              ) : (
                <DoorOpen size={16} />
              )}
            </button>
            <button
              className="p-xs text-content-secondary hover:text-state-error transition-colors"
              title="삭제"
              onClick={() => toast.info(`"${row.name}" 게이트 삭제 기능 준비 중입니다.`)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )
      },
    ];

    const data = [
      { id: 1, name: "메인 출입구", type: "입출구", device: "RFID-Main-01", room: "-", status: "정상", lastComm: "2026-03-11 14:20" },
      { id: 2, name: "운동룸 A", type: "입구", device: "QR-RoomA-01", room: "필라테스 1번룸", status: "정상", lastComm: "2026-03-11 14:18" },
      { id: 3, name: "탈의실 입구", type: "입구", device: "RFID-Locker-01", room: "-", status: "오류", lastComm: "2026-03-11 12:05" },
      { id: 4, name: "후문", type: "출구", device: "Button-Back-01", room: "-", status: "오프라인", lastComm: "2026-03-10 22:10" },
    ];

    return (
      <div className="space-y-lg">
        <DataTable
            title="게이트 목록"
            columns={columns}
            data={data}
            onDownloadExcel={() => {
              const exportColumns = [
                { key: 'id',       header: 'No' },
                { key: 'name',     header: '게이트명' },
                { key: 'type',     header: '유형' },
                { key: 'device',   header: '연동 기기' },
                { key: 'room',     header: '연동 운동룸' },
                { key: 'status',   header: '상태' },
                { key: 'lastComm', header: '마지막 통신' },
              ];
              exportToExcel(data as unknown as Record<string, unknown>[], exportColumns, { filename: '게이트목록' });
              toast.success(`${data.length}건 엑셀 다운로드 완료`);
            }}
          />
      </div>
    );
  };

  // ── 출입 로그 탭 ──
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logFilterGate, setLogFilterGate] = useState("");
  const [logFilterResult, setLogFilterResult] = useState("");

  const renderAccessLog = () => {
    const filters = [
      { key: "gate", label: "게이트", type: "select" as const, options: [
        { value: "main", label: "메인 출입구" }, { value: "rooma", label: "운동룸 A" },
      ]},
      { key: "result", label: "출입 결과", type: "select" as const, options: [
        { value: "allow", label: "허용" }, { value: "deny", label: "거부" },
      ]},
      { key: "date", label: "로그 기간", type: "dateRange" as const },
    ];

    const columns = [
      { key: "id", header: "No", width: 60, align: "center" as const },
      { key: "time", header: "출입 시각", width: 180 },
      {
        key: "memberName", header: "회원명",
        render: (val: string, row: any) => (
          <button className="text-accent hover:underline font-medium" onClick={() => row.memberId && moveToPage(985, { id: row.memberId })}>{val}</button>
        )
      },
      { key: "memberNo", header: "회원번호" },
      { key: "gateName", header: "게이트명" },
      {
        key: "direction", header: "방향",
        render: (val: string) => (
          <span className={cn(
            "px-sm py-[2px] rounded-full text-[10px] font-bold",
            val === "입" ? "bg-accent-light text-accent" : "bg-primary-light text-primary"
          )}>
            {val}
          </span>
        )
      },
      { key: "authMethod", header: "인증 방식" },
      {
        key: "result", header: "결과",
        render: (val: string) => <StatusBadge variant={val === "허용" ? "success" : "error"} label={val} />
      },
      { key: "reason", header: "거부 사유" },
    ];

    const allData = [
      { id: 1, time: "2026-03-11 14:25", memberName: "김철수", memberNo: "2024-0012", gateName: "메인 출입구", direction: "입", authMethod: "RFID", result: "허용", reason: "-" },
      { id: 2, time: "2026-03-11 14:22", memberName: "이영희", memberNo: "2025-0045", gateName: "운동룸 A", direction: "입", authMethod: "QR", result: "허용", reason: "-" },
      { id: 3, time: "2026-03-11 14:10", memberName: "정명훈", memberNo: "2026-0005", gateName: "메인 출입구", direction: "입", authMethod: "RFID", result: "거부", reason: "이용권 만료" },
    ];

    // 로컬 필터링
    const filteredData = allData.filter(row => {
      if (logSearchQuery) {
        const q = logSearchQuery.toLowerCase();
        if (!row.memberName.toLowerCase().includes(q) && !row.memberNo.toLowerCase().includes(q)) return false;
      }
      if (logFilterGate === "main" && row.gateName !== "메인 출입구") return false;
      if (logFilterGate === "rooma" && row.gateName !== "운동룸 A") return false;
      if (logFilterResult === "allow" && row.result !== "허용") return false;
      if (logFilterResult === "deny" && row.result !== "거부") return false;
      return true;
    });

    return (
      <div className="space-y-lg">
        <SearchFilter
          filters={filters}
          searchPlaceholder="회원명 / 회원번호 검색"
          onSearch={(query: string) => {
            setLogSearchQuery(query);
          }}
        />
        <DataTable
          title="출입 로그 이력"
          columns={columns}
          data={filteredData}
          pagination={{ page: 1, pageSize: 10, total: filteredData.length }}
          onDownloadExcel={() => {
            const exportColumns = [
              { key: 'time',       header: '출입 시각' },
              { key: 'memberName', header: '회원명' },
              { key: 'memberNo',   header: '회원번호' },
              { key: 'gateName',   header: '게이트명' },
              { key: 'direction',  header: '방향' },
              { key: 'authMethod', header: '인증 방식' },
              { key: 'result',     header: '결과' },
              { key: 'reason',     header: '거부 사유' },
            ];
            exportToExcel(filteredData as unknown as Record<string, unknown>[], exportColumns, { filename: '출입로그이력' });
            toast.success(`${filteredData.length}건 엑셀 다운로드 완료`);
          }}
        />
      </div>
    );
  };

  // 출입 규칙 편집 상태 (첫 번째 규칙 기반)
  const [editRule, setEditRule] = useState(() => accessRules[0] || {
    gate: "메인 출입구", days: ["월","화","수","목","금","토","일"], startTime: "06:00", endTime: "23:00",
  });

  // ── 출입 규칙 탭 ──
  const renderAccessRules = () => (
    <div className="space-y-lg">
      <FormSection title="게이트별 출입 규칙" description="특정 게이트에 대한 허용 요일, 시간대, 대상 회원을 설정합니다.">
        <div className="space-y-md">
          <label className="block text-Body-2 text-content font-medium">대상 게이트 선택</label>
          <select
            className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-accent transition-all"
            value={editRule.gate}
            onChange={e => setEditRule({ ...editRule, gate: e.target.value })}
          >
            <option>메인 출입구</option>
            <option>운동룸 A</option>
            <option>탈의실 입구</option>
          </select>
        </div>

        <div className="space-y-md">
          <label className="block text-Body-2 text-content font-medium">출입 가능 요일</label>
          <div className="flex flex-wrap gap-sm">
            {["월", "화", "수", "목", "금", "토", "일"].map(day => (
              <label key={day} className="flex items-center gap-xs p-sm border border-line rounded-button cursor-pointer hover:bg-accent-light transition-colors">
                <input
                  className="w-4 h-4 accent-accent"
                  type="checkbox"
                  checked={editRule.days.includes(day)}
                  onChange={() => {
                    const newDays = editRule.days.includes(day)
                      ? editRule.days.filter(d => d !== day)
                      : [...editRule.days, day];
                    setEditRule({ ...editRule, days: newDays });
                  }}
                />
                <span className="text-Body-2">{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-md">
          <label className="block text-Body-2 text-content font-medium">출입 가능 시간대</label>
          <div className="flex items-center gap-sm">
            <input
              className="bg-surface-secondary border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-accent transition-all"
              type="time"
              value={editRule.startTime}
              onChange={e => setEditRule({ ...editRule, startTime: e.target.value })}
            />
            <span className="text-content-secondary">~</span>
            <input
              className="bg-surface-secondary border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-accent transition-all"
              type="time"
              value={editRule.endTime}
              onChange={e => setEditRule({ ...editRule, endTime: e.target.value })}
            />
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary-light text-primary rounded-button text-Label font-semibold hover:opacity-90"
              onClick={() => {
                const newRules = [...accessRules, { gate: editRule.gate, days: ["월","화","수","목","금"], startTime: "06:00", endTime: "23:00" }];
                setAccessRules(newRules);
                toast.info("새 출입 규칙이 추가되었습니다.");
              }}
            >
              <Plus size={14} /> 규칙 추가
            </button>
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end gap-sm">
        <button
          className="px-xl py-md bg-surface border border-line text-content rounded-button text-Body-2 font-semibold hover:bg-surface-secondary transition-colors"
          onClick={() => {
            const defaultRule = { gate: "메인 출입구", days: ["월","화","수","목","금","토","일"], startTime: "06:00", endTime: "23:00" };
            setEditRule(defaultRule);
            setAccessRules([defaultRule]);
            toast.info("출입 규칙이 초기화되었습니다.");
          }}
        >
          초기화
        </button>
        <button
          className="px-xl py-md bg-accent text-white rounded-button text-Body-2 font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent/20"
          onClick={async () => {
            // 현재 편집 중인 규칙을 반영하여 저장
            const updatedRules = accessRules.map((r, i) => i === 0 ? editRule : r);
            setAccessRules(updatedRules);
            const ok = await saveIotSettings({ devices, accessRules: updatedRules });
            if (ok) toast.success("출입 규칙이 저장되었습니다.");
            else toast.error("저장에 실패했습니다. 로컬에 임시 저장되었습니다.");
          }}
        >
          규칙 저장하기
        </button>
      </div>
    </div>
  );

  // 로딩 중 스켈레톤
  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-xl animate-pulse">
          <div className="h-20 bg-surface rounded-xl border border-line" />
          <div className="h-12 bg-surface rounded-xl border border-line" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {[1,2,3,4].map(i => <div key={i} className="h-56 bg-surface rounded-xl border border-line" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="출입문/IoT 설정"
        description="센터 내 출입 게이트와 IoT 기기 연동을 관리하고 출입 보안 로그를 확인합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button
              onClick={() => moveToPage(994)}
              className="flex items-center gap-xs px-md py-sm bg-surface border border-line text-content-secondary rounded-button text-Label font-semibold hover:bg-surface-secondary transition-all"
            >
              <Settings2 size={16} /> 키오스크 설정
            </button>
            <button
              onClick={() => setIsAddDeviceOpen(true)}
              className="flex items-center gap-xs px-md py-sm bg-accent-light text-accent rounded-button text-Label font-semibold hover:bg-accent hover:text-white transition-all"
            >
              <Cpu size={16} /> IoT 기기 추가
            </button>
          </div>
        }
      />

      <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-lg" />

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "gate" && renderGateManagement()}
        {activeTab === "iot" && renderIotDevices()}
        {activeTab === "log" && renderAccessLog()}
        {activeTab === "rule" && renderAccessRules()}

        {/* 자동 전원 제어 탭 (레슨북 참고: 오픈/마감 시 키오스크·프로젝터 자동 제어) */}
        {activeTab === "power" && (
          <div className="space-y-lg">
            <FormSection title="자동 전원 스케줄" description="오픈/마감 시간에 맞춰 장비 전원을 자동으로 켜고 끕니다. (레슨북 고척점 참고)">
              <div className="col-span-full space-y-sm">
                {powerSchedules.map((schedule, idx) => (
                  <div key={schedule.id} className={cn(
                    "flex items-center gap-md p-md rounded-xl border transition-colors",
                    schedule.enabled ? "border-accent/30 bg-accent-light/30" : "border-line bg-surface-secondary opacity-60"
                  )}>
                    <button
                      onClick={() => {
                        const next = [...powerSchedules];
                        next[idx] = { ...next[idx], enabled: !next[idx].enabled };
                        setPowerSchedules(next);
                      }}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                        schedule.enabled ? "bg-accent" : "bg-line"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform",
                        schedule.enabled ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-content truncate">{schedule.deviceName}</p>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="text-[11px] text-content-secondary">ON</span>
                      <input
                        type="time"
                        value={schedule.powerOnTime}
                        onChange={e => {
                          const next = [...powerSchedules];
                          next[idx] = { ...next[idx], powerOnTime: e.target.value };
                          setPowerSchedules(next);
                        }}
                        className="px-sm py-[4px] border border-line rounded-lg text-[12px] bg-surface focus:outline-none focus:border-accent w-[90px]"
                      />
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="text-[11px] text-content-secondary">OFF</span>
                      <input
                        type="time"
                        value={schedule.powerOffTime}
                        onChange={e => {
                          const next = [...powerSchedules];
                          next[idx] = { ...next[idx], powerOffTime: e.target.value };
                          setPowerSchedules(next);
                        }}
                        className="px-sm py-[4px] border border-line rounded-lg text-[12px] bg-surface focus:outline-none focus:border-accent w-[90px]"
                      />
                    </div>
                    <button
                      onClick={() => setPowerSchedules(prev => prev.filter((_, i) => i !== idx))}
                      className="p-xs text-content-tertiary hover:text-state-error transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setPowerSchedules(prev => [
                    ...prev,
                    { id: Date.now(), deviceName: "새 장비", powerOnTime: "06:00", powerOffTime: "23:00", enabled: true },
                  ])}
                  className="flex items-center gap-xs text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
                >
                  <Plus size={14} /> 스케줄 추가
                </button>
              </div>
            </FormSection>

            <div className="p-md bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-[12px] text-blue-700 font-medium">자동 전원 제어 안내</p>
              <ul className="mt-xs space-y-xs text-[11px] text-blue-600">
                <li>• 설정된 시간에 WoL(Wake on LAN) 또는 스마트 플러그 API로 전원을 제어합니다</li>
                <li>• 프로젝터는 RS-232/IP 제어 프로토콜을 사용합니다</li>
                <li>• 시간 종료 시 자동 종료되어 에너지를 절약합니다</li>
                <li>• IoT 기기 탭에서 장비를 먼저 등록하세요</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 기기 추가 모달 */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
          <div className="w-full max-w-md bg-surface rounded-modal shadow-card overflow-hidden">
            <div className="px-xl py-lg border-b border-line flex justify-between items-center">
              <h2 className="text-Heading-2 font-bold text-content">IoT 기기 추가</h2>
              <button className="text-content-secondary hover:text-content" onClick={() => setIsAddDeviceOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-xl space-y-md">
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">기기명 <span className="text-state-error">*</span></label>
                <input
                  className="w-full bg-surface-secondary rounded-input px-md py-sm border-0 focus:ring-2 focus:ring-accent outline-none"
                  placeholder="예: 운동룸 B 출입 RFID"
                  value={newDevice.name}
                  onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
                />
              </div>
              <div className="space-y-xs">
                <label className="text-Label text-content-secondary">기기 유형 <span className="text-state-error">*</span></label>
                <select
                  className="w-full bg-surface-secondary rounded-input px-md py-sm border-0 focus:ring-2 focus:ring-accent outline-none"
                  value={newDevice.type}
                  onChange={e => setNewDevice({ ...newDevice, type: e.target.value as DeviceType })}
                >
                  <option value="출입문">출입문</option>
                  <option value="체성분">체성분</option>
                  <option value="키오스크">키오스크</option>
                  <option value="RFID">RFID</option>
                  <option value="카메라">카메라</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="text-Label text-content-secondary">IP 주소 <span className="text-state-error">*</span></label>
                  <input
                    className="w-full bg-surface-secondary rounded-input px-md py-sm border-0 focus:ring-2 focus:ring-accent outline-none font-mono"
                    placeholder="192.168.0.xxx"
                    value={newDevice.ip}
                    onChange={e => setNewDevice({ ...newDevice, ip: e.target.value })}
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-Label text-content-secondary">포트</label>
                  <input
                    className="w-full bg-surface-secondary rounded-input px-md py-sm border-0 focus:ring-2 focus:ring-accent outline-none font-mono"
                    type="number"
                    value={newDevice.port}
                    onChange={e => setNewDevice({ ...newDevice, port: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="px-xl py-lg border-t border-line flex justify-end gap-md bg-surface-secondary/5">
              <button
                className="px-xl py-md rounded-button border border-line text-content-secondary hover:bg-surface transition-colors"
                onClick={() => setIsAddDeviceOpen(false)}
              >
                취소
              </button>
              <button
                className="px-xl py-md rounded-button bg-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={!newDevice.name || !newDevice.ip}
                onClick={handleAddDevice}
              >
                기기 등록
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppLayout>
  );
}
