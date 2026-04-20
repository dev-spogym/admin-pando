#!/usr/bin/env node
/**
 * 모든 다이어그램 .md 파일의 mermaid 블록의 "엣지 라벨"만 안전하게 수정
 *
 * 수정 대상: 파이프 엣지 라벨에 괄호/콜론이 포함된 경우 → 따옴표 랩
 *   `A -->|E_01: 설명 (비고)| B`  →  `A -->|"E_01: 설명 (비고)"| B`
 *   `A -->|라벨 (주석)| B`       →  `A -->|"라벨 (주석)"| B`
 *
 * 수정하지 않는 것 (안전 우선):
 *   - 노드 라벨 (`[label]`, `{label}` 등) — 복잡한 shape 파싱 위험
 *   - `-- label -->` 형태의 임베디드 엣지 라벨 (현 파서가 처리 못하는 경우 적음)
 *   - classDef / style / 키워드 라인
 *   - 이미 따옴표로 감싸진 라벨
 *
 * 옵션:
 *   --dry  : 파일 쓰기 없이 변경 예정 개수만 리포트
 *   --show <N> : 변경된 파일 경로를 상위 N개까지 출력 (default 20)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../docs/다이어그램');
const DRY = process.argv.includes('--dry');
const showIdx = process.argv.indexOf('--show');
const SHOW = showIdx >= 0 ? parseInt(process.argv[showIdx + 1], 10) || 20 : 20;

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, list);
    else if (entry.name.endsWith('.md')) list.push(p);
  }
  return list;
}

// 키워드 라인은 수정하지 않음
const KEYWORD_RE = /^\s*(classDef|class |style |flowchart|graph|stateDiagram|sequenceDiagram|erDiagram|journey|subgraph|end\b|participant|actor |Note |note |alt |else|loop |direction|%%|```)/;

/**
 * 파이프 엣지 라벨 수정
 *   -->|라벨|  or  --|라벨|  (등등)
 * 파이프 `|`는 노드 내부에서도 쓰일 수 있으므로 엣지 문맥(화살표 직후)에서만 매칭
 */
function fixPipeLabels(line) {
  // 패턴: {arrow}|라벨| 형태
  // arrow: --> | --- | -.-> | ==> | etc
  const arrowPipe = /((?:-{2,}>|-{2,}|-\.{1,}->|={2,}>|={2,})\|)([^|\n]+)\|/g;
  return line.replace(arrowPipe, (_m, arrow, label) => {
    const trimmed = label.trim();
    if (!trimmed) return `${arrow}${label}|`;
    if (/^".*"$/.test(trimmed)) return `${arrow}${label}|`;
    // 괄호/콜론/세미콜론/해시 포함 시 따옴표 랩
    if (/[():;#]/.test(trimmed)) {
      return `${arrow}"${trimmed.replace(/"/g, '&quot;')}"|`;
    }
    return `${arrow}${label}|`;
  });
}

function fixMermaidBlock(block) {
  const lines = block.split('\n');
  const out = lines.map((line) => {
    if (KEYWORD_RE.test(line)) return line;
    return fixPipeLabels(line);
  });
  return out.join('\n');
}

function fixFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  let changed = false;
  const fixed = original.replace(/```mermaid\n([\s\S]*?)```/g, (_m, block) => {
    const after = fixMermaidBlock(block);
    if (after !== block) changed = true;
    return '```mermaid\n' + after + '```';
  });
  if (changed && !DRY) fs.writeFileSync(file, fixed);
  return changed;
}

function main() {
  const files = walk(ROOT);
  const changedList = [];
  for (const f of files) {
    if (fixFile(f)) changedList.push(path.relative(ROOT, f));
  }
  const verb = DRY ? '수정 예정' : '수정됨';
  console.log(`${DRY ? '[DRY] ' : ''}✅ 전체 ${files.length}개 중 ${changedList.length}개 ${verb}.`);
  changedList.slice(0, SHOW).forEach((p) => console.log('  -', p));
  if (changedList.length > SHOW) console.log(`  ... 외 ${changedList.length - SHOW}개`);
}

main();
