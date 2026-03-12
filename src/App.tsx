import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { setNavigate } from '@/internal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PrivateRoute from '@/components/PrivateRoute';
import { initAuthListener, restoreSupabaseSession } from '@/stores/authStore';

// --- Pages ---
import Dashboard from '@/pages/Dashboard';
import MemberList from '@/pages/MemberList';
import MemberDetail from '@/pages/MemberDetail';
import MemberForm from '@/pages/MemberForm';
import BodyComposition from '@/pages/BodyComposition';
import Attendance from '@/pages/Attendance';
import Calendar from '@/pages/Calendar';
import Sales from '@/pages/Sales';
import SalesPos from '@/pages/SalesPos';
import PosPayment from '@/pages/PosPayment';
import ProductList from '@/pages/ProductList';
import ProductForm from '@/pages/ProductForm';
import Locker from '@/pages/Locker';
import LockerManagement from '@/pages/LockerManagement';
import RfidManagement from '@/pages/RfidManagement';
import RoomManagement from '@/pages/RoomManagement';
import StaffList from '@/pages/StaffList';
import StaffForm from '@/pages/StaffForm';
import StaffResignation from '@/pages/StaffResignation';
import Payroll from '@/pages/Payroll';
import PayrollStatement from '@/pages/PayrollStatement';
import MessageSend from '@/pages/MessageSend';
import AutoAlarm from '@/pages/AutoAlarm';
import CouponManagement from '@/pages/CouponManagement';
import MileageManagement from '@/pages/MileageManagement';
import ContractWizard from '@/pages/ContractWizard';
import Settings from '@/pages/Settings';
import PermissionSettings from '@/pages/PermissionSettings';
import KioskSettings from '@/pages/KioskSettings';
import IotSettings from '@/pages/IotSettings';
import Subscription from '@/pages/Subscription';
import BranchManagement from '@/pages/BranchManagement';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Forbidden from '@/pages/Forbidden';

// --- 멀티테넌트 페이지 ---
import SuperDashboard from '@/pages/SuperDashboard';
import AuditLog from '@/pages/AuditLog';
import MemberTransfer from '@/pages/MemberTransfer';

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

      {/* 매출/결제 */}
      <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
      <Route path="/pos" element={<PrivateRoute><SalesPos /></PrivateRoute>} />
      <Route path="/pos/payment" element={<PrivateRoute><PosPayment /></PrivateRoute>} />

      {/* 상품 */}
      <Route path="/products" element={<PrivateRoute><ProductList /></PrivateRoute>} />
      <Route path="/products/new" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
      {/* 상품 수정 */}
      <Route path="/products/edit" element={<PrivateRoute><ProductForm /></PrivateRoute>} />

      {/* 시설 */}
      <Route path="/locker" element={<PrivateRoute><Locker /></PrivateRoute>} />
      <Route path="/locker/management" element={<PrivateRoute><LockerManagement /></PrivateRoute>} />
      <Route path="/rfid" element={<PrivateRoute><RfidManagement /></PrivateRoute>} />
      <Route path="/rooms" element={<PrivateRoute><RoomManagement /></PrivateRoute>} />

      {/* 직원/급여 */}
      <Route path="/staff" element={<PrivateRoute><StaffList /></PrivateRoute>} />
      <Route path="/staff/new" element={<PrivateRoute><StaffForm /></PrivateRoute>} />
      {/* 직원 수정 */}
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

      {/* 멀티테넌트 */}
      <Route path="/super-dashboard" element={<PrivateRoute><SuperDashboard /></PrivateRoute>} />
      <Route path="/audit-log" element={<PrivateRoute><AuditLog /></PrivateRoute>} />

      {/* 존재하지 않는 경로 → 404 페이지 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </ErrorBoundary>
  );
}
