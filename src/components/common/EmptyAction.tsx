import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyActionButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

interface EmptyActionProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: EmptyActionButton[];
  className?: string;
}

const buttonVariantClasses: Record<string, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-surface-secondary text-content hover:bg-line',
  outline: 'border border-line text-content-secondary hover:bg-surface-secondary',
};

export default function EmptyAction({
  icon,
  title,
  description,
  actions = [],
  className,
}: EmptyActionProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-14 px-6 text-center',
        className
      )}
    >
      {/* 아이콘 */}
      {icon && (
        <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-4">
          <span className="text-primary [&>svg]:w-8 [&>svg]:h-8 [&>svg]:stroke-[1.5]">{icon}</span>
        </div>
      )}

      {/* 텍스트 */}
      <h3 className="text-[15px] font-semibold text-content">{title}</h3>
      {description && (
        <p className="mt-1.5 text-[13px] text-content-secondary max-w-xs">{description}</p>
      )}

      {/* 액션 버튼 */}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {actions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={action.onClick}
              className={cn(
                'px-4 py-2 text-[13px] font-medium rounded-lg transition-colors',
                buttonVariantClasses[action.variant ?? 'primary']
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
