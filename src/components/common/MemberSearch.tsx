import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from './StatusBadge';

interface MemberOption {
  id: number;
  name: string;
  phone: string;
  status: string;
}

interface MemberSearchProps {
  value: { id: number; name: string } | null;
  onChange: (member: { id: number; name: string; phone: string } | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
}

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'default' | 'secondary' {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'success';
    case 'HOLDING': return 'warning';
    case 'EXPIRED':
    case 'SUSPENDED': return 'error';
    case 'INACTIVE': return 'secondary';
    default: return 'default';
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: '활성',
    INACTIVE: '비활성',
    EXPIRED: '만료',
    HOLDING: '홀딩',
    SUSPENDED: '정지',
  };
  return map[status?.toUpperCase()] ?? status ?? '-';
}

export default function MemberSearch({
  value,
  onChange,
  placeholder = '회원 검색...',
  label,
  error,
  className,
}: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const branchId = localStorage.getItem('branchId') || '1';
    const { data } = await supabase
      .from('members')
      .select('id, name, phone, status')
      .eq('branchId', branchId)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(10);
    setResults((data as MemberOption[]) ?? []);
    setOpen(true);
    setLoading(false);
  }, []);

  // 디바운스 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, search]);

  function handleSelect(member: MemberOption) {
    onChange({ id: member.id, name: member.name, phone: member.phone });
    setQuery('');
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className={cn('flex flex-col gap-xs', className)} ref={containerRef}>
      {label && (
        <label className="text-Body-Primary-KR text-content font-medium leading-[1.5]">
          {label}
        </label>
      )}

      <div className="relative">
        {/* 선택된 회원 표시 또는 입력 */}
        {value ? (
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-sm py-[9px] text-sm text-content">
            <div className="flex items-center gap-2">
              <User size={14} className="text-content-secondary shrink-0" />
              <span className="font-medium">{value.name}</span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-content-tertiary hover:text-content-secondary transition-colors"
              aria-label="선택 해제"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search
              size={14}
              className="absolute left-sm top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setOpen(true)}
              placeholder={placeholder}
              className={cn(
                'w-full rounded-lg border bg-surface px-sm py-[9px] pl-8 text-sm text-content',
                'placeholder:text-content-tertiary outline-none transition-colors',
                'focus:border-primary focus:ring-2 focus:ring-primary/15',
                error ? 'border-state-error' : 'border-line'
              )}
            />
            {loading && (
              <div className="absolute right-sm top-1/2 -translate-y-1/2">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        )}

        {/* 드롭다운 결과 */}
        {open && results.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-lg border border-line bg-surface shadow-lg overflow-hidden">
            {results.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(member)}
                  className="flex w-full items-center justify-between px-sm py-[9px] hover:bg-surface-secondary transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-content">{member.name}</p>
                    <p className="text-xs text-content-tertiary">{member.phone}</p>
                  </div>
                  <StatusBadge
                    label={getStatusLabel(member.status)}
                    variant={getStatusVariant(member.status)}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {open && !loading && results.length === 0 && query.trim() && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-line bg-surface shadow-lg px-sm py-md text-sm text-content-tertiary text-center">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {error && (
        <p className="text-Body-Primary-KR text-state-error leading-[1.5]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { MemberSearch };
