import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE_TO_DOC } from '../src/lib/designDocMap.ts';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const APP_ROOT = path.join(ROOT, 'src', 'app');
const DOC_ROOT = path.join(ROOT, 'docs', 'admin', '화면설계서');

const warnings: string[] = [];
const errors: string[] = [];

const APP_ROUTE_EXCLUDES = new Set([
  '/forbidden',
  '/not-found',
  '/publishing',
  '/publishing-guide',
  '/publishing/[category]',
  '/client-preview',
  '/client-preview/[category]',
  '/diagrams',
  '/error',
]);
const DOC_ROUTE_OPTIONAL = new Set(['/forbidden', '/not-found', '/diagrams']);
const DOC_ROUTE_ALIASES: Record<string, string[]> = {
  '/error': ['/forbidden', '/not-found'],
};

function walk(dir: string, matcher: (fileName: string) => boolean, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, matcher, acc);
      continue;
    }
    if (matcher(entry.name)) acc.push(full);
  }
  return acc;
}

function normalizeAppRoute(file: string): string {
  const rel = path.relative(APP_ROOT, file).replace(/\\/g, '/');
  const withoutFile = rel.replace(/\/page\.tsx$/, '');
  const withoutGroups = withoutFile.replace(/\/?\([^/]+\)/g, '');
  return withoutGroups ? `/${withoutGroups}`.replace(/\/+/g, '/') : '/';
}

function parseDocRoutes(rawRoute: string): string[] {
  return rawRoute
    .split(' 또는 ')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^['"]|['"]$/g, ''))
    .filter((item) => !item.startsWith('('))
    .map((item) => item.split(' (')[0]?.trim() ?? item)
    .filter((item) => item.startsWith('/'));
}

function extractFrontmatterRoute(file: string): string[] {
  const raw = fs.readFileSync(file, 'utf8');
  const match = raw.match(/\nroute:\s*(.+)/);
  if (!match) return [];
  return parseDocRoutes(match[1]);
}

function addError(message: string) {
  errors.push(message);
}

function addWarn(message: string) {
  warnings.push(message);
}

function main() {
  console.log('─'.repeat(60));
  console.log('🧭 관리자 라우트/문서 정합성 검증');
  console.log('─'.repeat(60));

  const appRoutes = Array.from(
    new Set(
      walk(APP_ROOT, (name) => name === 'page.tsx')
        .map(normalizeAppRoute)
        .filter((route) => !route.startsWith('/api'))
        .filter((route) => !APP_ROUTE_EXCLUDES.has(route))
    )
  ).sort();

  const mappedRoutes = Object.keys(ROUTE_TO_DOC).sort();

  const docMasters = walk(DOC_ROOT, (name) => name === '00-기본화면.md');
  const docRoutes = new Set<string>();

  for (const file of docMasters) {
    for (const route of extractFrontmatterRoute(file)) {
      docRoutes.add(route);
      for (const alias of DOC_ROUTE_ALIASES[route] ?? []) {
        docRoutes.add(alias);
      }
    }
  }

  for (const route of appRoutes) {
    if (!ROUTE_TO_DOC[route]) {
      addError(`앱 라우트가 ROUTE_TO_DOC에 없음: ${route}`);
    }
  }

  for (const [route, config] of Object.entries(ROUTE_TO_DOC)) {
    if (!appRoutes.includes(route) && !APP_ROUTE_EXCLUDES.has(route)) {
      addError(`ROUTE_TO_DOC 라우트에 page.tsx가 없음: ${route}`);
    }

    if (!docRoutes.has(route) && !DOC_ROUTE_OPTIONAL.has(route)) {
      addWarn(`ROUTE_TO_DOC 라우트가 화면설계서 route에 직접 없음: ${route}`);
    }

    if (config.screen) {
      const screenFolder = path.join(DOC_ROOT, config.screen.folder);
      const screenMaster = path.join(screenFolder, '00-기본화면.md');
      if (!fs.existsSync(screenMaster)) {
        addError(`screen.folder 마스터 파일이 없음: ${config.screen.folder}`);
      }
    }

  }

  for (const route of docRoutes) {
    if (!ROUTE_TO_DOC[route] && !APP_ROUTE_EXCLUDES.has(route)) {
      addWarn(`화면설계서 route가 ROUTE_TO_DOC에 없음: ${route}`);
    }
  }

  console.log(`앱 라우트: ${appRoutes.length}`);
  console.log(`ROUTE_TO_DOC: ${mappedRoutes.length}`);
  console.log(`문서 route: ${docRoutes.size}`);
  console.log(`오류: ${errors.length}`);
  console.log(`경고: ${warnings.length}`);
  console.log('');

  if (errors.length > 0) {
    console.log('❌ 오류 목록');
    for (const message of errors) console.log(`  [ERR] ${message}`);
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️ 경고 목록');
    for (const message of warnings) console.log(`  [WRN] ${message}`);
    console.log('');
  }

  if (errors.length > 0) {
    console.log('✗ 검증 실패');
    process.exit(1);
  }

  console.log('✓ 검증 통과');
}

main();
