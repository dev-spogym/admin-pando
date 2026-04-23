import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { stripDevSections } from '@/lib/stripDevSections';

// ─── 라우트 매핑 (designDocMap.ts 와 구조 동일 · 서버 사이드 복사본) ──────────
// 서버 측 독립 매핑을 유지하는 이유: 이 API는 fs 접근이 필요해 서버 전용.
// 클라이언트에서 import 되는 designDocMap 에는 fs 를 넣을 수 없음.
//
// TODO(sync-docs): 향후 화면설계서 frontmatter 스캔으로 자동 생성 예정.
interface FunctionalSource { file: string; keywords: string[] }
interface ScreenSource { folder: string }
interface RouteMapping {
  title: string;
  category: string;
  functional?: FunctionalSource;
  screen?: ScreenSource;
}

const ROUTE_TO_DOC: Record<string, RouteMapping> = {
  // 본사관리
  '/': { title: '대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['대시보드', '1. 대시보드'] } },
  '/login': { title: '로그인', category: '인증', functional: { file: '본사관리.md', keywords: ['로그인', '11. 로그인'] }, screen: { folder: 'D01-공통/SCR-100-로그인' } },
  '/super-dashboard': { title: '슈퍼 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['슈퍼 대시보드', '2. 슈퍼 대시보드'] } },
  '/branches': { title: '지점 관리', category: '본사관리', functional: { file: '본사관리.md', keywords: ['지점 관리', '3. 지점 관리'] } },
  '/branch-report': { title: '지점 리포트', category: '본사관리', functional: { file: '본사관리.md', keywords: ['지점 리포트', '4. 지점 리포트'] } },
  '/kpi': { title: 'KPI 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['KPI 대시보드', '5. KPI 대시보드'] } },
  '/kpi-preview': { title: 'KPI 프리뷰', category: '본사관리', functional: { file: '본사관리.md', keywords: ['KPI 센터', '6. KPI 센터'] } },
  '/onboarding': { title: '온보딩 대시보드', category: '본사관리', functional: { file: '본사관리.md', keywords: ['온보딩', '7. 온보딩'] } },
  '/audit-log': { title: '감사 로그', category: '본사관리', functional: { file: '본사관리.md', keywords: ['감사 로그', '8. 감사 로그'] } },
  '/today-tasks': { title: 'Today Tasks', category: '본사관리', functional: { file: '본사관리.md', keywords: ['Today Tasks', '9. Today Tasks'] } },
  '/reports': { title: '자동 리포트', category: '본사관리', functional: { file: '본사관리.md', keywords: ['리포트', '10. 리포트'] } },

  // 회원관리
  '/members': { title: '회원 목록', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 목록', '1. 회원 목록'] } },
  '/members/new': { title: '회원 등록', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 등록', '2. 회원 등록'] } },
  '/members/edit': { title: '회원 수정', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 등록/수정', '2. 회원 등록'] } },
  '/members/detail': { title: '회원 상세', category: '회원관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['회원 상세 건강/연동 요약', 'SCR-I007 회원 상세 건강/연동 요약'] } },
  '/members/transfer': { title: '회원 이관', category: '회원관리', functional: { file: '회원관리.md', keywords: ['회원 지점 이관', '4. 회원 지점 이관'] } },
  '/body-composition': { title: '체성분 관리', category: '회원관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['체성분 통합 관리', 'SCR-I006 체성분 통합 관리'] } },

  // 매출관리
  '/sales': { title: '매출 현황', category: '매출관리', functional: { file: '매출관리.md', keywords: ['매출 현황', '1. 매출 현황'] } },
  '/pos': { title: 'POS 판매', category: '매출관리', functional: { file: '매출관리.md', keywords: ['POS 판매', '2. POS 판매'] } },
  '/pos/payment': { title: 'POS 결제', category: '매출관리', functional: { file: '매출관리.md', keywords: ['POS 결제', '3. POS 결제'] } },
  '/sales/stats': { title: '매출 통계', category: '매출관리', functional: { file: '매출관리.md', keywords: ['매출 통계', '4. 매출 통계'] } },
  '/sales/statistics-management': { title: '통계 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['통계관리', '5. 통계관리'] } },
  '/deferred-revenue': { title: '선수익금', category: '매출관리', functional: { file: '매출관리.md', keywords: ['선수익금', '6. 선수익금'] } },
  '/refunds': { title: '환불 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['환불 관리', '7. 환불 관리'] } },
  '/unpaid': { title: '미수금 관리', category: '매출관리', functional: { file: '매출관리.md', keywords: ['미수금 관리', '8. 미수금 관리'] } },

  // 수업관리
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

  // 시설관리
  '/locker': { title: '락커 관리', category: '시설관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['옷 락커 운영 관리', 'SCR-I004 옷 락커 운영 관리'] } },
  '/locker/management': { title: '사물함 배정', category: '시설관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['고정 물품 락커 관리', 'SCR-I005 고정 물품 락커 관리'] } },
  '/rfid': { title: 'RFID 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['밴드/카드', '3. 밴드/카드'] } },
  '/rooms': { title: '운동룸 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['운동룸', '4. 운동룸'] } },
  '/golf-bays': { title: '골프 타석', category: '시설관리', functional: { file: '시설관리.md', keywords: ['골프 타석', '5. 골프 타석'] } },
  '/clothing': { title: '운동복 관리', category: '시설관리', functional: { file: '시설관리.md', keywords: ['운동복', '6. 운동복'] } },

  // 설정관리
  '/settings': { title: '센터 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['센터 설정', '1. 센터 설정'] } },
  '/settings/permissions': { title: '권한 설정', category: '설정관리', functional: { file: '설정관리.md', keywords: ['권한 설정', '2. 권한 설정'] } },
  '/settings/kiosk': { title: '키오스크 설정', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['키오스크 설정', 'SCR-I002 키오스크 설정'] } },
  '/settings/iot': { title: 'IoT 설정', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['IoT 연동 관리', 'SCR-I003 IoT 연동 관리'] } },
  '/subscription': { title: '구독 관리', category: '설정관리', functional: { file: '설정관리.md', keywords: ['구독 관리', '5. 구독 관리'] } },
  '/notices': { title: '공지사항', category: '설정관리', functional: { file: '설정관리.md', keywords: ['공지사항', '6. 공지사항'] } },
  '/attendance': { title: '출석 관리', category: '설정관리', functional: { file: '통합운영_IOT_헬스.md', keywords: ['통합 출석 관리', 'SCR-I001 통합 출석 관리'] } },

  // 마케팅
  '/leads': { title: '리드 관리', category: '마케팅', functional: { file: '마케팅.md', keywords: ['리드 관리', '1. 리드 관리'] } },
  '/message': { title: '메시지 발송', category: '마케팅', functional: { file: '마케팅.md', keywords: ['메시지 발송', '2. 메시지 발송'] } },
  '/message/auto-alarm': { title: '자동 알림', category: '마케팅', functional: { file: '마케팅.md', keywords: ['자동 알림', '3. 자동 알림'] } },
  '/message/coupon': { title: '쿠폰 관리', category: '마케팅', functional: { file: '마케팅.md', keywords: ['쿠폰 관리', '4. 쿠폰 관리'] } },
  '/mileage': { title: '마일리지', category: '마케팅', functional: { file: '마케팅.md', keywords: ['마일리지', '5. 마일리지'] } },
  '/contracts/new': { title: '전자계약', category: '마케팅', functional: { file: '마케팅.md', keywords: ['전자계약', '6. 전자계약'] } },

  // 직원관리
  '/staff': { title: '직원 목록', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 목록', '1. 직원 목록'] } },
  '/staff/new': { title: '직원 등록', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 등록', '2. 직원 등록'] } },
  '/staff/edit': { title: '직원 수정', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 등록/수정', '2. 직원 등록'] } },
  '/staff/resignation': { title: '퇴사 처리', category: '직원관리', functional: { file: '직원관리.md', keywords: ['퇴사 처리', '3. 퇴사 처리'] } },
  '/staff/attendance': { title: '직원 근태', category: '직원관리', functional: { file: '직원관리.md', keywords: ['직원 근태', '4. 직원 근태'] } },
  '/payroll': { title: '급여 관리', category: '직원관리', functional: { file: '직원관리.md', keywords: ['급여 관리', '5. 급여 관리'] } },
  '/payroll/statements': { title: '급여 명세서', category: '직원관리', functional: { file: '직원관리.md', keywords: ['급여 명세서', '6. 급여 명세서'] } },

  // 상품관리
  '/products': { title: '상품 목록', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 목록', '1. 상품 목록'] } },
  '/products/new': { title: '상품 등록', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] } },
  '/products/edit': { title: '상품 수정', category: '상품관리', functional: { file: '상품관리.md', keywords: ['상품 상세/등록', '2. 상품 상세'] } },
  '/discount-settings': { title: '할인 설정', category: '상품관리', functional: { file: '상품관리.md', keywords: ['할인 설정', '3. 할인 설정'] } },
};

// ─── 시스템 모듈 / KPI 참조 매핑 (기존 동일) ─────────────────────────────────
const ROUTE_TO_MODULE: Record<string, { module: string; section?: string }> = {
  '/': { module: '모듈 1', section: '주요 기능' },
  '/super-dashboard': { module: '모듈 1', section: '주요 기능' },
  '/branch-report': { module: '모듈 1', section: '주요 기능' },
  '/kpi': { module: '모듈 1', section: '주요 기능' },
  '/kpi-preview': { module: '모듈 1', section: '주요 기능' },
  '/members': { module: '모듈 2', section: '주요 기능' },
  '/members/new': { module: '모듈 2', section: '주요 기능' },
  '/members/edit': { module: '모듈 2', section: '주요 기능' },
  '/members/detail': { module: '모듈 2', section: '주요 기능' },
  '/members/transfer': { module: '모듈 2', section: '주요 기능' },
  '/body-composition': { module: '모듈 2', section: '주요 기능' },
  '/lessons': { module: '모듈 2', section: '강습(PT) 관리 고도화' },
  '/lesson-counts': { module: '모듈 2', section: '강습(PT) 관리 고도화' },
  '/leads': { module: '모듈 3', section: 'I. 신규회원 유입 강화' },
  '/message': { module: '모듈 3', section: '주요 기능' },
  '/message/auto-alarm': { module: '모듈 3', section: 'II. 기존회원 유지율 향상' },
  '/message/coupon': { module: '모듈 3', section: 'II. 기존회원 유지율 향상' },
  '/mileage': { module: '모듈 3', section: 'II. 기존회원 유지율 향상' },
  '/contracts/new': { module: '모듈 3', section: '주요 기능' },
  '/calendar': { module: '모듈 4', section: '주요 기능' },
  '/class-schedule': { module: '모듈 4', section: '주요 기능' },
  '/class-templates': { module: '모듈 4', section: '주요 기능' },
  '/attendance': { module: '모듈 4', section: '주요 기능' },
  '/class-stats': { module: '모듈 4' },
  '/instructor-status': { module: '모듈 4' },
  '/sales': { module: '모듈 5', section: '주요 기능' },
  '/pos': { module: '모듈 5', section: '주요 기능' },
  '/pos/payment': { module: '모듈 5', section: '주요 기능' },
  '/refunds': { module: '모듈 5', section: '주요 기능' },
  '/unpaid': { module: '모듈 5', section: '주요 기능' },
  '/deferred-revenue': { module: '모듈 5', section: '주요 기능' },
  '/payroll': { module: '모듈 5', section: '주요 기능' },
  '/payroll/statements': { module: '모듈 5', section: '주요 기능' },
  '/sales/stats': { module: '모듈 6', section: '주요 기능' },
  '/sales/statistics-management': { module: '모듈 6', section: '주요 기능' },
  '/reports': { module: '모듈 6', section: '주요 기능' },
};

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

// ─── 유틸 섹션 추출 (기존 함수 이식) ──────────────────────────────────────────
function extractKpiSection(content: string, sectionName: string): string {
  if (sectionName === '전체') return content;
  const lines = content.split('\n');
  const result: string[] = [];
  let capturing = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if ((trimmed.startsWith('## ') || trimmed.startsWith('### ')) && trimmed.includes(sectionName)) {
      capturing = true; result.push(line); continue;
    }
    if (capturing && trimmed.startsWith('## ') && !trimmed.includes(sectionName)) break;
    if (capturing) result.push(line);
  }
  return result.join('\n');
}

function extractModuleSection(content: string, moduleName: string): string {
  const lines = content.split('\n');
  let capturing = false;
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ') && trimmed.includes(moduleName)) {
      capturing = true; result.push(line); continue;
    }
    if (capturing && trimmed.startsWith('## ') && !trimmed.includes(moduleName)) break;
    if (capturing) result.push(line);
  }
  return result.join('\n');
}

// ─── 화면설계서 폴더 스캔 ────────────────────────────────────────────────────
interface StateDoc {
  file: string;          // 예: 01-기본.md
  label: string;         // 예: 기본
  content: string;
}

interface ScreenDocs {
  folder: string;
  /** 마스터 파일(00-기본화면.md) frontmatter (gray-matter) */
  frontmatter: Record<string, unknown> | null;
  /** 마스터 파일 본문 (frontmatter 제외) */
  masterContent: string;
  states: StateDoc[];
}

/** 파일명에서 상태 라벨 추출. "01-기본.md" → "기본" */
function extractStateLabel(fileName: string): string {
  const base = fileName.replace(/\.md$/i, '');
  // "01-기본", "02-로딩" 형태: 숫자+하이픈 이후를 라벨로
  const match = base.match(/^\d{2}-(.+)$/);
  return match ? match[1] : base;
}

// ─── route → 화면 폴더 자동 인덱스 (frontmatter.route 기반) ──────────────────
// 모듈 초기화 시 1회 스캔 후 메모리 캐시.
let screenIndex: Map<string, string> | null = null;

function walkMasters(root: string, acc: string[] = []): string[] {
  if (!fs.existsSync(root)) return acc;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkMasters(full, acc);
    else if (entry.name === '00-기본화면.md') acc.push(full);
  }
  return acc;
}

function buildScreenIndex(): Map<string, string> {
  const idx = new Map<string, string>();
  const root = path.join(process.cwd(), 'docs', '화면설계서');
  const masters = walkMasters(root);
  for (const file of masters) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = matter(raw);
      const route = typeof parsed.data?.route === 'string' ? parsed.data.route.trim() : null;
      if (!route) continue;
      const folder = path.relative(root, path.dirname(file));
      // 동일 route에 여러 마스터가 있으면 첫 번째만 (일반적으로 중복 없어야 함)
      if (!idx.has(route)) idx.set(route, folder);
    } catch {
      // 단일 파일 오류는 무시하고 인덱스는 계속 구축
    }
  }
  return idx;
}

function getScreenIndex(): Map<string, string> {
  if (screenIndex) return screenIndex;
  screenIndex = buildScreenIndex();
  return screenIndex;
}

function loadScreenDocs(folder: string): ScreenDocs | null {
  try {
    const fullPath = path.join(process.cwd(), 'docs', '화면설계서', folder);
    if (!fs.existsSync(fullPath)) return null;

    const entries = fs.readdirSync(fullPath).filter((name) => name.endsWith('.md'));
    if (entries.length === 0) return null;

    // 마스터 (00-기본화면.md) 우선 로드
    let frontmatter: Record<string, unknown> | null = null;
    let masterContent = '';
    const masterName = '00-기본화면.md';
    if (entries.includes(masterName)) {
      const raw = fs.readFileSync(path.join(fullPath, masterName), 'utf-8');
      const parsed = matter(raw);
      frontmatter = parsed.data as Record<string, unknown>;
      masterContent = stripDevSections(parsed.content.trim());
    }

    // 상태 파일 (01-*.md ~ 99-*.md) 정렬
    const stateFiles = entries
      .filter((name) => /^\d{2}-.+\.md$/.test(name) && name !== masterName && !name.startsWith('_'))
      .sort();

    const states: StateDoc[] = stateFiles.map((file) => {
      const raw = fs.readFileSync(path.join(fullPath, file), 'utf-8');
      const parsed = matter(raw);
      const fmLabel = typeof parsed.data?.state === 'string' ? parsed.data.state : null;
      return {
        file,
        label: fmLabel || extractStateLabel(file),
        content: stripDevSections(parsed.content.trim()),
      };
    });

    return { folder, frontmatter, masterContent, states };
  } catch {
    return null;
  }
}

// ─── GET 핸들러 ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const routePath = request.nextUrl.searchParams.get('path') || '/';
  const mapping = ROUTE_TO_DOC[routePath];

  if (!mapping) {
    return NextResponse.json({
      path: routePath,
      title: routePath,
      category: '',
      functional: null,
      screen: null,
      error: '해당 페이지의 문서가 준비 중입니다.',
    });
  }

  // ── 1) 기능명세서 (functional) ──
  let functional: { file: string; content: string; keywords: string[] } | null = null;
  if (mapping.functional) {
    try {
      const docPath = path.join(process.cwd(), 'docs', '기능명세서', mapping.functional.file);
      let content = fs.readFileSync(docPath, 'utf-8');

      // 시스템 모듈 보너스 섹션 (plan/ 이동 후 경로 동기화)
      const moduleMapping = ROUTE_TO_MODULE[routePath];
      if (moduleMapping) {
        try {
          const modulePath = path.join(process.cwd(), 'plan', '시스템_모듈_정의서.md');
          const moduleContent = fs.readFileSync(modulePath, 'utf-8');
          const moduleSection = extractModuleSection(moduleContent, moduleMapping.module);
          if (moduleSection) content += '\n\n---\n\n# 📋 관련 시스템 모듈\n\n' + moduleSection;
        } catch { /* 모듈 정의서 없어도 무시 */ }
      }

      // KPI 보너스 섹션 (plan/ 이동 후 경로 동기화)
      const kpiMapping = ROUTE_TO_KPI[routePath];
      if (kpiMapping) {
        try {
          const kpiPath = path.join(process.cwd(), 'plan', 'KPI_정의서.md');
          const kpiContent = fs.readFileSync(kpiPath, 'utf-8');
          const kpiSection = extractKpiSection(kpiContent, kpiMapping.section);
          if (kpiSection) content += '\n\n---\n\n# 📊 관련 KPI\n\n' + kpiSection;
        } catch { /* KPI 정의서 없어도 무시 */ }
      }

      functional = {
        file: mapping.functional.file,
        content: stripDevSections(content),
        keywords: mapping.functional.keywords,
      };
    } catch {
      functional = {
        file: mapping.functional.file,
        content: '',
        keywords: mapping.functional.keywords,
      };
    }
  }

  // ── 2) 화면설계서 (screen) ──
  // 우선순위: 명시적 mapping.screen.folder → frontmatter.route 기반 자동 인덱스
  const screenFolder = mapping.screen?.folder ?? getScreenIndex().get(routePath) ?? null;
  const screen = screenFolder ? loadScreenDocs(screenFolder) : null;

  const category = mapping.category || (mapping.functional ? FILE_TO_CATEGORY[mapping.functional.file] ?? '' : '');

  return NextResponse.json({
    path: routePath,
    title: mapping.title,
    category,
    functional,
    screen,
  });
}
