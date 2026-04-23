/**
 * 화면설계서 마스터의 functional 배열 자동 채움.
 *
 * 각 파일의 `## 1. (화면|다이얼로그) 목적` 섹션 아래 첫 번째 불릿 리스트를
 * functional 배열로 변환.
 *
 * - 기존 functional 이 있으면 건너뜀 (수기 작성 보호)
 * - 불릿 1개 = functional 항목 1개
 * - id: F-{숫자ID}-{NN} 또는 F-D{숫자}-{NN} (다이얼로그)
 * - title: 불릿 첫 문장 (마침표/문장부호 기준) 축약
 * - description: 불릿 원본 텍스트 (markdown 마커 유지)
 *
 * 사용:
 *   tsx scripts/enrich-functional.ts --dry-run
 *   tsx scripts/enrich-functional.ts
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

// 본문에서 "## N. 목적" 또는 "## 화면 목적" 섹션 본문 추출
function extractPurposeSection(body: string): string | null {
  const lines = body.split('\n');
  let startIdx = -1;
  const titleRe = /^##\s+(?:\d+\.\s*)?(?:화면|다이얼로그)\s*목적/;

  for (let i = 0; i < lines.length; i++) {
    if (titleRe.test(lines[i].trim())) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) return null;

  const section: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^##\s/.test(t)) break;
    if (/^---$/.test(t)) break;
    section.push(lines[i]);
  }
  return section.join('\n');
}

// 섹션에서 불릿 리스트 추출 (`- `, `* `, `1. ` 시작)
function extractBullets(section: string): string[] {
  const lines = section.split('\n');
  const bullets: string[] = [];
  let current: string[] = [];
  let inBullet = false;

  const flushCurrent = () => {
    if (current.length > 0) {
      const text = current.join(' ').trim();
      if (text) bullets.push(text);
      current = [];
    }
  };

  for (const line of lines) {
    const m = line.match(/^\s*[-*+]\s+(.+)$/) || line.match(/^\s*\d+\.\s+(.+)$/);
    if (m) {
      flushCurrent();
      current.push(m[1].trim());
      inBullet = true;
      continue;
    }
    // 이어지는 들여쓰기 라인은 현재 불릿에 붙임
    if (inBullet && /^\s+\S/.test(line)) {
      current.push(line.trim());
      continue;
    }
    // 빈 줄/평문 — 불릿 종료
    if (inBullet && line.trim() === '') {
      flushCurrent();
      inBullet = false;
    } else if (!inBullet) {
      continue;
    }
  }
  flushCurrent();

  return bullets;
}

// id 숫자부 추출: "SCR-100" → "100", "DLG-000" → "D000", "DLG-M011" → "DM011", "SCR-M001" → "M001"
function functionalIdPrefix(id: string): string {
  const m = id.match(/^(?:SCR|DLG)-(.+)$/);
  if (!m) return id;
  const rest = m[1];
  return id.startsWith('DLG-') ? `D${rest}` : rest;
}

// 불릿 → title (첫 문장 또는 축약)
function bulletToTitle(text: string): string {
  // markdown 마커 제거 (굵기·이탤릭·백틱)
  const clean = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
  // 첫 문장 분리 (마침표, 콜론, 세미콜론, → 등)
  const sentence = clean.split(/[.。:;→]/)[0].trim();
  // 너무 길면 40자 이내로 잘라 말줄임
  if (sentence.length > 40) {
    return sentence.slice(0, 38).trim() + '…';
  }
  return sentence || clean.slice(0, 40);
}

interface Frontmatter {
  id?: string;
  kind?: string;
  functional?: unknown;
  [k: string]: unknown;
}

function enrichFile(file: string): { count: number } | null {
  const raw = fs.readFileSync(file, 'utf-8');
  const parsed = matter(raw);
  const fm = parsed.data as Frontmatter;

  // 이미 functional 있으면 skip (수기 보호)
  if (Array.isArray(fm.functional) && fm.functional.length > 0) return null;

  if (!fm.id) return null;

  const purpose = extractPurposeSection(parsed.content);
  if (!purpose) return null;

  const bullets = extractBullets(purpose);
  if (bullets.length === 0) return null;

  const prefix = functionalIdPrefix(fm.id);
  const functional = bullets.map((text, idx) => {
    const nn = String(idx + 1).padStart(2, '0');
    return {
      id: `F-${prefix}-${nn}`,
      title: bulletToTitle(text),
      description: text,
    };
  });

  fm.functional = functional;

  if (!dryRun) {
    const newRaw = matter.stringify(parsed.content, fm as Record<string, unknown>);
    fs.writeFileSync(file, newRaw);
  }

  return { count: functional.length };
}

// ─── main ────────────────────────────────────────────────────────────────────
function main() {
  console.log('─'.repeat(60));
  console.log(`🎯 functional 배열 자동 채움${dryRun ? ' (dry-run)' : ''}`);
  console.log('─'.repeat(60));

  const files = findMasterFiles(SCREEN_ROOT);
  console.log(`스캔: ${files.length}개 마스터\n`);

  let touched = 0;
  let skipped = 0;
  let totalItems = 0;

  for (const file of files) {
    const result = enrichFile(file);
    if (!result) {
      skipped++;
      continue;
    }
    touched++;
    totalItems += result.count;
    console.log(`[${dryRun ? 'dry' : 'write'}] ${path.relative(ROOT, file)}  +functional(${result.count})`);
  }

  console.log('');
  console.log(`${dryRun ? '예상' : '완료'}: ${touched}개 파일 · functional ${totalItems}개 추가, ${skipped}개 건너뜀 (기존 값 있음 또는 목적 섹션 없음)`);
  if (dryRun) console.log('실제 적용은 --dry-run 없이 재실행');
}

main();
