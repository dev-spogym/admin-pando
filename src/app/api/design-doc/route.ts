import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRouteMapping } from '@/lib/designDocMap';
import { parseFrontmatter } from '@/lib/frontmatter';
import { stripDevSections } from '@/lib/stripDevSections';
import {
  getScreensByRoute,
  DOCS4_DOMAIN_FILES,
  DOCS4_DOMAIN_LABELS,
  type Docs4Domain,
} from '@/lib/docs4Registry';

// ─── docs4 기획문서(V1+V2) 로더 ──────────────────────────────────────────────
// docs4/** 는 읽기 전용. 라우트로 도메인/SCR을 역조회해 해당 SCR + 연결 DLG 섹션을
// 추출하고, 모든 화면 공통으로 적용되는 공통 프레임/정책을 부록으로 덧붙인다.

const DOCS4_ROOT = path.join(process.cwd(), 'docs4');

/** `## <code> ...` 헤딩부터 다음 `## ` 헤딩(또는 EOF) 직전까지 추출. `### ` 하위 섹션은 유지 */
function extractSection(content: string, code: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let capturing = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      if (capturing) break; // 다음 ## 섹션 시작 → 종료
      // `## SCR-M001 회원 목록`, `## DLG-056-001 장비 등록` → 첫 토큰 일치
      const firstToken = trimmed.replace(/^##\s+/, '').split(/\s+/)[0];
      if (firstToken === code) {
        capturing = true;
        result.push(line);
      }
      continue;
    }
    if (capturing) result.push(line);
  }
  return result.join('\n').trim();
}

function readFileSafe(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/** 본문 파일 1개에서 여러 코드(SCR/DLG) 섹션을 추출해 합친다 */
function extractCodesFromFile(filePath: string, codes: string[]): string {
  const raw = readFileSafe(filePath);
  if (!raw) return '';
  return codes
    .map((code) => extractSection(raw, code))
    .filter((s) => s.length > 0)
    .join('\n\n');
}

/** SCR 본문에서 참조된 DLG 코드(예: DLG-M001, DLG-056-001)를 중복 없이 수집 */
function collectReferencedDialogCodes(scrContent: string): string[] {
  const matches = scrContent.match(/DLG-[A-Za-z0-9-]+/g) ?? [];
  return Array.from(new Set(matches));
}

// 공통 프레임/정책은 매 요청마다 동일하므로 1회 로드 후 캐시
let commonFrameCache: string | null = null;
let commonPolicyCache: string | null = null;

/** 모든 화면에 적용되는 공통 프레임 화면(사이드바/글로벌검색/알림센터/화면설계서/로그아웃) */
function loadCommonFrameDocs(): string {
  if (commonFrameCache !== null) return commonFrameCache;
  const codes = ['SCR-102', 'SCR-103', 'SCR-104', 'SCR-107', 'SCR-109'];
  const parts: string[] = [];
  for (const version of ['V1', 'V2'] as const) {
    const body = extractCodesFromFile(
      path.join(DOCS4_ROOT, version, 'D01-공통', '공통.md'),
      codes
    );
    if (body) parts.push(`## [${version}] 공통 프레임\n\n${body}`);
  }
  commonFrameCache = parts.join('\n\n');
  return commonFrameCache;
}

/** _공통 정책 문서(권한/토스트/상태전이) — 패널 하단 접이식 부록 */
function loadCommonPolicyDocs(): string {
  if (commonPolicyCache !== null) return commonPolicyCache;
  const files = [
    { name: '권한매트릭스.md', title: '공통 권한 매트릭스' },
    { name: '토스트_메시지.md', title: '공통 토스트 메시지' },
    { name: '상태전이.md', title: '공통 상태 전이' },
  ];
  const parts: string[] = [];
  for (const f of files) {
    const raw = readFileSafe(path.join(DOCS4_ROOT, '_공통', f.name));
    if (raw) {
      // 최상위 `# 제목`은 부록 헤딩과 충돌하지 않도록 `## `로 강등
      const body = raw.replace(/^#\s+/gm, '## ');
      parts.push(`## ${f.title}\n\n${body.trim()}`);
    }
  }
  commonPolicyCache = parts.join('\n\n');
  return commonPolicyCache;
}

/** 라우트의 docs4 화면 명세(V1/V2) + 운영정책 + 연결 DLG + 공통 프레임/정책을 구성 */
function loadDocs4Functional(
  routePath: string
): { file: string; content: string; keywords: string[]; category: string } | null {
  const screens = getScreensByRoute(routePath);
  if (screens.length === 0) return null;

  // 다중 도메인 라우트 대응: 코드를 도메인별로 묶어 각자의 docs4 파일에서 추출
  const byDomain = new Map<Docs4Domain, string[]>();
  for (const s of screens) {
    byDomain.set(s.domain, [...(byDomain.get(s.domain) ?? []), s.code]);
  }

  const sections: string[] = [];
  const allCodes: string[] = [];
  const fileLabels: string[] = [];

  for (const [domain, codes] of byDomain) {
    const meta = DOCS4_DOMAIN_FILES[domain];
    const label = DOCS4_DOMAIN_LABELS[domain];
    allCodes.push(...codes);
    fileLabels.push(`${meta.folder} · ${codes.join(', ')}`);

    for (const version of ['V1', 'V2'] as const) {
      const bodyPath = path.join(DOCS4_ROOT, version, meta.folder, meta.body);
      const body = extractCodesFromFile(bodyPath, codes);
      if (body) {
        sections.push(`# [${version}] ${label} 화면 명세\n\n${body}`);

        // 화면이 참조하는 다이얼로그 상세도 같은 도메인 파일에서 추출
        const dlgCodes = collectReferencedDialogCodes(body);
        const dlgBody = extractCodesFromFile(bodyPath, dlgCodes);
        if (dlgBody) {
          sections.push(`# [${version}] ${label} 연결 다이얼로그 상세\n\n${dlgBody}`);
        }
      }
      const policy = extractCodesFromFile(
        path.join(DOCS4_ROOT, version, meta.folder, '운영정책.md'),
        codes
      );
      if (policy) {
        sections.push(`# [${version}] ${label} 운영정책\n\n${policy}`);
      }
    }
  }

  if (sections.length === 0) return null;

  // 공통 프레임(사이드바/검색/알림 등) — 모든 화면 공통 적용이므로 부록으로 첨부
  const commonFrame = loadCommonFrameDocs();
  if (commonFrame) sections.push(`# 공통 프레임 명세 (모든 화면 공통)\n\n${commonFrame}`);

  // _공통 정책 부록
  const commonPolicy = loadCommonPolicyDocs();
  if (commonPolicy) sections.push(`# 공통 정책 (권한·토스트·상태전이)\n\n${commonPolicy}`);

  const primaryDomain = screens[0].domain;
  return {
    file: `docs4 · ${fileLabels.join(' / ')}`,
    content: sections.join('\n\n---\n\n'),
    keywords: allCodes,
    category: DOCS4_DOMAIN_LABELS[primaryDomain],
  };
}

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
  '/class-reservations': { module: '모듈 4', section: '주요 기능' },
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
  '/class-reservations': { section: 'PT Trainer' },
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
  /** 마스터 파일(00-기본화면.md) frontmatter */
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

function walkNamedFiles(root: string, targetName: string, acc: string[] = []): string[] {
  if (!fs.existsSync(root)) return acc;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkNamedFiles(full, targetName, acc);
    else if (entry.name === targetName) acc.push(full);
  }
  return acc;
}

function buildScreenIndex(): Map<string, string> {
  const idx = new Map<string, string>();
  const root = path.join(process.cwd(), 'docs', 'admin', '화면설계서');
  const masters = walkMasters(root);
  for (const file of masters) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = parseFrontmatter(raw);
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
    const fullPath = path.join(process.cwd(), 'docs', 'admin', '화면설계서', folder);
    if (!fs.existsSync(fullPath)) return null;

    const entries = fs.readdirSync(fullPath).filter((name) => name.endsWith('.md'));
    if (entries.length === 0) return null;

    // 마스터 (00-기본화면.md) 우선 로드
    let frontmatter: Record<string, unknown> | null = null;
    let masterContent = '';
    const masterName = '00-기본화면.md';
    if (entries.includes(masterName)) {
      const raw = fs.readFileSync(path.join(fullPath, masterName), 'utf-8');
      const parsed = parseFrontmatter(raw);
      frontmatter = parsed.data as Record<string, unknown>;
      masterContent = stripDevSections(parsed.content.trim());
    }

    // 상태 파일 (01-*.md ~ 99-*.md) 정렬
    const stateFiles = entries
      .filter((name) => /^\d{2}-.+\.md$/.test(name) && name !== masterName && !name.startsWith('_'))
      .sort();

    const states: StateDoc[] = stateFiles.map((file) => {
      const raw = fs.readFileSync(path.join(fullPath, file), 'utf-8');
      const parsed = parseFrontmatter(raw);
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

interface FeatureDocRecord {
  id: string;
  title: string;
  relativePath: string;
  content: string;
}

let featureDocIndex: Map<string, FeatureDocRecord> | null = null;

function buildFeatureDocIndex(): Map<string, FeatureDocRecord> {
  const index = new Map<string, FeatureDocRecord>();
  const root = path.join(process.cwd(), 'docs', 'admin', '기능명세서');
  const masters = walkNamedFiles(root, '00-기본기능.md');

  for (const file of masters) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = parseFrontmatter(raw);
      const id = typeof parsed.data?.id === 'string' ? parsed.data.id.trim() : '';
      if (!id) continue;

      index.set(id, {
        id,
        title: typeof parsed.data?.title === 'string' ? parsed.data.title.trim() : id,
        relativePath: path.relative(root, file),
        content: stripDevSections(parsed.content.trim()),
      });
    } catch {
      // 기능명세서 단일 파일 오류는 무시하고 계속 구축
    }
  }

  return index;
}

function getFeatureDocIndex(): Map<string, FeatureDocRecord> {
  if (featureDocIndex) return featureDocIndex;
  featureDocIndex = buildFeatureDocIndex();
  return featureDocIndex;
}

function loadFunctionalFromFeatureCodes(featureCodes: unknown): { file: string; content: string; keywords: string[] } | null {
  if (!Array.isArray(featureCodes) || featureCodes.length === 0) return null;

  const featureIds = featureCodes.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (featureIds.length === 0) return null;

  const records = featureIds
    .map((id) => getFeatureDocIndex().get(id))
    .filter((record): record is FeatureDocRecord => Boolean(record));

  if (records.length === 0) return null;

  const mergedContent = records
    .map((record) => `# ${record.id} ${record.title}\n\n${record.content}`)
    .join('\n\n---\n\n');

  return {
    file: records.map((record) => record.id).join(', '),
    content: mergedContent,
    keywords: featureIds,
  };
}

function loadLegacyFunctionalDoc(file: string, keywords: string[]): { file: string; content: string; keywords: string[] } | null {
  const docPath = path.join(process.cwd(), 'docs', 'admin', '기능명세서', file);
  if (!fs.existsSync(docPath)) return null;

  const content = fs.readFileSync(docPath, 'utf-8');
  return {
    file,
    content: stripDevSections(content),
    keywords,
  };
}

// ─── GET 핸들러 ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const routePath = request.nextUrl.searchParams.get('path') || '/';
  const mapping = getRouteMapping(routePath);
  const indexedScreenFolder = getScreenIndex().get(routePath) ?? null;

  // ── docs4 우선 (단일 진실원) ──
  const docs4Functional = loadDocs4Functional(routePath);

  if (!mapping && !indexedScreenFolder && !docs4Functional) {
    return NextResponse.json({
      path: routePath,
      title: routePath,
      category: '',
      functional: null,
      screen: null,
      error: '해당 페이지의 문서가 준비 중입니다.',
    });
  }

  // ── 1) 화면설계서 (screen) — 레거시 docs/admin 폴백 ──
  // 우선순위: 명시적 mapping.screen.folder → frontmatter.route 기반 자동 인덱스
  const screenFolder = mapping?.screen?.folder ?? indexedScreenFolder;
  const screen = screenFolder ? loadScreenDocs(screenFolder) : null;

  // ── 2) 기능명세서 (functional) ──
  // 우선순위: docs4(V1+V2) → 화면설계서 feature_codes → 레거시 기능명세서
  let functional: { file: string; content: string; keywords: string[] } | null = docs4Functional
    ? { file: docs4Functional.file, content: docs4Functional.content, keywords: docs4Functional.keywords }
    : null;

  if (!functional) {
    functional = loadFunctionalFromFeatureCodes(screen?.frontmatter?.feature_codes);
  }

  if (!functional && mapping?.functional) {
    functional = loadLegacyFunctionalDoc(mapping.functional.file, mapping.functional.keywords);
  }

  if (functional) {
    let content = functional.content;

    const moduleMapping = ROUTE_TO_MODULE[routePath];
    if (moduleMapping) {
      try {
        const modulePath = path.join(process.cwd(), 'plan', '시스템_모듈_정의서.md');
        const moduleContent = fs.readFileSync(modulePath, 'utf-8');
        const moduleSection = extractModuleSection(moduleContent, moduleMapping.module);
        if (moduleSection) content += '\n\n---\n\n# 📋 관련 시스템 모듈\n\n' + moduleSection;
      } catch {
        // 모듈 정의서 없어도 무시
      }
    }

    const kpiMapping = ROUTE_TO_KPI[routePath];
    if (kpiMapping) {
      try {
        const kpiPath = path.join(process.cwd(), 'plan', 'KPI_정의서.md');
        const kpiContent = fs.readFileSync(kpiPath, 'utf-8');
        const kpiSection = extractKpiSection(kpiContent, kpiMapping.section);
        if (kpiSection) content += '\n\n---\n\n# 📊 관련 KPI\n\n' + kpiSection;
      } catch {
        // KPI 정의서 없어도 무시
      }
    }

    functional = { ...functional, content };
  }

  const category =
    docs4Functional?.category ||
    mapping?.category ||
    (mapping?.functional ? FILE_TO_CATEGORY[mapping.functional.file] ?? '' : '');

  return NextResponse.json({
    path: routePath,
    title: mapping?.title ?? routePath,
    category,
    functional,
    screen,
  });
}
