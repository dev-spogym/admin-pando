import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  /** 라벨 텍스트 */
  label: string;
  /** 에러 메시지 */
  error?: string;
  /** 필수 여부 (true면 라벨 옆에 빨간 * 표시) */
  required?: boolean;
  /** 입력 컴포넌트 */
  children: React.ReactNode;
  /** 외부 스타일 주입용 */
  className?: string;
}

/**
 * FormField - 폼 입력 필드 래퍼 컴포넌트.
 * 라벨, 필수 표시, 에러 메시지를 일관된 방식으로 렌더링합니다.
 */
export default function FormField({
  label,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      {/* 라벨 영역 */}
      <label className="text-Body-Primary-KR text-4 font-medium leading-[1.5]">
        {label}
        {/* 필수 항목 표시 */}
        {required && (
          <span className="ml-xs text-error" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* 입력 컴포넌트 슬롯 */}
      {children}

      {/* 에러 메시지 영역 */}
      {error && (
        <p
          className="text-Body-Primary-KR text-error leading-[1.5]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
