/**
 * 화면설계서 frontmatter 스캔 + 드리프트 검증 스크립트
 *
 * 사용:
 *   pnpm docs:check        # 검증만 (실패 시 exit 1)
 *   pnpm docs:check --verbose  # 파일별 상세 출력
 *
 * 검증 항목:
 *   1. 화면설계서 마스터(00-기본화면.md)의 frontmatter 필수 필드 존재
 *   2. id / kind / domain 값이 폴더명과 일치
 *   3. diagrams 배열의 각 경로가 실제 존재
 *
 * TODO(v2):
 *   - --write 모드로 docs/기능명세서/ 자동 재생성
 *   - 라우트 매핑(ROUTE_TO_DOC)의 screen.folder, functional.file 존재 검증
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SCREEN_ROOT = path.join(ROOT, 'docs', '화면설계서');
const MASTER_NAME = '00-기본화면.md';

interface Finding {
  level: 'error' | 'warn';
  file: string;
  message: string;
}

const findings: Finding[] = [];
const verbose = process.argv.includes('--verbose');

function addError(file: string, message: string) {
  findings.push({ level: 'error', file, message });
}
function addWarn(file: string, message: string) {
  findings.push({ level: 'warn', file, message });
}

/** 화면설계서 하위에서 모든 00-기본화면.md 경로 수집 */
function findMasterFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMasterFiles(full, acc);
    } else if (entry.isFile() && entry.name === MASTER_NAME) {
      acc.push(full);
    }
  }
  return acc;
}

// 폴더명에서 ID prefix 추출. "SCR-100-로그인" → "SCR-100"
function extractIdFromFolder(folderName: string): string | null {
  const match = folderName.match(/^((?:SCR|DLG)-[A-Z]?\d+(?:-\d+)?)/);
  return match ? match[1] : null;
}

// 폴더명이 SCR- 또는 DLG- 로 시작하는지로 kind 결정
function expectedKind(folderName: string): 'screen' | 'dialog' | null {
  if (folderName.startsWith('SCR-')) return 'screen';
  if (folderName.startsWith('DLG-')) return 'dialog';
  return null;
}

interface Frontmatter {
  id?: unknown;
  kind?: unknown;
  domain?: unknown;
  title?: unknown;
  priority?: unknown;
  roles?: unknown;
  route?: unknown;
  parentRoutes?: unknown;
  functional?: unknown;
  diagrams?: unknown;
  errorCodes?: unknown;
}

const REQUIRED_FIELDS: (keyof Frontmatter)[] = [
  'id', 'kind', 'domain', 'title', 'priority', 'roles', 'functional',
];

const ALLOWED_PRIORITIES = ['P0', 'P1', 'P2'];
const ALLOWED_KINDS = ['screen', 'dialog'];

/** 단일 마스터 파일 검증 */
function validateMaster(filePath: string) {
  const rel = path.relative(ROOT, filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);
  const data = parsed.data as Frontmatter;

  // frontmatter 자체가 없으면: 현 과도기에는 warn (나중에 error로 승격)
  if (Object.keys(data).length === 0) {
    addWarn(rel, 'frontmatter 없음 (스키마 미적용)');
    return;
  }

  // 필수 필드
  for (const key of REQUIRED_FIELDS) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      addError(rel, `필수 필드 누락: ${key}`);
    }
  }

  // kind enum
  if (data.kind && !ALLOWED_KINDS.includes(String(data.kind))) {
    addError(rel, `kind 값이 ${ALLOWED_KINDS.join('|')} 중 아님: ${String(data.kind)}`);
  }

  // priority enum
  if (data.priority && !ALLOWED_PRIORITIES.includes(String(data.priority))) {
    addError(rel, `priority 값이 ${ALLOWED_PRIORITIES.join('|')} 중 아님: ${String(data.priority)}`);
  }

  // 폴더명 ↔ frontmatter 일관성
  const screenFolder = path.basename(path.dirname(filePath));
  const domainFolder = path.basename(path.dirname(path.dirname(filePath)));
  const expectedId = extractIdFromFolder(screenFolder);
  const expectKind = expectedKind(screenFolder);

  if (expectedId && data.id && String(data.id) !== expectedId) {
    addError(rel, `id가 폴더명과 불일치: frontmatter=${data.id} vs folder=${expectedId}`);
  }
  if (expectKind && data.kind && String(data.kind) !== expectKind) {
    addError(rel, `kind가 폴더명과 불일치: frontmatter=${data.kind} vs folder=${expectKind}`);
  }
  if (data.domain && String(data.domain) !== domainFolder) {
    addError(rel, `domain이 폴더명과 불일치: frontmatter=${data.domain} vs folder=${domainFolder}`);
  }

  // route/parentRoutes 필수성 (kind 기준)
  if (data.kind === 'screen' && !data.route) {
    addError(rel, `kind: screen 은 route 필수`);
  }
  if (data.kind === 'dialog' && !data.parentRoutes) {
    addError(rel, `kind: dialog 은 parentRoutes 필수`);
  }

  // functional 배열 형식
  if (Array.isArray(data.functional)) {
    if (data.functional.length === 0) {
      addError(rel, `functional 배열이 비어있음`);
    }
    data.functional.forEach((item: unknown, idx: number) => {
      if (typeof item !== 'object' || item === null) {
        addError(rel, `functional[${idx}] 는 객체여야 함`);
        return;
      }
      const obj = item as Record<string, unknown>;
      if (!obj.id || !obj.title || !obj.description) {
        addError(rel, `functional[${idx}] 에 id/title/description 중 누락 필드 있음`);
      }
      if (obj.id && typeof obj.id === 'string' && !/^F-[A-Z0-9]+-\d{2}$/.test(obj.id)) {
        addWarn(rel, `functional[${idx}].id 패턴(F-ID-NN) 불일치: ${obj.id}`);
      }
    });
  } else if (data.functional !== undefined) {
    addError(rel, `functional 은 배열이어야 함`);
  }

  // diagrams 배열 경로 검증
  if (Array.isArray(data.diagrams)) {
    for (const p of data.diagrams) {
      if (typeof p !== 'string') {
        addError(rel, `diagrams 항목이 문자열이 아님: ${String(p)}`);
        continue;
      }
      const abs = path.join(ROOT, p);
      if (!fs.existsSync(abs)) {
        addError(rel, `diagrams 경로가 존재하지 않음: ${p}`);
      }
    }
  } else if (data.diagrams !== undefined) {
    addError(rel, `diagrams 은 배열이어야 함`);
  }

  if (verbose) {
    console.log(`  ✓ ${rel} (id=${data.id ?? '?'}, kind=${data.kind ?? '?'})`);
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
function main() {
  console.log('─'.repeat(60));
  console.log('📋 화면설계서 frontmatter 검증');
  console.log('─'.repeat(60));

  if (!fs.existsSync(SCREEN_ROOT)) {
    console.error(`❌ 화면설계서 디렉토리를 찾을 수 없음: ${SCREEN_ROOT}`);
    process.exit(2);
  }

  const masters = findMasterFiles(SCREEN_ROOT);
  console.log(`스캔: ${masters.length}개 마스터 파일`);

  for (const file of masters) {
    validateMaster(file);
  }

  const errors = findings.filter((f) => f.level === 'error');
  const warns = findings.filter((f) => f.level === 'warn');
  const withFrontmatter = masters.length - warns.filter((w) => w.message === 'frontmatter 없음 (스키마 미적용)').length;

  console.log('');
  console.log(`  frontmatter 적용됨: ${withFrontmatter}/${masters.length}`);
  console.log(`  오류: ${errors.length}`);
  console.log(`  경고: ${warns.length}`);
  console.log('');

  if (errors.length > 0) {
    console.log('❌ 오류 목록:');
    for (const f of errors) {
      console.log(`  [ERR] ${f.file}: ${f.message}`);
    }
    console.log('');
  }

  if (warns.length > 0 && verbose) {
    console.log('⚠️  경고 목록:');
    for (const f of warns) {
      console.log(`  [WRN] ${f.file}: ${f.message}`);
    }
    console.log('');
  } else if (warns.length > 0) {
    console.log(`⚠️  경고 ${warns.length}건 (--verbose 로 상세 확인)`);
    console.log('');
  }

  if (errors.length > 0) {
    console.log('✗ 검증 실패');
    process.exit(1);
  }

  console.log('✓ 검증 통과');
  process.exit(0);
}

main();
