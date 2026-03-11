// ============================================================
// FitGenie CRM 2.0 - Virtual Server (Barrel Export)
// ============================================================
//
// 사용법:
//   import { memberApi, useQuery, useMutation } from '@/server';
//
// 실제 서버 전환 시:
//   import { configureClient } from '@/server';
//   configureClient({ useVirtual: false, baseUrl: 'https://api.example.com' });
//

// Types
export type {
  Member,
  MemberStatus,
  MemberTicket,
  Staff,
  StaffRole,
  StaffStatus,
  StaffAttendance,
  AttendanceStatus,
  Sale,
  SaleStatus,
  Product,
  ProductCategoryKey,
  AttendanceRecord,
  Locker,
  LockerStatus,
  LockerType,
  DashboardStats,
  BirthdayMember,
  UnpaidMember,
  HoldingMember,
  ExpiringMember,
  PaginatedResponse,
  ApiResponse,
  ApiError,
  HttpMethod,
  RequestConfig,
} from './types';

// API Client & Domain APIs
export {
  api,
  configureClient,
  memberApi,
  staffApi,
  salesApi,
  productApi,
  attendanceApi,
  lockerApi,
  dashboardApi,
  systemApi,
} from './client';

// React Hooks
export {
  useQuery,
  useMutation,
  useInfiniteQuery,
} from './hooks';

// Virtual Fetch (low-level)
export { virtualFetch } from './api';
export type { VirtualResponse } from './api';

// Store (for advanced usage / direct access)
export {
  memberStore,
  staffStore,
  staffAttendanceStore,
  salesStore,
  productStore,
  attendanceStore,
  lockerStore,
  resetAllStores,
} from './store';
