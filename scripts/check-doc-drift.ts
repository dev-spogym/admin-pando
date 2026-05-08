import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

const REQUIRED_ROOTS = [
  path.join(ROOT, 'docs', 'admin', '화면설계서'),
  path.join(ROOT, 'docs', 'admin', '기능명세서'),
  path.join(ROOT, 'docs', 'admin', '다이어그램'),
];

const LEGACY_ROOTS = [
  path.join(ROOT, 'docs', '화면설계서'),
  path.join(ROOT, 'docs', '기능명세서'),
  path.join(ROOT, 'docs', '다이어그램'),
];

const SCAN_TARGETS = [
  path.join(ROOT, 'AGENTS.md'),
  path.join(ROOT, 'docs', 'admin'),
  path.join(ROOT, 'scripts'),
  path.join(ROOT, 'src', 'lib', 'designDocMap.ts'),
];

const TEXT_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.md', '.mjs', '.ts', '.tsx']);
const LEGACY_PATH_RE = /docs\/(?:화면설계서|기능명세서|다이어그램)(?=$|[`'")\],\s/\\])/g;

interface Finding {
  file: string;
  line: number;
  text: string;
}

function walkTextFiles(target: string, acc: string[] = []): string[] {
  if (!fs.existsSync(target)) return acc;

  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (TEXT_EXTENSIONS.has(path.extname(target))) acc.push(target);
    return acc;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walkTextFiles(full, acc);
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(full);
    }
  }

  return acc;
}

function main() {
  console.log('─'.repeat(60));
  console.log('🧱 문서 drift 검증');
  console.log('─'.repeat(60));

  const findings: Finding[] = [];
  const rootErrors: string[] = [];

  for (const requiredRoot of REQUIRED_ROOTS) {
    if (!fs.existsSync(requiredRoot)) {
      rootErrors.push(`필수 문서 루트 없음: ${path.relative(ROOT, requiredRoot)}`);
    }
  }

  for (const legacyRoot of LEGACY_ROOTS) {
    if (fs.existsSync(legacyRoot)) {
      rootErrors.push(`구 문서 루트가 다시 생성됨: ${path.relative(ROOT, legacyRoot)}`);
    }
  }

  const files = SCAN_TARGETS.flatMap((target) => walkTextFiles(target)).sort((a, b) => a.localeCompare(b, 'ko'));
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (LEGACY_PATH_RE.test(line)) {
        findings.push({ file: rel, line: idx + 1, text: line.trim() });
      }
      LEGACY_PATH_RE.lastIndex = 0;
    });
  }

  console.log(`스캔 파일: ${files.length}`);
  console.log(`오류: ${rootErrors.length + findings.length}`);
  console.log('');

  for (const message of rootErrors) {
    console.log(`  [ERR] ${message}`);
  }

  for (const finding of findings) {
    console.log(`  [ERR] ${finding.file}:${finding.line}: 구 문서 경로 참조 - ${finding.text}`);
  }

  if (rootErrors.length > 0 || findings.length > 0) {
    console.log('');
    console.log('✗ 검증 실패');
    process.exit(1);
  }

  console.log('✓ 검증 통과');
}

main();
