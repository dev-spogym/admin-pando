import React from "react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";

export interface AvatarGroupUser {
  name: string;
  src?: string;
}

export interface AvatarGroupProps {
  users: AvatarGroupUser[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export default function AvatarGroup({
  users,
  max = 3,
  size = "md",
  className,
}: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const overlapClass = size === "sm" ? "-ml-2" : "-ml-2.5";

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((user, idx) => (
        <span
          key={idx}
          className={cn(
            "rounded-full ring-2 ring-white inline-block shrink-0",
            idx > 0 && overlapClass
          )}
          title={user.name}
        >
          <Avatar src={user.src} name={user.name} size={size} />
        </span>
      ))}

      {overflow > 0 && (
        <span
          className={cn(
            "rounded-full ring-2 ring-white inline-flex items-center justify-center",
            "bg-gray-100 text-gray-600 font-semibold shrink-0",
            overlapClass,
            sizeClass
          )}
          title={`+${overflow}명 더`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
