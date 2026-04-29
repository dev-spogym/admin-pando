import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Users, Package, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { moveToPage } from '@/internal';

const getBranchId = (): number => Number(localStorage.getItem('branchId')) || 1;

interface SearchResult {
  type: 'member' | 'product' | 'notice' | 'menu';
  id: number | string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

const MENU_ITEMS = [
  { label: '대시보드', path: '/', viewId: 966 },
  { label: '회원 목록', path: '/members', viewId: 967 },
  { label: '회원 등록', path: '/members/new', viewId: 967 },
  { label: '출석 관리', path: '/attendance', viewId: 968 },
  { label: '캘린더', path: '/calendar', viewId: 969 },
  { label: '매출 현황', path: '/sales', viewId: 970 },
  { label: 'POS 결제', path: '/pos', viewId: 971 },
  { label: '상품 관리', path: '/products', viewId: 972 },
  { label: '락커 관리', path: '/locker', viewId: 973 },
  { label: '직원 관리', path: '/staff', viewId: 974 },
  { label: '급여 관리', path: '/payroll', viewId: 976 },
  { label: '메시지 발송', path: '/message', viewId: 980 },
  { label: '센터 설정', path: '/settings', viewId: 975 },
  { label: '리드 관리', path: '/leads', viewId: 0 },
  { label: '공지사항', path: '/notices', viewId: 0 },
  { label: 'KPI 대시보드', path: '/kpi', viewId: 0 },
  { label: '통합 대시보드', path: '/super-dashboard', viewId: 0 },
  { label: '히스토리 로그', path: '/audit-log', viewId: 0 },
];

const RECENT_KEY = 'global_search_recent';
const MAX_RECENT = 8;

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]; }
  catch { return []; }
}

function addRecent(q: string) {
  const prev = loadRecent().filter(s => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

function removeRecent(q: string) {
  const next = loadRecent().filter(s => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 열릴 때 포커스 + 최근 검색어 로드
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setRecentSearches(loadRecent());
    }
  }, [isOpen]);

  // 검색 디바운스
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setSelectedIdx(0);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      addRecent(q.trim());
      setRecentSearches(loadRecent());
      const branchId = getBranchId();
      const items: SearchResult[] = [];

      // 메뉴 검색
      MENU_ITEMS.filter(m => m.label.includes(q)).forEach(m => {
        items.push({
          type: 'menu', id: m.path, title: m.label, subtitle: m.path,
          icon: <Settings size={14} className="text-content-tertiary" />,
          action: () => { m.viewId ? moveToPage(m.viewId) : window.location.assign(m.path); },
        });
      });

      // 회원 검색
      try {
        const { data: members } = await supabase
          .from('members').select('id, name, phone, status')
          .eq('branchId', branchId).is('deletedAt', null)
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(5);
        (members ?? []).forEach((m: any) => {
          items.push({
            type: 'member', id: m.id, title: m.name, subtitle: `${m.phone ?? ''} · ${m.status}`,
            icon: <Users size={14} className="text-primary" />,
            action: () => moveToPage(985, { id: m.id }),
          });
        });
      } catch { /* ignore */ }

      // 상품 검색
      try {
        const { data: products } = await supabase
          .from('products').select('id, name, category, price')
          .eq('branchId', branchId).ilike('name', `%${q}%`).limit(5);
        (products ?? []).forEach((p: any) => {
          items.push({
            type: 'product', id: p.id, title: p.name,
            subtitle: `${p.category} · ₩${Number(p.price).toLocaleString()}`,
            icon: <Package size={14} className="text-accent" />,
            action: () => moveToPage(972),
          });
        });
      } catch { /* ignore */ }

      // 공지 검색
      try {
        const { data: notices } = await supabase
          .from('notices').select('id, title, authorName')
          .ilike('title', `%${q}%`).limit(3);
        (notices ?? []).forEach((n: any) => {
          items.push({
            type: 'notice', id: n.id, title: n.title, subtitle: n.authorName ?? '',
            icon: <FileText size={14} className="text-state-warning" />,
            action: () => moveToPage(0),
          });
        });
      } catch { /* ignore */ }

      setResults(items);
      setLoading(false);
    }, 200);
  }, []);

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIdx]) {
      results[selectedIdx].action();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/40" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-[560px] mx-md bg-surface rounded-xl shadow-lg border border-line overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* 검색 입력 */}
        <div className="flex items-center gap-sm px-lg py-md border-b border-line">
          <Search size={18} className="text-content-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="회원, 상품, 메뉴 검색..."
            className="flex-1 text-[14px] text-content bg-transparent outline-none placeholder:text-content-tertiary"
          />
          <kbd className="hidden sm:inline-flex items-center px-xs py-[1px] text-[10px] text-content-tertiary border border-line rounded">ESC</kbd>
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="text-content-tertiary hover:text-content">
              <X size={16} />
            </button>
          )}
        </div>

        {/* 결과 */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-lg text-[13px] text-content-tertiary">검색 중...</div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="flex items-center justify-center py-lg text-[13px] text-content-tertiary">검색 결과가 없습니다</div>
          )}
          {!loading && results.length > 0 && (
            <div className="py-xs">
              {results.map((item, idx) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => { item.action(); setIsOpen(false); }}
                  className={cn(
                    'flex items-center gap-sm w-full px-lg py-sm text-left transition-colors',
                    idx === selectedIdx ? 'bg-primary/10' : 'hover:bg-surface-secondary'
                  )}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-secondary shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-content truncate">{item.title}</p>
                    <p className="text-[11px] text-content-tertiary truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-content-tertiary uppercase shrink-0">
                    {{ member: '회원', product: '상품', notice: '공지', menu: '메뉴' }[item.type]}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!query && (
            <div className="py-md px-lg text-[12px] text-content-tertiary">
              {recentSearches.length > 0 && (
                <div className="mb-md">
                  <p className="mb-xs font-semibold text-content-secondary">최근 검색어</p>
                  <div className="flex flex-wrap gap-xs">
                    {recentSearches.map(s => (
                      <div key={s} className="flex items-center gap-[2px] bg-surface-secondary rounded-full pl-sm pr-xs py-[3px] border border-line">
                        <button
                          className="text-[12px] text-content hover:text-primary transition-colors"
                          onClick={() => handleSearch(s)}
                        >
                          {s}
                        </button>
                        <button
                          className="text-content-tertiary hover:text-content ml-[2px]"
                          onClick={() => { removeRecent(s); setRecentSearches(loadRecent()); }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-xs font-medium">빠른 검색</p>
              <p>회원 이름, 전화번호, 상품명, 메뉴를 검색하세요</p>
              <p className="mt-xs">↑↓ 이동 · Enter 선택 · Esc 닫기</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
