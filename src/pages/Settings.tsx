import React, { useState } from 'react';
import { 
  Save, 
  Info, 
  DoorOpen, 
  Monitor, 
  Smartphone, 
  Bell, 
  ShieldCheck, 
  CreditCard, 
  Plus, 
  Trash2, 
  Settings as SettingsIcon,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Building2,
  Image as ImageIcon,
  ChevronRight,
  ExternalLink,
  Lock
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import FormSection from '@/components/FormSection';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mock Center Info
  const [centerInfo, setCenterInfo] = useState({
    name: '발란스 웰니스 센터',
    description: '프리미엄 피트니스 및 필라테스 전문 센터입니다.',
    address: '서울특별시 강남구 테헤란로 123, 4층',
    businessNumber: '123-45-67890',
    phone: '02-1234-5678',
    operatingHours: {
      weekday: '06:00 - 23:00',
      weekend: '09:00 - 20:00',
    },
    sectors: ['헬스', '필라테스', 'PT샵'],
  });

  // Mock Door Data
  const [doors, setDoors] = useState([
    { id: 1, type: '메인', name: '메인 출입구', ip: '192.168.0.10', access: '전체 이용권', memo: '전면 유리 자동문' },
    { id: 2, type: '서브', name: '필라테스 룸 A', ip: '192.168.0.11', access: '필라테스 이용권 전용', memo: '지문 인식기 설치' },
  ]);

  const tabs = [
    { key: 'basic', label: '센터 기본정보', icon: Info },
    { key: 'door', label: '출입문 설정', icon: DoorOpen },
    { key: 'kiosk', label: '키오스크 설정', icon: Monitor },
    { key: 'mobile', label: '모바일앱 설정', icon: Smartphone },
    { key: 'notification', label: '알림 설정', icon: Bell },
    { key: 'permission', label: '권한 설정', icon: ShieldCheck },
    { key: 'others', label: '기타 설정', icon: SettingsIcon },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const doorColumns = [
    { key: 'id', header: 'No', width: 60, align: 'center' as const },
    { key: 'type', header: '출입문 타입', width: 120 },
    { key: 'name', header: '출입문명', width: 180 },
    { key: 'ip', header: 'IP주소/번호', width: 150 },
    { key: 'access', header: '이용권별 출입 설정', width: 200 },
    { key: 'memo', header: '메모', width: 200 },
    { 
      key: 'actions', 
      header: '관리', 
      width: 100, 
      align: 'center' as const,
      render: (_: unknown, row: any) => (
        <button className="text-text-grey-blue hover:text-error transition-colors" >
          <Trash2 size={18}/>
        </button>
      )
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-lg" >
            <FormSection title="센터 기본정보" description="센터의 대표 정보를 설정합니다." columns={2}>
              <div className="col-span-2 flex items-start gap-lg mb-md" >
                <div className="relative group" >
                  <div className="w-[132px] h-[170px] bg-bg-main-light-blue rounded-card-normal border-[1px] border-border-light flex flex-col items-center justify-center gap-sm overflow-hidden border-dashed" >
                    <ImageIcon className="text-text-grey-blue" size={32}/>
                    <span className="text-Label text-text-grey-blue" >대표 이미지</span>
                  </div>
                  <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-card-normal" >
                    <Plus size={24}/>
                  </button>
                </div>
                <div className="flex-1 space-y-md" >
                  <div className="grid grid-cols-2 gap-md" >
                    <div className="space-y-xs" >
                      <label className="text-Label text-text-dark-grey" >센터명 <span className="text-error" >*</span></label>
                      <input
                        className="w-full bg-input-bg-light p-md rounded-input focus:ring-1 focus:ring-secondary-mint outline-none border-[1px] border-transparent transition-all" type="text" value={centerInfo.name} onChange={(e) => setCenterInfo({...centerInfo, name: e.target.value})}/>
                    </div>
                    <div className="space-y-xs" >
                      <label className="text-Label text-text-dark-grey" >사업자등록번호</label>
                      <input 
                        className="w-full bg-input-bg-light p-md rounded-input outline-none border-[1px] border-transparent" type="text" value={centerInfo.businessNumber}/>
                    </div>
                  </div>
                  <div className="space-y-xs" >
                    <label className="text-Label text-text-dark-grey" >센터 설명</label>
                    <textarea
                      className="w-full bg-input-bg-light p-md rounded-input focus:ring-1 focus:ring-secondary-mint outline-none border-[1px] border-transparent resize-none" rows={3} value={centerInfo.description}/>
                  </div>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey flex items-center gap-xs" >
                  <MapPin size={14}/> 주소
                </label>
                <div className="flex gap-sm" >
                  <input
                    className="flex-1 bg-input-bg-light p-md rounded-input outline-none border-[1px] border-transparent" type="text" readOnly={true} value={centerInfo.address}/>
                  <button className="bg-bg-soft-mint text-secondary-mint px-lg rounded-button text-Body 2 font-semibold" >
                    주소검색
                  </button>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey flex items-center gap-xs" >
                  <Phone size={14}/> 대표 연락처
                </label>
                <input
                  className="w-full bg-input-bg-light p-md rounded-input focus:ring-1 focus:ring-secondary-mint outline-none border-[1px] border-transparent" type="text" value={centerInfo.phone}/>
              </div>

              <div className="col-span-2 space-y-xs pt-md" >
                <label className="text-Label text-text-dark-grey flex items-center gap-xs" >
                  <Building2 size={14}/> 업종 (중복 선택 가능)
                </label>
                <div className="flex flex-wrap gap-sm" >
                  {['헬스', '필라테스', 'PT샵', '골프', '요가', '태권도', '크로스핏', '복싱', '테니스', '수영', '사우나', '태닝', '기타'].map((sector) => (
                    <label className="flex items-center gap-xs bg-bg-main-light-blue px-md py-sm rounded-full cursor-pointer hover:bg-bg-soft-peach transition-colors" key={sector}>
                      <input 
                        className="accent-primary-coral" type="checkbox" checked={centerInfo.sectors.includes(sector)}/>
                      <span className="text-Body 2" >{sector}</span>
                    </label>
                  ))}
                </div>
              </div>
            </FormSection>

            <FormSection title="운영 시간 설정" description="평일 및 주말 운영 시간을 설정합니다." columns={2}>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey flex items-center gap-xs" >
                  <Clock size={14}/> 평일 운영시간
                </label>
                <div className="flex items-center gap-sm" >
                  <input className="flex-1 bg-input-bg-light p-md rounded-input outline-none" type="time" defaultValue="06:00"/>
                  <span >-</span>
                  <input className="flex-1 bg-input-bg-light p-md rounded-input outline-none" type="time" defaultValue="23:00"/>
                </div>
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey flex items-center gap-xs" >
                  <Clock size={14}/> 주말/공휴일 운영시간
                </label>
                <div className="flex items-center gap-sm" >
                  <input className="flex-1 bg-input-bg-light p-md rounded-input outline-none" type="time" defaultValue="09:00"/>
                  <span >-</span>
                  <input className="flex-1 bg-input-bg-light p-md rounded-input outline-none" type="time" defaultValue="20:00"/>
                </div>
              </div>
            </FormSection>
          </div>
        );

      case 'door':
        return (
          <div className="space-y-lg" >
            <div className="flex justify-between items-end mb-md" >
              <div >
                <h3 className="text-Heading 2 text-text-dark-grey mb-xs" >출입문 관리</h3>
                <p className="text-Body 2 text-text-grey-blue" >센터의 모든 IoT 출입문 정보를 관리하고 제어합니다.</p>
              </div>
              <button className="bg-secondary-mint text-white px-lg py-md rounded-button flex items-center gap-xs shadow-card-soft hover:opacity-90 transition-opacity" >
                <Plus size={18}/> 출입문 추가
              </button>
            </div>
            
            <DataTable columns={doorColumns} data={doors} pagination={{ page: 1, pageSize: 10, total: doors.length }}/>

            <FormSection title="RFID 및 연동 설정" columns={2} collapsible={true}>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >체크인 대기시간 (분)</label>
                <input className="w-full bg-input-bg-light p-md rounded-input outline-none" type="number" defaultValue={5}/>
                <p className="text-Label text-text-grey-blue mt-xs" >연속 체크인 방지를 위한 대기 시간입니다.</p>
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >IoT 도어락 서버 IP</label>
                <input className="w-full bg-input-bg-light p-md rounded-input outline-none" type="text" placeholder="127.0.0.1"/>
              </div>
            </FormSection>
          </div>
        );

      case 'kiosk':
        return (
          <div className="space-y-lg" >
            <FormSection title="키오스크 공지사항" description="키오스크 메인 화면에 표시될 공지사항을 관리합니다.">
              <div className="col-span-2 space-y-md" >
                <div className="flex gap-md overflow-x-auto pb-sm" >
                  {[1, 2].map((i) => (
                    <div className="min-w-[200px] h-[120px] bg-bg-main-light-blue rounded-card-normal border-[1px] border-border-light flex items-center justify-center relative group" key={i}>
                      <span className="text-text-grey-blue text-Body 2" >이미지 {i}</span>
                      <button className="absolute top-2 right-2 p-xs bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ))}
                  <button className="min-w-[200px] h-[120px] border-[1px] border-dashed border-border-light rounded-card-normal flex flex-col items-center justify-center gap-xs text-text-grey-blue hover:bg-bg-main-light-blue transition-colors" >
                    <Plus size={24}/>
                    <span className="text-Label" >이미지 추가</span>
                  </button>
                </div>
              </div>
            </FormSection>

            <FormSection title="출석 관리 및 편의 기능" columns={2}>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >출석 번호 사용 유형</label>
                <select className="w-full bg-input-bg-light p-md rounded-input outline-none border-[1px] border-transparent" >
                  <option >휴대폰 뒷번호 (4자리)</option>
                  <option >통합 회원번호</option>
                  <option >카드번호 (RFID)</option>
                </select>
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >재입장 가능 시간 (분)</label>
                <input className="w-full bg-input-bg-light p-md rounded-input outline-none" type="number" defaultValue={180}/>
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >출석당 마일리지 적립</label>
                <div className="flex items-center gap-sm" >
                  <input className="flex-1 bg-input-bg-light p-md rounded-input outline-none" type="number" defaultValue={100}/>
                  <span className="text-Body 2" >P</span>
                </div>
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >이용권 만료 임박 표시</label>
                <div className="flex items-center gap-sm" >
                  <input className="flex-1 bg-input-bg-light p-md rounded-input outline-none" type="number" defaultValue={7}/>
                  <span className="text-Body 2" >일 전</span>
                </div>
              </div>
              <div className="col-span-2 space-y-md pt-md border-t border-border-light" >
                <div className="flex items-center justify-between" >
                  <div className="space-y-xs" >
                    <p className="text-Body 1 font-semibold text-text-dark-grey" >AI 음성 안내 (TTS)</p>
                    <p className="text-Label text-text-grey-blue" >상황별 AI 음성 안내 멘트를 커스터마이징합니다.</p>
                  </div>
                  <button className="text-secondary-mint text-Body 2 font-semibold flex items-center gap-xs" >
                    설정하기 <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            </FormSection>
          </div>
        );

      case 'mobile':
        return (
          <div className="space-y-lg" >
            <FormSection title="브랜드 및 스타일" description="모바일 앱의 시각적 요소를 설정합니다." columns={2}>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >앱 헤더 색상</label>
                <div className="flex gap-sm" >
                  <div className="w-[48px] h-[48px] rounded-button border-[1px] border-border-light shadow-sm" style={{ backgroundColor: '#47b2ff' }}/>
                  <input className="flex-1 bg-input-bg-light p-md rounded-input outline-none uppercase font-mono" type="text" defaultValue="#47B2FF"/>
                </div>
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey" >다크모드 지원 여부</label>
                <div className="flex items-center gap-md h-[48px]" >
                  <label className="flex items-center gap-xs cursor-pointer" >
                    <input className="accent-secondary-mint" type="radio" name="darkmode" defaultChecked={true}/>
                    <span className="text-Body 2" >지원</span>
                  </label>
                  <label className="flex items-center gap-xs cursor-pointer" >
                    <input className="accent-secondary-mint" type="radio" name="darkmode"/>
                    <span className="text-Body 2" >미지원</span>
                  </label>
                </div>
              </div>
            </FormSection>

            <FormSection title="콘텐츠 관리" columns={2}>
              {['센터 소식 관리', '앱 공지사항', '시설 안내 정보', 'STAFF 소개'].map((item) => (
                <div className="flex items-center justify-between p-lg bg-bg-main-light-blue rounded-card-normal border-[1px] border-border-light hover:border-secondary-mint transition-colors cursor-pointer group" key={item}>
                  <span className="text-Body 1 text-text-dark-grey font-medium" >{item}</span>
                  <ExternalLink className="text-text-grey-blue group-hover:text-secondary-mint transition-colors" size={18}/>
                </div>
              ))}
            </FormSection>

            <FormSection title="SNS 및 외부 링크">
              <div className="grid grid-cols-2 gap-md" >
                <div className="space-y-xs" >
                  <label className="text-Label text-text-dark-grey" >인스타그램 URL</label>
                  <input className="w-full bg-input-bg-light p-md rounded-input outline-none" type="text" placeholder="https://instagram.com/..."/>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-dark-grey" >홈페이지/블로그 URL</label>
                  <input className="w-full bg-input-bg-light p-md rounded-input outline-none" type="text" placeholder="https://..."/>
                </div>
              </div>
            </FormSection>
          </div>
        );

      case 'notification':
        return (
          <div className="space-y-lg" >
            <FormSection title="실시간 알림 설정" description="주요 이벤트 발생 시 실시간 알림을 구성합니다.">
              <div className="col-span-2 space-y-md" >
                {[
                  { title: '실시간 입장 알림', desc: '회원이 센터 입장 시 관리자 앱으로 푸시 알림을 보냅니다.', checked: true },
                  { title: '회원 만료 알림', desc: '이용권 만료 임박 회원 발생 시 알림을 보냅니다.', checked: true },
                  { title: '결제 완료 알림', desc: '새로운 결제가 발생할 때마다 알림을 보냅니다.', checked: false },
                  { title: '수업 예약/취소 알림', desc: '회원이 수업을 예약하거나 취소할 때 강사에게 알림을 보냅니다.', checked: true },
                ].map((item, idx) => (
                  <div className="flex items-center justify-between p-lg bg-bg-soft-mint/50 rounded-card-normal border-[1px] border-border-light" key={idx}>
                    <div className="space-y-xs" >
                      <p className="text-Body 1 font-semibold text-text-dark-grey" >{item.title}</p>
                      <p className="text-Body 2 text-text-grey-blue" >{item.desc}</p>
                    </div>
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-border-light cursor-pointer" >
                      <div className={cn(
                        "h-5 w-5 rounded-full bg-white transition-transform shadow-sm transform translate-x-1",
                        item.checked && "translate-x-5 bg-secondary-mint"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>
          </div>
        );

      case 'permission':
        return (
          <div className="flex flex-col items-center justify-center py-[80px] px-lg text-center bg-bg-main-light-blue rounded-card-strong border-[1px] border-border-light" >
            <div className="w-[80px] h-[80px] bg-bg-soft-peach rounded-full flex items-center justify-center mb-lg" >
              <ShieldCheck className="text-primary-coral" size={40}/>
            </div>
            <h3 className="text-Heading 2 text-text-dark-grey mb-md" >역할 및 권한 관리</h3>
            <p className="text-Body 1 text-text-grey-blue mb-xl max-w-[480px]" >
              직원 및 역할별로 시스템 접근 권한을 세부적으로 제어할 수 있습니다. <br />
              보안을 위해 권한 설정 페이지로 이동하여 관리해주세요.
            </p>
            <button
              className="bg-primary-coral text-white px-xxl py-lg rounded-button text-Body 1 font-bold flex items-center gap-sm shadow-card-soft hover:opacity-90 transition-opacity" onClick={() => moveToPage(996)}>
              권한 설정 페이지로 이동 <ChevronRight size={20}/>
            </button>
            <div className="mt-xxl flex items-center gap-xs text-Label text-text-grey-blue" >
              <Lock size={14}/>
              <span >현재 접속 계정의 권한에 따라 일부 항목이 제한될 수 있습니다.</span>
            </div>
          </div>
        );

      case 'others':
        return (
          <div className="space-y-lg" >
            <FormSection title="카드 단말기 테스트" description="연동된 카드 단말기의 통신 상태를 테스트합니다.">
              <div className="col-span-2 grid grid-cols-3 gap-md" >
                {['KSNET', 'KICC', 'KIS', 'DAOU', 'KPN', '임시 테스트'].map((vendor) => (
                  <div className="p-lg bg-bg-main-light-blue rounded-card-normal border-[1px] border-border-light flex flex-col items-center gap-md" key={vendor}>
                    <div className="w-[48px] h-[48px] bg-white rounded-full flex items-center justify-center shadow-sm" >
                      <CreditCard className="text-text-grey-blue" size={24}/>
                    </div>
                    <span className="text-Body 1 font-semibold" >{vendor}</span>
                    <button className="w-full py-sm bg-white text-text-dark-grey border-[1px] border-border-light rounded-button text-Label font-bold hover:bg-bg-soft-mint hover:border-secondary-mint transition-colors" >
                      연결 테스트
                    </button>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection title="기타 운영 설정" columns={1}>
              <div className="flex items-center justify-between py-md border-b border-border-light last:border-0" >
                <div className="space-y-xs" >
                  <p className="text-Body 1 font-medium text-text-dark-grey" >자동 락커 해지 설정</p>
                  <p className="text-Label text-text-grey-blue" >이용권 만료 후 N일 경과 시 락커를 자동으로 해지 처리합니다.</p>
                </div>
                <div className="flex items-center gap-sm" >
                  <input className="w-[80px] bg-input-bg-light p-sm rounded-input text-center outline-none" type="number" defaultValue={7}/>
                  <span className="text-Body 2" >일 후</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-md border-b border-border-light last:border-0" >
                <div className="space-y-xs" >
                  <p className="text-Body 1 font-medium text-text-dark-grey" >미납자 출석 차단</p>
                  <p className="text-Label text-text-grey-blue" >미납금이 있는 회원의 출석 시 경고 메시지를 표시하거나 입장을 제한합니다.</p>
                </div>
                <select className="bg-input-bg-light p-sm rounded-input outline-none border-[1px] border-transparent text-Body 2" >
                  <option >사용 안함</option>
                  <option >경고 메시지만 표시</option>
                  <option >입장 완전 제한</option>
                </select>
              </div>
            </FormSection>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout >
      <div className="flex flex-col h-full bg-bg-main-light-blue" >
        <PageHeader title="센터 설정" description="센터 운영 및 모바일 앱, 키오스크 등에 대한 상세 정책을 관리합니다." actions={
            <div className="flex items-center gap-md">
              {saveSuccess && (
                <div className="flex items-center gap-xs text-success bg-bg-soft-mint px-lg py-md rounded-button animate-in fade-in slide-in-from-right-2">
                  <CheckCircle2 size={18} />
                  <span className="text-Body 2 font-bold">변경사항이 저장되었습니다.</span>
                </div>
              )}
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "bg-secondary-mint text-white px-xl py-md rounded-button flex items-center gap-sm shadow-card-soft hover:opacity-90 transition-all disabled:opacity-50",
                  isSaving && "animate-pulse"
                )}
              >
                {isSaving ? <Clock size={18} className="animate-spin" /> : <Save size={18} />}
                <span className="text-Body 1 font-bold">{isSaving ? '저장 중...' : '설정 저장'}</span>
              </button>
            </div>
          }/>

        <div className="flex-1 overflow-hidden flex flex-col px-xl pb-xl" >
          <div className="bg-white rounded-card-strong shadow-card-soft flex flex-col h-full overflow-hidden border-[1px] border-border-light" >
            <TabNav 
              className="px-lg pt-lg border-b border-border-light" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>
            <div className="flex-1 overflow-y-auto p-xl scrollbar-hide" >
              <div className="max-w-[1000px] mx-auto" >
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
