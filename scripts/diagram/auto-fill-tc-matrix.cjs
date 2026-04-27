#!/usr/bin/env node
/**
 * 다이어그램 엣지에서 TC 트레이서빌리티 CSV 자동 채움
 * - 모든 mermaid 블록에서 엣지 ID + 라벨 추출
 * - 기존 CSV와 merge (중복 제거)
 * - TC ID는 플레이스홀더(TC-XXX-nnn)로 채우고, 수동으로 실제 TC 매핑
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../docs/admin/다이어그램');
const CSV  = path.join(ROOT, '99_TC_매핑/TC_트레이서빌리티_매트릭스.csv');

function walk(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, list);
    else if (f.endsWith('.md')) list.push(p);
  }
  return list;
}

function extractDiagramId(content) {
  const m = content.match(/^diagramId:\s*(.+)$/m);
  return m ? m[1].trim() : '';
}

function extractEdges(content) {
  const edges = [];
  const blocks = content.match(/```mermaid[\s\S]*?```/g) || [];
  for (const b of blocks) {
    const lines = b.split('\n');
    for (const line of lines) {
      const idMatch = line.match(/(E_[A-Za-z0-9_]+)/);
      if (!idMatch) continue;
      const edgeId = idMatch[1];
      const arrowMatch = line.match(/([A-Za-z0-9_]+)\s*(?:--|==|-\.)[^>]*(?:-->|==>|\.->)\s*([A-Za-z0-9_{[(]+)/);
      const labelMatch = line.match(/\|([^|]+)\|/);
      const from = arrowMatch ? arrowMatch[1] : '';
      const to = arrowMatch ? arrowMatch[2].replace(/[\[{(<].*/, '') : '';
      const label = labelMatch ? labelMatch[1].trim().replace(/,/g, ';') : '';
      edges.push({ edgeId, from, to, label });
    }
  }
  return edges;
}

function inferActor(filePath) {
  if (filePath.includes('D02')) return 'manager';
  if (filePath.includes('D03')) return 'staff';
  if (filePath.includes('D04')) return 'fc';
  if (filePath.includes('D07')) return 'manager';
  if (filePath.includes('D08')) return 'manager';
  if (filePath.includes('D10')) return 'owner';
  if (filePath.includes('D11') || filePath.includes('IoT')) return 'system';
  if (filePath.includes('40_자동화')) return 'system';
  return 'manager';
}

function inferType(label) {
  const l = (label || '').toLowerCase();
  if (l.match(/실패|오류|거부|차단|금지|에러|중복|만료|타임아웃|불가|없음|실행불가/)) return 'negative';
  if (l.match(/예외|롤백|500|403|409|timeout/i)) return 'exception';
  if (l.match(/경계|최대|최소|0|1만|첫|마지막/)) return 'boundary';
  return 'positive';
}

function inferPriority(tcType, diagramId) {
  if (diagramId.startsWith('F2_') || diagramId.startsWith('F7_')) return 'P0';
  if (tcType === 'exception' || tcType === 'negative') return 'P1';
  return 'P2';
}

function loadExisting() {
  if (!fs.existsSync(CSV)) return new Map();
  const lines = fs.readFileSync(CSV, 'utf8').split('\n');
  const header = lines[0];
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const [edgeId] = line.split(',');
    map.set(edgeId, line);
  }
  return { header, map };
}

function main() {
  const files = walk(ROOT);
  const existing = loadExisting();
  const header = existing.header || 'edgeId,diagramId,fromNode,toNode,label,actor,tcId,tcType,priority,automated,notes';
  const merged = new Map(existing.map);

  let added = 0;
  const counters = {};

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const diagramId = extractDiagramId(content);
    const edges = extractEdges(content);
    const actor = inferActor(file);

    for (const edge of edges) {
      if (merged.has(edge.edgeId)) continue;

      const tcType = inferType(edge.label);
      const priority = inferPriority(tcType, diagramId);
      const domain = diagramId.match(/SCR-([A-Z]*\d+)/)?.[1] ||
                     diagramId.match(/DLG-([A-Z]*\d+)/)?.[1] ||
                     diagramId.split('_')[0] || 'GEN';
      counters[domain] = (counters[domain] || 0) + 1;
      const suffix = tcType === 'negative' ? '-NEG' : (tcType === 'exception' ? '-EXC' : (tcType === 'boundary' ? '-BND' : ''));
      const tcId = `TC-${domain}-${String(counters[domain]).padStart(3, '0')}${suffix}`;
      const automated = tcType === 'exception' ? 'N' : 'Y';

      const row = [
        edge.edgeId,
        diagramId,
        edge.from,
        edge.to,
        `"${edge.label}"`,
        actor,
        tcId,
        tcType,
        priority,
        automated,
        ''
      ].join(',');
      merged.set(edge.edgeId, row);
      added++;
    }
  }

  const out = [header, ...merged.values()].join('\n');
  fs.writeFileSync(CSV, out);
  console.log(`✅ TC 매트릭스 자동 채움 완료. 신규 ${added}건, 전체 ${merged.size}건`);
}

main();
