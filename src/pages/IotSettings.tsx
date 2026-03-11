import React, { useState } from "react";
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
  Play,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";
import { moveToPage, stackPage } from "@/internal";
import { cn } from "@/lib/utils";

/**
 * SCR-028: 출입문/IoT 설정
 */
export default function IotSettings() {
  const [activeTab, setActiveTab] = useState("gate");
  
  // 상태 관리: 확인 다이얼로그
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    variant?: "default" | "danger";
    onConfirm: () => void;
  }>({
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const tabs = [
    { key: "gate", label: "게이트 관리", icon: DoorOpen },
    { key: "iot", label: "IoT 기기", icon: Cpu },
    { key: "log", label: "출입 로그", icon: ClipboardList },
    { key: "rule", label: "출입 규칙", icon: Settings2 },
  ];

  // 알림/토스트 대용 (간단 구현)
  const showAlert = (message: string) => {
    alert(message);
  };

  const handleRemoteOpen = (gateName: string) => {
    setConfirmConfig({
      title: "원격 게이트 개방",
      description: `"${gateName}" 게이트를 원격으로 개방하시겠습니까?`,
      onConfirm: () => {
        setConfirmOpen(false);
        setTimeout(() => showAlert(`${gateName} 게이트가 개방되었습니다.`), 500);
      },
    });
    setConfirmOpen(true);
  };

  // --- 탭별 렌더링 함수들 ---

  const renderGateManagement = () => {
    const columns = [
      { key: "id", header: "No", width: 60, align: "center" as const },
      { key: "name", header: "게이트명", sortable: true },
      { 
        key: "type", 
        header: "게이트 유형", 
        render: (val: string) => (
          <StatusBadge variant="default" label={val}/>
        ) 
      },
      { key: "device", header: "연동 기기" },
      { key: "room", header: "연동 운동룸" },
      { 
        key: "status", 
        header: "상태", 
        render: (val: string) => {
          const variant = val === "정상" ? "success" : val === "오류" ? "error" : "default";
          return <StatusBadge variant={variant} label={val} dot={true}/>;
        }
      },
      { key: "lastComm", header: "마지막 통신" },
      { 
        key: "menu", 
        header: "메뉴", 
        align: "right" as const,
        render: (_: any, row: any) => (
          <div className="flex items-center justify-end gap-sm" >
            <button className="p-xs text-text-grey-blue hover:text-primary-coral transition-colors" title="수정">
              <Edit2 size={16}/>
            </button>
            <button 
              className="p-xs text-text-grey-blue hover:text-secondary-mint transition-colors" title="원격 개방" onClick={() => handleRemoteOpen(row.name)}>
              <DoorOpen size={16}/>
            </button>
            <button className="p-xs text-text-grey-blue hover:text-error transition-colors" title="삭제">
              <Trash2 size={16}/>
            </button>
          </div>
        )
      },
    ];

    const data = [
      { id: 1, name: "메인 출입구", type: "입출구", device: "RFID-Main-01", room: "-", status: "정상", lastComm: "2026-02-19 14:20:05" },
      { id: 2, name: "운동룸 A", type: "입구", device: "QR-RoomA-01", room: "필라테스 1번룸", status: "정상", lastComm: "2026-02-19 14:18:22" },
      { id: 3, name: "탈의실 입구", type: "입구", device: "RFID-Locker-01", room: "-", status: "오류", lastComm: "2026-02-19 12:05:11" },
      { id: 4, name: "후문", type: "출구", device: "Button-Back-01", room: "-", status: "오프라인", lastComm: "2026-02-18 22:10:45" },
    ];

    return (
      <div className="space-y-lg" >
        <DataTable title="게이트 목록" columns={columns} data={data} onDownloadExcel={() => {}}/>
      </div>
    );
  };

  const renderIotDevice = () => {
    const columns = [
      { key: "id", header: "No", width: 60, align: "center" as const },
      { key: "name", header: "기기명" },
      { 
        key: "type", 
        header: "기기 유형",
        render: (val: string) => <StatusBadge variant="default" label={val}/>
      },
      { key: "serial", header: "시리얼 번호" },
      { key: "ip", header: "IP 주소" },
      { key: "firmware", header: "펌웨어" },
      { 
        key: "status", 
        header: "상태", 
        render: (val: string) => {
          const variant = val === "온라인" ? "success" : val === "오류" ? "error" : "default";
          return <StatusBadge variant={variant} label={val} dot={true}/>;
        }
      },
      {
        key: "menu",
        header: "메뉴", 
        align: "right" as const,
        render: (_: any, row: any) => (
          <div className="flex items-center justify-end gap-sm" >
            <button className="p-xs text-text-grey-blue hover:text-primary-coral transition-colors" title="수정">
              <Edit2 size={16}/>
            </button>
            <button className="p-xs text-text-grey-blue hover:text-secondary-mint transition-colors" title="재시작">
              <RotateCw size={16}/>
            </button>
            <button className="p-xs text-text-grey-blue hover:text-information transition-colors" title="펌웨어 업데이트">
              <RefreshCw size={16}/>
            </button>
            <button className="p-xs text-text-grey-blue hover:text-error transition-colors" title="삭제">
              <Trash2 size={16}/>
            </button>
          </div>
        )
      },
    ];

    const data = [
      { id: 1, name: "RFID-Main-01", type: "RFID 리더기", serial: "SN-99201-01", ip: "192.168.0.101", firmware: "v2.1.0", status: "온라인" },
      { id: 2, name: "QR-RoomA-01", type: "QR 스캐너", serial: "SN-QR-045", ip: "192.168.0.105", firmware: "v1.4.2", status: "온라인" },
      { id: 3, name: "CAM-Entrance-01", type: "카메라", serial: "SN-CAM-112", ip: "192.168.0.110", firmware: "v3.0.1", status: "오류" },
      { id: 4, name: "RFID-Locker-01", type: "RFID 리더기", serial: "SN-99201-05", ip: "192.168.0.102", firmware: "v2.1.0", status: "오프라인" },
    ];

    return (
      <div className="space-y-lg" >
        <DataTable title="IoT 기기 목록" columns={columns} data={data} onDownloadExcel={() => {}}/>
      </div>
    );
  };

  const renderAccessLog = () => {
    const filters = [
      { key: "gate", label: "게이트 선택", type: "select" as const, options: [
        { value: "main", label: "메인 출입구" },
        { value: "rooma", label: "운동룸 A" },
      ]},
      { key: "result", label: "출입 결과", type: "select" as const, options: [
        { value: "allow", label: "허용" },
        { value: "deny", label: "거부" },
      ]},
      { key: "date", label: "로그 기간", type: "dateRange" as const },
    ];

    const columns = [
      { key: "id", header: "No", width: 60, align: "center" as const },
      { key: "time", header: "출입 시각", width: 180 },
      { 
        key: "memberName", 
        header: "회원명",
        render: (val: string) => (
          <button 
            className="text-secondary-mint hover:underline font-medium" onClick={() => moveToPage(985)}>
            {val}
          </button>
        )
      },
      { key: "memberNo", header: "회원번호" },
      { key: "gateName", header: "게이트명" },
      { 
        key: "direction", 
        header: "방향",
        render: (val: string) => (
          <span className={cn(
            "px-sm py-[2px] rounded-full text-[10px] font-bold",
            val === "입" ? "bg-bg-soft-mint text-secondary-mint" : "bg-bg-soft-peach text-primary-coral"
          )} >
            {val}
          </span>
        )
      },
      { key: "authMethod", header: "인증 방식" },
      { 
        key: "result", 
        header: "결과",
        render: (val: string) => (
          <StatusBadge variant={val === "허용" ? "success" : "error"} label={val}/>
        )
      },
      { key: "reason", header: "거부 사유" },
    ];

    const data = [
      { id: 1, time: "2026-02-19 14:25:01", memberName: "김철수", memberNo: "2024-0012", gateName: "메인 출입구", direction: "입", authMethod: "RFID", result: "허용", reason: "-" },
      { id: 2, time: "2026-02-19 14:22:15", memberName: "이영희", memberNo: "2025-0045", gateName: "운동룸 A", direction: "입", authMethod: "앱(QR)", result: "허용", reason: "-" },
      { id: 3, time: "2026-02-19 14:15:33", memberName: "박지성", memberNo: "2023-0158", gateName: "메인 출입구", direction: "출", authMethod: "RFID", result: "허용", reason: "-" },
      { id: 4, time: "2026-02-19 14:10:12", memberName: "정명훈", memberNo: "2026-0005", gateName: "메인 출입구", direction: "입", authMethod: "RFID", result: "거부", reason: "이용권 만료" },
      { id: 5, time: "2026-02-19 13:55:40", memberName: "강호동", memberNo: "2024-0088", gateName: "운동룸 A", direction: "입", authMethod: "RFID", result: "거부", reason: "수업 시간 아님" },
    ];

    return (
      <div className="space-y-lg" >
        <SearchFilter filters={filters} searchPlaceholder="회원명 / 회원번호 검색" onSearch={() => {}}/>
        <DataTable title="출입 로그 이력" columns={columns} data={data} onDownloadExcel={() => {}} pagination={{ page: 1, pageSize: 10, total: 45 }}/>
      </div>
    );
  };

  const renderAccessRules = () => {
    return (
      <div className="space-y-lg" >
        <FormSection title="게이트별 출입 규칙 설정" description="특정 게이트에 대한 출입 허용 요일, 시간대 및 대상 회원을 설정합니다.">
          <div className="space-y-md" >
            <label className="block text-Body 2 text-text-dark-grey font-medium" >대상 게이트 선택</label>
            <select className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-secondary-mint transition-all" >
              <option >메인 출입구</option>
              <option >운동룸 A</option>
              <option >탈의실 입구</option>
            </select>
          </div>

          <div className="space-y-md" >
            <label className="block text-Body 2 text-text-dark-grey font-medium" >출입 가능 요일</label>
            <div className="flex flex-wrap gap-sm" >
              {["월", "화", "수", "목", "금", "토", "일"].map(day => (
                <label className="flex items-center gap-xs p-sm border border-border-light rounded-button cursor-pointer hover:bg-bg-soft-mint transition-colors" key={day}>
                  <input className="w-4 h-4 rounded text-secondary-mint focus:ring-secondary-mint accent-secondary-mint" type="checkbox" defaultChecked={true}/>
                  <span className="text-Body 2" >{day}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-md" >
            <label className="block text-Body 2 text-text-dark-grey font-medium" >출입 가능 시간대</label>
            <div className="flex items-center gap-sm" >
              <input className="bg-input-bg-light border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-secondary-mint transition-all" type="time" defaultValue="06:00"/>
              <span className="text-text-grey-blue" >~</span>
              <input className="bg-input-bg-light border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-secondary-mint transition-all" type="time" defaultValue="23:00"/>
              <button className="flex items-center gap-xs px-md py-sm bg-bg-soft-peach text-primary-coral rounded-button text-Label font-semibold hover:opacity-90 transition-opacity" >
                <Plus size={14}/>
                시간 추가
              </button>
            </div>
          </div>

          <div className="space-y-md" >
            <label className="block text-Body 2 text-text-dark-grey font-medium" >대상 회원 유형</label>
            <div className="grid grid-cols-2 gap-sm" >
              {["전체 회원", "퍼스널 트레이닝(PT)", "필라테스", "골프", "일반 헬스"].map(type => (
                <label className="flex items-center gap-xs" key={type}>
                  <input className="w-4 h-4 rounded text-secondary-mint focus:ring-secondary-mint accent-secondary-mint" type="checkbox" defaultChecked={type === "전체 회원"}/>
                  <span className="text-Body 2" >{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-md" >
            <div className="flex items-center justify-between p-md bg-bg-soft-mint rounded-card-normal border border-secondary-mint/20" >
              <div >
                <h4 className="text-Body 1 font-bold text-text-dark-grey" >비등록 방문자 출입 허용</h4>
                <p className="text-Body 2 text-text-grey-blue" >회원권이 없는 방문자의 입장을 허용합니다. (벨 호출 또는 원격 개방 전용)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer" >
                <input className="sr-only peer" type="checkbox"/>
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-mint" ></div>
              </label>
            </div>
          </div>
        </FormSection>

        <div className="flex justify-end gap-sm" >
          <button className="px-xl py-md bg-white border border-border-light text-text-dark-grey rounded-button text-Body 1 font-semibold hover:bg-input-bg-light transition-colors" >
            초기화
          </button>
          <button className="px-xl py-md bg-secondary-mint text-white rounded-button text-Body 1 font-semibold hover:opacity-90 shadow-lg shadow-secondary-mint/20 transition-all" >
            규칙 저장하기
          </button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout >
      <PageHeader title="출입문/IoT 설정" description="센터 내 출입 게이트와 IoT 기기 연동을 관리하고 출입 보안 로그를 확인합니다." actions={
          <div className="flex items-center gap-sm">
            <button 
              onClick={() => moveToPage(994)}
              className="flex items-center gap-xs px-md py-sm bg-white border border-border-light text-text-grey-blue rounded-button text-Label font-semibold hover:bg-input-bg-light transition-all"
            >
              <Settings2 size={18} />
              키오스크 설정
            </button>
            <button className="flex items-center gap-xs px-md py-sm bg-bg-soft-peach text-primary-coral rounded-button text-Label font-semibold hover:bg-primary-coral hover:text-white transition-all">
              <Plus size={18} />
              새 게이트 등록
            </button>
            <button className="flex items-center gap-xs px-md py-sm bg-bg-soft-mint text-secondary-mint rounded-button text-Label font-semibold hover:bg-secondary-mint hover:text-white transition-all">
              <Cpu size={18} />
              IoT 기기 추가
            </button>
          </div>
        }>
        <TabNav 
          className="bg-white px-lg rounded-t-card-normal border-x border-t border-border-light" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>
      </PageHeader>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" >
        {activeTab === "gate" && renderGateManagement()}
        {activeTab === "iot" && renderIotDevice()}
        {activeTab === "log" && renderAccessLog()}
        {activeTab === "rule" && renderAccessRules()}
      </div>

      {/* 확인 다이얼로그 */}
      <ConfirmDialog open={confirmOpen} title={confirmConfig.title} description={confirmConfig.description} variant={confirmConfig.variant} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmOpen(false)}/>
    </AppLayout>
  );
}
