#!/usr/bin/env node
/**
 * 도메인별 SCR 9종 세트 / DLG 3종 세트 커버리지 리포트
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../docs/admin/다이어그램');
const OUT = path.join(ROOT, '99_TC_매핑/TC_커버리지_리포트.md');

const SCR_SETS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'];
const DLG_SETS = ['M1', 'M2', 'M3'];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
}

function coverage(screenDir, sets) {
  const files = fs.existsSync(screenDir) ? fs.readdirSync(screenDir) : [];
  const found = sets.filter(s => files.some(f => f.startsWith(s + '_')));
  return { found: found.length, total: sets.length, missing: sets.filter(s => !found.includes(s)) };
}

function main() {
  const domains = walk(ROOT).filter(d => d.startsWith('D') && /^D\d{2}_/.test(d));
  const lines = ['# 다이어그램 커버리지 리포트', '', `생성: ${new Date().toISOString()}`, ''];

  let totalScr = 0, totalScrFound = 0, totalDlg = 0, totalDlgFound = 0;

  for (const domain of domains.sort()) {
    lines.push(`## ${domain}`);
    lines.push('');
    const domainDir = path.join(ROOT, domain);

    const scrs = walk(domainDir).filter(d => d.startsWith('SCR-'));
    lines.push('### SCR 9종 커버리지');
    lines.push('| SCR | 채움 | 누락 |');
    lines.push('|-----|:----:|------|');
    for (const scr of scrs) {
      const c = coverage(path.join(domainDir, scr), SCR_SETS);
      totalScr += c.total; totalScrFound += c.found;
      lines.push(`| ${scr} | ${c.found}/${c.total} | ${c.missing.join(', ') || '-'} |`);
    }

    const dlgDir = path.join(domainDir, 'DLG');
    if (fs.existsSync(dlgDir)) {
      lines.push('');
      lines.push('### DLG 3종 커버리지');
      lines.push('| DLG | 채움 | 누락 |');
      lines.push('|-----|:----:|------|');
      for (const dlg of walk(dlgDir).filter(d => d.startsWith('DLG-'))) {
        const c = coverage(path.join(dlgDir, dlg), DLG_SETS);
        totalDlg += c.total; totalDlgFound += c.found;
        lines.push(`| ${dlg} | ${c.found}/${c.total} | ${c.missing.join(', ') || '-'} |`);
      }
    }
    lines.push('');
  }

  const scrPct = totalScr > 0 ? ((totalScrFound / totalScr) * 100).toFixed(1) : '0.0';
  const dlgPct = totalDlg > 0 ? ((totalDlgFound / totalDlg) * 100).toFixed(1) : '0.0';

  lines.splice(3, 0, `**SCR 전체 커버리지**: ${totalScrFound}/${totalScr} (${scrPct}%)`, `**DLG 전체 커버리지**: ${totalDlgFound}/${totalDlg} (${dlgPct}%)`, '');

  fs.writeFileSync(OUT, lines.join('\n'));
  console.log(`✅ 커버리지 리포트 생성: SCR ${scrPct}%, DLG ${dlgPct}%`);
  console.log(`📄 ${OUT}`);
}

main();
