import React, { useState } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Layout, 
  Grid, 
  CheckCircle2, 
  XCircle,
  Edit2
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';

// --- Types ---
interface Room {
  id: number;
  name: string;
  isActive: boolean;
  gate: string;
  createdAt: string;
  processedBy: string;
}

interface LayoutInfo {
  id: number;
  name: string;
  capacity: number;
  previewUrl?: string;
  createdAt: string;
}

export default function RoomManagement() {
  // --- States ---
  const [activeTab, setActiveTab] = useState('rooms');
  const [rooms, setRooms] = useState<Room[]>([
    { id: 1, name: 'GX룸', isActive: true, gate: 'A-1 게이트', createdAt: '2024-01-10', processedBy: '홍길동' },
    { id: 2, name: '스피닝룸', isActive: true, gate: 'B-1 게이트', createdAt: '2024-01-12', processedBy: '김매니저' },
    { id: 3, name: '그룹기구필라테스룸', isActive: true, gate: 'C-1 게이트', createdAt: '2024-01-15', processedBy: '이팀장' },
    { id: 4, name: '스피닝룸2', isActive: false, gate: '-', createdAt: '2024-02-01', processedBy: '홍길동' },
    { id: 5, name: 'PT룸', isActive: true, gate: 'D-1 게이트', createdAt: '2024-02-10', processedBy: '김매니저' },
  ]);

  const [layouts, setLayouts] = useState<LayoutInfo[]>([
    { id: 1, name: '요가(GX룸)', capacity: 14, createdAt: '2024-01-10' },
    { id: 2, name: '필라테스', capacity: 14, createdAt: '2024-01-15' },
    { id: 3, name: '줌바', capacity: 16, createdAt: '2024-01-20' },
    { id: 4, name: '스피닝', capacity: 22, createdAt: '2024-01-25' },
  ]);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // --- Handlers ---
  const handleToggleRoomStatus = (id: number) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, isActive: !room.isActive } : room
    ));
  };

  const handleDeleteRoom = () => {
    if (selectedRoomId) {
      setRooms(rooms.filter(room => room.id !== selectedRoomId));
      setIsDeleteConfirmOpen(false);
      setSelectedRoomId(null);
    }
  };

  const openDeleteConfirm = (id: number) => {
    setSelectedRoomId(id);
    setIsDeleteConfirmOpen(true);
  };

  // --- Table Columns ---
  const roomColumns = [
    { 
      key: 'name', 
      header: '운동룸명',
      render: (val: string) => <span className="font-semibold text-text-dark-grey" >{val}</span>
    },
    { 
      key: 'isActive', 
      header: '사용 여부',
      render: (val: boolean, row: Room) => (
        <div className="flex items-center gap-2" >
          <StatusBadge variant={val ? 'mint' : 'default'} dot="true" label={val ? '사용 중' : '미사용'}/>
          <button
            className="p-1 hover:bg-bg-soft-peach rounded-full transition-colors" onClick={() => handleToggleRoomStatus(row.id)}>
            <Settings className="text-text-grey-blue" size={16}/>
          </button>
        </div>
      )
    },
    { key: 'gate', header: '연동 게이트' },
    { key: 'createdAt', header: '등록일' },
    { key: 'processedBy', header: '처리자' },
    { 
      key: 'actions', 
      header: '메뉴',
      render: (_: any, row: Room) => (
        <div className="flex items-center gap-2" >
          <button 
            className="p-2 hover:bg-bg-soft-mint rounded-lg text-secondary-mint transition-colors" title="수정">
            <Edit2 size={16}/>
          </button>
          <button
            className="p-2 hover:bg-bg-soft-peach rounded-lg text-error transition-colors" onClick={() => openDeleteConfirm(row.id)} title="삭제">
            <Trash2 size={16}/>
          </button>
        </div>
      )
    },
  ];

  const layoutColumns = [
    { 
      key: 'name', 
      header: '배치 이름',
      render: (val: string) => <span className="font-semibold text-text-dark-grey" >{val}</span>
    },
    { 
      key: 'capacity', 
      header: '정원수',
      render: (val: number) => <span >{val}명</span>
    },
    { 
      key: 'preview', 
      header: '미리보기',
      render: () => (
        <div className="w-[80px] h-[40px] bg-bg-main-light-blue rounded border border-border-light flex items-center justify-center" >
          <Grid className="text-text-grey-blue opacity-50" size={16}/>
        </div>
      )
    },
    { key: 'createdAt', header: '등록일' },
    { 
      key: 'actions', 
      header: '메뉴',
      render: (_: any, row: LayoutInfo) => (
        <div className="flex items-center gap-2" >
          <button 
            className="p-2 hover:bg-bg-soft-mint rounded-lg text-secondary-mint transition-colors" title="배치도 수정">
            <Layout size={16}/>
          </button>
          <button 
            className="p-2 hover:bg-bg-soft-peach rounded-lg text-error transition-colors" title="삭제">
            <Trash2 size={16}/>
          </button>
        </div>
      )
    },
  ];

  const tabs = [
    { key: 'rooms', label: '운동룸 목록', icon: Grid },
    { key: 'layouts', label: '좌석 배치 정보', icon: Layout },
  ];

  return (
    <AppLayout >
      <div className="flex flex-col gap-lg p-lg" >
        {/* 헤더 섹션 */}
        <PageHeader title="운동룸 관리" description="센터 내 운동룸 및 좌석 배치도를 관리합니다." actions={
            <button 
              onClick={() => activeTab === 'rooms' ? setIsRoomModalOpen(true) : setIsLayoutModalOpen(true)}
              className="flex items-center gap-2 bg-primary-coral text-white px-md py-sm rounded-button font-semibold hover:opacity-90 transition-opacity shadow-card-soft"
            >
              <Plus size={18} />
              {activeTab === 'rooms' ? '새 운동룸 추가' : '새 배치도 등록'}
            </button>
          }/>

        {/* 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md" >
          <StatCard label="전체 운동룸" value={rooms.length} icon={<Grid className="text-primary-coral" />}/>
          <StatCard label="운영 중" value={rooms.filter(r => r.isActive).length} icon={<CheckCircle2 className="text-success" />} variant="mint"/>
          <StatCard label="점검/미사용" value={rooms.filter(r => !r.isActive).length} icon={<XCircle className="text-error" />} variant="peach"/>
          <StatCard label="등록된 배치도" value={layouts.length} icon={<Layout className="text-secondary-mint" />}/>
        </div>

        {/* 메인 콘텐츠 카드 */}
        <div className="bg-white rounded-card-strong shadow-card-soft border border-border-light overflow-hidden" >
          <TabNav 
            className="px-md pt-sm border-b border-border-light" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>
          
          <div className="p-md" >
            {activeTab === 'rooms' ? (
              <DataTable columns={roomColumns} data={rooms} title="운동룸 목록" onDownloadExcel={() => alert('Excel 다운로드')}/>
            ) : (
              <DataTable columns={layoutColumns} data={layouts} title="좌석 배치도 목록"/>
            )}
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* 운동룸 등록 모달 (Simple Mock) */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" >
          <div className="bg-white rounded-modal w-full max-w-[500px] overflow-hidden shadow-card-soft animate-in fade-in zoom-in duration-200" >
            <div className="p-lg border-b border-border-light flex justify-between items-center" >
              <h3 className="text-Heading 2 text-text-dark-grey" >새 운동룸 등록</h3>
              <button className="text-text-grey-blue hover:text-text-dark-grey" onClick={() => setIsRoomModalOpen(false)}>
                <XCircle size={24}/>
              </button>
            </div>
            <div className="p-lg space-y-md" >
              <div className="space-y-sm" >
                <label className="text-Body 2 font-semibold text-text-grey-blue" >운동룸명 <span className="text-error" >*</span></label>
                <input 
                  className="w-full h-[48px] px-md rounded-input bg-input-bg-light border-none focus:ring-2 focus:ring-secondary-mint outline-none" type="text" placeholder="예: GX룸, 스피닝룸"/>
              </div>
              <div className="space-y-sm" >
                <label className="text-Body 2 font-semibold text-text-grey-blue" >연동 게이트</label>
                <select className="w-full h-[48px] px-md rounded-input bg-input-bg-light border-none focus:ring-2 focus:ring-secondary-mint outline-none appearance-none" >
                  <option value="">연동 없음</option>
                  <option value="A-1">A-1 게이트</option>
                  <option value="B-1">B-1 게이트</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-md bg-bg-soft-mint rounded-card-normal" >
                <span className="text-Body 1 font-medium text-text-dark-grey" >운동룸 즉시 사용</span>
                <input className="w-5 h-5 accent-secondary-mint cursor-pointer" type="checkbox" defaultChecked="true"/>
              </div>
            </div>
            <div className="p-lg bg-bg-main-light-blue flex gap-md" >
              <button
                className="flex-1 h-[48px] rounded-button bg-white border border-border-light text-text-grey-blue font-semibold" onClick={() => setIsRoomModalOpen(false)}>
                취소
              </button>
              <button
                className="flex-1 h-[48px] rounded-button bg-primary-coral text-white font-semibold shadow-card-soft" onClick={() => {
                  alert('운동룸이 등록되었습니다.');
                  setIsRoomModalOpen(false);
                }}>
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog open={isDeleteConfirmOpen} title="운동룸 삭제" description="정말로 이 운동룸을 삭제하시겠습니까? 삭제된 정보는 복구할 수 없으며, 연결된 예약 정보에 영향을 줄 수 있습니다." confirmLabel="삭제" variant="danger" confirmationText="삭제" onConfirm={handleDeleteRoom} onCancel={() => setIsDeleteConfirmOpen(false)}/>
    </AppLayout>
  );
}
