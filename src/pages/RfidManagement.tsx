import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  RefreshCcw,
  MoreVertical,
  Edit2,
  Trash2,
  History,
  CreditCard,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  X,
  CreditCard as CardIcon
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import SearchFilter from "@/components/SearchFilter";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// RFID 데이터 타입 정의
interface RfidItem {
  no: number;
  rfidId: string;
  status: "사용" | "미사용";
  registeredAt: string;
  issuedAt: string | null;
  currentUser: string | null;
  userType: "회원" | "직원" | null;
  memberNo: number | null;
  lockerNo: string | null;
}

// 이력 데이터 타입 정의
interface HistoryItem {
  id: number;
  date: string;
  user: string;
  memberNo: number | null;
  status: string;
  action: string;
}

export default function RfidManagement() {
  // --- States ---
  const [data, setData] = useState<RfidItem[]>([
    {
      no: 1,
      rfidId: "RF-10293847",
      status: "사용",
      registeredAt: "2026-01-10",
      issuedAt: "2026-02-01",
      currentUser: "홍길동",
      userType: "회원",
      memberNo: 10234,
      lockerNo: "A-102",
    },
    {
      no: 2,
      rfidId: "RF-55667788",
      status: "사용",
      registeredAt: "2026-01-12",
      issuedAt: "2026-02-05",
      currentUser: "김민수",
      userType: "직원",
      memberNo: null,
      lockerNo: null,
    },
    {
      no: 3,
      rfidId: "RF-99881122",
      status: "미사용",
      registeredAt: "2026-01-15",
      issuedAt: null,
      currentUser: null,
      userType: null,
      memberNo: null,
      lockerNo: null,
    },
    {
      no: 4,
      rfidId: "RF-33445566",
      status: "사용",
      registeredAt: "2026-01-20",
      issuedAt: "2026-02-10",
      currentUser: "이영희",
      userType: "회원",
      memberNo: 10567,
      lockerNo: "B-205",
    },
    {
      no: 5,
      rfidId: "RF-77112233",
      status: "미사용",
      registeredAt: "2026-01-25",
      issuedAt: null,
      currentUser: null,
      userType: null,
      memberNo: null,
      lockerNo: null,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [filterValues, setFilterValues] = useState({
    status: "",
    search: "",
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RfidItem | null>(null);
  const [rfidReady, setRfidReady] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    rfidId: "",
    userType: "회원",
    userSearch: "",
    lockerNo: "",
  });

  // --- Handlers ---
  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = (value: string) => {
    setFilterValues(prev => ({ ...prev, search: value }));
  };

  const handleReset = () => {
    setFilterValues({ status: "", search: "" });
  };

  const openAddModal = (item?: RfidItem) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        rfidId: item.rfidId,
        userType: item.userType || "회원",
        userSearch: item.currentUser || "",
        lockerNo: item.lockerNo || "",
      });
    } else {
      setSelectedItem(null);
      setFormData({
        rfidId: "",
        userType: "회원",
        userSearch: "",
        lockerNo: "",
      });
    }
    setIsAddModalOpen(true);
    setRfidReady(true); // 리더기 대기 상태 시뮬레이션
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setRfidReady(false);
  };

  const handleSave = () => {
    if (!formData.rfidId) {
      alert("밴드/카드 ID를 입력하거나 태그해주세요.");
      return;
    }

    if (selectedItem) {
      // 수정
      setData(prev => prev.map(item =>
        item.no === selectedItem.no
          ? {
              ...item,
              rfidId: formData.rfidId,
              userType: formData.userType as any,
              currentUser: formData.userSearch,
              lockerNo: formData.lockerNo,
              status: "사용" as const,
              issuedAt: item.issuedAt || new Date().toISOString().split("T")[0]
            }
          : item
      ));
    } else {
      // 신규 등록
      const newNo = Math.max(...data.map(d => d.no), 0) + 1;
      const newItem: RfidItem = {
        no: newNo,
        rfidId: formData.rfidId,
        status: "사용",
        registeredAt: new Date().toISOString().split("T")[0],
        issuedAt: new Date().toISOString().split("T")[0],
        currentUser: formData.userSearch,
        userType: formData.userType as any,
        memberNo: formData.userType === "회원" ? 10000 + newNo : null,
        lockerNo: formData.lockerNo || null,
      };
      setData([newItem, ...data]);
    }
    closeAddModal();
  };

  const handleDeleteClick = (item: RfidItem) => {
    setSelectedItem(item);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedItem) {
      setData(prev => prev.filter(item => item.no !== selectedItem.no));
    }
    setIsConfirmDialogOpen(false);
    setSelectedItem(null);
  };

  const openHistoryModal = (item: RfidItem) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
  };

  // RFID 태그 시뮬레이션
  const simulateRfidTag = () => {
    const randomId = "RF-" + Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
    setFormData(prev => ({ ...prev, rfidId: randomId }));
    setRfidReady(false);
    setTimeout(() => setRfidReady(true), 1500);
  };

  // --- Filtered Data ---
  const filteredData = data.filter(item => {
    const matchesStatus = !filterValues.status || item.status === filterValues.status;
    const matchesSearch = !filterValues.search ||
      item.rfidId.toLowerCase().includes(filterValues.search.toLowerCase()) ||
      (item.currentUser && item.currentUser.toLowerCase().includes(filterValues.search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // --- Table Columns ---
  const columns = [
    { key: "no", header: "No", width: 60, align: "center" as const },
    { key: "rfidId", header: "밴드/카드 ID", sortable: true },
    {
      key: "status",
      header: "사용 여부",
      align: "center" as const,
      render: (val: string) => (
        <StatusBadge variant={val === "사용" ? "success" : "default"} dot={true}>
          {val}
        </StatusBadge>
      )
    },
    { key: "registeredAt", header: "등록일", align: "center" as const },
    { key: "issuedAt", header: "발급일", align: "center" as const, render: (val: string | null) => val || "-" },
    {
      key: "currentUser",
      header: "현재 사용자",
      render: (val: string | null, row: RfidItem) => val ? (
        <button
          className="text-primary hover:underline font-medium" onClick={() => row.memberNo && moveToPage(985)}>
          {val}
        </button>
      ) : "-"
    },
    {
      key: "userType",
      header: "회원/직원",
      align: "center" as const,
      render: (val: string | null) => val ? (
        <StatusBadge variant={val === "회원" ? "info" : "warning"}>{val}</StatusBadge>
      ) : "-"
    },
    { key: "memberNo", header: "회원번호", align: "center" as const, render: (val: number | null) => val || "-" },
    { key: "lockerNo", header: "사물함", align: "center" as const, render: (val: string | null) => val || "-" },
    {
      key: "actions",
      header: "메뉴",
      width: 120,
      align: "center" as const,
      render: (_: any, row: RfidItem) => (
        <div className="flex items-center justify-center gap-xs" >
          <button
            className="p-xs text-content-secondary hover:text-primary transition-colors" title="이력 보기" onClick={() => openHistoryModal(row)}>
            <History size={16}/>
          </button>
          <button
            className="p-xs text-content-secondary hover:text-accent transition-colors" title="수정" onClick={() => openAddModal(row)}>
            <Edit2 size={16}/>
          </button>
          <button
            className="p-xs text-content-secondary hover:text-error transition-colors" title="삭제" onClick={() => handleDeleteClick(row)}>
            <Trash2 size={16}/>
          </button>
        </div>
      )
    }
  ];

  return (
    <AppLayout >
      <div className="space-y-lg" >
        {/* Page Header */}
        <PageHeader title="밴드/카드 관리" description="RFID 밴드 및 카드를 등록하고 회원/직원과 연결하여 출입 및 시설 이용을 관리합니다." actions={
            <button
              className="flex items-center gap-sm bg-primary text-white px-lg py-md rounded-button text-Body 1 font-bold shadow-card hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => openAddModal()}
            >
              <Plus size={20} />
              신규 등록
            </button>
          }/>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md" >
          <StatCard label="전체 밴드/카드" value={data.length} icon={<CreditCard />} variant="default"/>
          <StatCard label="사용 중" value={data.filter(d => d.status === "사용").length} icon={<UserCheck />} variant="mint"/>
          <StatCard label="미사용 (여분)" value={data.filter(d => d.status === "미사용").length} icon={<ShieldCheck />} variant="peach"/>
        </div>

        {/* Filter Section */}
        <SearchFilter searchPlaceholder="ID 또는 사용자명 검색" searchValue={filterValues.search} onSearchChange={(val) => handleFilterChange("search", val)} onSearch={handleSearch} filters={[
            {
              key: "status",
              label: "사용 여부",
              type: "select",
              options: [
                { value: "사용", label: "사용" },
                { value: "미사용", label: "미사용" },
              ]
            }
          ]} filterValues={filterValues} onFilterChange={handleFilterChange} onReset={handleReset}/>

        {/* Data Table */}
        <DataTable columns={columns} data={filteredData} loading={loading} pagination={{
            page: 1,
            pageSize: 20,
            total: filteredData.length,
          }} title="밴드/카드 목록" onDownloadExcel={() => alert("Excel 다운로드를 시작합니다.")}/>
      </div>

      {/* --- Modals --- */}

      {/* 밴드/카드 등록 & 수정 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-md" >
          <div className="w-full max-w-2xl rounded-modal bg-surface shadow-card overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200" >
            <div className="flex items-center justify-between p-xl border-b border-line bg-primary-light/30" >
              <div >
                <h2 className="text-Heading 2 text-content" >
                  {selectedItem ? "밴드/카드 정보 수정" : "신규 밴드/카드 등록"}
                </h2>
                <p className="text-Body 2 text-content-secondary mt-xs" >
                  RFID 리더기를 통해 ID를 자동 입력하거나 수동으로 입력할 수 있습니다.
                </p>
              </div>
              <button className="p-sm hover:bg-surface rounded-full transition-colors" onClick={closeAddModal}>
                <X className="text-content-secondary" size={24}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-xl space-y-xl" >
              {/* RFID Reader Status UI */}
              <div className={cn(
                "p-xl rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-md transition-all",
                rfidReady ? "border-primary bg-primary-light/50" : "border-line bg-surface-secondary"
              )} >
                <div className={cn(
                  "w-xxl h-xxl rounded-full flex items-center justify-center transition-all",
                  rfidReady ? "bg-primary text-white animate-pulse" : "bg-content-secondary/20 text-content-secondary"
                )} >
                  <CardIcon size={32}/>
                </div>
                <div className="text-center" >
                  <p className={cn(
                    "text-Body 1 font-bold",
                    rfidReady ? "text-primary" : "text-content-secondary"
                  )} >
                    {rfidReady ? "등록할 밴드/카드를 리더기에 대주세요" : "리더기 연결 대기 중..."}
                  </p>
                  <p className="text-Body 2 text-content-secondary mt-xs" >
                    태그 시 ID가 자동으로 아래 입력창에 입력됩니다.
                  </p>
                </div>
                {!formData.rfidId && (
                  <button
                    className="mt-md text-Label text-primary hover:underline" onClick={simulateRfidTag}>
                    [시뮬레이션: 태그하기]
                  </button>
                )}
              </div>

              <FormSection title="기본 정보" columns={2}>
                <div className="space-y-xs" >
                  <label className="text-Label text-content font-semibold" >밴드/카드 ID <span className="text-state-error" >*</span></label>
                  <input
                    className="w-full rounded-input border border-line bg-surface-secondary px-md py-sm text-Body 2 focus:border-primary focus:outline-none transition-all" placeholder="리더기 태그 또는 직접 입력" value={formData.rfidId} onChange={(e) => setFormData(prev => ({ ...prev, rfidId: e.target.value }))}/>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-content font-semibold" >사용자 유형 <span className="text-state-error" >*</span></label>
                  <div className="flex items-center gap-md h-[42px]" >
                    {["회원", "직원"].map((type) => (
                      <label className="flex items-center gap-xs cursor-pointer group" key={type}>
                        <input
                          className="w-4 h-4 accent-primary" type="radio" name="userType" checked={formData.userType === type} onChange={() => setFormData(prev => ({ ...prev, userType: type }))}/>
                        <span className="text-Body 2 text-content group-hover:text-primary transition-colors" >{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-content font-semibold" >사용자 선택 <span className="text-state-error" >*</span></label>
                  <div className="relative" >
                    <input
                      className="w-full rounded-input border border-line bg-surface-secondary pl-10 pr-md py-sm text-Body 2 focus:border-primary focus:outline-none transition-all" placeholder={`${formData.userType} 검색 (이름 또는 번호)`} value={formData.userSearch} onChange={(e) => setFormData(prev => ({ ...prev, userSearch: e.target.value }))}/>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary" size={18}/>
                  </div>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-content font-semibold" >연결 사물함 번호</label>
                  <input
                    className="w-full rounded-input border border-line bg-surface-secondary px-md py-sm text-Body 2 focus:border-primary focus:outline-none transition-all" placeholder="사물함 번호 입력 (선택)" value={formData.lockerNo} onChange={(e) => setFormData(prev => ({ ...prev, lockerNo: e.target.value }))}/>
                </div>
              </FormSection>
            </div>

            <div className="p-xl border-t border-line flex justify-end gap-sm" >
              <button
                className="px-lg py-md rounded-button border border-line text-content-secondary font-semibold hover:bg-surface-secondary transition-colors" onClick={closeAddModal}>
                취소
              </button>
              <button
                className="px-xl py-md rounded-button bg-primary text-white font-bold shadow-card hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleSave}>
                {selectedItem ? "수정 완료" : "등록 완료"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사용 이력 모달 */}
      {isHistoryModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-md" >
          <div className="w-full max-w-3xl rounded-modal bg-surface shadow-card overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200" >
            <div className="flex items-center justify-between p-xl border-b border-line" >
              <div >
                <h2 className="text-Heading 2 text-content flex items-center gap-sm" >
                  <History className="text-primary" size={24}/>
                  사용 이력 조회
                </h2>
                <p className="text-Body 2 text-content-secondary mt-xs" >
                  밴드 ID: <span className="font-bold text-content" >{selectedItem.rfidId}</span> 의 발급 및 사용 기록입니다.
                </p>
              </div>
              <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors" onClick={() => setIsHistoryModalOpen(false)}>
                <X className="text-content-secondary" size={24}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-xl" >
              <div className="mb-lg flex items-center justify-between" >
                <div className="flex gap-sm" >
                  <input className="rounded-input border border-line px-md py-xs text-Body 2" type="date" defaultValue="2026-02-01"/>
                  <span className="flex items-center" >~</span>
                  <input className="rounded-input border border-line px-md py-xs text-Body 2" type="date" defaultValue="2026-02-19"/>
                </div>
                <button className="flex items-center gap-xs px-md py-xs bg-surface-secondary text-content rounded-button text-Label font-semibold" >
                  <RefreshCcw size={14}/>
                  조회 기간 갱신
                </button>
              </div>

              <div className="rounded-xl border border-line overflow-hidden" >
                <table className="w-full border-collapse" >
                  <thead className="bg-surface-secondary/50" >
                    <tr >
                      <th className="px-md py-sm text-left text-Label text-content-secondary" >날짜</th>
                      <th className="px-md py-sm text-left text-Label text-content-secondary" >사용자</th>
                      <th className="px-md py-sm text-left text-Label text-content-secondary" >회원번호</th>
                      <th className="px-md py-sm text-center text-Label text-content-secondary" >상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line" >
                    {[
                      { date: "2026-02-01 10:20", user: "홍길동", memberNo: 10234, status: "발급" },
                      { date: "2026-01-20 15:45", user: "이수진", memberNo: 10055, status: "반납" },
                      { date: "2026-01-05 09:10", user: "박철수", memberNo: 10012, status: "발급" },
                      { date: "2025-12-28 18:30", user: "정미영", memberNo: 10008, status: "반납" },
                    ].map((item, idx) => (
                      <tr className="hover:bg-surface-secondary/20 transition-colors" key={idx}>
                        <td className="px-md py-md text-Body 2 text-content" >{item.date}</td>
                        <td className="px-md py-md text-Body 2 font-medium" >
                          <button
                            className="text-primary hover:underline" onClick={() => moveToPage(985)}>
                            {item.user}
                          </button>
                        </td>
                        <td className="px-md py-md text-Body 2 text-content-secondary" >{item.memberNo}</td>
                        <td className="px-md py-md text-center" >
                          <StatusBadge variant={item.status === "발급" ? "success" : "default"}>
                            {item.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-xl border-t border-line flex justify-end" >
              <button
                className="px-xl py-md rounded-button bg-accent-light text-accent font-bold hover:bg-accent hover:text-white transition-all" onClick={() => setIsHistoryModalOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog open={isConfirmDialogOpen} title="밴드/카드 삭제" description={`선택한 밴드/카드 ID: ${selectedItem?.rfidId} 를 삭제하시겠습니까?\n삭제된 정보는 복구할 수 없으며, 연결된 회원과의 관계가 끊어집니다.`} confirmLabel="삭제하기" variant="danger" confirmationText="삭제" onConfirm={handleConfirmDelete} onCancel={() => setIsConfirmDialogOpen(false)}/>
    </AppLayout>
  );
}
