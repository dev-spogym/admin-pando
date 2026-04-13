import React, { useRef, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavTabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  count?: number;
}

interface NavTabsProps {
  tabs: NavTabItem[];
  activeTab: string;
  onChange: (key: string) => void;
  variant?: 'underline' | 'pills' | 'enclosed';
  size?: 'sm' | 'md';
  className?: string;
}

export default function NavTabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  className,
}: NavTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTab]);

  const sizeClasses = {
    sm: 'text-[12px] px-3 py-1.5',
    md: 'text-[13px] px-4 py-2.5',
  };

  const containerClasses = {
    underline: 'border-b border-line bg-surface',
    pills: 'flex gap-1 p-1 bg-surface-secondary rounded-xl',
    enclosed: 'border border-line rounded-lg bg-surface-secondary p-0.5 flex gap-0.5',
  };

  const itemClasses = (isActive: boolean): string => {
    if (variant === 'underline') {
      return cn(
        'border-b-2 transition-colors whitespace-nowrap font-medium',
        sizeClasses[size],
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-content-secondary hover:text-content hover:border-line'
      );
    }
    if (variant === 'pills') {
      return cn(
        'rounded-lg transition-colors whitespace-nowrap font-medium',
        sizeClasses[size],
        isActive
          ? 'bg-white shadow-sm text-primary'
          : 'text-content-secondary hover:text-content'
      );
    }
    // enclosed
    return cn(
      'rounded-md transition-colors whitespace-nowrap font-medium flex-1 text-center',
      sizeClasses[size],
      isActive
        ? 'bg-white shadow-sm text-content'
        : 'text-content-secondary hover:text-content'
    );
  };

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        containerClasses[variant],
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;

        const content = (
          <>
            {Icon && <Icon size={size === 'sm' ? 13 : 14} className="shrink-0" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-px rounded-full text-[10px] font-semibold tabular-nums',
                  isActive ? 'bg-primary text-white' : 'bg-line text-content-secondary'
                )}
              >
                {tab.count}
              </span>
            )}
          </>
        );

        if (tab.href) {
          return (
            <a
              key={tab.key}
              href={tab.href}
              onClick={() => onChange(tab.key)}
              className={cn('flex items-center gap-1.5 shrink-0', itemClasses(isActive))}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn('flex items-center gap-1.5 shrink-0', itemClasses(isActive))}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
