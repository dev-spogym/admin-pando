import React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export default function Label({
  required = false,
  children,
  className,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn("text-Label text-content-secondary inline-flex items-center gap-xs", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
