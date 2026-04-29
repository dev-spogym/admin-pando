'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  FolderOpen,
  LayoutDashboard,
  LayoutList,
  MonitorPlay,
  Search,
  SquarePen,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import Card from "@/components/ui/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import {
  PUBLISHING_CATEGORIES,
  PublishingScreen,
  PublishingScreenKind,
  getPublishingCategory,
  getPublishingCountsByKind,
  getPublishingScreensByCategory,
} from "@/lib/publishingCatalog";

const KIND_META: Record<
  PublishingScreenKind,
  { label: string; badge: "default" | "info" | "peach" | "mint" | "secondary" }
> = {
  dashboard: { label: "대시보드", badge: "mint" },
  list: { label: "목록/운영", badge: "secondary" },
  form: { label: "입력/설정", badge: "peach" },
  detail: { label: "상세/확인", badge: "info" },
  entry: { label: "진입", badge: "default" },
};

type FilterKind = "all" | PublishingScreenKind;

interface PublishingCategoryGalleryProps {
  categorySlug: string;
}

function getScreenIcon(kind: PublishingScreenKind) {
  if (kind === "dashboard") return <LayoutDashboard />;
  if (kind === "form") return <SquarePen />;
  return <LayoutList />;
}

export default function PublishingCategoryGallery({ categorySlug }: PublishingCategoryGalleryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [filterKind, setFilterKind] = useState<FilterKind>("all");

  const category = getPublishingCategory(categorySlug);
  const screens = useMemo(() => getPublishingScreensByCategory(categorySlug), [categorySlug]);
  const counts = useMemo(() => getPublishingCountsByKind(screens), [screens]);
  const currentScreenParam = searchParams.get("screen") ?? "";
  const searchParamsValue = searchParams.toString();

  const filteredScreens = useMemo(() => {
    return screens.filter((screen) => {
      const matchesKind = filterKind === "all" || screen.kind === filterKind;
      const query = searchValue.trim().toLowerCase();
      const matchesQuery =
        !query ||
        screen.title.toLowerCase().includes(query) ||
        screen.route.toLowerCase().includes(query) ||
        screen.summary.toLowerCase().includes(query);
      return matchesKind && matchesQuery;
    });
  }, [filterKind, screens, searchValue]);

  const activeScreen = useMemo<PublishingScreen | null>(() => {
    return (
      screens.find((screen) => screen.route === currentScreenParam) ??
      filteredScreens[0] ??
      screens[0] ??
      null
    );
  }, [currentScreenParam, filteredScreens, screens]);

  useEffect(() => {
    if (!category || !activeScreen) return;
    if (currentScreenParam === activeScreen.route) return;

    const nextParams = new URLSearchParams(searchParamsValue);
    nextParams.set("screen", activeScreen.route);
    router.replace(`/publishing/${category.slug}?${nextParams.toString()}`, { scroll: false });
  }, [activeScreen, category, currentScreenParam, router, searchParamsValue]);

  if (!category) {
    return (
      <AppLayout>
        <PageHeader
          title="퍼블리싱 카테고리를 찾을 수 없습니다"
          description="존재하지 않는 카테고리입니다. 퍼블리싱 개요로 돌아가서 다시 선택해주세요."
          actions={
            <Link
              href="/publishing"
              className="inline-flex h-10 items-center justify-center gap-xs rounded-2xl bg-gradient-to-r from-primary to-[#ff907f] px-md text-[13px] font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-float"
            >
              개요로 이동
              <ArrowLeft size={15} />
            </Link>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={
          <Link href="/publishing" className="inline-flex items-center gap-xs text-content-tertiary transition-colors hover:text-content">
            <ArrowLeft size={14} />
            퍼블리싱 개요
          </Link>
        }
        title={`${category.label} Publishing Folder`}
        description="실제 운영 라우트를 그대로 iframe으로 묶은 화면입니다. 개발자는 좌측에서 페이지를 고르고, 우측에서 실제 렌더 결과를 바로 확인할 수 있습니다."
        actions={
          <>
            <Link
              href="/publishing-guide"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-line/80 bg-white/72 px-md text-[13px] font-semibold text-content shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:border-primary/35 hover:bg-white"
            >
              공통 가이드
            </Link>
            {activeScreen && (
              <Link
                href={activeScreen.route}
                target="_blank"
                className="inline-flex h-10 items-center justify-center gap-xs rounded-2xl bg-gradient-to-r from-primary to-[#ff907f] px-md text-[13px] font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-float"
              >
                실제 화면 열기
                <ExternalLink size={15} />
              </Link>
            )}
          </>
        }
      >
        <StatCardGrid cols={4}>
          <StatCard label="카테고리 화면 수" value={`${screens.length}장`} icon={<FolderOpen />} description={category.description} />
          <StatCard label="대시보드 / 목록" value={`${counts.dashboard + counts.list}장`} icon={<LayoutDashboard />} variant="mint" description="운영·조회 중심 화면" />
          <StatCard label="입력 / 설정" value={`${counts.form + counts.entry}장`} icon={<SquarePen />} variant="peach" description="등록·수정·설정 화면" />
          <StatCard label="상세 / 확인" value={`${counts.detail}장`} icon={<MonitorPlay />} description="상세 정보 확인 화면" />
        </StatCardGrid>
      </PageHeader>

      <div className="mb-lg flex flex-wrap gap-sm">
        {PUBLISHING_CATEGORIES.map((item) => (
          <Link
            key={item.slug}
            href={`/publishing/${item.slug}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors",
              item.slug === category.slug
                ? "border-primary/20 bg-primary-light text-primary"
                : "border-line/80 bg-white/72 text-content-secondary hover:border-primary/25 hover:bg-white"
            )}
          >
            {item.label}
            <span className="text-content-tertiary">{getPublishingScreensByCategory(item.slug).length}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-lg xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-md">
          <Card padding="lg" className="sticky top-4">
            <div className="space-y-md">
              <div>
                <p className="mb-xs text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Search</p>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
                  <input
                    className="app-control h-11 w-full rounded-2xl pl-10 pr-3 text-[13px] text-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="화면명, 경로 검색..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <p className="mb-sm text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Type Filter</p>
                <div className="flex flex-wrap gap-sm">
                  <button
                    className={cn(
                      "rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors",
                      filterKind === "all"
                        ? "border-primary/20 bg-primary-light text-primary"
                        : "border-line/80 bg-white/72 text-content-secondary hover:border-primary/25 hover:bg-white"
                    )}
                    onClick={() => setFilterKind("all")}
                  >
                    전체
                  </button>
                  {(Object.entries(KIND_META) as [PublishingScreenKind, { label: string; badge: "default" | "info" | "peach" | "mint" | "secondary" }][])
                    .map(([kind, meta]) => (
                      <button
                        key={kind}
                        className={cn(
                          "rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors",
                          filterKind === kind
                            ? "border-primary/20 bg-primary-light text-primary"
                            : "border-line/80 bg-white/72 text-content-secondary hover:border-primary/25 hover:bg-white"
                        )}
                        onClick={() => setFilterKind(kind)}
                      >
                        {meta.label}
                      </button>
                    ))}
                </div>
              </div>

              <div className="rounded-[20px] bg-surface-secondary/70 p-sm">
                <div className="mb-sm flex items-center justify-between px-sm pt-xs">
                  <p className="text-[12px] font-semibold text-content-secondary">화면 목록</p>
                  <p className="text-[11px] text-content-tertiary">{filteredScreens.length}장</p>
                </div>
                <div className="max-h-[920px] space-y-sm overflow-y-auto px-xs pb-xs">
                  {filteredScreens.map((screen) => {
                    const isActive = activeScreen?.route === screen.route;
                    return (
                      <button
                        key={screen.route}
                        className={cn(
                          "w-full rounded-[20px] border px-md py-md text-left transition-all",
                          isActive
                            ? "border-primary/25 bg-primary-light/70 shadow-card"
                            : "border-line/70 bg-white/82 hover:border-primary/20 hover:bg-white"
                        )}
                        onClick={() => {
                          const nextParams = new URLSearchParams(searchParamsValue);
                          nextParams.set("screen", screen.route);
                          router.replace(`/publishing/${category.slug}?${nextParams.toString()}`, { scroll: false });
                        }}
                      >
                        <div className="mb-sm flex items-start justify-between gap-sm">
                          <div className="flex min-w-0 items-start gap-sm">
                            <span className={cn(
                              "mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                              isActive
                                ? "border-primary/20 bg-white text-primary"
                                : "border-line/70 bg-surface-secondary text-content-secondary"
                            )}>
                              {getScreenIcon(screen.kind)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-content">{screen.title}</p>
                              <p className="mt-[3px] truncate font-mono text-[11px] text-content-tertiary">{screen.route}</p>
                            </div>
                          </div>
                          <StatusBadge variant={KIND_META[screen.kind].badge}>{KIND_META[screen.kind].label}</StatusBadge>
                        </div>
                        <p className="text-[12px] leading-5 text-content-secondary">{screen.summary}</p>
                      </button>
                    );
                  })}

                  {filteredScreens.length === 0 && (
                    <div className="rounded-[20px] border border-dashed border-line bg-white/72 px-md py-lg text-center">
                      <p className="text-[13px] font-semibold text-content-secondary">조건에 맞는 화면이 없습니다.</p>
                      <p className="mt-xs text-[12px] text-content-tertiary">검색어나 타입 필터를 조정해보세요.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-md">
          {activeScreen ? (
            <>
              <Card
                padding="none"
                className="overflow-hidden"
                header={(
                  <div className="flex flex-col gap-md lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-xs flex flex-wrap items-center gap-sm">
                        <StatusBadge variant="peach">{category.label}</StatusBadge>
                        <StatusBadge variant={KIND_META[activeScreen.kind].badge}>{KIND_META[activeScreen.kind].label}</StatusBadge>
                      </div>
                      <h2 className="text-[22px] font-bold text-content">{activeScreen.title}</h2>
                      <p className="mt-[4px] font-mono text-[12px] text-content-tertiary">{activeScreen.route}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-sm">
                      <Link
                        href={activeScreen.previewUrl}
                        target="_blank"
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-line/80 bg-white/72 px-md text-[13px] font-semibold text-content shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:border-primary/35 hover:bg-white"
                      >
                        preview=1 열기
                      </Link>
                      <Link
                        href={activeScreen.route}
                        target="_blank"
                        className="inline-flex h-10 items-center justify-center gap-xs rounded-2xl bg-gradient-to-r from-primary to-[#ff907f] px-md text-[13px] font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-float"
                      >
                        실제 라우트 열기
                        <ExternalLink size={15} />
                      </Link>
                    </div>
                  </div>
                )}
              >
                <div className="border-b border-line/70 bg-surface-secondary/70 px-lg py-md">
                  <div className="flex items-center gap-sm">
                    <span className="h-3 w-3 rounded-full bg-[#ff7f6e]" />
                    <span className="h-3 w-3 rounded-full bg-[#f6c54d]" />
                    <span className="h-3 w-3 rounded-full bg-[#5fd38d]" />
                    <div className="ml-sm flex h-10 flex-1 items-center rounded-2xl border border-line/80 bg-white/82 px-md font-mono text-[12px] text-content-secondary">
                      {activeScreen.previewUrl}
                    </div>
                  </div>
                </div>
                <div className="bg-[#e9eef5] p-lg">
                  <div className="overflow-hidden rounded-[28px] border border-line/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
                    <iframe
                      key={activeScreen.previewUrl}
                      src={activeScreen.previewUrl}
                      title={`${activeScreen.title} preview`}
                      className="h-[980px] w-full border-0 bg-white"
                      loading="lazy"
                    />
                  </div>
                </div>
              </Card>

              <Card padding="lg">
                <div className="grid gap-md lg:grid-cols-2">
                  <div className="app-panel-muted rounded-[20px] p-lg">
                    <p className="mb-xs text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Publishing Note</p>
                    <p className="text-[13px] leading-6 text-content-secondary">
                      {activeScreen.summary}
                    </p>
                  </div>
                  <div className="app-panel-muted rounded-[20px] p-lg">
                    <p className="mb-xs text-[12px] font-black uppercase tracking-[0.14em] text-content-tertiary">Connected Spec</p>
                    <p className="text-[13px] leading-6 text-content-secondary">
                      기능명세 기준 파일: <span className="font-semibold text-content">{activeScreen.functionalFile ?? "연결 정보 없음"}</span>
                    </p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card padding="lg">
              <p className="text-[14px] font-semibold text-content-secondary">이 카테고리에 연결된 화면이 없습니다.</p>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
