import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS = [
  "#6366F1",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
];

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

export default function ColorPicker({
  value,
  onChange,
  colors = DEFAULT_COLORS,
  size = "md",
  label,
  className,
}: ColorPickerProps) {
  const swatchSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const checkSize = size === "sm" ? 10 : 14;

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      {label && (
        <span className="text-Label font-medium text-content">{label}</span>
      )}

      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const isSelected = value.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`색상 ${color}`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex items-center justify-center rounded-full transition-transform",
                swatchSize,
                "ring-offset-2 focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected && "ring-2 ring-offset-2"
              )}
              style={{
                backgroundColor: color,
                outlineColor: isSelected ? color : undefined,
              }}
            >
              {isSelected && (
                <Check
                  size={checkSize}
                  strokeWidth={3}
                  className="text-white drop-shadow"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 현재 선택 색상 미리보기 */}
      {value && (
        <div className="flex items-center gap-2 text-xs text-content-secondary">
          <span
            className="inline-block h-3 w-3 rounded-full border border-line"
            style={{ backgroundColor: value }}
          />
          <span>{value.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
