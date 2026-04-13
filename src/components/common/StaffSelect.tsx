import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface StaffOption {
  id: number;
  name: string;
  role: string;
  position: string;
}

interface StaffSelectProps {
  value: number | null;
  onChange: (staffId: number, staffName: string) => void;
  label?: string;
  error?: string;
  role?: string;
  placeholder?: string;
  className?: string;
}

export default function StaffSelect({
  value,
  onChange,
  label,
  error,
  role: filterRole,
  placeholder = '직원 선택',
  className,
}: StaffSelectProps) {
  const [options, setOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchStaff() {
      setLoading(true);
      const branchId = localStorage.getItem('branchId') || '1';
      let query = supabase
        .from('staff')
        .select('id, name, role, position')
        .eq('branchId', branchId)
        .eq('isActive', true);

      if (filterRole) {
        query = query.eq('role', filterRole);
      }

      const { data } = await query;
      setOptions((data as StaffOption[]) ?? []);
      setLoading(false);
    }
    fetchStaff();
  }, [filterRole]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value);
    const staff = options.find((s) => s.id === id);
    if (staff) onChange(staff.id, staff.name);
  }

  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      {label && (
        <label className="text-Body-Primary-KR text-content font-medium leading-[1.5]">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          value={value ?? ''}
          onChange={handleChange}
          disabled={loading}
          className={cn(
            'w-full appearance-none rounded-lg border bg-surface px-sm py-[9px] pr-8 text-sm text-content',
            'outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            !value && 'text-content-tertiary',
            error ? 'border-state-error' : 'border-line'
          )}
        >
          <option value="" disabled>
            {loading ? '불러오는 중...' : placeholder}
          </option>
          {options.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
              {staff.position ? ` (${staff.position})` : ''}
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

export { StaffSelect };
