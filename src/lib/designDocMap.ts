// 화면설계서 라우트별 문서 매핑
// 두 소스를 병합해 Cmd+/ 오버레이에서 탭으로 노출:
//   - functional: docs/기능명세서/<file>.md 의 섹션 (현행 자동생성 대상)
//   - screen:     docs/화면설계서/<folder>/ 스캔 (마스터 + 상태별 파일)
//
// 실제 콘텐츠 로딩은 `src/app/api/design-doc/route.ts` 가 수행합니다.
// 이 파일은 타입 + 라우트→소스 매핑 + 폴백용 보조 역할만 합니다.

export interface FunctionalSource {
  /** docs/기능명세서/ 하위 파일명 (예: '회원관리.md') */
  file: string;
  /** 해당 파일 내 섹션을 찾기 위한 키워드 배열 */
  keywords: string[];
}

export interface ScreenSource {
  /** docs/화면설계서/ 하위 상대 경로 (예: 'D01-공통/SCR-100-로그인') */
  folder: string;
}

export interface RouteDocMapping {
  title: string;
  category: string;
  functional?: FunctionalSource;
  screen?: ScreenSource;
}

// ── 라우트 → 문서 소스 매핑 ────────────────────────────────────────────────
export const ROUTE_TO_DOC: Record<string, RouteDocMapping> = {
  // ── 본사관리 ──
  '/': { title: '대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['대시보드', '1. 대시보드'] } },
  '/login': {
    title: '로그인',
    category: '인증',
    functional: { file: '본사관리.md', keywords: ['로그인', '11. 로그인'] },
    screen: { folder: 'D01-공통/SCR-100-로그인' },
  },
  '/super-dashboard': { title: '슈퍼 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['슈퍼 대시보드', '2. 슈퍼 대시보드'] } },
  '/branches': { title: '지점 관리', category: '본사관리', functional: { file: '본사관리.md', keywords: ['지점 관리', '3. 지점 관리'] } },
  '/branch-report': { title: '지점 리포트', category: '본사관리', functional: { file: '본사관리.md', keywords: ['지점 리포트', '4. 지점 리포트'] } },
  '/kpi': { title: 'KPI 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['KPI 대시보드', '5. KPI 대시보드'] } },
  '/kpi-preview': { title: 'KPI 프리뷰', category: '본사관리', functional: { file: '본사관리.md', keywords: ['KPI 센터', '6. KPI 센터'] } },
  '/onboarding': { title: '온보딩 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['온보딩', '7. 온보딩'] } },
  '/audit-log': { title: '감사 로그', category: '본사관리', functional: { file: '본사관리.md', keywords: ['감사 로그', '8. 감사 로그'] } },
  '/today-tasks': { title: 'Today Tasks', category: '본사관리', functional: { file: '본사관리.md', keywords: ['Today Tasks', '9. Today Tasks'] } },
  '/reports': { title: '자동 리포트', category: '본사관리', functional: { file: '본사관리.md', keywords: ['리포트', '10. 리포트'] } },

  // ── 회원관리 ──
  '/members': { title: '회원 목록', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 목록', '1. 회원 목록'] } },
  '/members/new': { title: '회원 등록', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 등록', '2. 회원 등록'] } },
  '/members/edit': { title: '회원 수정', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 등록/수정', '2. 회원 등록'] } },
  '/members/detail': {
    title: '회원 상세',
    category: '회원관리',
    functional: { file: '통합운영_IOT_헬스.md', keywords: ['회원 상세 건강/연동 요약', 'SCR-I007 회원 상세 건강/연동 요약'] },
  },
  '/members/transfer': { title: '회원 이관', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 지점 이관', '4. 회원 지점 이관'] } },
  '/body-composition': { title: '체성분 관리', category: '회원관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['체성분 통합 관리', 'SCR-I006 체성분 통합 관리'] } },

  // ── 매출관리 ──
  '/sales': { title: '매출 현황', category: '매출관리', functional: { file: '매출관리.md', keywords: ['매출 현황', '1. 매출 현황'] } },
  '/pos': { title: 'POS 판매', category: '매출관리', functional: { file: '매출관리.md', keywords: ['POS 판매', '2. POS 판매'] } },
  '/pos/payment': { title: 'POS 결제', category: '매출관리', functional: { file: '매출관리.md', keywords: ['POS 결제', '3. POS 결제'] } },
  '/sales/stats': { title: '매출 통계', category: '매출관리', functional: { file: '매출관리.md', keywords: ['매출 통계', '4. 매출 통계'] } },
  '/sales/statistics-management': { title: '통계 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['통계관리', '5. 통계관리'] } },
  '/deferred-revenue': { title: '선수익금', category: '매출관리', functional: { file: '매출관리.md', keywords: ['선수익금', '6. 선수익금'] } },
  '/refunds': { title: '환불 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['환불 관리', '7. 환불 관리'] } },
  '/unpaid': { title: '미수금 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['미수금 관리', '8. 미수금 관리'] } },

  // ── 수업관리 ──
  '/calendar': { title: '수업 캘린더', category: '수업관리', functional: { file: '수업관리.md', keywords: ['캘린더', '1. 캘린더'] } },
  '/class-schedule': { title: '시간표 등록', category: '수업관리', functional: { file: '수업관리.md', keywords: ['시간표', '2. 시간표'] } },
  '/class-templates': { title: '수업 템플릿', category: '수업관리', functional: { file: '수업관리.md', keywords: ['수업 템플릿', '3. 수업 템플릿'] } },
  '/class-stats': { title: '수업 현황', category: '수업관리', functional: { file: '수업관리.md', keywords: ['수업 현황', '4. 수업 현황'] } },
  '/instructor-status': { title: '강사 현황', category: '수업관리', functional: { file: '수업관리.md', keywords: ['강사 근무', '5. 강사 근무'] } },
  '/lessons': { title: '수업 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['수업 관리', '6. 수업 관리'] } },
  '/lesson-counts': { title: '횟수 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['횟수 관리', '7. 횟수 관리'] } },
  '/penalties': { title: '페널티 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['페널티', '8. 페널티'] } },
  '/valid-lessons': { title: '유효 수업', category: '수업관리', functional: { file: '수업관리.md', keywords: ['유효 수업', '9. 유효 수업'] } },
  '/schedule-requests': { title: '일정 요청', category: '수업관리', functional: { file: '수업관리.md', keywords: ['일정 요청', '10. 일정 요청'] } },
  '/exercise-programs': { title: '운동 프로그램', category: '수업관리', functional: { file: '수업관리.md', keywords: ['운동 프로그램', '11. 운동 프로그램'] } },

  // ── 시설관리 ──
  '/locker': { title: '락커 관리', category: '시설관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['옷 락커 운영 관리', 'SCR-I004 옷 락커 운영 관리'] } },
  '/locker/management': { title: '사물함 배정', category: '시설관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['고정 물품 락커 관리', 'SCR-I005 고정 물품 락커 관리'] } },
  '/rfid': { title: 'RFID 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['밴드/카드', '3. 밴드/카드'] } },
  '/rooms': { title: '운동룸 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['운동룸', '4. 운동룸'] } },
  '/golf-bays': { title: '골프 타석', category: '시설관리', functional: { file: '시설관리.md', keywords: ['골프 타석', '5. 골프 타석'] } },
  '/clothing': { title: '운동복 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['운동복', '6. 운동복'] } },

  // ── 설정관리 ──
  '/settings': { title: '센터 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['센터 설정', '1. 센터 설정'] } },
  '/settings/permissions': { title: '권한 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['권한 설정', '2. 권한 설정'] } },
  '/settings/kiosk': { title: '키오스크 설정', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['키오스크 설정', 'SCR-I002 키오스크 설정'] } },
  '/settings/iot': { title: 'IoT 설정', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['IoT 연동 관리', 'SCR-I003 IoT 연동 관리'] } },
  '/subscription': { title: '구독 관리', category: '설정관리', functional: { file: '설정관리.md', keywords: ['구독 관리', '5. 구독 관리'] } },
  '/notices': { title: '공지사항', category: '설정관리', functional: { file: '설정관리.md', keywords: ['공지사항', '6. 공지사항'] } },
  '/attendance': { title: '출석 관리', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['통합 출석 관리', 'SCR-I001 통합 출석 관리'] } },

  // ── 마케팅 ──
  '/leads': { title: '리드 관리', category: '마케팅', functional: { file: '마케팅.md', keywords: ['리드 관리', '1. 리드 관리'] } },
  '/message': { title: '메시지 발송', category: '마케팅', functional: { file: '마케팅.md', keywords: ['메시지 발송', '2. 메시지 발송'] } },
  '/message/auto-alarm': { title: '자동 알림', category: '마케팅', functional: { file: '마케팅.md', keywords: ['자동 알림', '3. 자동 알림'] } },
  '/message/coupon': { title: '쿠폰 관리', category: '마케팅', functional: { file: '마케팅.md', keywords: ['쿠폰 관리', '4. 쿠폰 관리'] } },
  '/mileage': { title: '마일리지', category: '마케팅', functional: { file: '마케팅.md', keywords: ['마일리지', '5. 마일리지'] } },
  '/contracts/new': { title: '전자계약', category: '마케팅', functional: { file: '마케팅.md', keywords: ['전자계약', '6. 전자계약'] } },

  // ── 직원관리 ──
  '/staff': { title: '직원 목록', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 목록', '1. 직원 목록'] } },
  '/staff/new': { title: '직원 등록', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 등록', '2. 직원 등록'] } },
  '/staff/edit': { title: '직원 수정', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 등록/수정', '2. 직원 등록'] } },
  '/staff/resignation': { title: '퇴사 처리', category: '직원관리', functional: { file: '직원관리.md', keywords: ['퇴사 처리', '3. 퇴사 처리'] } },
  '/staff/attendance': { title: '직원 근태', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 근태', '4. 직원 근태'] } },
  '/payroll': { title: '급여 관리', category: '직원관리', functional: { file: '직원관리.md', keywords: ['급여 관리', '5. 급여 관리'] } },
  '/payroll/statements': { title: '급여 명세서', category: '직원관리', functional: { file: '직원관리.md', keywords: ['급여 명세서', '6. 급여 명세서'] } },

  // ── 상품관리 ──
  '/products': { title: '상품 목록', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 목록', '1. 상품 목록'] } },
  '/products/new': { title: '상품 등록', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] } },
  '/products/edit': { title: '상품 수정', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] } },
  '/discount-settings': { title: '할인 설정', category: '상품관리', functional: { file: '상품관리.md', keywords: ['할인 설정', '3. 할인 설정'] } },
};

/**
 * 라우트 경로로부터 매핑 정보를 조회하는 함수.
 * 정확한 매칭 -> 쿼리 제거 -> 트레일링 슬래시 제거 순으로 시도.
 */
export function getRouteMapping(pathname: string): RouteDocMapping | null {
  if (ROUTE_TO_DOC[pathname]) return ROUTE_TO_DOC[pathname];

  const basePath = pathname.split('?')[0];
  if (ROUTE_TO_DOC[basePath]) return ROUTE_TO_DOC[basePath];

  const trimmed = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  if (ROUTE_TO_DOC[trimmed]) return ROUTE_TO_DOC[trimmed];

  return null;
}
