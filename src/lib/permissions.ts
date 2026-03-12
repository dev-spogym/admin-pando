/**
 * 역할 기반 접근 제어(RBAC) 설정
 *
 * PermissionSettings.tsx의 INITIAL_ROLES.code 값과 호환:
 *   primary | owner | manager | fc | staff | readonly
 */

// 역할 정의 (PermissionSettings INITIAL_ROLES.code와 일치)
export type UserRole = 'primary' | 'owner' | 'manager' | 'fc' | 'staff' | 'readonly';

// 역할별 한글 라벨
export const ROLE_LABELS: Record<UserRole, string> = {
  primary: '최고관리자',
  owner: '센터장',
  manager: '매니저',
  fc: '피트니스 코치',
  staff: '스태프',
  readonly: '조회전용',
};

// 역할 계층 (높은 숫자 = 높은 권한)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  primary: 100,
  owner: 80,
  manager: 60,
  fc: 40,
  staff: 20,
  readonly: 10,
};

// 메뉴/페이지 접근 권한 - 각 라우트에 접근 가능한 역할 목록
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // 대시보드 - readonly 제외
  '/': ['primary', 'owner', 'manager', 'fc', 'staff'],

  // 회원
  '/members': ['primary', 'owner', 'manager', 'fc', 'staff'],
  '/members/detail': ['primary', 'owner', 'manager', 'fc', 'staff'],
  '/members/new': ['primary', 'owner', 'manager', 'staff'],
  '/members/edit': ['primary', 'owner', 'manager', 'staff'],
  '/attendance': ['primary', 'owner', 'manager', 'fc', 'staff'],
  '/body-composition': ['primary', 'owner', 'manager', 'fc'],
  '/mileage': ['primary', 'owner', 'manager'],
  '/contracts/new': ['primary', 'owner', 'manager', 'staff'],

  // 수업/캘린더
  '/calendar': ['primary', 'owner', 'manager', 'fc'],

  // 매출
  '/sales': ['primary', 'owner', 'manager'],
  '/pos': ['primary', 'owner', 'manager', 'staff'],
  '/pos/payment': ['primary', 'owner', 'manager', 'staff'],

  // 상품
  '/products': ['primary', 'owner', 'manager', 'staff'],
  '/products/new': ['primary', 'owner'],
  '/products/edit': ['primary', 'owner'],

  // 시설
  '/locker': ['primary', 'owner', 'manager', 'staff'],
  '/locker/management': ['primary', 'owner'],
  '/rfid': ['primary', 'owner', 'staff'],
  '/rooms': ['primary', 'owner', 'manager'],

  // 급여
  '/payroll': ['primary', 'owner'],
  '/payroll/statements': ['primary', 'owner', 'manager', 'fc', 'staff', 'readonly'], // 본인 명세서

  // 메시지
  '/message': ['primary', 'owner', 'manager'],
  '/message/auto-alarm': ['primary', 'owner'],
  '/message/coupon': ['primary', 'owner', 'manager'],

  // 설정
  '/settings': ['primary', 'owner'],
  '/settings/permissions': ['primary', 'owner'],
  '/settings/kiosk': ['primary', 'owner'],
  '/settings/iot': ['primary', 'owner'],
  '/subscription': ['primary'],
  '/branches': ['primary'],
  '/staff': ['primary', 'owner'],
  '/staff/new': ['primary', 'owner'],
  '/staff/edit': ['primary', 'owner'],
  '/staff/resignation': ['primary', 'owner'],

  // 멀티테넌트 (슈퍼관리자 전용 — hasPermission에서 isSuperAdmin bypass 처리)
  '/super-dashboard': [],
  '/audit-log': ['primary', 'owner'],
  '/members/transfer': ['primary', 'owner', 'manager'],
  '/branch-report': [],
};

// 사이드바 메뉴 표시 권한 (상위 그룹 단위)
export const MENU_PERMISSIONS: Record<string, UserRole[]> = {
  '대시보드': ['primary', 'owner', 'manager', 'fc', 'staff'],
  '회원': ['primary', 'owner', 'manager', 'fc', 'staff'],
  '수업/캘린더': ['primary', 'owner', 'manager', 'fc'],
  '매출': ['primary', 'owner', 'manager', 'staff'],
  '상품': ['primary', 'owner', 'manager', 'staff'],
  '시설': ['primary', 'owner', 'manager', 'staff'],
  '급여': ['primary', 'owner', 'manager', 'fc', 'staff', 'readonly'],
  '메시지/쿠폰': ['primary', 'owner', 'manager'],
  '설정': ['primary', 'owner'],
};

/**
 * 라우트 접근 권한 체크
 * @param userRole - 사용자 역할 코드
 * @param route - 라우트 경로
 * @param _isSuperAdmin - 슈퍼관리자 여부 (선택, 미지정 시 authStore에서 확인)
 * @returns 접근 허용 여부
 */
export function hasPermission(userRole: string, route: string, _isSuperAdmin?: boolean): boolean {
  // 슈퍼관리자는 모든 라우트 접근 가능
  if (_isSuperAdmin) return true;

  const allowedRoles = ROUTE_PERMISSIONS[route];
  // 정의되지 않은 라우트는 기본 허용 (login, 404 등)
  if (!allowedRoles) return true;
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * 사이드바 메뉴 그룹 표시 권한 체크
 * @param userRole - 사용자 역할 코드
 * @param menuLabel - 메뉴 그룹 라벨
 * @returns 표시 허용 여부
 */
export function hasMenuPermission(userRole: string, menuLabel: string): boolean {
  const allowedRoles = MENU_PERMISSIONS[menuLabel];
  if (!allowedRoles) return true;
  return allowedRoles.includes(userRole as UserRole);
}

// 기능별 권한 (페이지 내 버튼/액션)
export const FEATURE_PERMISSIONS = {
  memberDelete: ['primary', 'owner'],
  memberBulkAction: ['primary', 'owner', 'manager'],
  memberTransfer: ['primary', 'owner', 'manager'],
  memberWithdraw: ['primary', 'owner'],
  salesRefund: ['primary', 'owner'],
  productCreate: ['primary', 'owner'],
  productEdit: ['primary', 'owner'],
  staffManage: ['primary', 'owner'],
  staffResign: ['primary', 'owner'],
  staffTransfer: ['primary', 'owner'],
  payrollEdit: ['primary', 'owner'],
  settingsEdit: ['primary', 'owner'],
  excelDownload: ['primary', 'owner', 'manager'],
  auditLogView: ['primary', 'owner'],
  branchSwitch: [], // 슈퍼관리자 전용 (hasFeature에서 isSuperAdmin bypass)
} as const;

/**
 * 기능(버튼/액션) 수행 권한 체크
 * @param userRole - 사용자 역할 코드
 * @param feature - 기능 키
 * @returns 수행 허용 여부
 */
export function hasFeature(userRole: string, feature: keyof typeof FEATURE_PERMISSIONS, _isSuperAdmin?: boolean): boolean {
  if (_isSuperAdmin) return true;
  return (FEATURE_PERMISSIONS[feature] as readonly string[]).includes(userRole);
}

/**
 * 역할 계층 비교 - 상위 역할인지 확인
 * @param userRole - 사용자 역할
 * @param targetRole - 비교 대상 역할
 * @returns userRole이 targetRole보다 같거나 높은 권한인지
 */
export function isRoleAtLeast(userRole: string, targetRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;
  return userLevel >= targetLevel;
}
