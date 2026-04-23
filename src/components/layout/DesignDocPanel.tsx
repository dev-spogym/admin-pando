import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { X, ChevronDown, FileText, Search, Loader2, Maximize2, Minimize2, ArrowUp, LayoutGrid, ListChecks } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/stores/uiStore";
import { getRouteMapping } from "@/lib/designDocMap";
import { renderMarkdown } from "@/lib/renderMarkdown";
import mermaid from "mermaid";

// Mermaid 초기화
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "inherit",
});

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
  통합운영: "bg-teal-100 text-teal-700",
  인증: "bg-gray-100 text-gray-600",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "bg-surface-tertiary text-content-secondary";
}

// ─── API 응답 타입 ──────────────────────────────────────────────────────────

interface FunctionalPayload {
  file: string;
  content: string;
  keywords: string[];
}

interface StateDoc {
  file: string;
  label: string;
  content: string;
}

interface ScreenPayload {
  folder: string;
  frontmatter: Record<string, unknown> | null;
  masterContent: string;
  states: StateDoc[];
}

interface ApiPayload {
  path: string;
  title: string;
  category: string;
  functional: FunctionalPayload | null;
  screen: ScreenPayload | null;
  error?: string;
}

// ─── 파싱된 섹션 타입 ────────────────────────────────────────────────────────

interface ParsedSection {
  id: string;
  title: string;
  content: string;
  level: number; // 2 = ##, 3 = ###
  isRelevant: boolean;
}

// ─── 마크다운 섹션 파싱 ──────────────────────────────────────────────────────

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
        (kw) => currentTitle.includes(kw) || body.slice(0, 500).includes(kw)
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

  return sections.filter((s) => s.title !== "목차");
}

// ─── 검색 하이라이트 ─────────────────────────────────────────────────────────

function highlightSearch(html: string, query: string): string {
  if (!query || query.length < 2) return html;
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

  useEffect(() => {
    if (searchQuery && searchQuery.length >= 2) {
      const matchInTitle = section.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchInContent = section.content.toLowerCase().includes(searchQuery.toLowerCase());
      if (matchInTitle || matchInContent) setOpen(true);
    }
  }, [searchQuery, section.title, section.content]);

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
      className={`border-b border-line last:border-b-0 relative ${
        section.isRelevant && !isSubSection ? "bg-primary/[0.03]" : ""
      }`}
    >
      {section.isRelevant && !isSubSection && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r" />
      )}
      <button
        className={`flex w-full items-center gap-sm text-left hover:bg-surface-secondary/70 transition-colors ${
          isSubSection ? "px-lg py-[10px] pl-[44px]" : "px-lg py-[12px]"
        }`}
        onClick={() => setOpen(!open)}
      >
        <span className={`shrink-0 transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}>
          <ChevronDown size={isSubSection ? 12 : 14} className="text-content-tertiary" />
        </span>
        <span className={`font-semibold text-content ${isSubSection ? "text-[12px]" : "text-[13px]"}`}>
          {section.title}
        </span>
        {section.isRelevant && !isSubSection && (
          <span className="ml-auto shrink-0 px-2 py-[2px] rounded-full text-[10px] font-medium bg-primary/10 text-primary">
            현재 페이지
          </span>
        )}
      </button>
      {open && (
        <div
          className={`pb-lg animate-in fade-in slide-in-from-top-1 duration-150 ${
            isSubSection ? "px-lg pl-[60px]" : "px-lg pl-[44px] pr-lg"
          }`}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
    </div>
  );
};

// ─── 메인 패널 ──────────────────────────────────────────────────────────────

type TabKey = "functional" | "screen";
type StateIdx = number; // -1 = 마스터, 0+ = states[i]

const DesignDocPanel = () => {
  const pathname = usePathname();
  const designDocMode = useUiStore((s) => s.designDocMode);
  const setDesignDocMode = useUiStore((s) => s.setDesignDocMode);

  // 패널 애니메이션
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // API 데이터
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState<ApiPayload | null>(null);
  const [error, setError] = useState("");

  // 탭 & 상태 선택
  const [activeTab, setActiveTab] = useState<TabKey>("functional");
  const [stateIdx, setStateIdx] = useState<StateIdx>(-1); // -1 = master

  // 전체보기
  const [fullscreen, setFullscreen] = useState(false);

  // 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const relevantSectionRef = useRef<HTMLDivElement | null>(null);

  // 로컬 매핑 (빠른 헤더 표시용)
  const routeMapping = useMemo(() => {
    if (!pathname) return null;
    return getRouteMapping(pathname);
  }, [pathname]);

  // 애니메이션 트리거
  useEffect(() => {
    if (designDocMode) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      setFullscreen(false);
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [designDocMode]);

  // API 로드
  useEffect(() => {
    if (!designDocMode || !pathname) return;
    setLoading(true);
    setError("");
    setSearchQuery("");
    setStateIdx(-1);

    fetch(`/api/design-doc?path=${encodeURIComponent(pathname)}`)
      .then((res) => res.json())
      .then((data: ApiPayload) => {
        setApiData(data);
        // 탭 기본값: 기능명세서 있으면 functional, 없으면 screen
        if (data.functional) setActiveTab("functional");
        else if (data.screen) setActiveTab("screen");
        if (data.error) setError(data.error);
      })
      .catch(() => setError("문서를 불러오는 데 실패했습니다."))
      .finally(() => setLoading(false));
  }, [pathname, designDocMode]);

  // 활성 콘텐츠/키워드/파일 라벨 계산
  const { activeContent, activeKeywords, activeFileLabel } = useMemo(() => {
    if (!apiData) return { activeContent: "", activeKeywords: [] as string[], activeFileLabel: "" };

    if (activeTab === "screen" && apiData.screen) {
      if (stateIdx === -1) {
        return {
          activeContent: apiData.screen.masterContent,
          activeKeywords: [],
          activeFileLabel: `화면설계서/${apiData.screen.folder}/00-기본화면.md`,
        };
      }
      const st = apiData.screen.states[stateIdx];
      if (st) {
        return {
          activeContent: st.content,
          activeKeywords: [],
          activeFileLabel: `화면설계서/${apiData.screen.folder}/${st.file}`,
        };
      }
    }

    if (apiData.functional) {
      return {
        activeContent: apiData.functional.content,
        activeKeywords: apiData.functional.keywords,
        activeFileLabel: `기능명세서/${apiData.functional.file}`,
      };
    }

    return { activeContent: "", activeKeywords: [] as string[], activeFileLabel: "" };
  }, [apiData, activeTab, stateIdx]);

  // 섹션 파싱
  const sections = useMemo(
    () => parseMarkdownSections(activeContent, activeKeywords),
    [activeContent, activeKeywords]
  );

  // 검색 필터
  const filteredSections = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  // 스크롤 프로그레스
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const progress = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
      setScrollProgress(Math.min(progress * 100, 100));
      setShowBackToTop(scrollTop > 300);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [mounted]);

  // 탭/상태 변경 시 스크롤 맨 위로
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab, stateIdx]);

  // Mermaid 렌더링
  useEffect(() => {
    if (loading || !activeContent) return;
    const timer = setTimeout(async () => {
      const containers = document.querySelectorAll(".mermaid-container[data-mermaid]");
      for (const container of containers) {
        const code = container.getAttribute("data-mermaid");
        if (!code || container.querySelector("svg")) continue;
        try {
          const id = `mermaid-render-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const { svg } = await mermaid.render(id, code);
          container.innerHTML = svg;
        } catch {
          container.innerHTML = `<pre class="text-[11px] text-content-tertiary font-mono">${code}</pre>`;
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [loading, activeContent, filteredSections]);

  // 관련 섹션 자동 스크롤
  useEffect(() => {
    if (!loading && sections.length > 0 && relevantSectionRef.current) {
      const timer = setTimeout(() => {
        relevantSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, sections]);

  // 단축키: ESC 닫기, Ctrl+F 검색
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

  // 관련 섹션 ref
  const firstRelevantFound = useRef(false);
  useEffect(() => {
    firstRelevantFound.current = false;
  }, [activeContent]);

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
    [activeContent]
  );

  if (!mounted) return null;

  const displayTitle = apiData?.title || routeMapping?.title || "화면설계서";
  const displayCategory = apiData?.category || routeMapping?.category || "";
  const hasFunctional = !!apiData?.functional;
  const hasScreen = !!apiData?.screen;
  const showTabs = hasFunctional && hasScreen;

  return (
    <>
      {/* 배경 */}
      <div
        className={`fixed inset-0 z-[60] bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setDesignDocMode(false)}
      />

      {/* 패널 */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[61] bg-surface border-l-2 border-primary shadow-2xl flex flex-col transition-all duration-200 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        } ${fullscreen ? "w-full max-w-none" : "w-[50vw] max-w-[800px] min-w-[400px]"}`}
      >
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-lg py-md border-b border-line shrink-0">
          <div className="flex items-center gap-sm min-w-0">
            <FileText size={18} className="text-primary shrink-0" />
            <h2 className="text-[15px] font-bold text-content truncate">{displayTitle}</h2>
            {displayCategory && (
              <span className={`shrink-0 px-2 py-[2px] rounded-full text-[11px] font-medium ${getCategoryColor(displayCategory)}`}>
                {displayCategory}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors"
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
                else setSearchQuery("");
              }}
              title="검색 (Ctrl+F)"
            >
              <Search size={14} />
            </button>
            <button
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                fullscreen ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-content-secondary hover:bg-surface-tertiary hover:text-content"
              }`}
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? "반으로 줄이기" : "전체보기"}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content transition-colors"
              onClick={() => setDesignDocMode(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 소스 탭 */}
        {showTabs && (
          <div className="flex border-b border-line bg-surface-secondary shrink-0">
            <button
              className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold border-b-2 transition-colors ${
                activeTab === "functional"
                  ? "border-primary text-primary bg-surface"
                  : "border-transparent text-content-tertiary hover:text-content"
              }`}
              onClick={() => setActiveTab("functional")}
            >
              <ListChecks size={13} />
              기능명세
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold border-b-2 transition-colors ${
                activeTab === "screen"
                  ? "border-primary text-primary bg-surface"
                  : "border-transparent text-content-tertiary hover:text-content"
              }`}
              onClick={() => setActiveTab("screen")}
            >
              <LayoutGrid size={13} />
              화면설계
            </button>
          </div>
        )}

        {/* 상태 서브탭 (화면설계 탭 + states 존재 시) */}
        {activeTab === "screen" && apiData?.screen && (apiData.screen.states.length > 0 || apiData.screen.masterContent) && (
          <div className="flex flex-wrap gap-1 px-lg py-2 border-b border-line bg-surface-secondary shrink-0">
            {apiData.screen.masterContent && (
              <button
                className={`px-2.5 py-[3px] text-[11px] font-medium rounded-full border transition-colors ${
                  stateIdx === -1
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-content-secondary border-line hover:border-primary/50"
                }`}
                onClick={() => setStateIdx(-1)}
              >
                기본화면
              </button>
            )}
            {apiData.screen.states.map((st, idx) => (
              <button
                key={st.file}
                className={`px-2.5 py-[3px] text-[11px] font-medium rounded-full border transition-colors ${
                  stateIdx === idx
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-content-secondary border-line hover:border-primary/50"
                }`}
                onClick={() => setStateIdx(idx)}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}

        {/* 빵크럼 */}
        {activeFileLabel && (
          <div className="px-lg py-1.5 border-b border-line bg-surface-secondary shrink-0">
            <p className="text-[11px] text-content-tertiary truncate">
              <span className="text-content-secondary">{activeFileLabel}</span>
            </p>
          </div>
        )}

        {/* 검색바 */}
        {showSearch && (
          <div className="px-lg py-2 border-b border-line bg-surface-secondary shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
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

        {/* 프로그레스바 */}
        {!loading && activeContent && (
          <div className="h-[2px] bg-surface-secondary shrink-0">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <Loader2 size={32} className="animate-spin opacity-50" />
              <p className="text-[13px]">문서 로딩 중...</p>
            </div>
          ) : error && !activeContent ? (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <FileText size={40} className="opacity-30" />
              <p className="text-[14px] font-medium">{error}</p>
              <p className="text-[12px]">
                현재 경로: <code className="bg-surface-secondary px-1.5 py-0.5 rounded text-[11px]">{pathname}</code>
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
              <p className="text-[13px]">&ldquo;{searchQuery}&rdquo;에 대한 검색 결과가 없습니다.</p>
            </div>
          ) : !activeContent && activeTab === "screen" && apiData?.screen ? (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <LayoutGrid size={40} className="opacity-30" />
              <p className="text-[14px] font-medium">이 상태 파일은 아직 내용이 없습니다.</p>
              <p className="text-[12px]">상단의 다른 상태를 선택해보세요.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-content-tertiary gap-md p-lg">
              <FileText size={40} className="opacity-30" />
              <p className="text-[14px] font-medium">
                이 페이지의 {activeTab === "screen" ? "화면설계서" : "기능명세서"}가 아직 등록되지 않았습니다.
              </p>
              <p className="text-[12px]">
                현재 경로: <code className="bg-surface-secondary px-1.5 py-0.5 rounded text-[11px]">{pathname}</code>
              </p>
            </div>
          )}
        </div>

        {/* 맨 위로 */}
        {showBackToTop && (
          <button
            className="absolute bottom-16 right-6 z-10 w-9 h-9 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-dark active:scale-95 transition-all animate-in fade-in zoom-in-75 duration-200"
            onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            title="맨 위로"
          >
            <ArrowUp size={16} />
          </button>
        )}

        {/* 하단 */}
        <div className="border-t border-line px-lg py-sm shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-content-tertiary">
              FitGenie CRM {activeTab === "screen" ? "화면설계서" : "기능명세서"}
              {activeFileLabel && <span className="ml-1 text-content-quaternary">· {activeFileLabel.split("/").pop()}</span>}
            </p>
            {sections.length > 0 && (
              <p className="text-[10px] text-content-quaternary">
                {filteredSections.length}개 섹션 · {Math.round(scrollProgress)}%
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DesignDocPanel;
