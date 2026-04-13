import React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "offline" | "busy";

export interface AvatarProps {
  /** 이미지 URL */
  src?: string;
  /** 이름 (이니셜 추출 및 배경색 해시에 사용) */
  name?: string;
  /** 아바타 크기 */
  size?: AvatarSize;
  /** 상태 도트 */
  status?: AvatarStatus;
  /** 추가 클래스 */
  className?: string;
  /** alt 텍스트 */
  alt?: string;
}

const SIZE_STYLES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const DOT_SIZE_STYLES: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-4 w-4",
};

const STATUS_COLOR: Record<AvatarStatus, string> = {
  online: "bg-green-400",
  offline: "bg-gray-400",
  busy: "bg-red-400",
};

/** 이름 기반 파스텔 배경색 해시 */
const PASTEL_COLORS = [
  "bg-rose-200 text-rose-700",
  "bg-orange-200 text-orange-700",
  "bg-amber-200 text-amber-700",
  "bg-lime-200 text-lime-700",
  "bg-emerald-200 text-emerald-700",
  "bg-teal-200 text-teal-700",
  "bg-cyan-200 text-cyan-700",
  "bg-sky-200 text-sky-700",
  "bg-blue-200 text-blue-700",
  "bg-violet-200 text-violet-700",
  "bg-purple-200 text-purple-700",
  "bg-pink-200 text-pink-700",
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  src,
  name,
  size = "md",
  status,
  className,
  alt,
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const colorClass = name ? getColorFromName(name) : "bg-gray-200 text-gray-500";
  const initials = name ? getInitials(name) : null;

  return (
    <span className={cn("relative inline-flex flex-shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full overflow-hidden font-semibold",
          SIZE_STYLES[size],
          (!src || imgError) && colorClass
        )}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={alt ?? name ?? "avatar"}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User
            className={cn(
              size === "xs" && "h-3 w-3",
              size === "sm" && "h-4 w-4",
              size === "md" && "h-5 w-5",
              size === "lg" && "h-7 w-7",
              size === "xl" && "h-10 w-10"
            )}
          />
        )}
      </span>

      {/* 상태 도트 */}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-white",
            DOT_SIZE_STYLES[size],
            STATUS_COLOR[status]
          )}
        />
      )}
    </span>
  );
}
