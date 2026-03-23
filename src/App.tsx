import React, { Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { setNavigate } from '@/internal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PrivateRoute from '@/components/PrivateRoute';
import { initAuthListener, restoreSupabaseSession } from '@/stores/authStore';

// --- 로딩 스피너 ---
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

// --- Lazy Pages ---
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const MemberList = React.lazy(() => import('@/pages/MemberList'));
const MemberDetail = React.lazy(() => import('@/pages/MemberDetail'));
const MemberForm = React.lazy(() => import('@/pages/MemberForm'));
const BodyComposition = React.lazy(() => import('@/pages/BodyComposition'));
const Attendance = React.lazy(() => import('@/pages/Attendance'));
const Calendar = React.lazy(() => import('@/pages/Calendar'));
const Sales = React.lazy(() => import('@/pages/Sales'));
const SalesPos = React.lazy(() => import('@/pages/SalesPos'));
const PosPayment = React.lazy(() => import('@/pages/PosPayment'));
const ProductList = React.lazy(() => import('@/pages/ProductList'));
const ProductForm = React.lazy(() => import('@/pages/ProductForm'));
const Locker = React.lazy(() => import('@/pages/Locker'));
const LockerManagement = React.lazy(() => import('@/pages/LockerManagement'));
const RfidManagement = React.lazy(() => import('@/pages/RfidManagement'));
const RoomManagement = React.lazy(() => import('@/pages/RoomManagement'));
const StaffList = React.lazy(() => import('@/pages/StaffList'));
const StaffForm = React.lazy(() => import('@/pages/StaffForm'));
const StaffResignation = React.lazy(() => import('@/pages/StaffResignation'));
const Payroll = React.lazy(() => import('@/pages/Payroll'));
const PayrollStatement = React.lazy(() => import('@/pages/PayrollStatement'));
const MessageSend = React.lazy(() => import('@/pages/MessageSend'));
const AutoAlarm = React.lazy(() => import('@/pages/AutoAlarm'));
const CouponManagement = React.lazy(() => import('@/pages/CouponManagement'));
const MileageManagement = React.lazy(() => import('@/pages/MileageManagement'));
const ContractWizard = React.lazy(() => import('@/pages/ContractWizard'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const PermissionSettings = React.lazy(() => import('@/pages/PermissionSettings'));
const KioskSettings = React.lazy(() => import('@/pages/KioskSettings'));
const IotSettings = React.lazy(() => import('@/pages/IotSettings'));
const Subscription = React.lazy(() => import('@/pages/Subscription'));
const BranchManagement = React.lazy(() => import('@/pages/BranchManagement'));
const BranchReport = React.lazy(() => import('@/pages/BranchReport'));
const Login = React.lazy(() => import('@/pages/Login'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));
const Forbidden = React.lazy(() => import('@/pages/Forbidden'));

// --- 멀티테넌트 페이지 ---
const SuperDashboard = React.lazy(() => import('@/pages/SuperDashboard'));
const AuditLog = React.lazy(() => import('@/pages/AuditLog'));
const MemberTransfer = React.lazy(() => import('@/pages/MemberTransfer'));

// --- Sprint 3 신규 페이지 ---
const ScheduleRequests = React.lazy(() => import('@/pages/ScheduleRequests'));

// --- BROJ CRM 신규 페이지 ---
const RefundManagement = React.lazy(() => import('@/pages/RefundManagement'));
const UnpaidManagement = React.lazy(() => import('@/pages/UnpaidManagement'));
const SalesStats = React.lazy(() => import('@/pages/SalesStats'));
const StatisticsManagement = React.lazy(() => import('@/pages/StatisticsManagement'));
const ClothingManagement = React.lazy(() => import('@/pages/ClothingManagement'));

// --- Sprint 4: 수업 관리 강화 ---
const ClassTemplates = React.lazy(() => import('@/pages/ClassTemplates'));
const ClassSchedule = React.lazy(() => import('@/pages/ClassSchedule'));
const ClassStats = React.lazy(() => import('@/pages/ClassStats'));
const InstructorStatus = React.lazy(() => import('@/pages/InstructorStatus'));

// --- 골프 타석 관리 ---
const GolfBayManagement = React.lazy(() => import('@/pages/GolfBayManagement'));

// --- Sprint 5: 매출/설정/전자계약/공통 ---
const DeferredRevenue = React.lazy(() => import('@/pages/DeferredRevenue'));
const DiscountSettings = React.lazy(() => import('@/pages/DiscountSettings'));
const StaffAttendancePage = React.lazy(() => import('@/pages/StaffAttendance'));
const ExerciseProgramManagement = React.lazy(() => import('@/pages/ExerciseProgramManagement'));
const Notices = React.lazy(() => import('@/pages/Notices'));

export default function App() {
  const navigate = useNavigate();

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

  return (
    <ErrorBoundary>
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
      <Route path="/audit-log" element={<PrivateRoute><AuditLog /></PrivateRoute>} />

      {/* 존재하지 않는 경로 → 404 페이지 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
