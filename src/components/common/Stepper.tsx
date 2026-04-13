import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number; // 0-based
  direction?: "horizontal" | "vertical";
  className?: string;
}

export default function Stepper({
  steps,
  currentStep,
  direction = "horizontal",
  className,
}: StepperProps) {
  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={cn(
        isHorizontal
          ? "flex items-start"
          : "flex flex-col",
        className
      )}
      aria-label="진행 단계"
    >
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <React.Fragment key={idx}>
            {/* 스텝 항목 */}
            <div
              className={cn(
                "flex",
                isHorizontal
                  ? "flex-col items-center"
                  : "flex-row items-start gap-3"
              )}
            >
              {/* 아이콘 + 연결선 (vertical) */}
              <div
                className={cn(
                  isHorizontal ? "flex flex-col items-center" : "flex flex-col items-center"
                )}
              >
                {/* 스텝 원형 아이콘 */}
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : isCurrent
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-surface-secondary text-content-secondary"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* 연결선 (vertical, 마지막 제외) */}
                {!isLast && !isHorizontal && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 my-1",
                      idx < currentStep ? "bg-green-500" : "bg-line"
                    )}
                    style={{ minHeight: "24px" }}
                  />
                )}
              </div>

              {/* 레이블 영역 */}
              <div
                className={cn(
                  isHorizontal
                    ? "mt-2 flex flex-col items-center text-center min-w-0"
                    : "flex flex-col pb-6"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium leading-tight",
                    isCompleted
                      ? "text-green-600"
                      : isCurrent
                      ? "text-primary"
                      : "text-content-secondary"
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="mt-0.5 text-[11px] text-content-secondary leading-tight">
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {/* 연결선 (horizontal, 마지막 제외) */}
            {!isLast && isHorizontal && (
              <div
                className={cn(
                  "mt-4 h-0.5 flex-1 mx-1",
                  idx < currentStep ? "bg-green-500" : "bg-line"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
