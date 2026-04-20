#!/usr/bin/env node
/**
 * 다이어그램 엣지 ID ↔ TC 매트릭스 대조 검증
 * - docs/다이어그램/**\/*.md 의 mermaid 블록에서 E_xxx 엣지 ID 추출
 * - 99_TC_매핑/TC_트레이서빌리티_매트릭스.csv 의 edgeId 컬럼과 대조
 * - 누락/고아 엣지 리포트 생성
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../docs/다이어그램');
const CSV  = path.join(ROOT, '99_TC_매핑/TC_트레이서빌리티_매트릭스.csv');
const OUT  = path.join(ROOT, '99_TC_매핑/검증리포트.md');

function walk(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, list);
    else if (f.endsWith('.md')) list.push(p);
  }
  return list;
}

function extractEdgeIds(content) {
  const ids = new Set();
  const blocks = content.match(/```mermaid[\s\S]*?```/g) || [];
  for (const b of blocks) {
    const m = b.match(/E_[A-Za-z0-9_]+/g) || [];
    m.forEach(id => ids.add(id));
  }
  return ids;
}

function main() {
  const diagramEdges = new Map(); // edgeId -> [files]
  const files = walk(ROOT);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const ids = extractEdgeIds(content);
    for (const id of ids) {
      if (!diagramEdges.has(id)) diagramEdges.set(id, []);
      diagramEdges.get(id).push(path.relative(ROOT, file));
    }
  }

  const mappedEdges = new Set();
  if (fs.existsSync(CSV)) {
    const csv = fs.readFileSync(CSV, 'utf8').split('\n').slice(1);
    for (const line of csv) {
      const [edgeId] = line.split(',');
      if (edgeId && edgeId.startsWith('E_')) mappedEdges.add(edgeId);
    }
  }

  const unmapped = [...diagramEdges.keys()].filter(id => !mappedEdges.has(id));
  const orphans  = [...mappedEdges].filter(id => !diagramEdges.has(id));

  const total = diagramEdges.size;
  const covered = total - unmapped.length;
  const coverage = total > 0 ? ((covered / total) * 100).toFixed(2) : '0.00';

  const report = [
    '# TC 매핑 검증 리포트',
    '',
    `- **생성일**: ${new Date().toISOString()}`,
    `- **다이어그램 엣지 총수**: ${total}`,
    `- **TC 매핑된 엣지**: ${covered}`,
    `- **커버리지**: ${coverage}% (목표 ≥ 95%)`,
    `- **미매핑 엣지(TC 필요)**: ${unmapped.length}`,
    `- **고아 엣지(CSV에만 존재)**: ${orphans.length}`,
    '',
    '## 미매핑 엣지 (상위 50)',
    ...unmapped.slice(0, 50).map(id => `- \`${id}\` — ${diagramEdges.get(id).slice(0, 2).join(', ')}`),
    '',
    '## 고아 엣지 (상위 50)',
    ...orphans.slice(0, 50).map(id => `- \`${id}\``),
  ].join('\n');

  fs.writeFileSync(OUT, report);
  console.log(`✅ 검증 완료. 커버리지 ${coverage}% (${covered}/${total})`);
  console.log(`📄 리포트: ${OUT}`);
}

main();
