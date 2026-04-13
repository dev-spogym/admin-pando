/**
 * 간단한 마크다운 -> HTML 변환 유틸리티
 * 별도 라이브러리 없이 기본적인 마크다운 문법을 지원합니다.
 */

/** 테이블 마크다운을 HTML table로 변환 */
function convertTable(lines: string[]): string {
  const rows = lines
    .filter((l) => l.trim().startsWith('|') && !l.trim().match(/^\|[\s-:|]+\|$/))
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    );

  if (rows.length === 0) return '';

  const [header, ...body] = rows;
  let html = '<div class="overflow-x-auto my-2"><table class="w-full text-[12px] border-collapse">';
  html += '<thead><tr>';
  header.forEach((h) => {
    html += `<th class="border border-line bg-surface-secondary px-2 py-1.5 text-left font-semibold text-content-secondary">${escapeHtml(h)}</th>`;
  });
  html += '</tr></thead><tbody>';
  body.forEach((row) => {
    html += '<tr>';
    row.forEach((c) => {
      html += `<td class="border border-line px-2 py-1.5 text-content">${inlineFormat(escapeHtml(c))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

/** HTML 특수문자 이스케이프 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 인라인 서식 변환 (bold, code, link) */
function inlineFormat(text: string): string {
  // 볼드 **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-content">$1</strong>');
  // 인라인 코드 `code`
  text = text.replace(
    /`([^`]+)`/g,
    '<code class="bg-surface-secondary text-primary px-1 py-0.5 rounded text-[11px] font-mono">$1</code>'
  );
  // 이탤릭 *text* (볼드 이후 처리)
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return text;
}

/**
 * 마크다운 문자열을 HTML 문자열로 변환합니다.
 */
export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 빈 줄
    if (trimmed === '') {
      i++;
      continue;
    }

    // 코드블록 ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 닫는 ```
      output.push(
        `<pre class="bg-surface-secondary border border-line rounded-lg p-3 my-2 overflow-x-auto"><code class="text-[11px] font-mono text-content leading-relaxed">${escapeHtml(codeLines.join('\n'))}</code></pre>`
      );
      continue;
    }

    // 테이블 (| 로 시작하는 연속 줄)
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      output.push(convertTable(tableLines));
      continue;
    }

    // 헤더 ## / ###
    if (trimmed.startsWith('### ')) {
      output.push(
        `<h3 class="text-[13px] font-bold text-content mt-3 mb-1">${inlineFormat(escapeHtml(trimmed.slice(4)))}</h3>`
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      output.push(
        `<h2 class="text-[14px] font-bold text-content mt-4 mb-1.5">${inlineFormat(escapeHtml(trimmed.slice(3)))}</h2>`
      );
      i++;
      continue;
    }

    // 목록 - item
    if (trimmed.startsWith('- ')) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      output.push('<ul class="list-disc list-inside space-y-0.5 my-1 text-[12px] text-content">');
      listItems.forEach((item) => {
        output.push(`<li>${inlineFormat(escapeHtml(item))}</li>`);
      });
      output.push('</ul>');
      continue;
    }

    // 번호 목록 1. item
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      output.push('<ol class="list-decimal list-inside space-y-0.5 my-1 text-[12px] text-content">');
      listItems.forEach((item) => {
        output.push(`<li>${inlineFormat(escapeHtml(item))}</li>`);
      });
      output.push('</ol>');
      continue;
    }

    // 일반 텍스트
    output.push(`<p class="text-[12px] text-content leading-relaxed my-1">${inlineFormat(escapeHtml(trimmed))}</p>`);
    i++;
  }

  return output.join('\n');
}
