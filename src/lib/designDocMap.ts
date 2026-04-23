// 화면설계서 라우트별 명세서 매핑
// 실제 내용은 API Route에서 기능명세서 마크다운 파일을 직접 로드합니다.
// 이 파일은 타입 정의 + 라우트->파일 매핑 + 폴백용 보조 역할만 수행합니다.

export interface Section {
  id: string;
  title: string;
  content: string;
  isRelevant?: boolean;
}

export interface DesignDoc {
  title: string;
  category: string;
  file?: string;
  sections: Section[];
}

// 라우트 -> 기능명세서 파일 + 키워드 매핑 (API Route와 동일)
export const ROUTE_TO_DOC: Record<string, { file: string; keywords: string[]; title: string; category: string; directory?: string }> = {
  // ── 본사관리 ──
  '/': { file: '본사관리.md', keywords: ['대시보드', '1. 대시보드'], title: '대시보드', category: '본사관리' },
  '/login': { file: '본사관리.md', keywords: ['로그인', '11. 로그인'], title: '로그인', category: '인증' },
  '/super-dashboard': { file: '본사관리.md', keywords: ['슈퍼 대시보드', '2. 슈퍼 대시보드'], title: '슈퍼 대시보드', category: '본사관리' },
  '/branches': { file: '본사관리.md', keywords: ['지점 관리', '3. 지점 관리'], title: '지점 관리', category: '본사관리' },
  '/branch-report': { file: '본사관리.md', keywords: ['지점 리포트', '4. 지점 리포트'], title: '지점 리포트', category: '본사관리' },
  '/kpi': { file: '본사관리.md', keywords: ['KPI 대시보드', '5. KPI 대시보드'], title: 'KPI 대시보드', category: '본사관리' },
  '/kpi-preview': { file: '본사관리.md', keywords: ['KPI 센터', '6. KPI 센터'], title: 'KPI 프리뷰', category: '본사관리' },
  '/onboarding': { file: '본사관리.md', keywords: ['온보딩', '7. 온보딩'], title: '온보딩 대시보드', category: '본사관리' },
  '/audit-log': { file: '본사관리.md', keywords: ['감사 로그', '8. 감사 로그'], title: '감사 로그', category: '본사관리' },
  '/today-tasks': { file: '본사관리.md', keywords: ['Today Tasks', '9. Today Tasks'], title: 'Today Tasks', category: '본사관리' },
  '/reports': { file: '본사관리.md', keywords: ['리포트', '10. 리포트'], title: '자동 리포트', category: '본사관리' },

  // ── 회원관리 ──
  '/members': { file: '회원관리.md', keywords: ['회원 목록', '1. 회원 목록'], title: '회원 목록', category: '회원관리' },
  '/members/new': { file: '회원관리.md', keywords: ['회원 등록', '2. 회원 등록'], title: '회원 등록', category: '회원관리' },
  '/members/edit': { file: '회원관리.md', keywords: ['회원 등록/수정', '2. 회원 등록'], title: '회원 수정', category: '회원관리' },
  '/members/detail': { file: '통합운영_IOT_헬스.md', keywords: ['회원 상세 건강/연동 요약', 'SCR-I007 회원 상세 건강/연동 요약'], title: '회원 상세', category: '회원관리' },
  '/members/transfer': { file: '회원관리.md', keywords: ['회원 지점 이관', '4. 회원 지점 이관'], title: '회원 이관', category: '회원관리' },
  '/body-composition': { file: '통합운영_IOT_헬스.md', keywords: ['체성분 통합 관리', 'SCR-I006 체성분 통합 관리'], title: '체성분 관리', category: '회원관리' },

  // ── 매출관리 ──
  '/sales': { file: '매출관리.md', keywords: ['매출 현황', '1. 매출 현황'], title: '매출 현황', category: '매출관리' },
  '/pos': { file: '매출관리.md', keywords: ['POS 판매', '2. POS 판매'], title: 'POS 판매', category: '매출관리' },
  '/pos/payment': { file: '매출관리.md', keywords: ['POS 결제', '3. POS 결제'], title: 'POS 결제', category: '매출관리' },
  '/sales/stats': { file: '매출관리.md', keywords: ['매출 통계', '4. 매출 통계'], title: '매출 통계', category: '매출관리' },
  '/sales/statistics-management': { file: '매출관리.md', keywords: ['통계관리', '5. 통계관리'], title: '통계 관리', category: '매출관리' },
  '/deferred-revenue': { file: '매출관리.md', keywords: ['선수익금', '6. 선수익금'], title: '선수익금', category: '매출관리' },
  '/refunds': { file: '매출관리.md', keywords: ['환불 관리', '7. 환불 관리'], title: '환불 관리', category: '매출관리' },
  '/unpaid': { file: '매출관리.md', keywords: ['미수금 관리', '8. 미수금 관리'], title: '미수금 관리', category: '매출관리' },

  // ── 수업관리 ──
  '/calendar': { file: '수업관리.md', keywords: ['캘린더', '1. 캘린더'], title: '수업 캘린더', category: '수업관리' },
  '/class-schedule': { file: '수업관리.md', keywords: ['시간표', '2. 시간표'], title: '시간표 등록', category: '수업관리' },
  '/class-templates': { file: '수업관리.md', keywords: ['수업 템플릿', '3. 수업 템플릿'], title: '수업 템플릿', category: '수업관리' },
  '/class-stats': { file: '수업관리.md', keywords: ['수업 현황', '4. 수업 현황'], title: '수업 현황', category: '수업관리' },
  '/instructor-status': { file: '수업관리.md', keywords: ['강사 근무', '5. 강사 근무'], title: '강사 현황', category: '수업관리' },
  '/lessons': { file: '수업관리.md', keywords: ['수업 관리', '6. 수업 관리'], title: '수업 관리', category: '수업관리' },
  '/lesson-counts': { file: '수업관리.md', keywords: ['횟수 관리', '7. 횟수 관리'], title: '횟수 관리', category: '수업관리' },
  '/penalties': { file: '수업관리.md', keywords: ['페널티', '8. 페널티'], title: '페널티 관리', category: '수업관리' },
  '/valid-lessons': { file: '수업관리.md', keywords: ['유효 수업', '9. 유효 수업'], title: '유효 수업', category: '수업관리' },
  '/schedule-requests': { file: '수업관리.md', keywords: ['일정 요청', '10. 일정 요청'], title: '일정 요청', category: '수업관리' },
  '/exercise-programs': { file: '수업관리.md', keywords: ['운동 프로그램', '11. 운동 프로그램'], title: '운동 프로그램', category: '수업관리' },

  // ── 시설관리 ──
  '/locker': { file: '통합운영_IOT_헬스.md', keywords: ['옷 락커 운영 관리', 'SCR-I004 옷 락커 운영 관리'], title: '락커 관리', category: '시설관리' },
  '/locker/management': { file: '통합운영_IOT_헬스.md', keywords: ['고정 물품 락커 관리', 'SCR-I005 고정 물품 락커 관리'], title: '사물함 배정', category: '시설관리' },
  '/rfid': { file: '시설관리.md', keywords: ['밴드/카드', '3. 밴드/카드'], title: 'RFID 관리', category: '시설관리' },
  '/rooms': { file: '시설관리.md', keywords: ['운동룸', '4. 운동룸'], title: '운동룸 관리', category: '시설관리' },
  '/golf-bays': { file: '시설관리.md', keywords: ['골프 타석', '5. 골프 타석'], title: '골프 타석', category: '시설관리' },
  '/clothing': { file: '시설관리.md', keywords: ['운동복', '6. 운동복'], title: '운동복 관리', category: '시설관리' },

  // ── 설정관리 ──
  '/settings': { file: '설정관리.md', keywords: ['센터 설정', '1. 센터 설정'], title: '센터 설정', category: '설정관리' },
  '/settings/permissions': { file: '설정관리.md', keywords: ['권한 설정', '2. 권한 설정'], title: '권한 설정', category: '설정관리' },
  '/settings/kiosk': { file: '통합운영_IOT_헬스.md', keywords: ['키오스크 설정', 'SCR-I002 키오스크 설정'], title: '키오스크 설정', category: '설정관리' },
  '/settings/iot': { file: '통합운영_IOT_헬스.md', keywords: ['IoT 연동 관리', 'SCR-I003 IoT 연동 관리'], title: 'IoT 설정', category: '설정관리' },
  '/subscription': { file: '설정관리.md', keywords: ['구독 관리', '5. 구독 관리'], title: '구독 관리', category: '설정관리' },
  '/notices': { file: '설정관리.md', keywords: ['공지사항', '6. 공지사항'], title: '공지사항', category: '설정관리' },
  '/attendance': { file: '통합운영_IOT_헬스.md', keywords: ['통합 출석 관리', 'SCR-I001 통합 출석 관리'], title: '출석 관리', category: '설정관리' },

  // ── 마케팅 ──
  '/leads': { file: '마케팅.md', keywords: ['리드 관리', '1. 리드 관리'], title: '리드 관리', category: '마케팅' },
  '/message': { file: '마케팅.md', keywords: ['메시지 발송', '2. 메시지 발송'], title: '메시지 발송', category: '마케팅' },
  '/message/auto-alarm': { file: '마케팅.md', keywords: ['자동 알림', '3. 자동 알림'], title: '자동 알림', category: '마케팅' },
  '/message/coupon': { file: '마케팅.md', keywords: ['쿠폰 관리', '4. 쿠폰 관리'], title: '쿠폰 관리', category: '마케팅' },
  '/mileage': { file: '마케팅.md', keywords: ['마일리지', '5. 마일리지'], title: '마일리지', category: '마케팅' },
  '/contracts/new': { file: '마케팅.md', keywords: ['전자계약', '6. 전자계약'], title: '전자계약', category: '마케팅' },

  // ── 직원관리 ──
  '/staff': { file: '직원관리.md', keywords: ['직원 목록', '1. 직원 목록'], title: '직원 목록', category: '직원관리' },
  '/staff/new': { file: '직원관리.md', keywords: ['직원 등록', '2. 직원 등록'], title: '직원 등록', category: '직원관리' },
  '/staff/edit': { file: '직원관리.md', keywords: ['직원 등록/수정', '2. 직원 등록'], title: '직원 수정', category: '직원관리' },
  '/staff/resignation': { file: '직원관리.md', keywords: ['퇴사 처리', '3. 퇴사 처리'], title: '퇴사 처리', category: '직원관리' },
  '/staff/attendance': { file: '직원관리.md', keywords: ['직원 근태', '4. 직원 근태'], title: '직원 근태', category: '직원관리' },
  '/payroll': { file: '직원관리.md', keywords: ['급여 관리', '5. 급여 관리'], title: '급여 관리', category: '직원관리' },
  '/payroll/statements': { file: '직원관리.md', keywords: ['급여 명세서', '6. 급여 명세서'], title: '급여 명세서', category: '직원관리' },

  // ── 상품관리 ──
  '/products': { file: '상품관리.md', keywords: ['상품 목록', '1. 상품 목록'], title: '상품 목록', category: '상품관리' },
  '/products/new': { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'], title: '상품 등록', category: '상품관리' },
  '/products/edit': { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'], title: '상품 수정', category: '상품관리' },
  '/discount-settings': { file: '상품관리.md', keywords: ['할인 설정', '3. 할인 설정'], title: '할인 설정', category: '상품관리' },
};

/**
 * 라우트 경로로부터 매핑 정보를 조회하는 함수.
 * 정확한 매칭 -> 동적 라우트 패턴 매칭 순으로 시도.
 */
export function getRouteMapping(pathname: string) {
  // 정확한 매칭
  if (ROUTE_TO_DOC[pathname]) {
    return ROUTE_TO_DOC[pathname];
  }

  // 동적 라우트 처리 (예: /members/detail?id=123 -> /members/detail)
  const basePath = pathname.split('?')[0];
  if (ROUTE_TO_DOC[basePath]) {
    return ROUTE_TO_DOC[basePath];
  }

  // 경로 끝 슬래시 제거
  const trimmed = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  if (ROUTE_TO_DOC[trimmed]) {
    return ROUTE_TO_DOC[trimmed];
  }

  return null;
}

/**
 * 하위 호환: 기존 getDesignDoc 호출부를 위한 폴백 함수.
 * API Route 방식 전환 후에도 에러 없이 동작하도록 null을 반환합니다.
 * 실제 데이터는 DesignDocPanel에서 API를 통해 로드합니다.
 */
export function getDesignDoc(pathname: string): DesignDoc | null {
  const mapping = getRouteMapping(pathname);
  if (!mapping) return null;

  // 매핑 정보만 반환 (실제 내용은 API에서 로드)
  return {
    title: mapping.title,
    category: mapping.category,
    file: mapping.file,
    sections: [],
  };
}
