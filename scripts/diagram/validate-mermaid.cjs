#!/usr/bin/env node
/**
 * 모든 mermaid 블록을 실제로 파싱해서 에러 발생하는 파일 리포트
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../docs/admin/다이어그램');
const OUT = path.join(ROOT, '99_TC_매핑/mermaid_파싱에러.md');

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

(async () => {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

  const files = walk(ROOT);
  const errors = [];
  let okCount = 0, skipped = 0, totalBlocks = 0;

  const validTypes = /^(\s*%%[^\n]*\n)*\s*(flowchart|graph|stateDiagram(-v2)?|sequenceDiagram|erDiagram|journey|classDiagram|gantt|mindmap|timeline|gitGraph|pie|quadrantChart|sankey|xychart-beta|block-beta|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|requirementDiagram)\b/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const blocks = [...content.matchAll(/```mermaid\n([\s\S]*?)```/g)].map(m => m[1].trim());
    for (let i = 0; i < blocks.length; i++) {
      totalBlocks++;
      if (!validTypes.test(blocks[i])) {
        skipped++;
        continue;
      }
      try {
        await mermaid.parse(blocks[i]);
        okCount++;
      } catch (e) {
        errors.push({
          file: path.relative(ROOT, file),
          blockIdx: i,
          message: String(e.message || e).split('\n').slice(0, 3).join(' '),
        });
      }
    }
  }

  const report = [
    '# Mermaid 파싱 검증 리포트',
    `- 생성: ${new Date().toISOString()}`,
    `- 전체 mermaid 블록: ${totalBlocks}`,
    `- 성공: ${okCount}`,
    `- 스킵(유효 타입 아님): ${skipped}`,
    `- **에러: ${errors.length}**`,
    '',
    '## 에러 목록',
    ...errors.slice(0, 200).map(e => `- [${e.file}](../${e.file}) #${e.blockIdx} — ${e.message.replace(/\n/g, ' ')}`),
    errors.length > 200 ? `\n... 외 ${errors.length - 200}개` : '',
  ].join('\n');

  fs.writeFileSync(OUT, report);
  console.log(`✅ 검증 완료. 성공 ${okCount} / 스킵 ${skipped} / 에러 ${errors.length} / 총 ${totalBlocks}`);
  console.log(`📄 ${OUT}`);
})();
