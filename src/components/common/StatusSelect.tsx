import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType = 'member' | 'sale' | 'locker' | 'staff';

interface StatusOption {
  value: string;
  label: string;
}

const STATUS_OPTIONS: Record<StatusType, StatusOption[]> = {
  member: [
    { value: 'ACTIVE', label: '활성' },
    { value: 'INACTIVE', label: '비활성' },
    { value: 'EXPIRED', label: '만료' },
    { value: 'HOLDING', label: '홀딩' },
    { value: 'SUSPENDED', label: '정지' },
  ],
  sale: [
    { value: 'COMPLETED', label: '완료' },
    { value: 'UNPAID', label: '미납' },
    { value: 'REFUNDED', label: '환불' },
    { value: 'PENDING', label: '대기' },
  ],
  locker: [
    { value: 'AVAILABLE', label: '사용 가능' },
    { value: 'IN_USE', label: '사용 중' },
    { value: 'MAINTENANCE', label: '점검 중' },
  ],
  staff: [
    { value: 'ACTIVE', label: '재직' },
    { value: 'RESIGNED', label: '퇴직' },
    { value: 'ON_LEAVE', label: '휴직' },
  ],
};

interface StatusSelectProps {
  type: StatusType;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  includeAll?: boolean;
  className?: string;
}

export default function StatusSelect({
  type,
  value,
  onChange,
  label,
  error,
  placeholder = '상태 선택',
  includeAll = false,
  className,
}: StatusSelectProps) {
  const options = STATUS_OPTIONS[type] ?? [];

  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      {label && (
        <label className="text-Body-Primary-KR text-content font-medium leading-[1.5]">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none rounded-lg border bg-surface px-sm py-[9px] pr-8 text-sm text-content',
            'outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15',
            !value && 'text-content-tertiary',
            error ? 'border-state-error' : 'border-line'
          )}
        >
          {includeAll && <option value="">전체</option>}
          {!includeAll && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-content-tertiary"
        />
      </div>

      {error && (
        <p className="text-Body-Primary-KR text-state-error leading-[1.5]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { StatusSelect };
export type { StatusType, StatusOption };
