'use client';

import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import mermaid from 'mermaid';

type FileData = {
  path: string;
  content: string;
  mermaidBlocks: string[];
  meta: string;
};

let initialized = false;

/**
 * 자동 생성된 mermaid 코드의 라벨에 한글 괄호/콜론/대괄호가 섞여 파서 에러가 나는 경우를 보정.
 * - `|라벨 (주석)|` → `|"라벨 (주석)"|`
 * - `-- 라벨 (주석) -->` → `-- "라벨 (주석)" -->`
 * 이미 따옴표로 감싸진 라벨은 건드리지 않음.
 */
function sanitizeMermaid(code: string): string {
  const quoteIfNeeded = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return label;
    if (/^".*"$/.test(trimmed)) return label;
    if (/[():;[\]{}#]/.test(trimmed)) {
      return `"${trimmed.replace(/"/g, '&quot;')}"`;
    }
    return label;
  };

  return code
    .split('\n')
    .map((line) => {
      if (/^\s*(classDef|class|style|flowchart|graph|stateDiagram|sequenceDiagram|erDiagram|subgraph|end|participant|actor|Note|note|alt|else|loop|direction|%%)/.test(line)) {
        return line;
      }
      return line.replace(/\|([^|\n]+)\|/g, (_m, label) => `|${quoteIfNeeded(label)}|`);
    })
    .join('\n');
}

function ensureInit() {
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: { htmlLabels: true, curve: 'basis' },
      themeVariables: {
        fontFamily: 'system-ui, -apple-system, "Noto Sans KR", sans-serif',
      },
    });
    initialized = true;
  }
}

export function MermaidView({ file }: { file: FileData }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const idRef = useRef(0);

  useEffect(() => {
    ensureInit();
    setActiveIdx(0);
  }, [file.path]);

  useEffect(() => {
    const raw = file.mermaidBlocks[activeIdx];
    if (!raw) {
      setSvg('');
      setError(file.mermaidBlocks.length === 0 ? '이 파일에는 mermaid 블록이 없습니다.' : '');
      return;
    }
    const code = sanitizeMermaid(raw);
    idRef.current += 1;
    const id = `mmd-${idRef.current}`;
    setError('');
    mermaid
      .render(id, code)
      .then(({ svg }) => setSvg(svg))
      .catch((e: Error) => {
        setError(e.message);
        setSvg('');
      });
  }, [file, activeIdx]);

  const hasMultiple = file.mermaidBlocks.length > 1;
  const noMermaid = file.mermaidBlocks.length === 0;

  if (noMermaid) {
    const html = renderMarkdownLite(file.content);
    return (
      <div className="h-full overflow-auto bg-white">
        <article
          className="max-w-4xl mx-auto px-8 py-8 prose prose-slate prose-headings:font-bold prose-table:text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {hasMultiple && (
        <div className="flex gap-2 p-2 bg-white border-b border-slate-200 overflow-x-auto">
          {file.mermaidBlocks.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`px-3 py-1 text-sm rounded whitespace-nowrap ${
                activeIdx === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              다이어그램 {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {error && (
          <pre className="p-4 text-red-600 text-sm whitespace-pre-wrap">{error}</pre>
        )}
        {!error && svg && (
          <ZoomableMermaid svg={svg} />
        )}
      </div>

      {file.meta && (
        <details className="border-t border-slate-200 bg-white">
          <summary className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50">
            메타데이터
          </summary>
          <pre className="px-4 pb-3 text-xs text-slate-700 whitespace-pre-wrap">{file.meta}</pre>
        </details>
      )}
    </div>
  );
}

function ZoomableMermaid({ svg }: { svg: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  const fitToScreen = () => {
    const el = containerRef.current;
    const api = transformRef.current;
    if (!el || !api) return;
    const svgEl = el.querySelector('svg');
    if (!svgEl) return;
    const bbox = svgEl.getBoundingClientRect();
    const wrapper = el.closest('.react-transform-wrapper') as HTMLElement | null;
    const parentW = wrapper?.clientWidth ?? 1200;
    const parentH = wrapper?.clientHeight ?? 800;
    const naturalW = bbox.width / (api.state.scale || 1);
    const naturalH = bbox.height / (api.state.scale || 1);
    if (!naturalW || !naturalH) return;
    const scale = Math.min(parentW / naturalW, parentH / naturalH) * 0.92;
    const safe = Math.max(0.05, Math.min(scale, 4));
    const x = (parentW - naturalW * safe) / 2;
    const y = (parentH - naturalH * safe) / 2;
    api.setTransform(x, y, safe, 0);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      svgEl.removeAttribute('style');
      svgEl.style.maxWidth = 'none';
      svgEl.style.height = 'auto';
    }
    const t = setTimeout(fitToScreen, 80);
    return () => clearTimeout(t);
  }, [svg]);

  return (
    <TransformWrapper
      ref={transformRef}
      initialScale={1}
      minScale={0.05}
      maxScale={20}
      limitToBounds={false}
      wheel={{ step: 0.15 }}
      doubleClick={{ mode: 'reset' }}
    >
      {({ zoomIn, zoomOut }) => (
        <>
          <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white rounded shadow border border-slate-200 p-1">
            <button onClick={() => zoomIn(0.3)} className="w-9 h-9 rounded hover:bg-slate-100 text-slate-700 font-bold text-lg" aria-label="확대">+</button>
            <button onClick={() => zoomOut(0.3)} className="w-9 h-9 rounded hover:bg-slate-100 text-slate-700 font-bold text-lg" aria-label="축소">−</button>
            <button onClick={fitToScreen} className="px-2 h-9 rounded hover:bg-slate-100 text-xs text-slate-600 whitespace-nowrap" aria-label="화면맞춤">화면맞춤</button>
            <button onClick={() => transformRef.current?.centerView(1)} className="px-2 h-9 rounded hover:bg-slate-100 text-xs text-slate-600 whitespace-nowrap" aria-label="100%">100%</button>
            <button onClick={() => transformRef.current?.centerView(2)} className="px-2 h-9 rounded hover:bg-slate-100 text-xs text-slate-600 whitespace-nowrap" aria-label="200%">200%</button>
          </div>
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%', cursor: 'grab' }}
            contentStyle={{ display: 'inline-block' }}
          >
            <div
              ref={containerRef}
              className="mermaid-svg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
}

/**
 * 의존성 없이 MD→HTML 간이 렌더 (헤딩/리스트/테이블/링크/코드/인용/hr/굵게/이탤릭)
 * 전용 마크다운 라이브러리 도입 전 임시 폴백.
 */
function renderMarkdownLite(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  body = body.replace(/```mermaid\n[\s\S]*?```/g, '');

  const lines = body.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeLang = '';
  let codeBuf: string[] = [];
  let inTable = false;
  let tableBuf: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  const flushTable = () => {
    if (tableBuf.length < 2) {
      out.push(...tableBuf);
      tableBuf = [];
      inTable = false;
      return;
    }
    const rows = tableBuf.map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    const head = rows[0];
    const body = rows.slice(2);
    out.push('<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
    for (const r of body) out.push('<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
    out.push('</tbody></table>');
    tableBuf = [];
    inTable = false;
  };

  const flushList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  const inline = (s: string) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inCode) {
        flushList();
        if (inTable) flushTable();
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuf = [];
      } else {
        out.push(`<pre><code class="lang-${codeLang}">${esc(codeBuf.join('\n'))}</code></pre>`);
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      inTable = true;
      tableBuf.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    if (/^-{3,}$/.test(line)) {
      flushList();
      out.push('<hr/>');
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (inList !== 'ul') {
        flushList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        flushList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      continue;
    }
    if (line.startsWith('>')) {
      flushList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      flushList();
      out.push('');
      continue;
    }
    flushList();
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inCode) out.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`);
  if (inTable) flushTable();
  flushList();

  return out.join('\n');
}
