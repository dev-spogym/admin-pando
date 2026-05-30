import { hasPermission, normalizeRole, type UserRole } from "@/lib/permissions";

export type NavigationIconKey =
  | "home"
  | "users"
  | "calendar"
  | "trendingUp"
  | "package"
  | "building2"
  | "dollarSign"
  | "messageSquare"
  | "settings"
  | "layoutDashboard"
  | "barChart3"
  | "shield"
  | "creditCard"
  | "target"
  | "clipboardList"
  | "fileText"
  | "bellRing";

export interface NavigationLeafItem {
  label: string;
  path: string;
  viewId?: number;
  scope?: "v2";
}

export interface NavigationMenuItem extends NavigationLeafItem {
  iconKey: NavigationIconKey;
  children?: NavigationLeafItem[];
}

export interface NavigationDestination extends NavigationLeafItem {}

export const SUPER_ADMIN_MENU_ITEMS: NavigationMenuItem[] = [
  { label: "통합 대시보드", iconKey: "layoutDashboard", path: "/super-dashboard", viewId: 1000 },
  { label: "지점 관리", iconKey: "building2", path: "/branches", viewId: 984 },
  { label: "지점 비교 리포트", iconKey: "barChart3", path: "/branch-report", viewId: 1003 },
  { label: "자동 리포트", iconKey: "fileText", path: "/reports", viewId: 1004 },
  { label: "자동화 정책", iconKey: "bellRing", path: "/hq/automation-policies" },
  { label: "전체 직원 관리", iconKey: "users", path: "/staff", viewId: 974 },
  { label: "히스토리 로그", iconKey: "shield", path: "/audit-log", viewId: 1001 },
  { label: "구독 관리", iconKey: "creditCard", path: "/subscription", viewId: 983 },
  { label: "커스텀 대시보드", iconKey: "layoutDashboard", path: "/dashboard/builder" },
  { label: "벤치마크 비교", iconKey: "barChart3", path: "/benchmark" },
  { label: "예측 분석", iconKey: "target", path: "/analytics/forecast" },
  { label: "NPS 설문", iconKey: "messageSquare", path: "/nps" },
];

export const APP_MENU_ITEMS: NavigationMenuItem[] = [
  { label: "대시보드", iconKey: "home", path: "/", viewId: 966 },
  { label: "KPI 센터", iconKey: "target", path: "/kpi-preview" },
  { label: "Today Tasks", iconKey: "clipboardList", path: "/today-tasks" },
  {
    label: "회원",
    iconKey: "users",
    path: "/members",
    children: [
      { label: "회원 목록", path: "/members", viewId: 967 },
      { label: "회원 등록", path: "/members/new", viewId: 986 },
      { label: "체성분 관리", path: "/body-composition" },
      { label: "등급 관리", path: "/members/grade" },
      { label: "출석 관리", path: "/attendance", viewId: 968 },
      { label: "전자계약", path: "/contracts/new", viewId: 977 },
    ],
  },
  {
    label: "수업/캘린더",
    iconKey: "calendar",
    path: "/calendar",
    children: [
      { label: "캘린더", path: "/calendar", viewId: 969 },
      { label: "예약 목록", path: "/class-reservations" },
      { label: "일정 요청", path: "/schedule-requests" },
      { label: "수업 관리", path: "/lessons" },
      { label: "횟수 관리", path: "/lesson-counts" },
      { label: "페널티 관리", path: "/penalties" },
      { label: "유효 수업 목록", path: "/valid-lessons" },
      { label: "수업 템플릿", path: "/class-templates" },
      { label: "시간표 등록", path: "/class-schedule" },
      { label: "수업 현황", path: "/class-stats" },
      { label: "강사 현황", path: "/instructor-status" },
      { label: "대기열 관리", path: "/class-waitlist" },
      { label: "수업 평가", path: "/class-feedback" },
      { label: "수업 출석/완료 확인", path: "/attendance/lesson-completion" },
      { label: "수업 녹화 V2/후속", path: "/class-recording", scope: "v2" },
    ],
  },
  {
    label: "직원",
    iconKey: "users",
    path: "/staff",
    children: [
      { label: "직원 관리", path: "/staff", viewId: 974 },
      { label: "직원 등록", path: "/staff/new", viewId: 998 },
      { label: "직원 근태", path: "/staff/attendance" },
      { label: "급여 관리", path: "/payroll", viewId: 976 },
      { label: "급여 명세서", path: "/payroll/statements", viewId: 989 },
    ],
  },
  {
    label: "매출",
    iconKey: "trendingUp",
    path: "/sales",
    children: [
      { label: "매출 현황", path: "/sales", viewId: 970 },
      { label: "매출 통계", path: "/sales/stats" },
      { label: "통계 관리", path: "/sales/statistics-management" },
      { label: "KPI 대시보드", path: "/kpi" },
      { label: "온보딩 현황", path: "/onboarding" },
      { label: "선수익금", path: "/deferred-revenue" },
      { label: "POS 결제", path: "/pos", viewId: 971 },
      { label: "결제 취소 / 부분 환불", path: "/sales/cancel-refund" },
      { label: "환불 관리", path: "/refunds" },
      { label: "미수금 관리", path: "/unpaid" },
    ],
  },
  {
    label: "상품",
    iconKey: "package",
    path: "/products",
    children: [
      { label: "상품 관리", path: "/products", viewId: 972 },
      { label: "상품 카탈로그 V2/후속", path: "/products/catalog", scope: "v2" },
      { label: "상품 비교 V2/후속", path: "/products/compare", scope: "v2" },
      { label: "재고 관리 D06/후속", path: "/products/inventory", scope: "v2" },
      { label: "시즌 가격", path: "/products/seasonal-price" },
      { label: "할인 설정", path: "/discount-settings" },
    ],
  },
  {
    label: "시설",
    iconKey: "building2",
    path: "/locker",
    children: [
      { label: "락커 관리", path: "/locker", viewId: 973 },
      { label: "사물함 관리", path: "/locker/management", viewId: 991 },
      { label: "밴드/카드", path: "/rfid", viewId: 979 },
      { label: "운동룸", path: "/rooms", viewId: 978 },
      { label: "골프 타석", path: "/golf-bays" },
      { label: "상품 재고", path: "/facility/inventory" },
      { label: "옷 보관함", path: "/clothing-locker" },
      { label: "장비 점검", path: "/equipment-check" },
      { label: "소모품 재고", path: "/consumables" },
      { label: "청소 스케줄", path: "/cleaning-schedule" },
      { label: "공간 자산 관리", path: "/asset-management" },
    ],
  },
  {
    label: "영업/마케팅",
    iconKey: "messageSquare",
    path: "/message",
    children: [
      { label: "리드 관리", path: "/leads" },
      { label: "메시지 발송", path: "/message", viewId: 980 },
      { label: "자동 알림", path: "/message/auto-alarm", viewId: 992 },
      { label: "쿠폰 관리", path: "/message/coupon", viewId: 993 },
      { label: "캠페인 관리", path: "/marketing/campaign" },
      { label: "리퍼럴 프로그램", path: "/marketing/referral" },
      { label: "SMS/카카오", path: "/marketing/sms" },
      { label: "A/B 테스트", path: "/marketing/ab-test" },
      { label: "마일리지", path: "/mileage", viewId: 981 },
    ],
  },
  {
    label: "설정",
    iconKey: "settings",
    path: "/settings",
    children: [
      { label: "센터 설정", path: "/settings", viewId: 975 },
      { label: "운동 프로그램", path: "/exercise-programs" },
      { label: "권한 설정", path: "/settings/permissions", viewId: 996 },
      { label: "키오스크", path: "/settings/kiosk", viewId: 994 },
      { label: "키오스크 운영", path: "/kiosk-ops" },
      { label: "출입문/IoT", path: "/settings/iot", viewId: 995 },
      { label: "자동화 적용", path: "/settings/automation" },
      { label: "출석 설정", path: "/settings/attendance" },
      { label: "커스텀 역할", path: "/settings/custom-role" },
      { label: "다국어 설정", path: "/settings/language" },
      { label: "백업/복원", path: "/settings/backup" },
      { label: "구독 관리", path: "/subscription", viewId: 983 },
      { label: "지점 관리", path: "/branches", viewId: 984 },
      { label: "공지사항", path: "/notices" },
    ],
  },
];

const ROLE_HOME_CANDIDATES: Record<UserRole, NavigationDestination[]> = {
  primary: [
    { label: "대시보드", path: "/", viewId: 966 },
    { label: "회원 목록", path: "/members", viewId: 967 },
  ],
  owner: [
    { label: "대시보드", path: "/", viewId: 966 },
    { label: "회원 목록", path: "/members", viewId: 967 },
  ],
  manager: [
    { label: "대시보드", path: "/", viewId: 966 },
    { label: "회원 목록", path: "/members", viewId: 967 },
  ],
  fc: [
    { label: "캘린더", path: "/calendar", viewId: 969 },
    { label: "예약 목록", path: "/class-reservations" },
    { label: "회원 목록", path: "/members", viewId: 967 },
  ],
  staff: [
    { label: "출석 관리", path: "/attendance", viewId: 968 },
    { label: "회원 목록", path: "/members", viewId: 967 },
    { label: "POS 결제", path: "/pos", viewId: 971 },
  ],
  readonly: [
    { label: "급여 명세서", path: "/payroll/statements", viewId: 989 },
    { label: "예약 목록", path: "/class-reservations" },
  ],
};

export function getDefaultWorkspace(userRole: string, isSuperAdmin = false): NavigationDestination {
  if (isSuperAdmin) {
    return SUPER_ADMIN_MENU_ITEMS[0];
  }

  const normalizedRole = normalizeRole(userRole);
  const candidates = ROLE_HOME_CANDIDATES[normalizedRole] ?? ROLE_HOME_CANDIDATES.staff;
  return (
    candidates.find((candidate) => hasPermission(normalizedRole, candidate.path, isSuperAdmin)) ??
    candidates[0]
  );
}
