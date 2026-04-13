import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

interface AsyncBoundaryProps {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
  /** 로딩 시 children 유지 (오버레이 방식) */
  overlay?: boolean;
}

export default function AsyncBoundary({
  isLoading,
  error,
  isEmpty,
  emptyMessage = '데이터가 없습니다',
  emptyIcon,
  emptyAction,
  children,
  overlay = false,
}: AsyncBoundaryProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-xl text-center">
        <AlertCircle className="text-state-error mb-md" size={40} />
        <p className="text-content-secondary text-[14px]">{error}</p>
      </div>
    );
  }

  if (isLoading && !overlay) {
    return (
      <div className="flex items-center justify-center py-xl">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (isEmpty && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-xl text-center">
        {emptyIcon || <Inbox className="text-content-tertiary mb-md" size={40} />}
        <p className="text-content-secondary text-[14px]">{emptyMessage}</p>
        {emptyAction && <div className="mt-md">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && overlay && (
        <div className="absolute inset-0 bg-surface/50 flex items-center justify-center z-10 rounded-lg">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}
      {children}
    </div>
  );
}
