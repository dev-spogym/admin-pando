import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserMenuUser {
  name: string;
  email?: string;
  role: string;
  avatar?: string;
}

export interface UserMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  divider?: boolean;
}

interface UserMenuProps {
  user: UserMenuUser;
  items?: UserMenuItem[];
  onLogout: () => void;
  className?: string;
}

export default function UserMenu({ user, items = [], onLogout, className }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const initials = user.name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* 트리거 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
      >
        {/* 아바타 */}
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">{initials}</span>
          </div>
        )}

        {/* 이름/역할 */}
        <div className="text-left hidden sm:block">
          <p className="text-[13px] font-semibold text-content leading-tight">{user.name}</p>
          <p className="text-[11px] text-content-tertiary leading-tight">{user.role}</p>
        </div>

        <ChevronDown
          size={14}
          className={cn('text-content-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-line shadow-lg z-50 py-1 overflow-hidden">
          {/* 사용자 정보 */}
          <div className="px-3 py-2.5 border-b border-line">
            <p className="text-[13px] font-semibold text-content">{user.name}</p>
            {user.email && <p className="text-[11px] text-content-secondary truncate">{user.email}</p>}
            <span className="mt-1 inline-block text-[10px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full">
              {user.role}
            </span>
          </div>

          {/* 메뉴 아이템 */}
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={idx}>
                {item.divider && idx > 0 && <div className="my-1 border-t border-line" />}
                <button
                  type="button"
                  onClick={() => { item.onClick(); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-content hover:bg-surface-secondary transition-colors"
                >
                  {Icon && <Icon size={14} className="text-content-tertiary shrink-0" />}
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}

          {/* 로그아웃 */}
          {items.length > 0 && <div className="my-1 border-t border-line" />}
          <button
            type="button"
            onClick={() => { onLogout(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} className="shrink-0" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
