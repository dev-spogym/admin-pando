import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  /**
   * 그리드 열 수 (기본값: 2)
   */
  columns?: 1 | 2;
  /**
   * 접기/펼치기 가능 여부
   */
  collapsible?: boolean;
  /**
   * 초기 상태 (열림/닫힘)
   */
  defaultOpen?: boolean;
  /**
   * 외부 스타일 주입용
   */
  className?: string;
}

/**
 * FormSection - 폼 입력 영역의 섹션 래퍼.
 * 디자인 시스템의 Card UI 가이드를 준수합니다.
 */
export default function FormSection({
  title,
  description,
  children,
  columns = 2,
  collapsible = false,
  defaultOpen = true,
  className,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-card-normal border-[1px] border-7 bg-3 p-lg shadow-card-soft", className)} >
      <div
        className={cn(
          "flex items-center justify-between",
          collapsible && "cursor-pointer select-none"
        )} onClick={() => collapsible && setOpen(!open)}>
        <div className="flex-1" >
          <h3 className="text-Section-Title text-4 leading-[1.4] font-semibold" >{title}</h3>
          {description && (
            <p className="mt-xs text-Body-Primary-KR text-5 leading-[1.5]" >
              {description}
            </p>
          )}
        </div>
        {collapsible && (
          <div className="text-5 transition-transform duration-200 ml-md" >
            {open ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
          </div>
        )}
      </div>
      
      {open && (
        <div 
          className={cn(
            "mt-md grid gap-md",
            columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )} >
          {children}
        </div>
      )}
    </div>
  );
}
