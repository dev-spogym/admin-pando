/**
 * 화면설계서 마스터(00-기본화면.md)에 **최소 frontmatter** 일괄 적용.
 *
 * 목적: 86개 파일에 id/kind/domain/title 4개 Core 필수 필드를 폴더명 기반으로 자동 삽입.
 *       functional / priority / roles / diagrams 등 나머지는 수기 채움 대상.
 *
 * 사용:
 *   tsx scripts/bootstrap-frontmatter.ts --dry-run   # 변경할 파일 목록 출력만
 *   tsx scripts/bootstrap-frontmatter.ts             # 실제 적용
 *
 * 안전장치:
 *   - 이미 frontmatter 가 있는 파일은 건너뜀 (덮어쓰지 않음)
 *   - 원본 본문은 그대로, 최상단에 YAML 블록만 prepend
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

// "SCR-100-로그인" → "SCR-100"
function extractId(folderName: string): string {
  const m = folderName.match(/^((?:SCR|DLG)-[A-Z]?\d+(?:-\d+)?)/);
  return m ? m[1] : folderName;
}

// 폴더 prefix 기반 kind 결정
function extractKind(folderName: string): 'screen' | 'dialog' {
  return folderName.startsWith('DLG-') ? 'dialog' : 'screen';
}

// 폴더명에서 title 부분 (ID 접두 + 구분자 제외)
function titleFromFolder(folderName: string): string {
  return folderName
    .replace(/^(?:SCR|DLG)-[A-Z]?\d+(?:-\d+)?[-_]?/, '')
    .replace(/_/g, ' ')
    .trim();
}

// 첫 H1 에서 title 추출 (마스터 표기 "— 기본화면 (마스터)" 등 제거)
function titleFromH1(body: string, fallback: string): string {
  const lines = body.split('\n');
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) {
      let t = m[1].trim();
      // "SCR-100 로그인 — 기본화면 (마스터)" → "로그인"
      t = t.replace(/^(?:SCR|DLG)-[A-Z]?\d+(?:-\d+)?\s+/, '');
      t = t.replace(/\s*[—\-–]\s*기본화면.*$/, '');
      t = t.replace(/\s*\(마스터\)\s*$/, '');
      t = t.trim();
      return t || fallback;
    }
  }
  return fallback;
}

// YAML safe value: 특수문자 포함 시 따옴표
function yamlValue(s: string): string {
  // 따옴표 · 콜론 · 해시 · 쉼표 등 포함 시 큰따옴표로 감싸고 내부 이스케이프
  if (/[:#,{}\[\]&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

function buildFrontmatter(fields: { id: string; kind: string; domain: string; title: string }): string {
  return [
    '---',
    `id: ${yamlValue(fields.id)}`,
    `kind: ${fields.kind}`,
    `domain: ${yamlValue(fields.domain)}`,
    `title: ${yamlValue(fields.title)}`,
    '---',
    '',
    '',
  ].join('\n');
}

// ─── main ────────────────────────────────────────────────────────────────────
function main() {
  console.log('─'.repeat(60));
  console.log(`🔧 화면설계서 frontmatter 최소 bootstrap${dryRun ? ' (dry-run)' : ''}`);
  console.log('─'.repeat(60));

  const files = findMasterFiles(SCREEN_ROOT);
  console.log(`스캔: ${files.length}개 마스터 파일\n`);

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = matter(raw);
    if (Object.keys(parsed.data).length > 0) {
      skipped++;
      continue;
    }

    const folderName = path.basename(path.dirname(file));
    const domainName = path.basename(path.dirname(path.dirname(file)));
    const id = extractId(folderName);
    const kind = extractKind(folderName);
    const fallbackTitle = titleFromFolder(folderName);
    const title = titleFromH1(parsed.content, fallbackTitle);

    const fm = buildFrontmatter({ id, kind, domain: domainName, title });
    const newRaw = fm + parsed.content;

    const rel = path.relative(ROOT, file);
    if (dryRun) {
      console.log(`[dry] ${rel}`);
      console.log(`       id=${id} kind=${kind} domain=${domainName} title="${title}"`);
    } else {
      fs.writeFileSync(file, newRaw);
      console.log(`[write] ${rel}  (id=${id}, title="${title}")`);
      updated++;
    }
  }

  console.log('');
  console.log(`${dryRun ? '예상' : '완료'}: ${dryRun ? files.length - skipped : updated}개 ${dryRun ? '업데이트 대상' : '업데이트'}, ${skipped}개 건너뜀 (이미 frontmatter 있음)`);
  if (dryRun) console.log('실제 적용하려면 --dry-run 없이 다시 실행');
}

main();
