import React, { useCallback } from "react";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

export interface PrintLayoutProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function PrintLayout({ title, children, className }: PrintLayoutProps) {
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      {/* 화면 전용 인쇄 버튼 */}
      <div className="print:hidden flex items-center justify-between mb-md">
        <h2 className="text-Body-Primary-KR text-content font-semibold">{title}</h2>
        <Button
          variant="outline"
          size="sm"
          icon={<Printer size={14} />}
          onClick={handlePrint}
        >
          인쇄
        </Button>
      </div>

      {/* 인쇄 콘텐츠 */}
      <div
        className={cn("print-content", className)}
      >
        {/* 인쇄 시 표시될 제목 */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <hr className="mt-2 border-gray-300" />
        </div>
        {children}
      </div>

      {/* 인쇄 스타일 */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-content,
          .print-content * { visibility: visible; }
          .print-content { position: absolute; inset: 0; padding: 24px; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </>
  );
}
