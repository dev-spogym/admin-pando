import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/stores/uiStore";
import { getDesignDoc } from "@/lib/designDocMap";
import { renderMarkdown } from "@/lib/renderMarkdown";
import type { Section } from "@/lib/designDocMap";

// ─── 카테고리 배지 색상 매핑 ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  본사관리: "bg-blue-100 text-blue-700",
  회원관리: "bg-emerald-100 text-emerald-700",
  매출관리: "bg-amber-100 text-amber-700",
  수업관리: "bg-violet-100 text-violet-700",
  시설관리: "bg-cyan-100 text-cyan-700",
  설정관리: "bg-slate-100 text-slate-700",
  마케팅: "bg-pink-100 text-pink-700",
  직원관리: "bg-orange-100 text-orange-700",
  상품관리: "bg-lime-100 text-lime-700",
  인증: "bg-gray-100 text-gray-600",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "bg-surface-tertiary text-content-secondary";
}

// ─── 아코디언 섹션 ──────────────────────────────────────────────────────────

interface AccordionSectionProps {
  section: Section;
  defaultOpen: boolean;
}

const AccordionSection = ({ section, defaultOpen }: AccordionSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        className="flex w-full items-center gap-sm px-lg py-[10px] text-left hover:bg-surface-secondary transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown size={14} className="text-content-tertiary shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-content-tertiary shrink-0" />
        )}
        <span className="text-[13px] font-semibold text-content">{section.title}</span>
      </button>
      {open && (
        <div
          className="px-lg pb-md pl-[44px]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
        />
      )}
    </div>
  );
};

// ─── 메인 패널 ──────────────────────────────────────────────────────────────

const DesignDocPanel = () => {
  const pathname = usePathname();
  const designDocMode = useUiStore((s) => s.designDocMode);
  const setDesignDocMode = useUiStore((s) => s.setDesignDocMode);

  // 패널 열림/닫힘 애니메이션 상태
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (designDocMode) {
      setMounted(true);
      // 다음 프레임에서 애니메이션 시작
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [designDocMode]);

  const doc = useMemo(() => {
    if (!pathname) return null;
    return getDesignDoc(pathname);
  }, [pathname]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!designDocMode) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDesignDocMode(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [designDocMode, setDesignDocMode]);

  if (!mounted) return null;

  return (
    <>
      {/* 반투명 배경 (backdrop) */}
      <div
        className={`fixed inset-0 z-[60] bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setDesignDocMode(false)}
      />

      {/* 패널 */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[61] w-[50vw] max-w-[800px] min-w-[400px] bg-surface border-l-2 border-primary shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-lg py-md border-b border-line shrink-0">
          <div className="flex items-center gap-sm min-w-0">
            <FileText size={18} className="text-primary shrink-0" />
            <h2 className="text-[15px] font-bold text-content truncate">
              {doc?.title || "화면설계서"}
            </h2>
            {doc?.category && (
              <span
                className={`shrink-0 px-2 py-[2px] rounded-full text-[11px] font-medium ${getCategoryColor(
                  doc.category
                )}`}
              >
                {doc.category}
              </span>
            )}
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors shrink-0"
            onClick={() => setDesignDocMode(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          {doc ? (
            <div className="divide-y divide-line">
              {doc.sections.map((section, idx) => (
                <AccordionSection
                  key={section.id}
                  section={section}
                  defaultOpen={idx < 3}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <FileText size={40} className="opacity-30" />
              <p className="text-[14px] font-medium">
                이 페이지의 화면설계서가 아직 등록되지 않았습니다.
              </p>
              <p className="text-[12px]">
                현재 경로: <code className="bg-surface-secondary px-1.5 py-0.5 rounded text-[11px]">{pathname}</code>
              </p>
            </div>
          )}
        </div>

        {/* 하단 */}
        <div className="border-t border-line px-lg py-sm shrink-0">
          <p className="text-[11px] text-content-tertiary text-center">
            FitGenie CRM 화면설계서 &middot; 기능명세서 기반 자동 생성
          </p>
        </div>
      </div>
    </>
  );
};

export default DesignDocPanel;
