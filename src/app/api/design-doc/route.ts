import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 라우트 -> 기능명세서 파일 + 관련 섹션 키워드 매핑
const ROUTE_TO_DOC: Record<string, { file: string; keywords: string[]; category?: string; directory?: string }> = {
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
  '/members/detail': { file: '통합운영_IOT_헬스.md', keywords: ['회원 상세 건강/연동 요약', 'SCR-I007 회원 상세 건강/연동 요약'], category: '회원관리', directory: '화면설계서' },
  '/members/transfer': { file: '회원관리.md', keywords: ['회원 지점 이관', '4. 회원 지점 이관'] },
  '/body-composition': { file: '통합운영_IOT_헬스.md', keywords: ['체성분 통합 관리', 'SCR-I006 체성분 통합 관리'], category: '회원관리', directory: '화면설계서' },

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
  '/locker': { file: '통합운영_IOT_헬스.md', keywords: ['옷 락커 운영 관리', 'SCR-I004 옷 락커 운영 관리'], category: '시설관리', directory: '화면설계서' },
  '/locker/management': { file: '통합운영_IOT_헬스.md', keywords: ['고정 물품 락커 관리', 'SCR-I005 고정 물품 락커 관리'], category: '시설관리', directory: '화면설계서' },
  '/rfid': { file: '시설관리.md', keywords: ['밴드/카드', '3. 밴드/카드'] },
  '/rooms': { file: '시설관리.md', keywords: ['운동룸', '4. 운동룸'] },
  '/golf-bays': { file: '시설관리.md', keywords: ['골프 타석', '5. 골프 타석'] },
  '/clothing': { file: '시설관리.md', keywords: ['운동복', '6. 운동복'] },

  // ── 설정관리 ──
  '/settings': { file: '설정관리.md', keywords: ['센터 설정', '1. 센터 설정'] },
  '/settings/permissions': { file: '설정관리.md', keywords: ['권한 설정', '2. 권한 설정'] },
  '/settings/kiosk': { file: '통합운영_IOT_헬스.md', keywords: ['키오스크 설정', 'SCR-I002 키오스크 설정'], category: '설정관리', directory: '화면설계서' },
  '/settings/iot': { file: '통합운영_IOT_헬스.md', keywords: ['IoT 연동 관리', 'SCR-I003 IoT 연동 관리'], category: '설정관리', directory: '화면설계서' },
  '/subscription': { file: '설정관리.md', keywords: ['구독 관리', '5. 구독 관리'] },
  '/notices': { file: '설정관리.md', keywords: ['공지사항', '6. 공지사항'] },
  '/attendance': { file: '통합운영_IOT_헬스.md', keywords: ['통합 출석 관리', 'SCR-I001 통합 출석 관리'], category: '설정관리', directory: '화면설계서' },

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

// 라우트 -> 시스템 모듈 정의서 관련 섹션 매핑
const ROUTE_TO_MODULE: Record<string, { module: string; section?: string }> = {
  // 모듈 1: 통합 관제 대시보드
  '/': { module: '모듈 1', section: '주요 기능' },
  '/super-dashboard': { module: '모듈 1', section: '주요 기능' },
  '/branch-report': { module: '모듈 1', section: '주요 기능' },
  '/kpi': { module: '모듈 1', section: '주요 기능' },
  '/kpi-preview': { module: '모듈 1', section: '주요 기능' },

  // 모듈 2: 지능형 회원 관리
  '/members': { module: '모듈 2', section: '주요 기능' },
  '/members/new': { module: '모듈 2', section: '주요 기능' },
  '/members/edit': { module: '모듈 2', section: '주요 기능' },
  '/members/detail': { module: '모듈 2', section: '주요 기능' },
  '/members/transfer': { module: '모듈 2', section: '주요 기능' },
  '/body-composition': { module: '모듈 2', section: '주요 기능' },
  '/lessons': { module: '모듈 2', section: '강습(PT) 관리 고도화' },
  '/lesson-counts': { module: '모듈 2', section: '강습(PT) 관리 고도화' },

  // 모듈 3: 영업 및 마케팅 자동화
  '/leads': { module: '모듈 3', section: 'I. 신규회원 유입 강화' },
  '/message': { module: '모듈 3', section: '주요 기능' },
  '/message/auto-alarm': { module: '모듈 3', section: 'II. 기존회원 유지율 향상' },
  '/message/coupon': { module: '모듈 3', section: 'II. 기존회원 유지율 향상' },
  '/mileage': { module: '모듈 3', section: 'II. 기존회원 유지율 향상' },
  '/contracts/new': { module: '모듈 3', section: '주요 기능' },

  // 모듈 4: 스마트 예약 및 스케줄 관리
  '/calendar': { module: '모듈 4', section: '주요 기능' },
  '/class-schedule': { module: '모듈 4', section: '주요 기능' },
  '/class-templates': { module: '모듈 4', section: '주요 기능' },
  '/attendance': { module: '모듈 4', section: '주요 기능' },
  '/class-stats': { module: '모듈 4' },
  '/instructor-status': { module: '모듈 4' },

  // 모듈 5: 자동 결제 및 정산
  '/sales': { module: '모듈 5', section: '주요 기능' },
  '/pos': { module: '모듈 5', section: '주요 기능' },
  '/pos/payment': { module: '모듈 5', section: '주요 기능' },
  '/refunds': { module: '모듈 5', section: '주요 기능' },
  '/unpaid': { module: '모듈 5', section: '주요 기능' },
  '/deferred-revenue': { module: '모듈 5', section: '주요 기능' },
  '/payroll': { module: '모듈 5', section: '주요 기능' },
  '/payroll/statements': { module: '모듈 5', section: '주요 기능' },

  // 모듈 6: 다차원 리포트 및 분석
  '/sales/stats': { module: '모듈 6', section: '주요 기능' },
  '/sales/statistics-management': { module: '모듈 6', section: '주요 기능' },
  '/reports': { module: '모듈 6', section: '주요 기능' },
};

// 라우트 -> KPI 정의서 관련 섹션 매핑
const ROUTE_TO_KPI: Record<string, { section: string }> = {
  '/kpi': { section: '전체' },
  '/kpi-preview': { section: '전체' },
  '/super-dashboard': { section: '본사 (HQ) KPI' },
  '/branch-report': { section: '지점 (Branch) KPI' },
  '/': { section: '지점 (Branch) KPI' },
  '/today-tasks': { section: '직원 (Staff) KPI' },
  '/instructor-status': { section: 'PT Trainer' },
  '/class-stats': { section: 'GX/필라테스 강사' },
  '/lesson-counts': { section: 'PT Trainer' },
  '/lessons': { section: 'PT Trainer' },
  '/sales/stats': { section: '지점 (Branch) KPI' },
  '/sales/statistics-management': { section: '지점 (Branch) KPI' },
  '/leads': { section: 'FC (Fitness Consultant)' },
  '/members': { section: 'FC (Fitness Consultant)' },
  '/members/detail': { section: 'FC (Fitness Consultant)' },
  '/payroll': { section: '지점 (Branch) KPI' },
  '/attendance': { section: '지점 (Branch) KPI' },
};

// KPI 정의서에서 관련 섹션 추출
function extractKpiSection(content: string, sectionName: string): string {
  if (sectionName === '전체') return content;

  const lines = content.split('\n');
  const result: string[] = [];
  let capturing = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // ## 또는 ### 섹션 매칭
    if ((trimmed.startsWith('## ') || trimmed.startsWith('### ')) && trimmed.includes(sectionName)) {
      capturing = true;
      result.push(line);
      continue;
    }

    // 같은 레벨의 다른 섹션이 나오면 중단
    if (capturing && trimmed.startsWith('## ') && !trimmed.includes(sectionName)) {
      break;
    }
    if (capturing && trimmed.startsWith('### ') && !trimmed.includes(sectionName) && result.length > 3) {
      // ### 하위 섹션은 다음 ##까지 계속 수집
      if (trimmed.startsWith('## ')) break;
    }

    if (capturing) {
      result.push(line);
    }
  }

  return result.length > 0 ? result.join('\n') : '';
}

// 시스템 모듈 정의서에서 관련 모듈 섹션 추출
function extractModuleSection(content: string, moduleName: string, sectionName?: string): string {
  const lines = content.split('\n');
  let capturing = false;
  let moduleFound = false;
  const result: string[] = [];
  let currentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // ## 모듈 N: 매칭
    if (trimmed.startsWith('## ') && trimmed.includes(moduleName)) {
      moduleFound = true;
      capturing = true;
      result.push(line);
      currentLevel = 2;
      continue;
    }

    // 다른 ## 모듈이 나오면 중단
    if (moduleFound && capturing && trimmed.startsWith('## ') && !trimmed.includes(moduleName)) {
      break;
    }

    if (capturing) {
      result.push(line);
    }
  }

  if (result.length === 0) return '';

  // sectionName이 지정된 경우 해당 섹션만 하이라이트 (전체는 유지)
  return result.join('\n');
}

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
  '통합운영_IOT_헬스.md': '통합운영',
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
    const docDirectory = mapping.directory ?? '기능명세서';
    const docPath = path.join(process.cwd(), 'docs', docDirectory, mapping.file);
    let content = fs.readFileSync(docPath, 'utf-8');
    const category = mapping.category || FILE_TO_CATEGORY[mapping.file] || '';

    // 첫 번째 키워드를 페이지 제목으로 사용
    const title = mapping.keywords[0] || routePath;

    // 시스템 모듈 정의서에서 관련 모듈 섹션 추가
    const moduleMapping = ROUTE_TO_MODULE[routePath];
    if (moduleMapping) {
      try {
        const modulePath = path.join(process.cwd(), 'docs', '시스템_모듈_정의서.md');
        const moduleContent = fs.readFileSync(modulePath, 'utf-8');
        const moduleSection = extractModuleSection(moduleContent, moduleMapping.module, moduleMapping.section);
        if (moduleSection) {
          content += '\n\n---\n\n# 📋 관련 시스템 모듈\n\n' + moduleSection;
        }
      } catch {
        // 시스템 모듈 정의서 파일이 없어도 에러 무시
      }
    }

    // KPI 정의서에서 관련 섹션 추가
    const kpiMapping = ROUTE_TO_KPI[routePath];
    if (kpiMapping) {
      try {
        const kpiPath = path.join(process.cwd(), 'docs', 'KPI_정의서.md');
        const kpiContent = fs.readFileSync(kpiPath, 'utf-8');
        const kpiSection = extractKpiSection(kpiContent, kpiMapping.section);
        if (kpiSection) {
          content += '\n\n---\n\n# 📊 관련 KPI\n\n' + kpiSection;
        }
      } catch {
        // KPI 정의서 파일이 없어도 에러 무시
      }
    }

    return NextResponse.json({
      title,
      file: mapping.file,
      category,
      content,
      keywords: mapping.keywords,
    });
  } catch {
    // 기능명세서 파일이 없어도 시스템 모듈 정의서에서 시도
    const moduleMapping = ROUTE_TO_MODULE[routePath];
    let moduleContent = '';
    if (moduleMapping) {
      try {
        const modulePath = path.join(process.cwd(), 'docs', '시스템_모듈_정의서.md');
        const fullContent = fs.readFileSync(modulePath, 'utf-8');
        moduleContent = extractModuleSection(fullContent, moduleMapping.module, moduleMapping.section);
      } catch { /* ignore */ }
    }

    if (moduleContent) {
      return NextResponse.json({
        title: mapping.keywords[0] || routePath,
        file: '시스템_모듈_정의서.md',
        category: FILE_TO_CATEGORY[mapping.file] || '',
        content: moduleContent,
        keywords: mapping.keywords,
      });
    }

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
