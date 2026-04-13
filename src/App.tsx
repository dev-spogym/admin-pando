import React, { Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { setNavigate } from '@/internal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import PrivateRoute from '@/components/common/PrivateRoute';
import GlobalSearch from '@/components/layout/GlobalSearch';
import { initAuthListener, restoreSupabaseSession } from '@/stores/authStore';
import { runDailySync } from '@/lib/businessLogic';

// --- 로딩 스피너 ---
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

// --- Lazy Pages ---
const Dashboard = React.lazy(() => import('@/app/(dashboard)/page'));
const MemberList = React.lazy(() => import('@/app/members/page'));
const MemberDetail = React.lazy(() => import('@/app/members/detail/page'));
const MemberForm = React.lazy(() => import('@/app/members/new/page'));
const BodyComposition = React.lazy(() => import('@/app/members/body-composition/page'));
const Attendance = React.lazy(() => import('@/app/attendance/page'));
const Calendar = React.lazy(() => import('@/app/calendar/page'));
const Sales = React.lazy(() => import('@/app/sales/page'));
const SalesPos = React.lazy(() => import('@/app/sales/pos/page'));
const PosPayment = React.lazy(() => import('@/app/sales/pos/payment/page'));
const ProductList = React.lazy(() => import('@/app/products/page'));
const ProductForm = React.lazy(() => import('@/app/products/new/page'));
const Locker = React.lazy(() => import('@/app/facilities/locker/page'));
const LockerManagement = React.lazy(() => import('@/app/facilities/locker/management/page'));
const RfidManagement = React.lazy(() => import('@/app/facilities/rfid/page'));
const RoomManagement = React.lazy(() => import('@/app/facilities/rooms/page'));
const StaffList = React.lazy(() => import('@/app/staff/page'));
const StaffForm = React.lazy(() => import('@/app/staff/new/page'));
const StaffResignation = React.lazy(() => import('@/app/staff/resignation/page'));
const Payroll = React.lazy(() => import('@/app/staff/payroll/page'));
const PayrollStatement = React.lazy(() => import('@/app/staff/payroll/statements/page'));
const MessageSend = React.lazy(() => import('@/app/marketing/message/page'));
const AutoAlarm = React.lazy(() => import('@/app/marketing/message/auto-alarm/page'));
const LeadManagement = React.lazy(() => import('@/app/marketing/leads/page'));
const CouponManagement = React.lazy(() => import('@/app/marketing/message/coupon/page'));
const MileageManagement = React.lazy(() => import('@/app/marketing/mileage/page'));
const ContractWizard = React.lazy(() => import('@/app/marketing/contracts/new/page'));
const Settings = React.lazy(() => import('@/app/settings/page'));
const PermissionSettings = React.lazy(() => import('@/app/settings/permissions/page'));
const KioskSettings = React.lazy(() => import('@/app/settings/kiosk/page'));
const IotSettings = React.lazy(() => import('@/app/settings/iot/page'));
const Subscription = React.lazy(() => import('@/app/settings/subscription/page'));
const BranchManagement = React.lazy(() => import('@/app/admin/branches/page'));
const BranchReport = React.lazy(() => import('@/app/admin/branch-report/page'));
const Login = React.lazy(() => import('@/app/(auth)/login/page'));
const NotFound = React.lazy(() => import('@/app/_error/not-found/page'));
const Forbidden = React.lazy(() => import('@/app/_error/forbidden/page'));

// --- 멀티테넌트 페이지 ---
const SuperDashboard = React.lazy(() => import('@/app/admin/super-dashboard/page'));
const AuditLog = React.lazy(() => import('@/app/admin/audit-log/page'));
const MemberTransfer = React.lazy(() => import('@/app/members/transfer/page'));

const KpiDashboard = React.lazy(() => import('@/app/admin/kpi/page'));
const OnboardingDashboard = React.lazy(() => import('@/app/admin/onboarding/page'));

// --- Sprint 3 신규 페이지 ---
const ScheduleRequests = React.lazy(() => import('@/app/calendar/schedule-requests/page'));

// --- BROJ CRM 신규 페이지 ---
const RefundManagement = React.lazy(() => import('@/app/sales/refunds/page'));
const UnpaidManagement = React.lazy(() => import('@/app/sales/unpaid/page'));
const SalesStats = React.lazy(() => import('@/app/sales/stats/page'));
const StatisticsManagement = React.lazy(() => import('@/app/sales/statistics/page'));
const ClothingManagement = React.lazy(() => import('@/app/facilities/clothing/page'));

// --- Sprint 4: 수업 관리 강화 ---
const ClassTemplates = React.lazy(() => import('@/app/classes/templates/page'));
const ClassSchedule = React.lazy(() => import('@/app/classes/schedule/page'));
const ClassStats = React.lazy(() => import('@/app/classes/stats/page'));
const InstructorStatus = React.lazy(() => import('@/app/classes/instructor-status/page'));

// --- 골프 타석 관리 ---
const GolfBayManagement = React.lazy(() => import('@/app/facilities/golf-bays/page'));

// --- Sprint 5: 매출/설정/전자계약/공통 ---
const DeferredRevenue = React.lazy(() => import('@/app/sales/deferred-revenue/page'));
const DiscountSettings = React.lazy(() => import('@/app/products/discount-settings/page'));
const StaffAttendancePage = React.lazy(() => import('@/app/staff/attendance/page'));
const ExerciseProgramManagement = React.lazy(() => import('@/app/classes/exercise-programs/page'));
const Notices = React.lazy(() => import('@/app/notices/page'));
const KpiPreviewCenter = React.lazy(() => import('@/app/admin/kpi-preview/page'));
const TodayTasks = React.lazy(() => import('@/app/admin/today-tasks/page'));

// localStorage의 theme_mode를 읽어 document에 다크모드 클래스/속성 적용
function applyTheme() {
  const mode = localStorage.getItem('theme_mode') ?? 'system';
  let isDark = false;
  if (mode === 'dark') {
    isDark = true;
  } else if (mode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  }
}

export default function App() {
  const navigate = useNavigate();

  // 테마 초기화 (앱 마운트 시 1회 + storage 변경 감지)
  useEffect(() => {
    applyTheme();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme_mode') applyTheme();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // moveToPage에서 React Router navigate를 쓸 수 있도록 등록
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  // Supabase Auth 세션 리스너 초기화 (세션 만료 시 자동 로그아웃)
  useEffect(() => {
    // 앱 시작 시 Supabase 세션 유효성 확인
    restoreSupabaseSession();
    // onAuthStateChange 구독 (컴포넌트 언마운트 시 해제)
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, []);

  // 일일 동기화 (하루 1번, 만료 회원 상태 전환 등)
  useEffect(() => {
    runDailySync().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
    <GlobalSearch />
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* 인증 필요 라우트 */}
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      {/* 회원 */}
      <Route path="/members" element={<PrivateRoute><MemberList /></PrivateRoute>} />
      <Route path="/members/detail" element={<PrivateRoute><MemberDetail /></PrivateRoute>} />
      <Route path="/members/new" element={<PrivateRoute><MemberForm /></PrivateRoute>} />
      <Route path="/members/edit" element={<PrivateRoute><MemberForm /></PrivateRoute>} />
      <Route path="/members/transfer" element={<PrivateRoute><MemberTransfer /></PrivateRoute>} />
      <Route path="/body-composition" element={<PrivateRoute><BodyComposition /></PrivateRoute>} />

      {/* 출석/일정 */}
      <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
      <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
      <Route path="/schedule-requests" element={<PrivateRoute><ScheduleRequests /></PrivateRoute>} />

      {/* 매출/결제 */}
      <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
      <Route path="/pos" element={<PrivateRoute><SalesPos /></PrivateRoute>} />
      <Route path="/pos/payment" element={<PrivateRoute><PosPayment /></PrivateRoute>} />

      {/* 상품 */}
      <Route path="/products" element={<PrivateRoute><ProductList /></PrivateRoute>} />
      <Route path="/products/new" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
      <Route path="/products/edit" element={<PrivateRoute><ProductForm /></PrivateRoute>} />

      {/* 시설 */}
      <Route path="/locker" element={<PrivateRoute><Locker /></PrivateRoute>} />
      <Route path="/locker/management" element={<PrivateRoute><LockerManagement /></PrivateRoute>} />
      <Route path="/rfid" element={<PrivateRoute><RfidManagement /></PrivateRoute>} />
      <Route path="/rooms" element={<PrivateRoute><RoomManagement /></PrivateRoute>} />
      <Route path="/golf-bays" element={<PrivateRoute><GolfBayManagement /></PrivateRoute>} />

      {/* 직원/급여 */}
      <Route path="/staff" element={<PrivateRoute><StaffList /></PrivateRoute>} />
      <Route path="/staff/new" element={<PrivateRoute><StaffForm /></PrivateRoute>} />
      <Route path="/staff/edit" element={<PrivateRoute><StaffForm /></PrivateRoute>} />
      <Route path="/staff/resignation" element={<PrivateRoute><StaffResignation /></PrivateRoute>} />
      <Route path="/payroll" element={<PrivateRoute><Payroll /></PrivateRoute>} />
      <Route path="/payroll/statements" element={<PrivateRoute><PayrollStatement /></PrivateRoute>} />

      {/* 메시지/마케팅 */}
      <Route path="/leads" element={<PrivateRoute><LeadManagement /></PrivateRoute>} />
      <Route path="/message" element={<PrivateRoute><MessageSend /></PrivateRoute>} />
      <Route path="/message/auto-alarm" element={<PrivateRoute><AutoAlarm /></PrivateRoute>} />
      <Route path="/message/coupon" element={<PrivateRoute><CouponManagement /></PrivateRoute>} />
      <Route path="/mileage" element={<PrivateRoute><MileageManagement /></PrivateRoute>} />
      <Route path="/contracts/new" element={<PrivateRoute><ContractWizard /></PrivateRoute>} />

      {/* 설정 */}
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/settings/permissions" element={<PrivateRoute><PermissionSettings /></PrivateRoute>} />
      <Route path="/settings/kiosk" element={<PrivateRoute><KioskSettings /></PrivateRoute>} />
      <Route path="/settings/iot" element={<PrivateRoute><IotSettings /></PrivateRoute>} />
      <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} />
      <Route path="/branches" element={<PrivateRoute><BranchManagement /></PrivateRoute>} />
      <Route path="/branch-report" element={<PrivateRoute><BranchReport /></PrivateRoute>} />
      <Route path="/kpi-preview" element={<PrivateRoute><KpiPreviewCenter /></PrivateRoute>} />
      <Route path="/today-tasks" element={<PrivateRoute><TodayTasks /></PrivateRoute>} />

      {/* 수업 관리 (BROJ CRM) */}
      <Route path="/lessons" element={<PrivateRoute><Calendar /></PrivateRoute>} />
      <Route path="/lesson-counts" element={<PrivateRoute><Calendar /></PrivateRoute>} />
      <Route path="/penalties" element={<PrivateRoute><Calendar /></PrivateRoute>} />
      <Route path="/valid-lessons" element={<PrivateRoute><Calendar /></PrivateRoute>} />

      {/* 수업 관리 강화 (Sprint 4) */}
      <Route path="/class-templates" element={<PrivateRoute><ClassTemplates /></PrivateRoute>} />
      <Route path="/class-schedule" element={<PrivateRoute><ClassSchedule /></PrivateRoute>} />
      <Route path="/class-stats" element={<PrivateRoute><ClassStats /></PrivateRoute>} />
      <Route path="/instructor-status" element={<PrivateRoute><InstructorStatus /></PrivateRoute>} />

      {/* 운동복 관리 (BROJ CRM) */}
      <Route path="/clothing" element={<PrivateRoute><ClothingManagement /></PrivateRoute>} />

      {/* 매출 확장 (BROJ CRM) */}
      <Route path="/refunds" element={<PrivateRoute><RefundManagement /></PrivateRoute>} />
      <Route path="/unpaid" element={<PrivateRoute><UnpaidManagement /></PrivateRoute>} />
      <Route path="/sales/stats" element={<PrivateRoute><SalesStats /></PrivateRoute>} />
      <Route path="/sales/statistics-management" element={<PrivateRoute><StatisticsManagement /></PrivateRoute>} />

      {/* Sprint 5: 매출/설정/공통 */}
      <Route path="/deferred-revenue" element={<PrivateRoute><DeferredRevenue /></PrivateRoute>} />
      <Route path="/discount-settings" element={<PrivateRoute><DiscountSettings /></PrivateRoute>} />
      <Route path="/staff-attendance" element={<PrivateRoute><StaffAttendancePage /></PrivateRoute>} />
      <Route path="/exercise-programs" element={<PrivateRoute><ExerciseProgramManagement /></PrivateRoute>} />
      <Route path="/notices" element={<PrivateRoute><Notices /></PrivateRoute>} />

      {/* 멀티테넌트 */}
      <Route path="/super-dashboard" element={<PrivateRoute><SuperDashboard /></PrivateRoute>} />
      <Route path="/kpi" element={<PrivateRoute><KpiDashboard /></PrivateRoute>} />
      <Route path="/onboarding" element={<PrivateRoute><OnboardingDashboard /></PrivateRoute>} />
      <Route path="/audit-log" element={<PrivateRoute><AuditLog /></PrivateRoute>} />

      {/* 존재하지 않는 경로 → 404 페이지 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
