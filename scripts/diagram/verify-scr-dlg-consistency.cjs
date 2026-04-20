#!/usr/bin/env node
/**
 * SCR/DLG ID 일관성 검증
 * - 화면설계서 원본에서 SCR-xxx, DLG-xxx 전수 추출
 * - 다이어그램 MD에서 참조하는 SCR/DLG ID와 대조
 * - 불일치 리포트
 */

const fs = require('fs');
const path = require('path');

const SPEC_DIR = path.resolve(__dirname, '../../docs/화면설계서');
const DIAG_DIR = path.resolve(__dirname, '../../docs/다이어그램');
const OUT = path.join(DIAG_DIR, '99_TC_매핑/SCR_DLG_일관성리포트.md');

function walk(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, list);
    else if (f.endsWith('.md')) list.push(p);
  }
  return list;
}

function extractIds(content) {
  const scr = new Set(content.match(/SCR-[A-Z0-9][A-Z0-9_-]*\d+/g) || []);
  const dlg = new Set(content.match(/DLG-[A-Z0-9][A-Z0-9_-]*\d+/g) || []);
  return { scr, dlg };
}

function mergeSets(files) {
  const scr = new Set();
  const dlg = new Set();
  for (const file of files) {
    const ids = extractIds(fs.readFileSync(file, 'utf8'));
    ids.scr.forEach(x => scr.add(x));
    ids.dlg.forEach(x => dlg.add(x));
  }
  return { scr, dlg };
}

function main() {
  const spec = mergeSets(walk(SPEC_DIR));
  const diag = mergeSets(walk(DIAG_DIR));

  const scrMissing = [...diag.scr].filter(x => !spec.scr.has(x));
  const dlgMissing = [...diag.dlg].filter(x => !spec.dlg.has(x));
  const scrOrphan  = [...spec.scr].filter(x => !diag.scr.has(x));
  const dlgOrphan  = [...spec.dlg].filter(x => !diag.dlg.has(x));

  const report = [
    '# SCR/DLG 일관성 리포트',
    '',
    `- **생성일**: ${new Date().toISOString()}`,
    `- **화면설계서 SCR**: ${spec.scr.size} / DLG: ${spec.dlg.size}`,
    `- **다이어그램 SCR**: ${diag.scr.size} / DLG: ${diag.dlg.size}`,
    '',
    '## 다이어그램에 있으나 화면설계서에 없는 SCR',
    ...scrMissing.sort().map(x => `- ${x}`),
    '',
    '## 다이어그램에 있으나 화면설계서에 없는 DLG',
    ...dlgMissing.sort().map(x => `- ${x}`),
    '',
    '## 화면설계서에 있으나 다이어그램 미커버 SCR',
    ...scrOrphan.sort().map(x => `- ${x}`),
    '',
    '## 화면설계서에 있으나 다이어그램 미커버 DLG',
    ...dlgOrphan.sort().map(x => `- ${x}`),
  ].join('\n');

  fs.writeFileSync(OUT, report);
  console.log(`✅ 일관성 검증 완료. 미커버 SCR ${scrOrphan.length}, DLG ${dlgOrphan.length}`);
  console.log(`📄 리포트: ${OUT}`);
}

main();
