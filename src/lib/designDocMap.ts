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
  '/reset-password': {
    title: '비밀번호 재설정',
    category: '인증',
    functional: { file: '본사관리.md', keywords: ['로그인', '11. 로그인'] },
    screen: { folder: 'D01-공통/SCR-106-비밀번호재설정' },
  },
  '/profile': {
    title: '프로필 / 계정 설정',
    category: '인증',
    screen: { folder: 'D01-공통/SCR-105-프로필계정' },
  },
  '/super-dashboard': { title: '슈퍼 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['슈퍼 대시보드', '2. 슈퍼 대시보드'] } },
  '/branches': { title: '지점 관리', category: '본사관리', functional: { file: '본사관리.md', keywords: ['지점 관리', '3. 지점 관리'] } },
  '/branch-report': { title: '지점 리포트', category: '본사관리', functional: { file: '본사관리.md', keywords: ['지점 리포트', '4. 지점 리포트'] } },
  '/kpi': { title: 'KPI 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['KPI 대시보드', '5. KPI 대시보드'] } },
  '/kpi-preview': { title: 'KPI 센터', category: '본사관리', functional: { file: '본사관리.md', keywords: ['KPI 센터', '6. KPI 센터'] } },
  '/onboarding': { title: '온보딩 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['온보딩', '7. 온보딩'] } },
  '/audit-log': { title: '히스토리 로그', category: '본사관리', functional: { file: '본사관리.md', keywords: ['히스토리 로그', '8. 히스토리 로그'] } },
  '/today-tasks': { title: 'Today Tasks', category: '본사관리', functional: { file: '본사관리.md', keywords: ['Today Tasks', '9. Today Tasks'] } },
  '/reports': { title: '자동 리포트', category: '본사관리', functional: { file: '본사관리.md', keywords: ['리포트', '10. 리포트'] } },
  '/hq/automation-policies': { title: '자동화 정책 라이브러리', category: '본사관리', functional: { file: '본사관리.md', keywords: ['자동화 정책', '자동화 정책 라이브러리'] }, screen: { folder: 'D10-본사관리/SCR-100-자동화정책라이브러리' } },

  // ── 회원관리 ──
  '/members': { title: '회원 목록', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 목록', '1. 회원 목록'] }, screen: { folder: 'D02-회원관리/SCR-M001-회원목록' } },
  '/members/new': { title: '회원 등록', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 등록', '2. 회원 등록'] }, screen: { folder: 'D02-회원관리/SCR-M002-회원등록' } },
  '/members/edit': { title: '회원 수정', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 등록/수정', '2. 회원 등록'] }, screen: { folder: 'D02-회원관리/SCR-M003-회원수정' } },
  '/members/detail': { title: '회원 상세', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 상세', '3. 회원 상세'] }, screen: { folder: 'D02-회원관리/SCR-M004-회원상세' } },
  '/members/transfer': { title: '회원 이관', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 지점 이관', '4. 회원 이관'] }, screen: { folder: 'D02-회원관리/SCR-M005-회원이관' } },
  '/body-composition': { title: '체성분 관리', category: '회원관리', functional: { file: '회원관리.md', keywords: ['체성분 관리', '5. 체성분'] }, screen: { folder: 'D02-회원관리/SCR-M006-체성분관리' } },
  '/members/merge': { title: '회원 병합', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 병합', '6. 회원 병합'] }, screen: { folder: 'D02-회원관리/SCR-M007-회원병합' } },
  '/members/family': { title: '가족 회원', category: '회원관리', functional: { file: '회원관리.md', keywords: ['가족 회원', '7. 가족'] }, screen: { folder: 'D02-회원관리/SCR-M008-가족회원' } },
  '/members/grade': { title: '등급 관리', category: '회원관리', functional: { file: '회원관리.md', keywords: ['등급 관리', '8. 등급'] }, screen: { folder: 'D02-회원관리/SCR-M009-등급관리' } },
  '/members/segment': { title: '세그먼트 관리', category: '회원관리', functional: { file: '회원관리.md', keywords: ['세그먼트', '9. 세그먼트'] }, screen: { folder: 'D02-회원관리/SCR-M010-세그먼트관리' } },

  // ── 매출관리 ──
  '/sales': { title: '매출 현황', category: '매출관리', functional: { file: '매출관리.md', keywords: ['매출 현황', '1. 매출 현황'] }, screen: { folder: 'D03-매출관리/SCR-S001-매출현황' } },
  '/pos': { title: 'POS 판매', category: '매출관리', functional: { file: '매출관리.md', keywords: ['POS 판매', '2. POS 판매'] }, screen: { folder: 'D03-매출관리/SCR-S002-POS판매' } },
  '/pos/payment': { title: 'POS 결제', category: '매출관리', functional: { file: '매출관리.md', keywords: ['POS 결제', '3. POS 결제'] }, screen: { folder: 'D03-매출관리/SCR-S003-결제처리' } },
  '/sales/stats': { title: '매출 통계', category: '매출관리', functional: { file: '매출관리.md', keywords: ['매출 통계', '4. 매출 통계'] }, screen: { folder: 'D03-매출관리/SCR-S004-매출통계' } },
  '/sales/statistics-management': { title: '통계 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['통계관리', '5. 통계관리'] }, screen: { folder: 'D03-매출관리/SCR-S005-통계관리' } },
  '/deferred-revenue': { title: '선수익금', category: '매출관리', functional: { file: '매출관리.md', keywords: ['선수익금', '6. 선수익금'] }, screen: { folder: 'D03-매출관리/SCR-S006-선수익금조회' } },
  '/refunds': { title: '환불 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['환불 관리', '7. 환불 관리'] }, screen: { folder: 'D03-매출관리/SCR-S007-환불관리' } },
  '/unpaid': { title: '미수금 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['미수금 관리', '8. 미수금 관리'] }, screen: { folder: 'D03-매출관리/SCR-S008-미수금관리' } },
  '/sales/installment': { title: '할부결제 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['할부', '9. 할부'] }, screen: { folder: 'D03-매출관리/SCR-S009-할부결제관리' } },
  '/sales/invoice': { title: '세금계산서 발행', category: '매출관리', functional: { file: '매출관리.md', keywords: ['세금계산서', '10. 세금계산서'] }, screen: { folder: 'D03-매출관리/SCR-S010-세금계산서발행' } },
  '/sales/forecast': { title: '매출 예측', category: '매출관리', functional: { file: '매출관리.md', keywords: ['매출 예측', '11. 매출 예측'] }, screen: { folder: 'D03-매출관리/SCR-S011-매출예측' } },
  '/sales/cancel-refund': { title: '결제 취소 / 부분 환불', category: '매출관리', functional: { file: '매출관리.md', keywords: ['결제 취소', '12. 결제 취소'] }, screen: { folder: 'D03-매출관리/SCR-S012-결제취소-부분환불' } },

  // ── 수업관리 ──
  '/calendar': { title: '수업 캘린더', category: '수업관리', functional: { file: '수업관리.md', keywords: ['캘린더', '1. 캘린더'] }, screen: { folder: 'D04-수업관리/SCR-C001-수업캘린더' } },
  '/class-schedule': { title: '시간표 등록', category: '수업관리', functional: { file: '수업관리.md', keywords: ['시간표', '2. 시간표'] }, screen: { folder: 'D04-수업관리/SCR-C003-시간표일괄등록' } },
  '/class-templates': { title: '수업 템플릿', category: '수업관리', functional: { file: '수업관리.md', keywords: ['수업 템플릿', '3. 수업 템플릿'] }, screen: { folder: 'D04-수업관리/SCR-C004-그룹수업템플릿' } },
  '/class-stats': { title: '수업 현황', category: '수업관리', functional: { file: '수업관리.md', keywords: ['수업 현황', '4. 수업 현황'] }, screen: { folder: 'D04-수업관리/SCR-C005-그룹수업현황' } },
  '/instructor-status': { title: '강사 현황', category: '수업관리', functional: { file: '수업관리.md', keywords: ['강사 근무', '5. 강사 근무'] }, screen: { folder: 'D04-수업관리/SCR-C006-강사근무현황' } },
  '/lessons': { title: '수업 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['수업 관리', '6. 수업 관리'] }, screen: { folder: 'D04-수업관리/SCR-C002-수업관리' } },
  '/lesson-counts': { title: '횟수 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['횟수 관리', '7. 횟수 관리'] }, screen: { folder: 'D04-수업관리/SCR-C007-횟수관리' } },
  '/penalties': { title: '페널티 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['페널티', '8. 페널티'] }, screen: { folder: 'D04-수업관리/SCR-C008-페널티관리' } },
  '/valid-lessons': { title: '유효 수업', category: '수업관리', functional: { file: '수업관리.md', keywords: ['유효 수업', '9. 유효 수업'] }, screen: { folder: 'D04-수업관리/SCR-C011-유효수업목록' } },
  '/schedule-requests': { title: '일정 요청', category: '수업관리', functional: { file: '수업관리.md', keywords: ['일정 요청', '10. 일정 요청'] }, screen: { folder: 'D04-수업관리/SCR-C009-일정요청처리' } },
  '/exercise-programs': { title: '운동 프로그램', category: '수업관리', functional: { file: '수업관리.md', keywords: ['운동 프로그램', '11. 운동 프로그램'] }, screen: { folder: 'D04-수업관리/SCR-C010-운동프로그램관리' } },
  '/class-waitlist': { title: '대기열 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['대기열', '12. 대기열'] }, screen: { folder: 'D04-수업관리/SCR-C012-대기열관리' } },
  '/class-feedback': { title: '수업 평가 피드백', category: '수업관리', functional: { file: '수업관리.md', keywords: ['평가', '13. 평가'] }, screen: { folder: 'D04-수업관리/SCR-C013-수업평가피드백' } },

  // ── 시설관리 ──
  '/locker': { title: '락커 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['락커', '1. 락커'] }, screen: { folder: 'D06-시설관리/SCR-050-락커관리' } },
  '/locker/management': { title: '사물함 배정', category: '시설관리', functional: { file: '시설관리.md', keywords: ['사물함', '2. 사물함'] }, screen: { folder: 'D06-시설관리/SCR-051-사물함배정관리' } },
  '/rfid': { title: 'RFID 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['밴드/카드', '3. 밴드/카드'] }, screen: { folder: 'D06-시설관리/SCR-052-밴드카드관리' } },
  '/rooms': { title: '운동룸 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['운동룸', '4. 운동룸'] }, screen: { folder: 'D06-시설관리/SCR-053-운동룸관리' } },
  '/golf-bays': { title: '골프 타석', category: '시설관리', functional: { file: '시설관리.md', keywords: ['골프 타석', '5. 골프 타석'] }, screen: { folder: 'D06-시설관리/SCR-054-골프타석관리' } },
  '/clothing': { title: '운동복 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['운동복', '6. 운동복'] }, screen: { folder: 'D06-시설관리/SCR-055-운동복관리' } },

  // ── 설정관리 ──
  '/settings': { title: '센터 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['센터 설정', '1. 센터 설정'] }, screen: { folder: 'D09-설정관리/SCR-080-센터설정' } },
  '/settings/automation': { title: '지점 자동화 적용', category: '설정관리', functional: { file: '설정관리.md', keywords: ['자동화', '지점 자동화'] }, screen: { folder: 'D09-설정관리/SCR-080A-지점자동화적용' } },
  '/settings/permissions': { title: '권한 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['권한 설정', '2. 권한 설정'] }, screen: { folder: 'D09-설정관리/SCR-081-권한설정' } },
  '/settings/kiosk': { title: '키오스크 설정', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['키오스크 설정', '2. 키오스크 설정'] }, screen: { folder: 'D09-설정관리/SCR-082-키오스크설정' } },
  '/settings/iot': { title: 'IoT 연동 관리', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['IoT 연동 관리', '3. IoT 연동 관리'] }, screen: { folder: 'D09-설정관리/SCR-083-IoT출입관리' } },
  '/subscription': { title: '구독 관리', category: '설정관리', functional: { file: '설정관리.md', keywords: ['구독 관리', '5. 구독 관리'] }, screen: { folder: 'D09-설정관리/SCR-084-구독결제관리' } },
  '/notices': { title: '공지사항', category: '설정관리', functional: { file: '설정관리.md', keywords: ['공지사항', '6. 공지사항'] }, screen: { folder: 'D09-설정관리/SCR-085-공지사항관리' } },
  '/attendance': { title: '통합 출석 관리', category: '통합운영', functional: { file: '통합운영_IOT_헬스.md', keywords: ['통합 출석 관리', '1. 통합 출석 관리'] }, screen: { folder: 'D11-통합운영/SCR-I001-통합출석관리' } },

  // ── 마케팅 ──
  '/leads': { title: '리드 관리', category: '마케팅', functional: { file: '마케팅.md', keywords: ['리드 관리', '1. 리드 관리'] }, screen: { folder: 'D08-마케팅/SCR-070-리드관리' } },
  '/message': { title: '메시지 발송', category: '마케팅', functional: { file: '마케팅.md', keywords: ['메시지 발송', '2. 메시지 발송'] }, screen: { folder: 'D08-마케팅/SCR-071-메시지발송' } },
  '/message/auto-alarm': { title: '자동 알림', category: '마케팅', functional: { file: '마케팅.md', keywords: ['자동 알림', '3. 자동 알림'] }, screen: { folder: 'D08-마케팅/SCR-072-자동알림설정' } },
  '/message/coupon': { title: '쿠폰 관리', category: '마케팅', functional: { file: '마케팅.md', keywords: ['쿠폰 관리', '4. 쿠폰 관리'] }, screen: { folder: 'D08-마케팅/SCR-073-쿠폰관리' } },
  '/mileage': { title: '마일리지', category: '마케팅', functional: { file: '마케팅.md', keywords: ['마일리지', '5. 마일리지'] }, screen: { folder: 'D08-마케팅/SCR-074-마일리지관리' } },
  '/contracts/new': { title: '전자계약', category: '마케팅', functional: { file: '마케팅.md', keywords: ['전자계약', '6. 전자계약'] }, screen: { folder: 'D08-마케팅/SCR-075-전자계약' } },

  // ── 직원관리 ──
  '/staff': { title: '직원 목록', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 목록', '1. 직원 목록'] }, screen: { folder: 'D07-직원관리/SCR-060-직원목록' } },
  '/staff/new': { title: '직원 등록', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 등록', '2. 직원 등록'] }, screen: { folder: 'D07-직원관리/SCR-061-직원등록수정' } },
  '/staff/edit': { title: '직원 수정', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 등록/수정', '2. 직원 등록'] }, screen: { folder: 'D07-직원관리/SCR-061-직원등록수정' } },
  '/staff/resignation': { title: '퇴사 처리', category: '직원관리', functional: { file: '직원관리.md', keywords: ['퇴사 처리', '3. 퇴사 처리'] }, screen: { folder: 'D07-직원관리/SCR-062-직원퇴사처리' } },
  '/staff/attendance': { title: '직원 근태', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 근태', '4. 직원 근태'] }, screen: { folder: 'D07-직원관리/SCR-063-직원근태관리' } },
  '/payroll': { title: '급여 관리', category: '직원관리', functional: { file: '직원관리.md', keywords: ['급여 관리', '5. 급여 관리'] }, screen: { folder: 'D07-직원관리/SCR-064-급여관리' } },
  '/payroll/statements': { title: '급여 명세서', category: '직원관리', functional: { file: '직원관리.md', keywords: ['급여 명세서', '6. 급여 명세서'] }, screen: { folder: 'D07-직원관리/SCR-065-급여명세서' } },

  // ── 상품관리 ──
  '/products': { title: '상품 목록', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 목록', '1. 상품 목록'] }, screen: { folder: 'D05-상품관리/SCR-P001-상품관리' } },
  '/products/detail': { title: '상품 상세 패널', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 상세', '2. 상품 상세'] }, screen: { folder: 'D05-상품관리/SCR-P003-상품상세패널' } },
  '/products/new': { title: '상품 등록', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] }, screen: { folder: 'D05-상품관리/SCR-P002-상품등록수정' } },
  '/products/edit': { title: '상품 수정', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] }, screen: { folder: 'D05-상품관리/SCR-P002-상품등록수정' } },
  '/discount-settings': { title: '할인 설정', category: '상품관리', functional: { file: '상품관리.md', keywords: ['할인 설정', '3. 할인 설정'] }, screen: { folder: 'D05-상품관리/SCR-P004-할인설정' } },

  // ── 상품관리 추가 ──
  '/products/catalog': { title: '상품 카탈로그', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 카탈로그', '4. 상품 카탈로그'] }, screen: { folder: 'D05-상품관리/SCR-P005-상품카탈로그' } },
  '/products/compare': { title: '상품 비교', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 비교', '5. 상품 비교'] }, screen: { folder: 'D05-상품관리/SCR-P006-상품비교' } },
  '/products/inventory': { title: '재고 관리', category: '상품관리', functional: { file: '상품관리.md', keywords: ['재고 관리', '6. 재고 관리'] }, screen: { folder: 'D05-상품관리/SCR-P007-재고관리' } },
  '/products/seasonal-price': { title: '시즌 가격 관리', category: '상품관리', functional: { file: '상품관리.md', keywords: ['시즌 가격', '7. 시즌 가격'] }, screen: { folder: 'D05-상품관리/SCR-P008-시즌가격관리' } },

  // ── 수업관리 추가 ──
  '/attendance/qr': { title: '출석 QR 체크인', category: '수업관리', functional: { file: '수업관리.md', keywords: ['QR 체크인', '14. QR 체크인'] }, screen: { folder: 'D04-수업관리/SCR-C014-출석QR체크인' } },
  '/class-recording': { title: '수업 녹화 관리', category: '수업관리', functional: { file: '수업관리.md', keywords: ['수업 녹화', '15. 수업 녹화'] }, screen: { folder: 'D04-수업관리/SCR-C015-수업녹화관리' } },

  // ── 시설관리 추가 ──
  '/equipment-check': { title: '장비 점검 일정', category: '시설관리', functional: { file: '시설관리.md', keywords: ['장비 점검', '7. 장비 점검'] }, screen: { folder: 'D06-시설관리/SCR-056-장비점검일정' } },
  '/consumables': { title: '소모품 재고 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['소모품', '8. 소모품'] }, screen: { folder: 'D06-시설관리/SCR-057-소모품재고관리' } },
  '/cleaning-schedule': { title: '청소 스케줄', category: '시설관리', functional: { file: '시설관리.md', keywords: ['청소', '9. 청소'] }, screen: { folder: 'D06-시설관리/SCR-058-청소스케줄' } },
  '/clothing-locker': { title: '옷 보관함 운영', category: '시설관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['옷락커', '4. 옷락커'] }, screen: { folder: 'D11-통합운영/SCR-I004-옷락커운영관리' } },

  // ── 마케팅 추가 ──
  '/marketing/campaign': { title: '캠페인 관리', category: '마케팅', functional: { file: '마케팅.md', keywords: ['캠페인', '7. 캠페인'] }, screen: { folder: 'D08-마케팅/SCR-076-캠페인관리' } },
  '/marketing/referral': { title: '리퍼럴 프로그램', category: '마케팅', functional: { file: '마케팅.md', keywords: ['리퍼럴', '8. 리퍼럴'] }, screen: { folder: 'D08-마케팅/SCR-077-리퍼럴프로그램' } },
  '/marketing/sms': { title: 'SMS / 카카오 발송', category: '마케팅', functional: { file: '마케팅.md', keywords: ['SMS', '9. SMS'] }, screen: { folder: 'D08-마케팅/SCR-078-SMS카카오발송' } },
  '/marketing/ab-test': { title: 'A/B 테스트', category: '마케팅', functional: { file: '마케팅.md', keywords: ['A/B 테스트', '10. A/B 테스트'] }, screen: { folder: 'D08-마케팅/SCR-079-AB테스트' } },

  // ── 설정관리 추가 ──
  '/settings/attendance': { title: '출석 관리 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['출석 설정', '7. 출석 설정'] }, screen: { folder: 'D09-설정관리/SCR-086-출석관리설정' } },
  '/settings/custom-role': { title: '커스텀 역할 생성', category: '설정관리', functional: { file: '설정관리.md', keywords: ['커스텀 역할', '8. 커스텀 역할'] }, screen: { folder: 'D09-설정관리/SCR-087-커스텀역할생성' } },
  '/settings/language': { title: '다국어 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['다국어', '9. 다국어'] }, screen: { folder: 'D09-설정관리/SCR-088-다국어설정' } },
  '/settings/backup': { title: '데이터 백업 / 복원', category: '설정관리', functional: { file: '설정관리.md', keywords: ['데이터 백업', '10. 데이터 백업'] }, screen: { folder: 'D09-설정관리/SCR-089-데이터백업복원' } },

  // ── 본사관리 추가 ──
  '/dashboard/builder': { title: '커스텀 대시보드 빌더', category: '본사관리', functional: { file: '본사관리.md', keywords: ['커스텀 대시보드', '12. 커스텀 대시보드'] }, screen: { folder: 'D10-본사관리/SCR-101-커스텀대시보드빌더' } },
  '/benchmark': { title: '벤치마크 비교', category: '본사관리', functional: { file: '본사관리.md', keywords: ['벤치마크', '13. 벤치마크'] }, screen: { folder: 'D10-본사관리/SCR-102-벤치마크비교' } },
  '/analytics/forecast': { title: '예측 분석', category: '본사관리', functional: { file: '본사관리.md', keywords: ['예측 분석', '14. 예측 분석'] }, screen: { folder: 'D10-본사관리/SCR-103-예측분석' } },
  '/nps': { title: 'NPS 설문', category: '본사관리', functional: { file: '본사관리.md', keywords: ['NPS', '15. NPS'] }, screen: { folder: 'D10-본사관리/SCR-104-NPS설문' } },

  // ── 통합운영 추가 ──
  '/members/health': { title: '회원 건강 연동 요약', category: '통합운영', functional: { file: '통합운영_IOT_헬스.md', keywords: ['건강 연동', '7. 건강 연동'] }, screen: { folder: 'D11-통합운영/SCR-I007-회원건강연동요약' } },
  '/kiosk-ops': { title: '키오스크 운영 현황', category: '통합운영', functional: { file: '통합운영_IOT_헬스.md', keywords: ['키오스크 운영', '키오스크 운영 현황'] }, screen: { folder: 'D11-통합운영/SCR-I008-키오스크운영현황' } },
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
