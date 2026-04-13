import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 라우트 -> 기능명세서 파일 + 관련 섹션 키워드 매핑
const ROUTE_TO_DOC: Record<string, { file: string; keywords: string[] }> = {
  // ── 본사관리 ──
  '/': { file: '본사관리.md', keywords: ['대시보드', '1. 대시보드'] },
  '/login': { file: '본사관리.md', keywords: ['로그인', '11. 로그인'] },
  '/super-dashboard': { file: '본사관리.md', keywords: ['슈퍼 대시보드', '2. 슈퍼 대시보드'] },
  '/branches': { file: '본사관리.md', keywords: ['지점 관리', '3. 지점 관리'] },
  '/branch-report': { file: '본사관리.md', keywords: ['지점 리포트', '4. 지점 리포트'] },
  '/kpi': { file: '본사관리.md', keywords: ['KPI 대시보드', '5. KPI 대시보드'] },
  '/kpi-preview': { file: '본사관리.md', keywords: ['KPI 센터', '6. KPI 센터'] },
  '/onboarding': { file: '본사관리.md', keywords: ['온보딩', '7. 온보딩'] },
  '/audit-log': { file: '본사관리.md', keywords: ['감사 로그', '8. 감사 로그'] },
  '/today-tasks': { file: '본사관리.md', keywords: ['Today Tasks', '9. Today Tasks'] },
  '/reports': { file: '본사관리.md', keywords: ['리포트', '10. 리포트'] },

  // ── 회원관리 ──
  '/members': { file: '회원관리.md', keywords: ['회원 목록', '1. 회원 목록'] },
  '/members/new': { file: '회원관리.md', keywords: ['회원 등록', '2. 회원 등록'] },
  '/members/edit': { file: '회원관리.md', keywords: ['회원 등록/수정', '2. 회원 등록'] },
  '/members/detail': { file: '회원관리.md', keywords: ['회원 상세', '3. 회원 상세'] },
  '/members/transfer': { file: '회원관리.md', keywords: ['회원 지점 이관', '4. 회원 지점 이관'] },
  '/body-composition': { file: '회원관리.md', keywords: ['체성분 관리', '5. 체성분 관리'] },

  // ── 매출관리 ──
  '/sales': { file: '매출관리.md', keywords: ['매출 현황', '1. 매출 현황'] },
  '/pos': { file: '매출관리.md', keywords: ['POS 판매', '2. POS 판매'] },
  '/pos/payment': { file: '매출관리.md', keywords: ['POS 결제', '3. POS 결제'] },
  '/sales/stats': { file: '매출관리.md', keywords: ['매출 통계', '4. 매출 통계'] },
  '/sales/statistics-management': { file: '매출관리.md', keywords: ['통계관리', '5. 통계관리'] },
  '/deferred-revenue': { file: '매출관리.md', keywords: ['선수익금', '6. 선수익금'] },
  '/refunds': { file: '매출관리.md', keywords: ['환불 관리', '7. 환불 관리'] },
  '/unpaid': { file: '매출관리.md', keywords: ['미수금 관리', '8. 미수금 관리'] },

  // ── 수업관리 ──
  '/calendar': { file: '수업관리.md', keywords: ['캘린더', '1. 캘린더'] },
  '/class-schedule': { file: '수업관리.md', keywords: ['시간표', '2. 시간표'] },
  '/class-templates': { file: '수업관리.md', keywords: ['수업 템플릿', '3. 수업 템플릿'] },
  '/class-stats': { file: '수업관리.md', keywords: ['수업 현황', '4. 수업 현황'] },
  '/instructor-status': { file: '수업관리.md', keywords: ['강사 근무', '5. 강사 근무'] },
  '/lessons': { file: '수업관리.md', keywords: ['수업 관리', '6. 수업 관리'] },
  '/lesson-counts': { file: '수업관리.md', keywords: ['횟수 관리', '7. 횟수 관리'] },
  '/penalties': { file: '수업관리.md', keywords: ['페널티', '8. 페널티'] },
  '/valid-lessons': { file: '수업관리.md', keywords: ['유효 수업', '9. 유효 수업'] },
  '/schedule-requests': { file: '수업관리.md', keywords: ['일정 요청', '10. 일정 요청'] },
  '/exercise-programs': { file: '수업관리.md', keywords: ['운동 프로그램', '11. 운동 프로그램'] },

  // ── 시설관리 ──
  '/locker': { file: '시설관리.md', keywords: ['락커 관리', '1. 락커 관리'] },
  '/locker/management': { file: '시설관리.md', keywords: ['사물함 배정', '2. 사물함 배정'] },
  '/rfid': { file: '시설관리.md', keywords: ['밴드/카드', '3. 밴드/카드'] },
  '/rooms': { file: '시설관리.md', keywords: ['운동룸', '4. 운동룸'] },
  '/golf-bays': { file: '시설관리.md', keywords: ['골프 타석', '5. 골프 타석'] },
  '/clothing': { file: '시설관리.md', keywords: ['운동복', '6. 운동복'] },

  // ── 설정관리 ──
  '/settings': { file: '설정관리.md', keywords: ['센터 설정', '1. 센터 설정'] },
  '/settings/permissions': { file: '설정관리.md', keywords: ['권한 설정', '2. 권한 설정'] },
  '/settings/kiosk': { file: '설정관리.md', keywords: ['키오스크', '3. 키오스크'] },
  '/settings/iot': { file: '설정관리.md', keywords: ['IoT', '4. IoT'] },
  '/subscription': { file: '설정관리.md', keywords: ['구독 관리', '5. 구독 관리'] },
  '/notices': { file: '설정관리.md', keywords: ['공지사항', '6. 공지사항'] },
  '/attendance': { file: '설정관리.md', keywords: ['출석 관리', '7. 출석 관리'] },

  // ── 마케팅 ──
  '/leads': { file: '마케팅.md', keywords: ['리드 관리', '1. 리드 관리'] },
  '/message': { file: '마케팅.md', keywords: ['메시지 발송', '2. 메시지 발송'] },
  '/message/auto-alarm': { file: '마케팅.md', keywords: ['자동 알림', '3. 자동 알림'] },
  '/message/coupon': { file: '마케팅.md', keywords: ['쿠폰 관리', '4. 쿠폰 관리'] },
  '/mileage': { file: '마케팅.md', keywords: ['마일리지', '5. 마일리지'] },
  '/contracts/new': { file: '마케팅.md', keywords: ['전자계약', '6. 전자계약'] },

  // ── 직원관리 ──
  '/staff': { file: '직원관리.md', keywords: ['직원 목록', '1. 직원 목록'] },
  '/staff/new': { file: '직원관리.md', keywords: ['직원 등록', '2. 직원 등록'] },
  '/staff/edit': { file: '직원관리.md', keywords: ['직원 등록/수정', '2. 직원 등록'] },
  '/staff/resignation': { file: '직원관리.md', keywords: ['퇴사 처리', '3. 퇴사 처리'] },
  '/staff/attendance': { file: '직원관리.md', keywords: ['직원 근태', '4. 직원 근태'] },
  '/payroll': { file: '직원관리.md', keywords: ['급여 관리', '5. 급여 관리'] },
  '/payroll/statements': { file: '직원관리.md', keywords: ['급여 명세서', '6. 급여 명세서'] },

  // ── 상품관리 ──
  '/products': { file: '상품관리.md', keywords: ['상품 목록', '1. 상품 목록'] },
  '/products/new': { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] },
  '/products/edit': { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] },
  '/discount-settings': { file: '상품관리.md', keywords: ['할인 설정', '3. 할인 설정'] },
};

// 파일명에서 카테고리명 추출
const FILE_TO_CATEGORY: Record<string, string> = {
  '본사관리.md': '본사관리',
  '회원관리.md': '회원관리',
  '매출관리.md': '매출관리',
  '수업관리.md': '수업관리',
  '시설관리.md': '시설관리',
  '설정관리.md': '설정관리',
  '마케팅.md': '마케팅',
  '직원관리.md': '직원관리',
  '상품관리.md': '상품관리',
};

export async function GET(request: NextRequest) {
  const routePath = request.nextUrl.searchParams.get('path') || '/';
  const mapping = ROUTE_TO_DOC[routePath];

  if (!mapping) {
    return NextResponse.json({
      title: routePath,
      file: '',
      category: '',
      content: '',
      keywords: [],
      error: '해당 페이지의 명세서가 준비 중입니다.',
    });
  }

  try {
    const docPath = path.join(process.cwd(), 'docs', '기능명세서', mapping.file);
    const content = fs.readFileSync(docPath, 'utf-8');
    const category = FILE_TO_CATEGORY[mapping.file] || '';

    // 첫 번째 키워드를 페이지 제목으로 사용
    const title = mapping.keywords[0] || routePath;

    return NextResponse.json({
      title,
      file: mapping.file,
      category,
      content,
      keywords: mapping.keywords,
    });
  } catch {
    return NextResponse.json({
      title: routePath,
      file: mapping.file,
      category: '',
      content: '',
      keywords: mapping.keywords,
      error: `기능명세서 파일을 찾을 수 없습니다: ${mapping.file}`,
    });
  }
}
