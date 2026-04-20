'use client';

import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import mermaid from 'mermaid';

type FileData = {
  path: string;
  content: string;
  mermaidBlocks: string[];
  meta: string;
};

let initialized = false;

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
    const code = file.mermaidBlocks[activeIdx];
    if (!code) {
      setSvg('');
      setError(file.mermaidBlocks.length === 0 ? '이 파일에는 mermaid 블록이 없습니다.' : '');
      return;
    }
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
          <TransformWrapper
            initialScale={1}
            minScale={0.1}
            maxScale={8}
            limitToBounds={false}
            wheel={{ step: 0.1 }}
            doubleClick={{ mode: 'reset' }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white rounded shadow border border-slate-200 p-1">
                  <button
                    onClick={() => zoomIn()}
                    className="w-8 h-8 rounded hover:bg-slate-100 text-slate-700 font-bold"
                    aria-label="확대"
                  >
                    +
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="w-8 h-8 rounded hover:bg-slate-100 text-slate-700 font-bold"
                    aria-label="축소"
                  >
                    −
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="px-2 h-8 rounded hover:bg-slate-100 text-xs text-slate-600"
                    aria-label="리셋"
                  >
                    리셋
                  </button>
                </div>
                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                  }}
                >
                  <div
                    className="mermaid-svg"
                    dangerouslySetInnerHTML={{ __html: svg }}
                    style={{ minWidth: '400px' }}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
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
