import React from 'react';
import { cn } from '@/lib/utils';

type RoleColor = 'purple' | 'blue' | 'green' | 'amber' | 'cyan' | 'orange' | 'gray';

const ROLE_COLOR_MAP: Record<string, RoleColor> = {
  슈퍼관리자: 'purple',
  ADMIN: 'purple',
  primary: 'purple',
  지점장: 'blue',
  OWNER: 'blue',
  owner: 'blue',
  매니저: 'green',
  MANAGER: 'green',
  manager: 'green',
  FC: 'amber',
  fc: 'amber',
  트레이너: 'cyan',
  STAFF: 'cyan',
  staff: 'cyan',
  프론트: 'orange',
  front: 'orange',
  readonly: 'gray',
};

const COLOR_STYLES: Record<RoleColor, string> = {
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  orange: 'bg-orange-50 text-orange-700 border border-orange-200',
  gray: 'bg-surface-tertiary text-content-secondary border border-line',
};

const SIZE_STYLES: Record<'sm' | 'md', string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[11px]',
};

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  const color: RoleColor = ROLE_COLOR_MAP[role] ?? 'gray';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-semibold',
        COLOR_STYLES[color],
        SIZE_STYLES[size],
        className
      )}
    >
      {role}
    </span>
  );
}

export { RoleBadge };
