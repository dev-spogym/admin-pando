/**
 * 화면설계서 마스터(00-기본화면.md) frontmatter 자동 풍부화.
 *
 * 기존 frontmatter에 이미 있는 필드는 보존하고, 본문의 "메타 표" + "원천 문서 링크"를
 * 파싱해 비어있는 필드를 채웁니다.
 *
 * 채우는 필드:
 *   - priority  (메타: "우선순위" → P0/P1/P2)
 *   - roles     (메타: "역할" → 배열)
 *   - platforms (메타: "플랫폼" → [desktop, tablet, mobile])
 *   - route     (SCR: 메타 "경로")
 *   - filePath  (메타: "파일 경로")
 *   - component (메타: "페이지 컴포넌트" 또는 "컴포넌트")
 *   - diagrams  (본문 내 백틱으로 감싼 docs/다이어그램/*.md 경로 실존만 수집)
 *   - errorCodes(본문 내 E######## 토큰)
 *
 * 안전장치:
 *   - 이미 값이 있는 필드는 덮어쓰지 않음
 *   - diagrams는 실존하는 파일만 포함
 *   - parentRoutes는 파싱 복잡도가 높아 자동화 제외 (수기 채움)
 *
 * 사용:
 *   tsx scripts/enrich-frontmatter.ts --dry-run
 *   tsx scripts/enrich-frontmatter.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SCREEN_ROOT = path.join(ROOT, 'docs', '화면설계서');
const MASTER_NAME = '00-기본화면.md';

const dryRun = process.argv.includes('--dry-run');

function findMasterFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findMasterFiles(full, acc);
    else if (entry.name === MASTER_NAME) acc.push(full);
  }
  return acc;
}

// "## 0. 메타" 또는 "## 메타" 이후 첫 번째 '| 항목 | 값 |' 표를 파싱.
function extractMetaTable(body: string): Record<string, string> {
  const lines = body.split('\n');
  const meta: Record<string, string> = {};
  let state: 'search' | 'separator' | 'data' = 'search';

  for (const line of lines) {
    const trimmed = line.trim();
    if (state === 'search') {
      if (/^\|\s*항목\s*\|\s*값\s*\|/.test(trimmed)) state = 'separator';
      continue;
    }
    if (state === 'separator') {
      if (/^\|\s*:?-+:?\s*\|/.test(trimmed)) state = 'data';
      continue;
    }
    if (state === 'data') {
      const m = trimmed.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
      if (m) {
        meta[m[1]] = m[2];
      } else {
        break; // 표 종료
      }
    }
  }
  return meta;
}

function parsePriority(val: string): string | null {
  const m = val.match(/P[012]/);
  return m ? m[0] : null;
}

function parseRoles(val: string): string[] | null {
  const cleaned = val.replace(/`/g, '').replace(/\s*\([^)]*\)/g, '').trim();
  if (!cleaned) return null;
  if (/^all$/i.test(cleaned)) return ['all'];
  const parts = cleaned
    .split(/\s*[/,·]\s*/)
    .map((s) => s.replace(/[●○◐◑❌✓✗\-—–]/g, '').trim())
    .map((s) => s.split(/\s+/)[0]) // 공백 이후 수식어 버림 ("owner ●" → "owner")
    .filter((s) => s && !/^그$/.test(s) && !/^외$/.test(s) && !/^그외/.test(s));
  return parts.length > 0 ? parts : null;
}

const PLATFORM_MAP: Record<string, string> = {
  '데스크톱': 'desktop',
  'desktop': 'desktop',
  '태블릿': 'tablet',
  'tablet': 'tablet',
  '모바일': 'mobile',
  'mobile': 'mobile',
};

function parsePlatforms(val: string): string[] | null {
  const cleaned = val.replace(/\s*\([^)]*\)/g, '').trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/\s*[/,·]\s*/).map((s) => s.trim()).filter(Boolean);
  const mapped = parts
    .map((p) => {
      // "데스크톱 우선" / "모바일 축약" → 첫 단어만 매핑
      const first = p.split(/\s+/)[0];
      return PLATFORM_MAP[first] || PLATFORM_MAP[p] || null;
    })
    .filter((p): p is string => !!p);
  // 중복 제거
  const unique = Array.from(new Set(mapped));
  return unique.length > 0 ? unique : null;
}

function parseBacktickedPath(val: string): string | null {
  const m = val.match(/`([^`]+)`/);
  if (m) return m[1].trim();
  const t = val.trim();
  return t || null;
}

function parseComponent(val: string): string | null {
  const m = val.match(/`?([A-Z][A-Za-z0-9_]+)`?/);
  return m ? m[1] : null;
}

function parseRoute(val: string): string | null {
  const m = val.match(/`(\/[^`]*)`/);
  if (m) return m[1].trim();
  const t = val.trim();
  if (t.startsWith('/')) {
    // "/login" 또는 "/login (쿼리 ...)" — 앞쪽 경로만
    const space = t.search(/\s/);
    return space > 0 ? t.slice(0, space) : t;
  }
  return null;
}

function extractDiagrams(body: string): string[] {
  const found = new Set<string>();
  const re = /`(docs\/다이어그램\/[^\s`|]+\.md)`/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const abs = path.join(ROOT, m[1]);
    if (fs.existsSync(abs)) found.add(m[1]);
  }
  return Array.from(found);
}

function extractErrorCodes(body: string): string[] {
  const found = new Set<string>();
  const re = /\bE\d{5,6}\b/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    found.add(m[0]);
  }
  return Array.from(found).sort();
}

interface Frontmatter {
  id?: string;
  kind?: string;
  domain?: string;
  title?: string;
  route?: string;
  parentRoutes?: string[];
  filePath?: string;
  component?: string;
  priority?: string;
  roles?: string[];
  platforms?: string[];
  functional?: unknown;
  diagrams?: string[];
  errorCodes?: string[];
  [key: string]: unknown;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function enrichFile(file: string): { added: string[]; file: string } | null {
  const raw = fs.readFileSync(file, 'utf-8');
  const parsed = matter(raw);
  const fm = parsed.data as Frontmatter;
  const body = parsed.content;
  const meta = extractMetaTable(body);

  const added: string[] = [];

  // priority
  if (isEmpty(fm.priority) && meta['우선순위']) {
    const p = parsePriority(meta['우선순위']);
    if (p) {
      fm.priority = p;
      added.push(`priority=${p}`);
    }
  }
  // roles
  if (isEmpty(fm.roles) && meta['역할']) {
    const r = parseRoles(meta['역할']);
    if (r) {
      fm.roles = r;
      added.push(`roles=[${r.join(',')}]`);
    }
  }
  // platforms
  if (isEmpty(fm.platforms) && meta['플랫폼']) {
    const p = parsePlatforms(meta['플랫폼']);
    if (p) {
      fm.platforms = p;
      added.push(`platforms=[${p.join(',')}]`);
    }
  }
  // route (SCR만)
  if (fm.kind === 'screen' && isEmpty(fm.route) && meta['경로']) {
    const r = parseRoute(meta['경로']);
    if (r) {
      fm.route = r;
      added.push(`route=${r}`);
    }
  }
  // filePath
  if (isEmpty(fm.filePath) && meta['파일 경로']) {
    const f = parseBacktickedPath(meta['파일 경로']);
    if (f) {
      fm.filePath = f;
      added.push(`filePath=${f}`);
    }
  }
  // component
  if (isEmpty(fm.component)) {
    const v = meta['페이지 컴포넌트'] || meta['컴포넌트'];
    if (v) {
      const c = parseComponent(v);
      if (c) {
        fm.component = c;
        added.push(`component=${c}`);
      }
    }
  }
  // diagrams
  if (isEmpty(fm.diagrams)) {
    const d = extractDiagrams(body);
    if (d.length > 0) {
      fm.diagrams = d;
      added.push(`diagrams(${d.length})`);
    }
  }
  // errorCodes
  if (isEmpty(fm.errorCodes)) {
    const e = extractErrorCodes(body);
    if (e.length > 0) {
      fm.errorCodes = e;
      added.push(`errorCodes(${e.length})`);
    }
  }

  if (added.length === 0) return null;

  if (!dryRun) {
    const newRaw = matter.stringify(body, fm as Record<string, unknown>);
    fs.writeFileSync(file, newRaw);
  }

  return { added, file };
}

// ─── main ────────────────────────────────────────────────────────────────────
function main() {
  console.log('─'.repeat(60));
  console.log(`🔬 화면설계서 frontmatter 풍부화${dryRun ? ' (dry-run)' : ''}`);
  console.log('─'.repeat(60));

  const files = findMasterFiles(SCREEN_ROOT);
  console.log(`스캔: ${files.length}개 마스터\n`);

  let enriched = 0;
  let unchanged = 0;
  const fieldCounts: Record<string, number> = {};

  for (const file of files) {
    const result = enrichFile(file);
    if (!result) {
      unchanged++;
      continue;
    }
    enriched++;
    const rel = path.relative(ROOT, file);
    console.log(`[${dryRun ? 'dry' : 'write'}] ${rel}`);
    console.log(`       +${result.added.join(', ')}`);
    for (const a of result.added) {
      const key = a.split('=')[0].split('(')[0];
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }
  }

  console.log('');
  console.log(`${dryRun ? '예상' : '완료'}: ${enriched}개 풍부화, ${unchanged}개 미변경`);
  console.log('필드별 추가 건수:');
  for (const [k, v] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} ${v}`);
  }
  if (dryRun) console.log('\n실제 적용은 --dry-run 없이 재실행');
}

main();
