import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { setNavigate } from '@/internal';

// --- Pages ---
import Dashboard from '@/pages/Dashboard';
import MemberList from '@/pages/MemberList';
import MemberDetail from '@/pages/MemberDetail';
import MemberForm from '@/pages/MemberForm';
import MemberFormTemp from '@/pages/MemberFormTemp';
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

export default function App() {
  const navigate = useNavigate();

  // moveToPage에서 React Router navigate를 쓸 수 있도록 등록
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />

      {/* 회원 */}
      <Route path="/members" element={<MemberList />} />
      <Route path="/members/detail" element={<MemberDetail />} />
      <Route path="/members/new" element={<MemberForm />} />
      <Route path="/members/edit" element={<MemberFormTemp />} />
      <Route path="/body-composition" element={<BodyComposition />} />

      {/* 출석/일정 */}
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/calendar" element={<Calendar />} />

      {/* 매출/결제 */}
      <Route path="/sales" element={<Sales />} />
      <Route path="/pos" element={<SalesPos />} />
      <Route path="/pos/payment" element={<PosPayment />} />

      {/* 상품 */}
      <Route path="/products" element={<ProductList />} />
      <Route path="/products/new" element={<ProductForm />} />

      {/* 시설 */}
      <Route path="/locker" element={<Locker />} />
      <Route path="/locker/management" element={<LockerManagement />} />
      <Route path="/rfid" element={<RfidManagement />} />
      <Route path="/rooms" element={<RoomManagement />} />

      {/* 직원/급여 */}
      <Route path="/staff" element={<StaffList />} />
      <Route path="/staff/new" element={<StaffForm />} />
      <Route path="/payroll" element={<Payroll />} />
      <Route path="/payroll/statements" element={<PayrollStatement />} />

      {/* 메시지/마케팅 */}
      <Route path="/message" element={<MessageSend />} />
      <Route path="/message/auto-alarm" element={<AutoAlarm />} />
      <Route path="/message/coupon" element={<CouponManagement />} />
      <Route path="/mileage" element={<MileageManagement />} />
      <Route path="/contracts/new" element={<ContractWizard />} />

      {/* 설정 */}
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/permissions" element={<PermissionSettings />} />
      <Route path="/settings/kiosk" element={<KioskSettings />} />
      <Route path="/settings/iot" element={<IotSettings />} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="/branches" element={<BranchManagement />} />
    </Routes>
  );
}
