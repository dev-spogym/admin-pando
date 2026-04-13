import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidePanelTab {
  key: string;
  label: string;
}

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tabs?: SidePanelTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  actions?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const widthMap: Record<string, string> = {
  sm: 'w-[400px]',
  md: 'w-[560px]',
  lg: 'w-[720px]',
};

export default function SidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  width = 'md',
  children,
  className,
}: SidePanelProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* 오버레이 */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* 패널 */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full bg-white shadow-2xl flex flex-col transition-transform duration-300',
          widthMap[width],
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-content truncate">{title}</h2>
            {subtitle && (
              <p className="text-[12px] text-content-secondary mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {actions}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-secondary text-content-tertiary hover:text-content transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 탭 */}
        {tabs && tabs.length > 0 && (
          <div className="flex border-b border-line overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange?.(tab.key)}
                  className={cn(
                    'px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-content-secondary hover:text-content'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
