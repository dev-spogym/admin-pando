import React from "react";
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  /** 알림 변형 */
  variant?: AlertVariant;
  /** 제목 */
  title?: string;
  /** 설명 */
  description?: React.ReactNode;
  /** 닫기 버튼 표시 */
  closable?: boolean;
  /** 닫기 콜백 */
  onClose?: () => void;
  /** 커스텀 아이콘 (false면 아이콘 숨김) */
  icon?: React.ReactNode | false;
  /** 오른쪽 액션 */
  action?: React.ReactNode;
  /** 추가 클래스 */
  className?: string;
}

const VARIANT_STYLES: Record<AlertVariant, { wrapper: string; icon: string }> = {
  info: {
    wrapper: "bg-blue-50 border border-blue-200 text-blue-800",
    icon: "text-blue-500",
  },
  success: {
    wrapper: "bg-green-50 border border-green-200 text-green-800",
    icon: "text-green-500",
  },
  warning: {
    wrapper: "bg-amber-50 border border-amber-200 text-amber-800",
    icon: "text-amber-500",
  },
  error: {
    wrapper: "bg-red-50 border border-red-200 text-red-800",
    icon: "text-red-500",
  },
};

const DEFAULT_ICONS: Record<AlertVariant, React.ReactNode> = {
  info: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />,
};

export default function Alert({
  variant = "info",
  title,
  description,
  closable = false,
  onClose,
  icon,
  action,
  className,
}: AlertProps) {
  const styles = VARIANT_STYLES[variant];
  const resolvedIcon = icon === false ? null : (icon ?? DEFAULT_ICONS[variant]);

  return (
    <div
      className={cn("flex items-start gap-3 rounded-xl px-4 py-3", styles.wrapper, className)}
      role="alert"
    >
      {/* 아이콘 */}
      {resolvedIcon && (
        <span className={cn("mt-0.5 flex-shrink-0", styles.icon)}>{resolvedIcon}</span>
      )}

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold leading-5">{title}</p>}
        {description && (
          <p className={cn("text-sm leading-5", title && "mt-0.5 opacity-80")}>{description}</p>
        )}
      </div>

      {/* 오른쪽 액션 */}
      {action && <div className="flex-shrink-0">{action}</div>}

      {/* 닫기 버튼 */}
      {closable && (
        <button
          onClick={onClose}
          className={cn(
            "flex-shrink-0 rounded p-0.5 transition-colors hover:bg-black/10",
            styles.icon
          )}
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
