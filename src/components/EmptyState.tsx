import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  // lucide-react 아이콘 컴포넌트
  icon?: LucideIcon;
  title: string;
  description?: string;
  // 액션 버튼 (선택)
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-xxl px-xl text-center',
        className,
      )}
    >
      {/* 아이콘 영역 */}
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-lg">
          <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
      )}

      {/* 제목 */}
      <h3 className="text-Section-Title text-content mb-xs">{title}</h3>

      {/* 설명 */}
      {description && (
        <p className="text-Body-Primary-KR text-content-secondary max-w-xs mb-lg">{description}</p>
      )}

      {/* 액션 버튼 */}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-xs bg-primary text-white rounded-button px-lg py-sm text-Body-Primary-KR font-semibold hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
