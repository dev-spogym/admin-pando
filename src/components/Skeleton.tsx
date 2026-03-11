import { cn } from '@/lib/utils';

// --- 기본 Skeleton ---

interface SkeletonProps {
  // 너비 (Tailwind 클래스 또는 인라인 스타일용 값)
  width?: string;
  // 높이 (Tailwind 클래스 또는 인라인 스타일용 값)
  height?: string;
  // 둥근 모서리 여부
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const roundedMap: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  none: 'rounded-none',
  sm: 'rounded-0',
  md: 'rounded-1',
  lg: 'rounded-2',
  full: 'rounded-full',
};

export function Skeleton({ width, height, rounded = 'md', className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-8',
        roundedMap[rounded],
        className,
      )}
      style={{
        width: width ?? '100%',
        height: height ?? '16px',
      }}
    />
  );
}

// --- SkeletonCard: 카드형 스켈레톤 ---

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('bg-3 rounded-card-normal shadow-0 p-lg space-y-sm', className)}>
      {/* 상단 헤더 영역 */}
      <div className="flex items-center gap-sm">
        <Skeleton width="40px" height="40px" rounded="full" />
        <div className="flex-1 space-y-xs">
          <Skeleton width="60%" height="14px" />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      {/* 본문 영역 */}
      <Skeleton height="12px" />
      <Skeleton height="12px" width="80%" />
      <Skeleton height="12px" width="90%" />
      {/* 하단 액션 영역 */}
      <div className="flex gap-sm pt-xs">
        <Skeleton width="80px" height="32px" rounded="lg" />
        <Skeleton width="80px" height="32px" rounded="lg" />
      </div>
    </div>
  );
}

// --- SkeletonTable: 테이블형 스켈레톤 ---

interface SkeletonTableProps {
  // 표시할 행 수
  rows?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, className }: SkeletonTableProps) {
  return (
    <div className={cn('bg-3 rounded-card-normal shadow-0 overflow-hidden', className)}>
      {/* 테이블 헤더 */}
      <div className="bg-2 px-lg py-sm flex gap-md border-b border-7">
        {[30, 20, 20, 15, 15].map((w, i) => (
          <Skeleton key={i} width={`${w}%`} height="12px" />
        ))}
      </div>
      {/* 테이블 행 */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="px-lg py-md flex gap-md border-b border-7 last:border-0"
        >
          {[30, 20, 20, 15, 15].map((w, colIdx) => (
            <Skeleton key={colIdx} width={`${w}%`} height="14px" />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- SkeletonText: 텍스트형 스켈레톤 ---

interface SkeletonTextProps {
  // 표시할 줄 수
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  // 마지막 줄은 75% 너비로 자연스럽게 표현
  const widths = Array.from({ length: lines }, (_, i) =>
    i === lines - 1 ? '75%' : '100%',
  );

  return (
    <div className={cn('space-y-xs', className)}>
      {widths.map((w, i) => (
        <Skeleton key={i} width={w} height="14px" />
      ))}
    </div>
  );
}
