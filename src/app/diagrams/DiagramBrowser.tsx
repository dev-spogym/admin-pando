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
      .then((d) => setTree(d.tree ?? []));
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
        >
          📄 {node.name.replace('.md', '')}
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
        >
          {isOpen ? '▾' : '▸'} 📁 {node.name}
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
