// ============================================================
// FitGenie CRM 2.0 - Virtual Server Type Definitions
// ============================================================

// --- Common ---
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: number;
  timestamp: string;
}

// --- Member ---
export interface MemberTicket {
  name: string;
  status: string;
  expiry: string;
}

export type MemberStatus = 'active' | 'imminent' | 'expired' | 'holding' | 'pending' | 'unregistered';

export interface Member {
  id: number;
  name: string;
  gender: '남' | '여';
  birthDate: string;
  age: number;
  phone: string;
  status: MemberStatus;
  statusLabel: string;
  tickets: MemberTicket[];
  rental: string;
  subscription: string;
  lockerNo: string;
  finalExpiryDate: string;
  remainingDays: number;
  lastVisit: string;
  lastContract: string;
  firstRegDate: string;
  manager: string;
  attendanceNo: string;
  company: string;
  email?: string;
  address?: string;
  memo?: string;
}

// --- Staff ---
export type StaffRole = 'trainer' | 'fc' | 'owner' | 'admin';
export type StaffStatus = 'active' | 'resigned';
export type AttendanceStatus = 'on_time' | 'late' | 'not_attended' | 'day_off';

export interface Staff {
  id: number;
  status: StaffStatus;
  name: string;
  gender: '남' | '여';
  contact: string;
  role: StaffRole;
  jobGroup: string;
  position: string;
  team: string;
  joinDate: string;
  adminId: string;
  memo: string;
  workType: string;
  attendanceStatus: AttendanceStatus;
}

export interface StaffAttendance {
  id: number;
  name: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workTime: string;
}

// --- Sales ---
export type SaleStatus = '정상' | '환불' | '취소';

export interface Sale {
  id: number;
  no: number;
  purchaseDate: string;
  type: string;
  productName: string;
  manager: string;
  buyer: string;
  buyerId: number;
  round: string;
  quantity: number;
  originalPrice: number;
  salePrice: number;
  discountPrice: number;
  paymentMethod: string;
  paymentType: string;
  paymentTool: string;
  cash: number;
  card: number;
  mileage: number;
  cardCompany: string;
  cardNumber: string;
  approvalNo: string;
  unpaid: number;
  serviceDays: number;
  serviceCount: number;
  servicePoints: number;
  status: SaleStatus;
  category: string;
  memo: string;
}

// --- Product ---
export type ProductCategoryKey = 'facility' | 'pt' | 'group' | 'option';

export interface Product {
  id: number;
  category: string;
  categoryKey: ProductCategoryKey;
  subCategory: string;
  name: string;
  cashPrice: number;
  cardPrice: number;
  period: string;
  kioskExposure: boolean;
  status: '사용' | '미사용';
  createdAt: string;
}

// --- Attendance ---
export interface AttendanceRecord {
  id: number;
  type: '회원' | '직원';
  status: '성공' | '실패';
  category: string;
  door: string;
  memberName: string;
  memberId: number;
  presence: '재실' | '부재';
  gender: '남' | '여';
  tel: string;
  inTime: string;
  outTime: string;
  visitCount: number;
  passInfo: string;
  expiryDate: string;
  lockerNo: string;
  isOtherBranch: boolean;
  address: string;
}

// --- Locker ---
export type LockerStatus = 'available' | 'in_use' | 'expiring' | 'expired' | 'unavailable';
export type LockerType = 'personal' | 'daily' | 'golf';

export interface Locker {
  id: string;
  number: number;
  type: LockerType;
  area: string;
  status: LockerStatus;
  memberName?: string;
  memberId?: string;
  expiryDate?: string;
  gender?: 'M' | 'F';
  lastUpdated?: string;
}

// --- Dashboard ---
export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  pendingMembers: number;
  unregisteredMembers: number;
}

export interface BirthdayMember {
  id: number;
  name: string;
  birth: string;
  status: string;
}

export interface UnpaidMember {
  id: number;
  name: string;
  amount: string;
  item: string;
}

export interface HoldingMember {
  id: number;
  name: string;
  period: string;
  remaining: number;
}

export interface ExpiringMember {
  id: number;
  name: string;
  expiry: string;
  dday: string;
}

// --- API Endpoint Types ---
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  method?: HttpMethod;
  params?: Record<string, any>;
  body?: any;
  delay?: number;
}

export interface RouteHandler {
  method: HttpMethod;
  pattern: RegExp;
  handler: (params: Record<string, any>, body?: any, pathParams?: Record<string, string>) => any;
}
