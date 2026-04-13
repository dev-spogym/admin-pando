/**
 * 마크다운 -> HTML 변환 유틸리티 (v2)
 * 콜아웃, 코드 복사, Mermaid, interface 카드, 상태 배지 등 지원
 */

// ─── HTML 이스케이프 ─────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── 인라인 서식 ─────────────────────────────────────────────────────────────

function inlineFormat(text: string): string {
  // 볼드
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-content">$1</strong>');
  // 인라인 코드
  text = text.replace(
    /`([^`]+)`/g,
    '<code class="bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded text-[11px] font-mono">$1</code>'
  );
  // 이탤릭
  text = text.replace(/\*(.+?)\*/g, '<em class="text-content-secondary">$1</em>');
  // 상태 배지
  text = text.replace(/\[O\]/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">✓ 완료</span>');
  text = text.replace(/\[△\]/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">△ 부분</span>');
  text = text.replace(/\[X\]/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-danger/10 text-danger">✕ 미구현</span>');
  // 🆕 배지
  text = text.replace(/🆕/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">NEW</span>');
  return text;
}

// ─── 테이블 변환 ─────────────────────────────────────────────────────────────

function convertTable(lines: string[]): string {
  const rows = lines
    .filter((l) => l.trim().startsWith('|') && !l.trim().match(/^\|[\s-:|]+\|$/))
    .map((l) =>
      l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    );
  if (rows.length === 0) return '';

  const [header, ...body] = rows;
  let html = '<div class="overflow-x-auto my-3 rounded-lg border border-line shadow-sm"><table class="w-full text-[12px] border-collapse">';
  html += '<thead><tr>';
  header.forEach((h) => {
    html += `<th class="border-b border-r last:border-r-0 border-line bg-surface-secondary px-3 py-2.5 text-left font-semibold text-content-secondary text-[11px]">${escapeHtml(h)}</th>`;
  });
  html += '</tr></thead><tbody>';
  body.forEach((row, idx) => {
    const stripe = idx % 2 === 1 ? ' bg-surface-secondary/30' : '';
    html += `<tr class="hover:bg-primary/[0.04] transition-colors${stripe}">`;
    row.forEach((c) => {
      html += `<td class="border-b border-r last:border-r-0 last:border-b-0 border-line px-3 py-2 text-content leading-relaxed">${inlineFormat(escapeHtml(c))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

// ─── 콜아웃 감지 ─────────────────────────────────────────────────────────────

interface CalloutConfig {
  icon: string;
  bg: string;
  border: string;
  title: string;
  titleColor: string;
}

const CALLOUT_MAP: Record<string, CalloutConfig> = {
  '⚠️': { icon: '⚠️', bg: 'bg-amber-50', border: 'border-amber-300', title: '주의', titleColor: 'text-amber-700' },
  '💡': { icon: '💡', bg: 'bg-blue-50', border: 'border-blue-300', title: '팁', titleColor: 'text-blue-700' },
  '🆕': { icon: '🆕', bg: 'bg-indigo-50', border: 'border-indigo-300', title: '신규 기능', titleColor: 'text-indigo-700' },
  '❌': { icon: '❌', bg: 'bg-red-50', border: 'border-red-300', title: '경고', titleColor: 'text-red-700' },
  '✅': { icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-300', title: '완료', titleColor: 'text-emerald-700' },
  '📌': { icon: '📌', bg: 'bg-violet-50', border: 'border-violet-300', title: '참고', titleColor: 'text-violet-700' },
  '🔒': { icon: '🔒', bg: 'bg-slate-50', border: 'border-slate-300', title: '보안', titleColor: 'text-slate-700' },
};

function detectCallout(text: string): CalloutConfig | null {
  for (const [emoji, config] of Object.entries(CALLOUT_MAP)) {
    if (text.startsWith(emoji)) return config;
  }
  return null;
}

// ─── 인용문 / 콜아웃 ────────────────────────────────────────────────────────

function collectBlockquote(lines: string[], startIdx: number): { html: string; endIdx: number } {
  const bqLines: string[] = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith('>')) {
    bqLines.push(lines[i].trim().slice(1).trim());
    i++;
  }

  const firstLine = bqLines[0] || '';
  const callout = detectCallout(firstLine);

  if (callout) {
    const content = bqLines.map((l) => inlineFormat(escapeHtml(l.replace(/^[⚠️💡🆕❌✅📌🔒]\s*/, '')))).join('<br/>');
    const html = `<div class="my-3 rounded-lg border-l-4 ${callout.border} ${callout.bg} px-4 py-3">
      <div class="flex items-center gap-1.5 mb-1.5"><span class="text-[14px]">${callout.icon}</span><span class="text-[11px] font-bold ${callout.titleColor} uppercase tracking-wide">${callout.title}</span></div>
      <div class="text-[12px] text-content leading-relaxed">${content}</div>
    </div>`;
    return { html, endIdx: i };
  }

  const content = bqLines.map((l) => inlineFormat(escapeHtml(l))).join('<br/>');
  const html = `<blockquote class="border-l-4 border-primary/20 bg-primary/[0.02] rounded-r-lg px-4 py-3 my-3 text-[12px] text-content-secondary leading-relaxed italic">${content}</blockquote>`;
  return { html, endIdx: i };
}

// ─── interface / type 카드 변환 ──────────────────────────────────────────────

function isInterfaceBlock(codeLines: string[]): boolean {
  return codeLines.some((l) => /^\s*(export\s+)?(interface|type)\s+\w+/.test(l));
}

function renderInterfaceCard(codeLines: string[]): string {
  const joined = codeLines.join('\n');
  const nameMatch = joined.match(/(interface|type)\s+(\w+)/);
  const name = nameMatch ? nameMatch[2] : 'Type';
  const kind = nameMatch ? nameMatch[1] : 'interface';

  // 필드 파싱
  const fields: { name: string; type: string; comment: string }[] = [];
  for (const line of codeLines) {
    const fieldMatch = line.match(/^\s*(\w+)\??\s*:\s*([^;/]+);?\s*(\/\/\s*(.*))?$/);
    if (fieldMatch) {
      fields.push({
        name: fieldMatch[1],
        type: fieldMatch[2].trim(),
        comment: fieldMatch[4]?.trim() || '',
      });
    }
  }

  if (fields.length === 0) {
    // 파싱 실패 시 일반 코드블록으로 폴백
    return '';
  }

  let html = `<div class="my-3 rounded-lg border border-line overflow-hidden shadow-sm">`;
  html += `<div class="bg-gradient-to-r from-violet-50 to-blue-50 px-4 py-2.5 border-b border-line flex items-center gap-2">`;
  html += `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-100 text-violet-600">${kind}</span>`;
  html += `<span class="text-[13px] font-bold font-mono text-content">${escapeHtml(name)}</span>`;
  html += `</div>`;
  html += `<div class="divide-y divide-line">`;
  fields.forEach((f, idx) => {
    const stripe = idx % 2 === 1 ? ' bg-surface-secondary/40' : '';
    html += `<div class="flex items-start px-4 py-2 gap-3 text-[12px]${stripe}">`;
    html += `<span class="font-mono font-medium text-content shrink-0 min-w-[120px]">${escapeHtml(f.name)}</span>`;
    html += `<span class="font-mono text-primary/70 shrink-0 min-w-[100px]">${escapeHtml(f.type)}</span>`;
    if (f.comment) {
      html += `<span class="text-content-tertiary">${escapeHtml(f.comment)}</span>`;
    }
    html += `</div>`;
  });
  html += `</div></div>`;
  return html;
}

// ─── 코드블록 (복사 버튼 + Mermaid + interface 카드) ─────────────────────────

let codeBlockId = 0;

function renderCodeBlock(lang: string, codeLines: string[]): string {
  const code = codeLines.join('\n');

  // Mermaid 다이어그램
  if (lang === 'mermaid') {
    const id = `mermaid-${codeBlockId++}`;
    return `<div class="my-3 rounded-lg border border-line overflow-hidden shadow-sm">
      <div class="bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 border-b border-line flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <span class="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">Diagram</span>
      </div>
      <div id="${id}" class="mermaid-container p-4 flex justify-center bg-white" data-mermaid="${escapeHtml(code)}">${escapeHtml(code)}</div>
    </div>`;
  }

  // Interface/Type 카드
  if (!lang || lang === 'typescript' || lang === 'ts') {
    if (isInterfaceBlock(codeLines)) {
      const card = renderInterfaceCard(codeLines);
      if (card) return card;
    }
  }

  // 일반 코드블록 + 복사 버튼
  const blockId = `code-${codeBlockId++}`;
  return `<div class="my-3 rounded-lg border border-line overflow-hidden shadow-sm group/code relative">
    ${lang ? `<div class="bg-surface-tertiary px-3 py-1.5 border-b border-line flex items-center justify-between">
      <span class="text-[10px] font-mono text-content-tertiary uppercase tracking-wide">${escapeHtml(lang)}</span>
      <button onclick="navigator.clipboard.writeText(document.getElementById('${blockId}').textContent);this.textContent='✓ 복사됨';setTimeout(()=>this.textContent='복사',1500)" class="text-[10px] text-content-tertiary hover:text-primary px-2 py-0.5 rounded hover:bg-primary/5 transition-colors">복사</button>
    </div>` : `<button onclick="navigator.clipboard.writeText(document.getElementById('${blockId}').textContent);this.textContent='✓';setTimeout(()=>this.textContent='⎘',1500)" class="absolute top-2 right-2 text-[12px] text-content-tertiary hover:text-primary w-6 h-6 flex items-center justify-center rounded hover:bg-primary/5 transition-colors opacity-0 group-hover/code:opacity-100">⎘</button>`}
    <pre class="bg-surface-secondary p-4 overflow-x-auto"><code id="${blockId}" class="text-[11px] font-mono text-content leading-[1.7]">${escapeHtml(code)}</code></pre>
  </div>`;
}

// ─── 메인 렌더러 ─────────────────────────────────────────────────────────────

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let i = 0;
  codeBlockId = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 빈 줄
    if (trimmed === '') { i++; continue; }

    // 수평선
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      output.push('<hr class="border-line my-5" />');
      i++; continue;
    }

    // 인용문 / 콜아웃
    if (trimmed.startsWith('>')) {
      const { html, endIdx } = collectBlockquote(lines, i);
      output.push(html);
      i = endIdx; continue;
    }

    // 코드블록
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      output.push(renderCodeBlock(lang, codeLines));
      continue;
    }

    // 테이블
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      output.push(convertTable(tableLines));
      continue;
    }

    // ##### 헤더
    if (trimmed.startsWith('##### ')) {
      output.push(`<h5 class="text-[11px] font-bold text-content-tertiary mt-3 mb-1 uppercase tracking-wide">${inlineFormat(escapeHtml(trimmed.slice(6)))}</h5>`);
      i++; continue;
    }

    // #### 헤더
    if (trimmed.startsWith('#### ')) {
      output.push(`<h4 class="text-[12px] font-bold text-content-secondary mt-4 mb-1.5 flex items-center gap-1.5"><span class="w-1 h-1 rounded-full bg-content-tertiary shrink-0"></span>${inlineFormat(escapeHtml(trimmed.slice(5)))}</h4>`);
      i++; continue;
    }

    // ### 헤더
    if (trimmed.startsWith('### ')) {
      output.push(`<h3 class="text-[13px] font-bold text-content mt-5 mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0"></span>${inlineFormat(escapeHtml(trimmed.slice(4)))}</h3>`);
      i++; continue;
    }

    // ## 헤더
    if (trimmed.startsWith('## ')) {
      output.push(`<h2 class="text-[15px] font-bold text-content mt-6 mb-2 pb-2 border-b-2 border-primary/10">${inlineFormat(escapeHtml(trimmed.slice(3)))}</h2>`);
      i++; continue;
    }

    // 체크리스트
    if (/^- \[[ x]\] /.test(trimmed)) {
      const items: { checked: boolean; text: string }[] = [];
      while (i < lines.length && /^- \[[ x]\] /.test(lines[i].trim())) {
        const t = lines[i].trim();
        items.push({ checked: t.startsWith('- [x]'), text: t.replace(/^- \[[ x]\] /, '') });
        i++;
      }
      output.push('<div class="space-y-1.5 my-3">');
      items.forEach(({ checked, text }) => {
        if (checked) {
          output.push(`<div class="flex items-start gap-2.5 text-[12px]"><span class="w-4 h-4 rounded border border-success bg-success/10 flex items-center justify-center shrink-0 mt-0.5"><svg class="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><span class="line-through text-content-tertiary">${inlineFormat(escapeHtml(text))}</span></div>`);
        } else {
          output.push(`<div class="flex items-start gap-2.5 text-[12px]"><span class="w-4 h-4 rounded border border-line bg-surface shrink-0 mt-0.5"></span><span class="text-content">${inlineFormat(escapeHtml(text))}</span></div>`);
        }
      });
      output.push('</div>');
      continue;
    }

    // 목록
    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      output.push('<ul class="space-y-1.5 my-2">');
      items.forEach((item) => {
        output.push(`<li class="flex items-start gap-2 text-[12px] text-content leading-relaxed"><span class="text-primary mt-[5px] shrink-0"><svg class="w-1.5 h-1.5" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg></span><span>${inlineFormat(escapeHtml(item))}</span></li>`);
      });
      output.push('</ul>');
      continue;
    }

    // 번호 목록
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      output.push('<ol class="space-y-1.5 my-2">');
      items.forEach((item, idx) => {
        output.push(`<li class="flex items-start gap-2.5 text-[12px] text-content leading-relaxed"><span class="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span><span>${inlineFormat(escapeHtml(item))}</span></li>`);
      });
      output.push('</ol>');
      continue;
    }

    // 일반 텍스트
    output.push(`<p class="text-[12px] text-content leading-[1.7] my-1.5">${inlineFormat(escapeHtml(trimmed))}</p>`);
    i++;
  }

  return output.join('\n');
}
