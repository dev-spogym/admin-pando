
import React, { useState, useMemo } from 'react';
import { 
  Send, 
  History, 
  Ticket, 
  MessageSquare, 
  Bell, 
  Smartphone, 
  Plus, 
  MoreHorizontal, 
  RefreshCw, 
  AlertCircle, 
  Download, 
  CheckCircle2, 
  XCircle,
  Clock,
  UserPlus,
  Gift,
  Calendar,
  ShieldCheck,
  PauseCircle,
  Timer,
  ExternalLink,
  ChevronRight,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import SearchFilter from '@/components/SearchFilter';
import DataTable from '@/components/DataTable';
import FormSection from '@/components/FormSection';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function MessageSend() {
  const [activeTab, setActiveTab] = useState('send');
  const [historySubTab, setHistorySubTab] = useState('all');
  
  // -- 메시지 전송 탭 상태 --
  const [sendForm, setSendForm] = useState({
    senderNumber: '02-1234-5678',
    channel: 'kakao',
    recipients: [],
    title: '',
    content: '',
    isReserved: false,
    reserveDate: ''
  });

  // -- 자동 알림 설정 상태 --
  const [autoAlarms, setAutoAlarms] = useState({
    // 고객 관련
    contractComplete: true,
    rentalPurchase: true,
    birthday: false,
    newMember: true,
    reRegistration: true,
    longTermAbsence: false,
    couponExpiry: true,
    // 상품 관련
    productHolding: true,
    courseExpiry: true,
    courseExpirySoon: true,
    holdingExpirySoon: false,
    membershipExpiry: true,
    membershipExpirySoon: true
  });

  // -- 메시지 내역 필터 상태 --
  const [historyFilters, setHistoryFilters] = useState({
    search: '',
    dateStart: '',
    dateEnd: '',
    type: ''
  });

  const mainTabs = [
    { key: 'send', label: '메시지 전송', icon: Send },
    { key: 'history', label: '메시지 내역', icon: History },
    { key: 'coupon', label: '쿠폰 관리', icon: Ticket }
  ];

  const handleTabChange = (key: string) => {
    if (key === 'coupon') {
      moveToPage(993); // 쿠폰 관리 페이지로 이동
      return;
    }
    setActiveTab(key);
  };

  // -- Render Helpers --
  const renderSendTab = () => (
    <div className="space-y-lg animate-in fade-in duration-500" >
      {/* 발신 설정 및 포인트 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md" >
        <StatCard label="보유 포인트" value="52,480 P" icon={<RefreshCw className="text-secondary-mint" />} description="약 SMS 2,624건 발송 가능" onClick={() => alert('포인트 충전 페이지로 이동')} variant="mint"/>
        <div className="md:col-span-2 bg-3 rounded-card-normal border border-border-light p-lg flex flex-col justify-between shadow-card-soft" >
          <div className="flex justify-between items-start" >
            <div >
              <p className="text-Label text-text-grey-blue mb-xs" >발신 설정</p>
              <div className="flex items-center gap-sm" >
                <select 
                  className="bg-input-bg-light border-none rounded-button px-md py-sm text-Body-1 focus:ring-2 focus:ring-secondary-mint" value={sendForm.senderNumber} onChange={(e) => setSendForm({...sendForm, senderNumber: e.target.value})}>
                  <option value="02-1234-5678">02-1234-5678 (대표번호)</option>
                  <option value="010-9876-5432">010-9876-5432</option>
                </select>
                <button className="text-secondary-mint text-Label font-bold hover:underline" >+ 번호 추가</button>
              </div>
            </div>
            <div className="flex gap-xs" >
              <StatusBadge label="알림톡 활성" variant="success" dot={true}/>
              <StatusBadge label="SMS/LMS 가능" variant="default"/>
            </div>
          </div>
          <p className="mt-md text-Body-2 text-text-grey-blue flex items-center gap-xs" >
            <AlertCircle size={14}/>
            발신번호 미등록 시 문자 메시지가 전송되지 않습니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg" >
        {/* 수동 발송 폼 */}
        <FormSection title="수동 메시지 발송" description="회원들에게 직접 알림톡 또는 문자를 발송합니다." columns={1}>
          <div className="space-y-md" >
            <div >
              <label className="block text-Label text-text-dark-grey mb-xs font-semibold" >수신자 선택 <span className="text-error" >*</span></label>
              <div className="flex gap-sm" >
                <div className="flex-1 bg-input-bg-light border border-border-light rounded-button p-sm min-h-[44px] flex flex-wrap gap-xs items-center" >
                  <span className="bg-bg-soft-peach text-primary-coral px-sm py-[2px] rounded-full text-Label flex items-center gap-xs border border-primary-coral/20" >
                    전체 회원 (1,240명)
                    <button className="hover:text-error" >×</button>
                  </span>
                </div>
                <button className="bg-bg-soft-mint text-secondary-mint px-md py-sm rounded-button font-bold text-Body-2 hover:bg-secondary-mint hover:text-white transition-colors" >
                  대상 검색
                </button>
              </div>
            </div>

            <div >
              <label className="block text-Label text-text-dark-grey mb-xs font-semibold" >발송 채널 <span className="text-error" >*</span></label>
              <div className="flex gap-md" >
                {[
                  { id: 'kakao', label: '알림톡', icon: <MessageSquare size={18}/> },
                  { id: 'sms', label: 'SMS/LMS', icon: <Smartphone size={18}/> },
                  { id: 'push', label: '앱 푸시', icon: <Bell size={18}/> }
                ].map(item => (
                  <label className={cn(
                    "flex-1 flex flex-col items-center justify-center p-md border rounded-card-normal cursor-pointer transition-all gap-xs",
                    sendForm.channel === item.id 
                      ? "border-primary-coral bg-bg-soft-peach text-primary-coral shadow-sm" 
                      : "border-border-light bg-3 text-text-grey-blue hover:border-text-grey-blue"
                  )} key={item.id}>
                    <input 
                      className="hidden" type="radio" name="channel" checked={sendForm.channel === item.id} onChange={() => setSendForm({...sendForm, channel: item.id})}/>
                    {item.icon}
                    <span className="text-Label" >{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {sendForm.channel === 'sms' && (
              <div >
                <label className="block text-Label text-text-dark-grey mb-xs font-semibold" >메시지 제목</label>
                <input
                  className="w-full bg-input-bg-light border border-border-light rounded-button px-md py-sm text-Body-1 focus:ring-2 focus:ring-primary-coral outline-none" type="text" placeholder="LMS 발송 시에만 노출됩니다." value={sendForm.title} onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}/>
              </div>
            )}

            <div >
              <div className="flex justify-between items-center mb-xs" >
                <label className="block text-Label text-text-dark-grey font-semibold" >메시지 내용 <span className="text-error" >*</span></label>
                <span className="text-Label text-text-grey-blue" >{sendForm.content.length} / 1,000자 (LMS)</span>
              </div>
              <textarea
                className="w-full bg-input-bg-light border border-border-light rounded-button px-md py-sm text-Body-1 focus:ring-2 focus:ring-primary-coral outline-none resize-none" rows={6} placeholder="내용을 입력하세요. {이름}, {상품명} 등 치환 변수를 사용할 수 있습니다." value={sendForm.content} onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}/>
              <div className="mt-sm flex flex-wrap gap-xs" >
                {['{이름}', '{상품명}', '{만료일}', '{잔여횟수}', '{센터명}'].map(tag => (
                  <button 
                    className="text-Label bg-3 border border-border-light px-sm py-[2px] rounded-full text-text-grey-blue hover:border-primary-coral hover:text-primary-coral transition-colors" key={tag} onClick={() => setSendForm({ ...sendForm, content: sendForm.content + tag })}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-md border-t border-border-light flex items-center justify-between" >
              <div className="flex items-center gap-sm" >
                <input
                  className="w-4 h-4 accent-primary-coral" type="checkbox" id="reserve" checked={sendForm.isReserved} onChange={(e) => setSendForm({...sendForm, isReserved: e.target.checked})}/>
                <label className="text-Body-2 text-text-dark-grey cursor-pointer" htmlFor="reserve">예약 발송</label>
                {sendForm.isReserved && (
                  <input 
                    className="bg-input-bg-light border border-border-light rounded-button px-sm py-xs text-Body-2 outline-none" type="datetime-local" value={sendForm.reserveDate} onChange={(e) => setSendForm({ ...sendForm, reserveDate: e.target.value })}/>
                )}
              </div>
              <button 
                className="bg-primary-coral text-white px-xl py-md rounded-button font-bold text-Body-1 shadow-md shadow-primary-coral/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-sm" onClick={() => {
                  if (!sendForm.content) return alert('메시지 내용을 입력하세요.');
                  alert(`메시지가 ${sendForm.isReserved ? `${sendForm.reserveDate}에 예약` : '즉시'} 발송됩니다.`);
                }}>
                <Send size={18}/>
                메시지 발송
              </button>
            </div>
          </div>
        </FormSection>

        {/* 자동 알림 설정 */}
        <div className="space-y-lg" >
          <FormSection title="자동 알림 설정" description="특정 이벤트 발생 시 자동으로 메시지를 발송합니다." columns={1} actions={
              <button 
                onClick={() => moveToPage(992)}
                className="text-secondary-mint text-Label font-bold flex items-center gap-xs hover:underline"
              >
                상세 설정 <ChevronRight size={14} />
              </button>
            }>
            <div className="space-y-lg" >
              {/* 고객 관련 */}
              <div >
                <h4 className="text-Label text-text-grey-blue font-bold mb-md uppercase tracking-wider" >고객 관련 (7)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm" >
                  {[
                    { key: 'contractComplete', label: '계약 완료 시', icon: <ShieldCheck size={16}/> },
                    { key: 'rentalPurchase', label: '대여권 구매 시', icon: <Smartphone size={16}/> },
                    { key: 'birthday', label: '생일자 고객', icon: <Gift size={16}/> },
                    { key: 'newMember', label: '신규 등록 시', icon: <UserPlus size={16}/> },
                    { key: 'reRegistration', label: '재등록 시', icon: <RefreshCw size={16}/> },
                    { key: 'longTermAbsence', label: '장기 미출석 시', icon: <PauseCircle size={16}/> },
                    { key: 'couponExpiry', label: '쿠폰 만료 시', icon: <Timer size={16}/> }
                  ].map(item => (
                    <div className="flex items-center justify-between p-md bg-bg-main-light-blue/30 rounded-card-normal border border-transparent hover:border-border-light transition-all" key={item.key}>
                      <div className="flex items-center gap-sm" >
                        <div className="w-8 h-8 rounded-full bg-3 flex items-center justify-center text-text-grey-blue shadow-sm" >
                          {item.icon}
                        </div>
                        <span className="text-Body-2 font-medium text-text-dark-grey" >{item.label}</span>
                      </div>
                      <div className="flex items-center gap-sm" >
                        <button className="p-xs text-text-grey-blue hover:text-primary-coral transition-colors" >
                          <MoreHorizontal size={18}/>
                        </button>
                        <Toggle checked={autoAlarms[item.key as keyof typeof autoAlarms]} onChange={() => setAutoAlarms({...autoAlarms, [item.key]: !autoAlarms[item.key as keyof typeof autoAlarms]})}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 상품 관련 */}
              <div >
                <h4 className="text-Label text-text-grey-blue font-bold mb-md uppercase tracking-wider" >상품 관련 (6)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm" >
                  {[
                    { key: 'productHolding', label: '상품 홀딩 시', icon: <PauseCircle size={16}/> },
                    { key: 'courseExpiry', label: '수강권 만료 시', icon: <Clock size={16}/> },
                    { key: 'courseExpirySoon', label: '수강권 만료 전', icon: <Bell size={16}/> },
                    { key: 'holdingExpirySoon', label: '홀딩 종료 임박', icon: <Timer size={16}/> },
                    { key: 'membershipExpiry', label: '회원권 만료 시', icon: <Clock size={16}/> },
                    { key: 'membershipExpirySoon', label: '회원권 만료 전', icon: <Bell size={16}/> }
                  ].map(item => (
                    <div className="flex items-center justify-between p-md bg-bg-main-light-blue/30 rounded-card-normal border border-transparent hover:border-border-light transition-all" key={item.key}>
                      <div className="flex items-center gap-sm" >
                        <div className="w-8 h-8 rounded-full bg-3 flex items-center justify-center text-text-grey-blue shadow-sm" >
                          {item.icon}
                        </div>
                        <span className="text-Body-2 font-medium text-text-dark-grey" >{item.label}</span>
                      </div>
                      <div className="flex items-center gap-sm" >
                        <button className="p-xs text-text-grey-blue hover:text-primary-coral transition-colors" >
                          <MoreHorizontal size={18}/>
                        </button>
                        <Toggle checked={autoAlarms[item.key as keyof typeof autoAlarms]} onChange={() => setAutoAlarms({...autoAlarms, [item.key]: !autoAlarms[item.key as keyof typeof autoAlarms]})}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => {
    const columns = [
      { key: 'no', header: 'No', width: 60, align: 'center' },
      { key: 'sender', header: '발신번호', width: 140 },
      { key: 'receiver', header: '수신번호', width: 140 },
      { key: 'date', header: '발송일시', width: 180, sortable: true },
      { 
        key: 'type', 
        header: '타입', 
        width: 100, 
        align: 'center',
        render: (val: string) => (
          <StatusBadge label={val} variant={val === '알림톡' ? 'secondary' : val === '푸시' ? 'info' : 'default'}/>
        )
      },
      { 
        key: 'status', 
        header: '결과', 
        width: 100, 
        align: 'center',
        render: (val: string) => (
          <div className="flex items-center justify-center gap-xs" >
            {val === '성공' ? (
              <>
                <CheckCircle2 className="text-success" size={14}/>
                <span className="text-success text-Label" >성공</span>
              </>
            ) : (
              <>
                <XCircle className="text-error" size={14}/>
                <span className="text-error text-Label" >실패</span>
              </>
            )}
          </div>
        )
      },
      { key: 'content', header: '내용', render: (val: string) => <p className="truncate max-w-[300px]" >{val}</p> },
      { 
        key: 'refund', 
        header: '환불', 
        width: 80, 
        align: 'center',
        render: (val: boolean) => val ? <span className="text-primary-coral font-bold text-Label" >완료</span> : '-'
      }
    ];

    const mockData = useMemo(() => {
      const data = [
        { no: 1, sender: '02-1234-5678', receiver: '010-1111-2222', date: '2026-02-19 14:30:22', type: '알림톡', status: '성공', content: '[스포짐] 안녕하세요 홍길동님, 회원권이 등록되었습니다.', refund: false },
        { no: 2, sender: '02-1234-5678', receiver: '010-3333-4444', date: '2026-02-19 12:15:05', type: 'SMS', status: '실패', content: '[스포짐] 장기 미출석 안내 메시지입니다.', refund: true },
        { no: 3, sender: '02-1234-5678', receiver: '010-5555-6666', date: '2026-02-19 09:40:11', type: '푸시', status: '성공', content: '오늘의 추천 운동 영상을 확인해보세요!', refund: false },
        { no: 4, sender: '02-1234-5678', receiver: '010-7777-8888', date: '2026-02-18 18:22:45', type: 'LMS', status: '성공', content: '[스포짐 종각점] 2월 프로모션 안내드립니다. 최대 50% 할인...', refund: false },
        { no: 5, sender: '02-1234-5678', receiver: '010-1234-5678', date: '2026-02-18 10:05:30', type: '알림톡', status: '성공', content: '[스포짐] 예약하신 PT 수업이 1시간 뒤 시작됩니다.', refund: false },
      ];

      return data.filter(item => {
        const matchesSearch = !historyFilters.search || item.receiver.includes(historyFilters.search) || item.content.includes(historyFilters.search);
        const matchesType = !historyFilters.type || item.type === historyFilters.type;
        const matchesDate = (!historyFilters.dateStart || item.date >= historyFilters.dateStart) && (!historyFilters.dateEnd || item.date <= historyFilters.dateEnd);
        return matchesSearch && matchesType && matchesDate;
      });
    }, [historyFilters]);

    return (
      <div className="space-y-md animate-in fade-in duration-500" >
        <div className="flex flex-col md:flex-row gap-md items-end justify-between bg-3 p-lg rounded-card-normal border border-border-light shadow-card-soft" >
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md w-full" >
            <div >
              <label className="block text-Label text-text-grey-blue mb-xs" >발송 기간</label>
              <div className="flex items-center gap-xs" >
                <input 
                  className="flex-1 bg-input-bg-light border border-border-light rounded-button px-sm py-xs text-Body-2 outline-none" type="date" value={historyFilters.dateStart} onChange={(e) => setHistoryFilters({ ...historyFilters, dateStart: e.target.value })}/>
                <span className="text-text-grey-blue" >~</span>
                <input 
                  className="flex-1 bg-input-bg-light border border-border-light rounded-button px-sm py-xs text-Body-2 outline-none" type="date" value={historyFilters.dateEnd} onChange={(e) => setHistoryFilters({ ...historyFilters, dateEnd: e.target.value })}/>
              </div>
            </div>
            <div >
              <label className="block text-Label text-text-grey-blue mb-xs" >메시지 타입</label>
              <select 
                className="w-full bg-input-bg-light border border-border-light rounded-button px-sm py-xs text-Body-2 outline-none" value={historyFilters.type} onChange={(e) => setHistoryFilters({ ...historyFilters, type: e.target.value })}>
                <option value="">전체 채널</option>
                <option value="알림톡">알림톡</option>
                <option value="SMS">SMS/LMS</option>
                <option value="푸시">푸시 알림</option>
              </select>
            </div>
            <div className="lg:col-span-2" >
              <label className="block text-Label text-text-grey-blue mb-xs" >검색어</label>
              <div className="relative" >
                <input
                  className="w-full bg-input-bg-light border border-border-light rounded-button px-md py-xs pl-xl text-Body-2 focus:ring-2 focus:ring-secondary-mint outline-none" type="text" placeholder="수신번호 또는 내용 검색" value={historyFilters.search} onChange={(e) => setHistoryFilters({ ...historyFilters, search: e.target.value })}/>
                <Search className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={16}/>
              </div>
            </div>
          </div>
          <div className="flex gap-sm w-full md:w-auto" >
            <button 
              className="flex-1 md:flex-none bg-bg-main-light-blue text-text-dark-grey px-lg py-sm rounded-button font-bold text-Body-2 hover:bg-border-light transition-colors" onClick={() => setHistoryFilters({ search: '', dateStart: '', dateEnd: '', type: '' })}>
              초기화
            </button>
            <button 
              className="flex-1 md:flex-none bg-secondary-mint text-white px-xl py-sm rounded-button font-bold text-Body-2 shadow-md shadow-secondary-mint/20 hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={() => alert('조회 필터가 적용되었습니다.')}>
              조회하기
            </button>
          </div>
        </div>

        <DataTable title="발송 내역" columns={columns as any} data={mockData} onDownloadExcel={() => alert('엑셀 다운로드')} pagination={{
            page: 1,
            pageSize: 10,
            total: 124
          }}/>
      </div>
    );
  };

  return (
    <AppLayout >
      <div className="max-w-[1400px] mx-auto" >
        <PageHeader title="메시지 발송 (알림톡/SMS)" description="회원들에게 다양한 채널을 통해 소식을 전하고 자동 알림을 관리합니다."/>

        <TabNav
          className="mb-lg" tabs={mainTabs} activeTab={activeTab} onTabChange={handleTabChange}/>

        <div className="pb-xxl" >
          {activeTab === 'send' && renderSendTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </div>
      </div>
    </AppLayout>
  );
}

// -- Shared Helper Components --

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    className={cn(
      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
      checked ? "bg-secondary-mint" : "bg-border-light"
    )} onClick={onChange}>
    <span
      className={cn(
        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
        checked ? "translate-x-6" : "translate-x-1"
      )} />
  </button>
);
