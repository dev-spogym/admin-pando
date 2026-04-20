'use client';

import { useEffect, useMemo, useState } from 'react';
import { MermaidView } from './MermaidView';

type Node = {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: Node[];
};

type FileData = {
  path: string;
  content: string;
  mermaidBlocks: string[];
  meta: string;
};

const SECTION_DESC: Record<string, { label: string; order: number; desc: string }> = {
  'README.md': { label: '규칙집', order: 0, desc: '컨벤션·색상·노드 규칙' },
  'INDEX.md': { label: '마스터 인덱스 (여기부터)', order: 1, desc: '전체 구조 한눈에' },
  '00_사이트맵': { label: '1. 사이트맵', order: 10, desc: '화면 간 이동 전체도' },
  '10_권한매트릭스': { label: '2. 권한 매트릭스', order: 11, desc: '6개 역할의 접근 범위' },
  '20_상태전이도': { label: '3. 상태 전이', order: 12, desc: '엔티티 16개 상태 흐름' },
  '30_시나리오_시퀀스': { label: '4. 업무 시나리오', order: 13, desc: 'X01~X30 실무 흐름' },
  'D01_공통': { label: 'D01. 공통 / 대시보드', order: 20, desc: '로그인·알림·글로벌검색' },
  'D02_회원관리': { label: 'D02. 회원관리 [중요]', order: 21, desc: '회원·이용권·체성분' },
  'D03_매출관리': { label: 'D03. 매출 [중요]', order: 22, desc: 'POS·결제·환불·미수금' },
  'D04_수업관리': { label: 'D04. 수업 / PT [중요]', order: 23, desc: '캘린더·그룹수업·횟수' },
  'D05_상품관리': { label: 'D05. 상품', order: 24, desc: '상품·할인·재고' },
  'D06_시설관리': { label: 'D06. 시설', order: 25, desc: '락커·운동복·타석' },
  'D07_직원관리': { label: 'D07. 직원', order: 26, desc: '근태·급여·퇴사' },
  'D08_마케팅': { label: 'D08. 마케팅 [중요]', order: 27, desc: '리드·쿠폰·전자계약' },
  'D09_설정관리': { label: 'D09. 설정', order: 28, desc: '센터·권한·키오스크' },
  'D10_본사관리': { label: 'D10. 본사', order: 29, desc: '본사·지점·KPI·감사' },
  'D11_통합운영': { label: 'D11. IoT / 헬스', order: 30, desc: '출입·체성분·밴드' },
  '40_자동화_크론': { label: '5. 자동화 크론', order: 40, desc: '매일/매월 자동 실행' },
  '50_에러_예외': { label: '6. 에러 카탈로그', order: 41, desc: '에러코드별 대응' },
  '60_데이터흐름': { label: '7. 데이터 흐름', order: 42, desc: 'DB·API 파이프라인' },
  '99_TC_매핑': { label: 'QA / TC 매핑', order: 50, desc: 'QA팀 인수인계' },
  '_관리': { label: '관리 문서 (참고)', order: 90, desc: '진행상태·완료리포트' },
};

export function DiagramBrowser() {
  const [tree, setTree] = useState<Node[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<FileData | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/diagrams')
      .then((r) => r.json())
      .then((d) => {
        const raw: Node[] = d.tree ?? [];
        raw.sort((a, b) => (SECTION_DESC[a.name]?.order ?? 999) - (SECTION_DESC[b.name]?.order ?? 999));
        setTree(raw);
        if (!selected) setSelected('INDEX.md');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/diagrams/file?path=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((d) => {
        setFile(d);
        setLoading(false);
      });
  }, [selected]);

  const filteredTree = useMemo(() => {
    if (!query.trim()) return tree;
    const q = query.toLowerCase();
    const filter = (nodes: Node[]): Node[] =>
      nodes
        .map((n) => {
          if (n.type === 'file') {
            return n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q) ? n : null;
          }
          const children = filter(n.children ?? []);
          if (children.length > 0 || n.name.toLowerCase().includes(q)) {
            return { ...n, children };
          }
          return null;
        })
        .filter(Boolean) as Node[];
    return filter(tree);
  }, [tree, query]);

  const toggle = (p: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  };

  const renderNode = (node: Node, depth = 0): React.ReactNode => {
    const section = depth === 0 ? SECTION_DESC[node.name] : undefined;
    if (node.type === 'file') {
      const active = selected === node.path;
      return (
        <button
          key={node.path}
          onClick={() => setSelected(node.path)}
          className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-blue-50 ${
            active ? 'bg-blue-100 font-semibold text-blue-900' : 'text-slate-700'
          }`}
          style={{ paddingLeft: 8 + depth * 12 }}
          title={section?.desc}
        >
          {section ? section.label : node.name.replace('.md', '')}
          {section && <div className="text-[10px] text-slate-500 font-normal mt-0.5">{section.desc}</div>}
        </button>
      );
    }
    const isOpen = expanded.has(node.path) || !!query;
    return (
      <div key={node.path}>
        <button
          onClick={() => toggle(node.path)}
          className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-slate-100 font-medium text-slate-800"
          style={{ paddingLeft: 8 + depth * 12 }}
          title={section?.desc}
        >
          <span>{isOpen ? '▾' : '▸'} {section ? section.label : node.name}</span>
          {section && <div className="text-[10px] text-slate-500 font-normal mt-0.5 ml-3">{section.desc}</div>}
        </button>
        {isOpen && node.children?.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-3 border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-900 mb-2">📊 다이어그램 뷰어</h1>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색 (파일명/경로)"
            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredTree.map((n) => renderNode(n))}
        </div>
        <div className="p-2 border-t border-slate-200 text-xs text-slate-500">
          {tree.length > 0 ? `루트 ${countFiles(tree)}개 파일` : '로딩 중...'}
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        {!selected && (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            좌측에서 다이어그램 선택
          </div>
        )}
        {selected && (
          <>
            <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">{selected}</div>
                <div className="text-lg font-semibold text-slate-900">
                  {selected.split('/').pop()?.replace('.md', '')}
                </div>
              </div>
              <a
                href={`/api/diagrams/file?path=${encodeURIComponent(selected)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                원본 보기 →
              </a>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-100">
              {loading && (
                <div className="flex items-center justify-center h-full text-slate-400">
                  로딩 중...
                </div>
              )}
              {!loading && file && <MermaidView file={file} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function countFiles(tree: Node[]): number {
  let count = 0;
  for (const n of tree) {
    if (n.type === 'file') count++;
    else if (n.children) count += countFiles(n.children);
  }
  return count;
}
