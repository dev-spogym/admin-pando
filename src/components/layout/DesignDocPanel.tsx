import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { X, ChevronDown, ChevronRight, FileText, Search, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/stores/uiStore";
import { getRouteMapping } from "@/lib/designDocMap";
import { renderMarkdown } from "@/lib/renderMarkdown";

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

// ─── 파싱된 섹션 타입 ────────────────────────────────────────────────────────

interface ParsedSection {
  id: string;
  title: string;
  content: string;
  level: number; // 2 = ##, 3 = ###, etc.
  isRelevant: boolean;
}

// ─── 마크다운을 ## 기준으로 섹션 파싱 ─────────────────────────────────────────

function parseMarkdownSections(
  content: string,
  keywords: string[]
): ParsedSection[] {
  if (!content) return [];

  const lines = content.split("\n");
  const sections: ParsedSection[] = [];
  let currentTitle = "";
  let currentLevel = 0;
  let currentLines: string[] = [];
  let sectionIdx = 0;

  const flushSection = () => {
    if (currentTitle) {
      const body = currentLines.join("\n").trim();
      const isRelevant = keywords.some(
        (kw) =>
          currentTitle.includes(kw) || body.slice(0, 500).includes(kw)
      );
      sections.push({
        id: `section-${sectionIdx++}`,
        title: currentTitle,
        content: body,
        level: currentLevel,
        isRelevant,
      });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // ## 또는 ### 헤딩 감지
    const h2Match = trimmed.match(/^## (.+)$/);
    const h3Match = trimmed.match(/^### (.+)$/);

    if (h2Match) {
      flushSection();
      currentTitle = h2Match[1].trim();
      currentLevel = 2;
      currentLines = [];
    } else if (h3Match) {
      flushSection();
      currentTitle = h3Match[1].trim();
      currentLevel = 3;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flushSection();

  // "목차" 섹션은 제외
  return sections.filter((s) => s.title !== "목차");
}

// ─── 검색 하이라이트 ─────────────────────────────────────────────────────────

function highlightSearch(html: string, query: string): string {
  if (!query || query.length < 2) return html;
  // HTML 태그 내부는 건너뛰고 텍스트만 하이라이트
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?![^<]*>)(${escaped})`, "gi");
  return html.replace(
    regex,
    '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">$1</mark>'
  );
}

// ─── 아코디언 섹션 ──────────────────────────────────────────────────────────

interface AccordionSectionProps {
  section: ParsedSection;
  defaultOpen: boolean;
  searchQuery: string;
  sectionRef?: React.RefCallback<HTMLDivElement>;
}

const AccordionSection = ({
  section,
  defaultOpen,
  searchQuery,
  sectionRef,
}: AccordionSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  // 검색어가 있고 이 섹션에 매치되면 자동으로 열기
  useEffect(() => {
    if (searchQuery && searchQuery.length >= 2) {
      const matchInTitle = section.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchInContent = section.content
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (matchInTitle || matchInContent) {
        setOpen(true);
      }
    }
  }, [searchQuery, section.title, section.content]);

  // defaultOpen 변경 시 반영
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const isSubSection = section.level >= 3;
  const renderedHtml = useMemo(() => {
    const html = renderMarkdown(section.content);
    return highlightSearch(html, searchQuery);
  }, [section.content, searchQuery]);

  return (
    <div
      ref={sectionRef}
      className={`border-b border-line last:border-b-0 ${
        section.isRelevant && !isSubSection
          ? "bg-primary/[0.03]"
          : ""
      }`}
    >
      <button
        className={`flex w-full items-center gap-sm text-left hover:bg-surface-secondary transition-colors ${
          isSubSection
            ? "px-lg py-[8px] pl-[44px]"
            : "px-lg py-[10px]"
        }`}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown
            size={isSubSection ? 12 : 14}
            className="text-content-tertiary shrink-0"
          />
        ) : (
          <ChevronRight
            size={isSubSection ? 12 : 14}
            className="text-content-tertiary shrink-0"
          />
        )}
        <span
          className={`font-semibold text-content ${
            isSubSection ? "text-[12px]" : "text-[13px]"
          }`}
        >
          {section.title}
        </span>
        {section.isRelevant && !isSubSection && (
          <span className="ml-auto shrink-0 px-1.5 py-[1px] rounded text-[10px] font-medium bg-primary/10 text-primary">
            현재 페이지
          </span>
        )}
      </button>
      {open && (
        <div
          className={`pb-md ${
            isSubSection ? "px-lg pl-[60px]" : "px-lg pl-[44px]"
          }`}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
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

  // API 데이터 상태
  const [loading, setLoading] = useState(false);
  const [docContent, setDocContent] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState("");
  const [docCategory, setDocCategory] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState("");

  // 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const relevantSectionRef = useRef<HTMLDivElement | null>(null);

  // 로컬 매핑 정보 (빠른 타이틀/카테고리 표시용)
  const routeMapping = useMemo(() => {
    if (!pathname) return null;
    return getRouteMapping(pathname);
  }, [pathname]);

  useEffect(() => {
    if (designDocMode) {
      setMounted(true);
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

  // API에서 기능명세서 로드
  useEffect(() => {
    if (!designDocMode || !pathname) return;
    setLoading(true);
    setError("");
    setSearchQuery("");

    fetch(`/api/design-doc?path=${encodeURIComponent(pathname)}`)
      .then((res) => res.json())
      .then((data) => {
        setDocContent(data.content || "");
        setDocTitle(data.title || pathname);
        setDocFile(data.file || "");
        setDocCategory(data.category || "");
        setKeywords(data.keywords || []);
        if (data.error) {
          setError(data.error);
        }
      })
      .catch(() => {
        setError("기능명세서를 불러오는 데 실패했습니다.");
      })
      .finally(() => setLoading(false));
  }, [pathname, designDocMode]);

  // 마크다운을 섹션으로 파싱
  const sections = useMemo(() => {
    if (!docContent) return [];
    return parseMarkdownSections(docContent, keywords);
  }, [docContent, keywords]);

  // 검색 필터링
  const filteredSections = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  // 관련 섹션으로 자동 스크롤
  useEffect(() => {
    if (!loading && sections.length > 0 && relevantSectionRef.current) {
      const timer = setTimeout(() => {
        relevantSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, sections]);

  // ESC 키로 닫기, Ctrl+F로 검색
  useEffect(() => {
    if (!designDocMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery("");
        } else {
          setDesignDocMode(false);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && designDocMode) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [designDocMode, setDesignDocMode, showSearch]);

  // 첫 번째 관련 섹션의 ref 콜백
  const firstRelevantFound = useRef(false);
  useEffect(() => {
    firstRelevantFound.current = false;
  }, [docContent]);

  const getRelevantRef = useCallback(
    (section: ParsedSection): React.RefCallback<HTMLDivElement> | undefined => {
      if (section.isRelevant && section.level === 2 && !firstRelevantFound.current) {
        firstRelevantFound.current = true;
        return (el) => {
          relevantSectionRef.current = el;
        };
      }
      return undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docContent]
  );

  if (!mounted) return null;

  const displayTitle = docTitle || routeMapping?.title || "화면설계서";
  const displayCategory = docCategory || routeMapping?.category || "";

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
              {displayTitle}
            </h2>
            {displayCategory && (
              <span
                className={`shrink-0 px-2 py-[2px] rounded-full text-[11px] font-medium ${getCategoryColor(
                  displayCategory
                )}`}
              >
                {displayCategory}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors"
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) {
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                } else {
                  setSearchQuery("");
                }
              }}
              title="검색 (Ctrl+F)"
            >
              <Search size={14} />
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors"
              onClick={() => setDesignDocMode(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 빵크럼 */}
        {docFile && (
          <div className="px-lg py-1.5 border-b border-line bg-surface-secondary shrink-0">
            <p className="text-[11px] text-content-tertiary truncate">
              <span className="text-content-secondary">{docFile}</span>
              {docTitle && (
                <>
                  <span className="mx-1">&gt;</span>
                  <span className="text-content-secondary font-medium">
                    {docTitle}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {/* 검색바 */}
        {showSearch && (
          <div className="px-lg py-2 border-b border-line bg-surface-secondary shrink-0">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-tertiary"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="섹션 내 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-line rounded-md bg-surface focus:outline-none focus:border-primary text-content placeholder:text-content-tertiary"
              />
              {searchQuery && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-content-tertiary">
                  {filteredSections.length}건
                </span>
              )}
            </div>
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <Loader2 size={32} className="animate-spin opacity-50" />
              <p className="text-[13px]">기능명세서 로딩 중...</p>
            </div>
          ) : error && !docContent ? (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <FileText size={40} className="opacity-30" />
              <p className="text-[14px] font-medium">{error}</p>
              <p className="text-[12px]">
                현재 경로:{" "}
                <code className="bg-surface-secondary px-1.5 py-0.5 rounded text-[11px]">
                  {pathname}
                </code>
              </p>
            </div>
          ) : filteredSections.length > 0 ? (
            <div className="divide-y divide-line">
              {filteredSections.map((section) => (
                <AccordionSection
                  key={section.id}
                  section={section}
                  defaultOpen={section.isRelevant || (section.level === 2 && sections.indexOf(section) < 2)}
                  searchQuery={searchQuery}
                  sectionRef={getRelevantRef(section)}
                />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <Search size={32} className="opacity-30" />
              <p className="text-[13px]">
                &ldquo;{searchQuery}&rdquo;에 대한 검색 결과가 없습니다.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <FileText size={40} className="opacity-30" />
              <p className="text-[14px] font-medium">
                이 페이지의 화면설계서가 아직 등록되지 않았습니다.
              </p>
              <p className="text-[12px]">
                현재 경로:{" "}
                <code className="bg-surface-secondary px-1.5 py-0.5 rounded text-[11px]">
                  {pathname}
                </code>
              </p>
            </div>
          )}
        </div>

        {/* 하단 */}
        <div className="border-t border-line px-lg py-sm shrink-0">
          <p className="text-[11px] text-content-tertiary text-center">
            FitGenie CRM 화면설계서 &middot; 기능명세서 기반 자동 생성
            {docFile && (
              <span className="ml-1 text-content-quaternary">
                ({docFile})
              </span>
            )}
          </p>
        </div>
      </div>
    </>
  );
};

export default DesignDocPanel;
