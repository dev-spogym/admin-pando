// ============================================================
// ModnCode Internal Shim - moveToPage / stackPage
// ============================================================
// 원래 ModnCode 플랫폼의 viewId 기반 네비게이션을
// React Router 기반으로 변환

let navigateFn: ((path: string) => void) | null = null;

export function setNavigate(fn: (path: string) => void) {
  navigateFn = fn;
}

// viewId → route path 매핑
const VIEW_ID_MAP: Record<number, string> = {
  966: '/',                          // 대시보드
  967: '/members',                   // 회원 목록
  968: '/attendance',                // 출석 관리
  969: '/calendar',                  // 수업/일정
  970: '/sales',                     // 매출 현황
  971: '/pos',                       // POS
  972: '/products',                  // 상품 관리
  973: '/locker',                    // 락커 관리
  974: '/staff',                     // 직원 관리
  975: '/settings',                  // 센터 설정
  976: '/payroll',                   // 급여 관리
  977: '/contracts/new',             // 전자계약
  978: '/rooms',                     // 운동룸 관리
  979: '/rfid',                      // RFID 관리
  980: '/message',                   // 메시지 발송
  981: '/mileage',                   // 마일리지 관리
  982: '/pos/payment',               // POS 결제
  983: '/subscription',              // 구독 플랜
  984: '/branches',                  // 지점 관리
  985: '/members/detail',            // 회원 상세
  986: '/members/new',               // 회원 등록
  987: '/members/edit',              // 회원 수정
  988: '/body-composition',          // 체성분
  989: '/payroll/statements',        // 급여 명세서
  990: '/login',                     // 로그인
  991: '/locker/management',         // 사물함 관리
  992: '/message/auto-alarm',        // 자동 알림
  993: '/message/coupon',            // 쿠폰 관리
  994: '/settings/kiosk',            // 키오스크 설정
  995: '/settings/iot',              // IoT 설정
  996: '/settings/permissions',      // 권한 설정
  997: '/products/new',              // 상품 등록
  998: '/staff/new',                 // 직원 등록
  999: '/staff/resignation',         // 직원 퇴사 처리
  1000: '/super-dashboard',          // 슈퍼관리자 통합 대시보드
  1001: '/audit-log',                // 감사 로그
  1002: '/members/transfer',         // 회원 이관
  1003: '/branch-report',            // 지점 비교 리포트
};

export function moveToPage(viewId: number, params?: Record<string, string | number>) {
  const path = VIEW_ID_MAP[viewId];
  if (path && navigateFn) {
    if (params) {
      const search = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      navigateFn(`${path}?${search}`);
    } else {
      navigateFn(path);
    }
  } else {
    console.warn(`[moveToPage] viewId ${viewId} → 경로를 찾을 수 없거나 네비게이터 미등록`);
  }
}

export function stackPage(viewId: number, params?: Record<string, string | number>) {
  // stackPage는 moveToPage와 동일하게 동작 (SPA에서는 구분 불필요)
  moveToPage(viewId, params);
}
