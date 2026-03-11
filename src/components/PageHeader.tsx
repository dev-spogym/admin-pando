import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /**
   * 브레드크럼 경로 (선택 사항)
   */
  breadcrumb?: React.ReactNode;
  /**
   * 페이지의 메인 타이틀
   */
  title: string;
  /**
   * 타이틀 하단에 표시될 보조 설명 (선택 사항)
   */
  description?: string;
  /**
   * 우측 영역에 배치될 액션 요소들 (버튼, 필터 등)
   */
  actions?: React.ReactNode;
  /**
   * 헤더 영역 하단에 배치될 추가 요소들 (탭 네비게이션 등)
   */
  children?: React.ReactNode;
  /**
   * 추가적인 스타일링을 위한 클래스명
   */
  className?: string;
}

/**
 * PageHeader 컴포넌트
 * 각 화면 상단의 제목 + 액션 버튼 영역을 정의합니다.
 */
export default function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={cn("mb-xl flex flex-col gap-2", className)} >
      {breadcrumb && (
        <div className="text-[13px] text-5 leading-1.4" >
          {breadcrumb}
        </div>
      )}
      <div className="flex items-center justify-between gap-md" >
        <div className="flex flex-col gap-1" >
          <h1 className="text-Page-Title text-4" >
            {title}
          </h1>
          {description && (
            <p className="text-Body-Primary-KR text-5" >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-sm shrink-0" >
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-4" >{children}</div>}
    </div>
  );
}
