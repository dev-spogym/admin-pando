import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  User,
  Phone,
  Calendar as CalendarIcon,
  Mail,
  MapPin,
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  MessageSquare,
  ClipboardList,
  Star,
  ShoppingBag,
  History,
  TrendingUp,
  BarChart3,
  Dumbbell,
  Users,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage, stackPage } from "@/internal";

// 공통 컴포넌트 임포트
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import FormSection from "@/components/FormSection";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * MemberDetail - 회원 상세 페이지
 * SCR-004 설계서 기준 구현
 */
export default function MemberDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // 상태 관리
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock 데이터 - 회원 정보
  const member = {
    id: "M-12345",
    name: "김민수",
    attendanceNo: "8823",
    gender: "남",
    birthDate: "1992-05-14",
    phone: "010-1234-5678",
    email: "minsoo.kim@example.com",
    status: "active",
    dDay: 45,
    recentVisit: "2026-02-18 14:30",
    joinDate: "2025-01-10",
    trainer: "이지은 (Jenny)",
    fc: "박상준 (Leo)",
    address: "서울시 강남구 테헤란로 123, 온핏 타워 8층",
    company: "(주)온핏테크",
    marketingAgreed: true,
    appLinked: true,
    appAccount: "minsoo_92",
    purpose: "다이어트 및 근력 강화",
    source: "인스타그램 광고",
    memo: "좌측 무릎 부상 이력 있음 (2년 전 수술). 하체 운동 시 가동 범위 주의 필요. 식단 관리 철저히 요청함.",
  };

  // 회원 존재 여부 (Mock - 실제에서는 API 호출 결과 기반)
  const memberNotFound = false;

  // Mock 데이터 - 이용권 목록
  const tickets = [
    {
      id: 1,
      name: "퍼스널 트레이닝 30회 (1:1)",
      type: "수강권",
      status: "active",
      period: "2026.01.10 ~ 2026.07.10",
      usage: "12 / 30회",
      price: "1,800,000원",
    },
    {
      id: 2,
      name: "헬스 회원권 6개월 (전지점 이용)",
      type: "회원권",
      status: "active",
      period: "2026.01.10 ~ 2026.07.10",
      usage: "D-142",
      price: "660,000원",
    },
    {
      id: 3,
      name: "운동복 & 수건 대여 (6개월)",
      type: "대여권",
      status: "active",
      period: "2026.01.10 ~ 2026.07.10",
      usage: "D-142",
      price: "55,000원",
    }
  ];

  // Mock 데이터 - 출석 히트맵 (최근 6개월)
  const generateAttendanceData = () => {
    const data: Record<string, number> = {};
    const today = new Date();
    for (let i = 180; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      // 랜덤 출석 (주말 제외하면 약 60% 확률)
      const day = d.getDay();
      if (day !== 0 && day !== 6 && Math.random() > 0.4) {
        data[key] = Math.random() > 0.7 ? 2 : 1;
      }
    }
    return data;
  };
  const attendanceData = generateAttendanceData();

  // Mock 데이터 - 결제 이력
  const paymentHistory = [
    { id: 1, date: "2026-01-10", product: "퍼스널 트레이닝 30회", amount: "1,800,000원", method: "카드", status: "완료" },
    { id: 2, date: "2026-01-10", product: "헬스 회원권 6개월", amount: "660,000원", method: "카드", status: "완료" },
    { id: 3, date: "2026-01-10", product: "운동복 & 수건 대여 6개월", amount: "55,000원", method: "현금", status: "완료" },
    { id: 4, date: "2025-07-15", product: "헬스 회원권 6개월", amount: "660,000원", method: "카드", status: "완료" },
    { id: 5, date: "2025-01-10", product: "퍼스널 트레이닝 20회", amount: "1,200,000원", method: "카드", status: "완료" },
  ];

  // Mock 데이터 - 상담 메모
  const [memos, setMemos] = useState([
    { id: 1, date: "2026-02-10", author: "이지원", content: "식단 상담 진행. 단백질 섭취 늘리기로 계획.", category: "상담" },
    { id: 2, date: "2026-01-20", author: "김민수", content: "좌측 무릎 통증 호소. PT 일정 조정.", category: "특이사항" },
    { id: 3, date: "2025-12-05", author: "이지원", content: "체성분 측정 후 목표 재설정. 체지방 5% 감량 목표.", category: "상담" },
  ]);
  const [memoPage, setMemoPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const PAYMENT_PAGE_SIZE = 3;
  const pagedPayments = paymentHistory.slice(
    (paymentPage - 1) * PAYMENT_PAGE_SIZE,
    paymentPage * PAYMENT_PAGE_SIZE
  );

  // 메모 편집 상태
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [newMemoContent, setNewMemoContent] = useState("");
  const [newMemoCategory, setNewMemoCategory] = useState("상담");
  const [deleteMemoId, setDeleteMemoId] = useState<number | null>(null);

  // 탭 구성
  const tabs = [
    { key: "info", label: "회원정보", icon: User },
    { key: "tickets", label: "이용권·계약", icon: CreditCard, count: tickets.length },
    { key: "rentals", label: "대여권", icon: ShoppingBag },
    { key: "attendance", label: "출석 이력", icon: History },
    { key: "body", label: "신체·체성분", icon: Activity },
    { key: "coupons", label: "쿠폰·마일리지", icon: Star },
    { key: "program", label: "운동프로그램", icon: Dumbbell },
    { key: "consulting", label: "상담·메모", icon: MessageSquare },
    { key: "payment", label: "결제 이력", icon: CreditCard },
    { key: "reservation", label: "예약 이력", icon: ClipboardList },
    { key: "evaluation", label: "종합평가", icon: BarChart3 },
    { key: "survey", label: "설문", icon: FileText },
    { key: "analysis", label: "분석", icon: TrendingUp },
  ];

  // 이용권 테이블 컬럼
  const ticketColumns = [
    {
      key: "name",
      header: "상품명",
      render: (val: string, row: any) => (
        <div className="flex flex-col" >
          <span className="font-semibold text-text-dark-grey" >{val}</span>
          <span className="text-xs text-text-grey-blue" >{row.type}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "상태",
      render: (val: string) => {
        const variants: Record<string, any> = {
          active: { label: "이용중", variant: "success" },
          holding: { label: "홀딩", variant: "info" },
          expired: { label: "만료", variant: "error" },
          warning: { label: "임박", variant: "warning" },
        };
        const s = variants[val] || { label: val, variant: "default" };
        return <StatusBadge variant={s.variant} dot={true}>{s.label}</StatusBadge>;
      }
    },
    { key: "period", header: "이용 기간" },
    { key: "usage", header: "잔여/사용" },
    { key: "price", header: "결제 금액", align: "right" as const },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: () => (
        <button className="p-xs hover:bg-bg-main-light-blue rounded-full transition-colors" >
          <MoreVertical className="text-text-grey-blue" size={16}/>
        </button>
      )
    }
  ];

  // 결제 이력 컬럼
  const paymentColumns = [
    { key: "date", header: "결제일", render: (v: string) => <span className="text-Data-Monospace-Tabular">{v}</span> },
    { key: "product", header: "상품명" },
    { key: "amount", header: "금액", align: "right" as const, render: (v: string) => <span className="font-semibold text-text-dark-grey">{v}</span> },
    { key: "method", header: "결제방법", align: "center" as const },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (v: string) => <StatusBadge variant="success" dot={true}>{v}</StatusBadge>
    },
  ];

  // 핸들러
  const handleAttendance = () => {
    alert(`${member.name} 회원의 출석이 처리되었습니다.`);
  };

  const handleDeleteMember = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    alert("회원이 삭제되었습니다.");
    setIsDeleteDialogOpen(false);
    moveToPage(967);
  };

  const handleAddMemo = () => {
    if (!newMemoContent.trim()) return;
    const newMemo = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      author: "관리자",
      content: newMemoContent.trim(),
      category: newMemoCategory,
    };
    setMemos(prev => [newMemo, ...prev]);
    setNewMemoContent("");
    setNewMemoCategory("상담");
  };

  const handleEditMemo = (id: number, content: string) => {
    setEditingMemoId(id);
    setEditingContent(content);
  };

  const handleSaveMemo = (id: number) => {
    if (!editingContent.trim()) return;
    setMemos(prev => prev.map(m => m.id === id ? { ...m, content: editingContent.trim() } : m));
    setEditingMemoId(null);
    setEditingContent("");
  };

  const handleDeleteMemo = (id: number) => {
    setDeleteMemoId(id);
  };

  const confirmDeleteMemo = () => {
    if (deleteMemoId !== null) {
      setMemos(prev => prev.filter(m => m.id !== deleteMemoId));
      setDeleteMemoId(null);
    }
  };

  // 출석 히트맵 렌더링
  const renderAttendanceHeatmap = () => {
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 주차별로 날짜 그룹화
    const weeks: Date[][] = [];
    const startDate = new Date(sixMonthsAgo);
    // 주의 시작(일요일)으로 맞추기
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let current = new Date(startDate);
    while (current <= today) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

    const getCellColor = (date: Date) => {
      const key = date.toISOString().split("T")[0];
      const count = attendanceData[key];
      if (date > today) return "bg-transparent";
      if (!count) return "bg-7";
      if (count >= 2) return "bg-0";
      return "bg-0/50";
    };

    // 월 라벨 계산
    const monthLabels: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const month = week[0].getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          label: `${week[0].getMonth() + 1}월`,
          colIndex: i,
        });
        lastMonth = month;
      }
    });

    const totalDays = Object.values(attendanceData).filter(v => v > 0).length;

    return (
      <div className="space-y-lg">
        <div className="flex gap-lg flex-wrap">
          <StatCard label="최근 6개월 출석" value={`${totalDays}일`} icon={<History size={20}/>} variant="mint"/>
          <StatCard label="이번 달 출석" value="12일" icon={<CalendarIcon size={20}/>} variant="default"/>
          <StatCard label="연속 출석" value="5일" icon={<TrendingUp size={20}/>} variant="peach"/>
        </div>

        <div className="bg-3 rounded-card-normal border border-border-light p-lg">
          <h3 className="text-Section-Title text-4 mb-md">출석 캘린더 (최근 6개월)</h3>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-max">
              {/* 월 라벨 */}
              <div className="flex mb-xs ml-6">
                {weeks.map((week, i) => {
                  const ml = monthLabels.find(m => m.colIndex === i);
                  return (
                    <div className="w-4 mr-1 text-[10px] text-5" key={i}>
                      {ml ? ml.label : ""}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-0">
                {/* 요일 라벨 */}
                <div className="flex flex-col mr-1">
                  {dayLabels.map((d, i) => (
                    <div className="h-4 mb-1 text-[10px] text-5 w-5 flex items-center" key={i}>{i % 2 === 1 ? d : ""}</div>
                  ))}
                </div>

                {/* 주차별 셀 */}
                {weeks.map((week, wi) => (
                  <div className="flex flex-col mr-1" key={wi}>
                    {week.map((date, di) => {
                      const key = date.toISOString().split("T")[0];
                      const count = attendanceData[key];
                      return (
                        <div
                          key={di}
                          className={cn(
                            "w-4 h-4 mb-1 rounded-sm transition-colors cursor-default",
                            getCellColor(date)
                          )}
                          title={`${key}${count ? ` (${count}회 출석)` : ""}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* 범례 */}
              <div className="flex items-center gap-sm mt-md ml-6">
                <span className="text-[11px] text-5">적음</span>
                <div className="w-4 h-4 rounded-sm bg-7"/>
                <div className="w-4 h-4 rounded-sm bg-0/50"/>
                <div className="w-4 h-4 rounded-sm bg-0"/>
                <span className="text-[11px] text-5">많음</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 결제 이력 탭 렌더링
  const renderPaymentTab = () => (
    <div className="space-y-lg">
      <DataTable
        title="결제 이력"
        columns={paymentColumns}
        data={pagedPayments}
        pagination={{
          page: paymentPage,
          pageSize: PAYMENT_PAGE_SIZE,
          total: paymentHistory.length,
        }}
        onPageChange={setPaymentPage}
        emptyMessage="결제 이력이 없습니다."
      />
    </div>
  );

  // 메모 탭 렌더링
  const renderConsultingTab = () => (
    <div className="space-y-lg">
      {/* 메모 작성 */}
      <div className="bg-3 rounded-card-normal border border-border-light p-lg">
        <h3 className="text-Section-Title text-4 mb-md">새 메모 작성</h3>
        <div className="space-y-sm">
          <div className="flex gap-sm">
            <select
              className="rounded-input bg-input-bg-light border border-border-light px-md py-sm text-sm text-4 outline-none focus:ring-2 focus:ring-0/20"
              value={newMemoCategory}
              onChange={e => setNewMemoCategory(e.target.value)}
            >
              <option value="상담">상담</option>
              <option value="특이사항">특이사항</option>
              <option value="일반">일반</option>
            </select>
          </div>
          <textarea
            className="w-full rounded-input bg-input-bg-light border border-border-light px-md py-sm text-sm text-4 outline-none focus:ring-2 focus:ring-0/20 resize-none"
            rows={3}
            placeholder="상담 내용 또는 특이사항을 입력하세요..."
            value={newMemoContent}
            onChange={e => setNewMemoContent(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              className="flex items-center gap-xs px-md py-sm bg-0 text-white rounded-button text-sm font-medium hover:translate-y-[-1px] hover:shadow-2 transition-all disabled:opacity-50"
              onClick={handleAddMemo}
              disabled={!newMemoContent.trim()}
            >
              <Plus size={14}/>
              메모 저장
            </button>
          </div>
        </div>
      </div>

      {/* 메모 목록 */}
      <div className="space-y-sm">
        {memos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-xxl text-5">
            <MessageSquare size={40} className="mb-sm opacity-20"/>
            <p className="text-sm">작성된 메모가 없습니다.</p>
          </div>
        )}
        {memos.map(memo => (
          <div key={memo.id} className="bg-3 rounded-card-normal border border-border-light p-md">
            <div className="flex items-start justify-between gap-sm">
              <div className="flex items-center gap-sm flex-wrap">
                <StatusBadge variant={memo.category === "특이사항" ? "warning" : memo.category === "상담" ? "info" : "default"}>
                  {memo.category}
                </StatusBadge>
                <span className="text-[12px] text-5 font-medium">{memo.date}</span>
                <span className="text-[12px] text-5">작성자: {memo.author}</span>
              </div>
              <div className="flex items-center gap-xs shrink-0">
                {editingMemoId === memo.id ? (
                  <>
                    <button
                      className="p-xs rounded-md hover:bg-bg-soft-mint text-secondary-mint transition-colors"
                      onClick={() => handleSaveMemo(memo.id)}
                      title="저장"
                    >
                      <Save size={14}/>
                    </button>
                    <button
                      className="p-xs rounded-md hover:bg-bg-main-light-blue text-5 transition-colors"
                      onClick={() => { setEditingMemoId(null); setEditingContent(""); }}
                      title="취소"
                    >
                      <X size={14}/>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="p-xs rounded-md hover:bg-bg-main-light-blue text-5 hover:text-4 transition-colors"
                      onClick={() => handleEditMemo(memo.id, memo.content)}
                      title="수정"
                    >
                      <Edit size={14}/>
                    </button>
                    <button
                      className="p-xs rounded-md hover:bg-bg-soft-peach text-5 hover:text-error transition-colors"
                      onClick={() => handleDeleteMemo(memo.id)}
                      title="삭제"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-sm">
              {editingMemoId === memo.id ? (
                <textarea
                  className="w-full rounded-input bg-input-bg-light border border-border-light px-md py-sm text-sm text-4 outline-none focus:ring-2 focus:ring-0/20 resize-none"
                  rows={3}
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  autoFocus
                />
              ) : (
                <p className="text-sm text-4 whitespace-pre-wrap">{memo.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 렌더링 - 회원정보 탭
  const renderInfoTab = () => (
    <div className="space-y-lg" >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md" >
        <StatCard label="최근 방문일" value={member.recentVisit.split(' ')[0]} description={member.recentVisit.split(' ')[1] + " 방문"} icon={<Clock />}/>
        <StatCard label="담당 트레이너" value={member.trainer} icon={<Users />} variant="peach"/>
        <StatCard label="담당 FC" value={member.fc} icon={<User />} variant="mint"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg" >
        <FormSection title="기본 정보" collapsible={true}>
          <div className="space-y-md" >
            <InfoItem label="휴대전화" value={member.phone} icon={<Phone size={16} />}/>
            <InfoItem label="최근 방문일" value={member.recentVisit.split(' ')[0]} icon={<History size={16} />} onClick={() => moveToPage(968)}/>
            <InfoItem label="생년월일" value={`${member.birthDate} (${member.gender})`} icon={<CalendarIcon size={16} />}/>
            <InfoItem label="이메일" value={member.email} icon={<Mail size={16} />}/>
            <InfoItem label="주소" value={member.address} icon={<MapPin size={16} />}/>
          </div>
          <div className="space-y-md" >
            <InfoItem label="회원번호" value={member.id}/>
            <InfoItem label="출석번호" value={member.attendanceNo}/>
            <InfoItem label="가입일" value={member.joinDate}/>
            <InfoItem label="앱 연동" value={member.appLinked ? `연동됨 (${member.appAccount})` : "미연동"} badge={member.appLinked ? "success" : "default"}/>
          </div>
        </FormSection>

        <FormSection title="운영 정보" collapsible={true}>
          <div className="space-y-md" >
            <InfoItem label="유입경로" value={member.source}/>
            <InfoItem label="운동목적" value={member.purpose}/>
            <InfoItem label="소속 회사" value={member.company}/>
            <InfoItem label="광고 수신" value={member.marketingAgreed ? "동의" : "미동의"} badge={member.marketingAgreed ? "success" : "error"}/>
          </div>
          <div className="space-y-md" >
            <div className="flex flex-col gap-xs" >
              <span className="text-Label text-text-grey-blue" >특이사항 및 메모</span>
              <div className="p-md bg-bg-main-light-blue/30 rounded-card-normal text-Body 2 text-text-dark-grey min-h-[100px] whitespace-pre-wrap" >
                {member.memo}
              </div>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );

  // 렌더링 - 이용권 탭
  const renderTicketsTab = () => (
    <div className="space-y-lg" >
      <DataTable title="보유 이용권 및 계약 내역" columns={ticketColumns} data={tickets} onDownloadExcel={() => {}}/>
      <div className="flex justify-center p-xl bg-3 rounded-card-normal border border-dashed border-border-light" >
        <button
          className="flex items-center gap-sm px-xl py-md bg-bg-soft-peach text-primary-coral rounded-button font-bold hover:bg-primary-coral hover:text-white transition-all shadow-sm" onClick={() => moveToPage(971)}>
          <Plus size={20}/>
          신규 이용권/상품 구매하기
        </button>
      </div>
    </div>
  );

  // 404 처리
  if (memberNotFound) {
    return (
      <AppLayout>
        <div className="p-lg flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertTriangle className="text-error mb-md opacity-60" size={64}/>
          <h1 className="text-Heading-1 font-bold text-text-dark-grey mb-sm">회원을 찾을 수 없습니다</h1>
          <p className="text-Body-2 text-text-grey-blue mb-lg">
            요청하신 회원 정보가 존재하지 않거나 삭제되었습니다.
          </p>
          <button
            className="flex items-center gap-sm px-xl py-md bg-0 text-white rounded-button font-bold hover:translate-y-[-1px] hover:shadow-2 transition-all"
            onClick={() => moveToPage(967)}
          >
            <ChevronLeft size={18}/>
            회원 목록으로 돌아가기
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout >
      <div className="p-lg" >
        {/* 상단 회원 요약 헤더 */}
        <div className="bg-3 rounded-card-normal border border-border-light p-xl mb-lg shadow-card-soft" >
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-xl" >
            {/* 프로필 이미지 */}
            <div className="relative" >
              <div className="w-[120px] h-[120px] rounded-full bg-bg-main-light-blue flex items-center justify-center border-[4px] border-bg-soft-peach overflow-hidden" >
                <User className="text-text-grey-blue" size={64}/>
              </div>
              <button
                className={cn(
                  "absolute bottom-0 right-0 p-sm rounded-full shadow-md transition-all",
                  isFavorite ? "bg-primary-coral text-white" : "bg-3 text-text-grey-blue hover:text-primary-coral"
                )} onClick={() => setIsFavorite(!isFavorite)}>
                <Star size={18} fill={isFavorite ? "currentColor" : "none"}/>
              </button>
            </div>

            {/* 회원 기본 정보 */}
            <div className="flex-1 text-center lg:text-left" >
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-sm mb-xs" >
                <h1 className="text-Heading 1 text-text-dark-grey font-bold" >{member.name}</h1>
                <span className="text-Body 1 text-text-grey-blue" >({member.attendanceNo})</span>
                <StatusBadge variant="success" dot={true}>정상 이용중</StatusBadge>
                <StatusBadge variant="warning">D-{member.dDay}</StatusBadge>
              </div>
              <p className="text-Body 1 text-text-grey-blue mb-md" >{member.gender} · {member.phone} · {member.email}</p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-sm" >
                <button
                  className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white rounded-button font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleAttendance}>
                  <CheckCircle2 size={16}/>
                  수동 출석
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-bg-main-light-blue text-text-dark-grey rounded-button font-semibold hover:bg-border-light transition-all" onClick={() => moveToPage(986)}>
                  <Edit size={16}/>
                  수정
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-bg-soft-mint text-secondary-mint rounded-button font-semibold hover:bg-secondary-mint hover:text-white transition-all" onClick={() => moveToPage(971)}>
                  <ShoppingBag size={16}/>
                  상품 구매
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm border border-error text-error rounded-button font-semibold hover:bg-error hover:text-white transition-all" onClick={handleDeleteMember}>
                  <Trash2 size={16}/>
                  삭제
                </button>
              </div>
            </div>

            {/* 퀵 지표 (오른쪽 정렬) */}
            <div className="hidden xl:flex flex-col gap-sm min-w-[200px]" >
              <div className="flex justify-between items-center p-sm bg-bg-main-light-blue/20 rounded-md" >
                <span className="text-Label text-text-grey-blue" >미수금</span>
                <span className="text-Body 2 font-bold text-error" >0원</span>
              </div>
              <div className="flex justify-between items-center p-sm bg-bg-main-light-blue/20 rounded-md" >
                <span className="text-Label text-text-grey-blue" >마일리지</span>
                <span className="text-Body 2 font-bold text-secondary-mint" >1,250P</span>
              </div>
              <div className="flex justify-between items-center p-sm bg-bg-main-light-blue/20 rounded-md" >
                <span className="text-Label text-text-grey-blue" >쿠폰</span>
                <span className="text-Body 2 font-bold text-primary-coral" >2장</span>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-3 rounded-card-normal border border-border-light shadow-card-soft overflow-hidden" >
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>

          <div className="p-xl bg-bg-main-light-blue/5 min-h-[500px]" >
            {activeTab === "info" && renderInfoTab()}
            {activeTab === "tickets" && renderTicketsTab()}
            {activeTab === "attendance" && renderAttendanceHeatmap()}
            {activeTab === "payment" && renderPaymentTab()}
            {activeTab === "consulting" && renderConsultingTab()}

            {/* 다른 탭들은 현재 구현 범위 외 (Placeholder) */}
            {!["info", "tickets", "attendance", "payment", "consulting"].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-xxl text-text-grey-blue" >
                <Activity className="mb-md opacity-20" size={48}/>
                <p className="text-Heading 2 font-medium" >준비 중인 탭입니다</p>
                <p className="text-Body 2 mt-xs mb-lg" >{tabs.find(t => t.key === activeTab)?.label} 데이터를 준비하고 있습니다.</p>

                {activeTab === "body" && (
                  <button
                    className="flex items-center gap-sm px-xl py-md bg-secondary-mint text-white rounded-button font-bold hover:scale-[1.02] transition-all shadow-sm" onClick={() => moveToPage(990)}>
                    <Activity size={20}/>
                    신체·체성분 상세 페이지로 이동
                  </button>
                )}
                {activeTab === "coupons" && (
                  <div className="flex gap-md" >
                    <button
                      className="flex items-center gap-sm px-xl py-md bg-primary-coral text-white rounded-button font-bold hover:scale-[1.02] transition-all shadow-sm" onClick={() => moveToPage(993)}>
                      <Star size={20}/>
                      쿠폰 관리
                    </button>
                    <button
                      className="flex items-center gap-sm px-xl py-md bg-bg-main-light-blue text-text-dark-grey rounded-button font-bold hover:scale-[1.02] transition-all shadow-sm" onClick={() => moveToPage(981)}>
                      <CreditCard size={20}/>
                      마일리지 관리
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 회원 삭제 확인 다이얼로그 */}
      <ConfirmDialog open={isDeleteDialogOpen} title="회원 삭제 확인" description={`${member.name} 회원의 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?`} confirmLabel="삭제하기" variant="danger" confirmationText="삭제" onConfirm={confirmDelete} onCancel={() => setIsDeleteDialogOpen(false)}/>

      {/* 메모 삭제 확인 다이얼로그 */}
      <ConfirmDialog open={deleteMemoId !== null} title="메모 삭제" description="이 메모를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다." confirmLabel="삭제" variant="danger" onConfirm={confirmDeleteMemo} onCancel={() => setDeleteMemoId(null)}/>
    </AppLayout>
  );
}

// 헬퍼 컴포넌트
function InfoItem({
  label,
  value,
  icon,
  badge,
  onClick
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  badge?: "success" | "error" | "default";
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-xs border-b border-border-light/50 last:border-0",
        onClick && "cursor-pointer hover:bg-bg-main-light-blue/50 px-xs -mx-xs transition-colors"
      )} onClick={onClick}>
      <div className="flex items-center gap-sm" >
        {icon && <span className="text-text-grey-blue" >{icon}</span>}
        <span className="text-Body 2 text-text-grey-blue font-medium" >{label}</span>
      </div>
      {badge ? (
        <StatusBadge variant={badge}>{String(value)}</StatusBadge>
      ) : (
        <span className={cn(
          "text-Body 2 font-semibold",
          onClick ? "text-primary-coral underline underline-offset-4" : "text-text-dark-grey"
        )} >{value}</span>
      )}
    </div>
  );
}
