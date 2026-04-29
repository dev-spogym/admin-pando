'use client';

import Link from "next/link";
import { ArrowRight, FolderKanban, LayoutGrid, MonitorPlay, PanelsTopLeft } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import Card from "@/components/ui/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  PUBLISHING_CATEGORIES,
  PUBLISHING_SCREENS,
  getPublishingCountsByKind,
  getPublishingScreensByCategory,
} from "@/lib/publishingCatalog";

export default function PublishingOverview() {
  const totalCounts = getPublishingCountsByKind(PUBLISHING_SCREENS);

  return (
    <AppLayout>
      <PageHeader
        title="퍼블리싱 갤러리"
        description="실제 운영 라우트를 그대로 preview 모드로 묶은 갤러리입니다. 복제용 목업이 아니라 현재 페이지를 그대로 보여주기 때문에 개발자가 화면 구조와 상태를 확인하기 쉽습니다."
        actions={
          <>
            <Link
              href="/publishing-guide"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-line/80 bg-white/72 px-md text-[13px] font-semibold text-content shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:border-primary/35 hover:bg-white"
            >
              공통 가이드
            </Link>
            <Link
              href={`/publishing/${PUBLISHING_CATEGORIES[0].slug}`}
              className="inline-flex h-10 items-center justify-center gap-xs rounded-2xl bg-gradient-to-r from-primary to-[#ff907f] px-md text-[13px] font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-float"
            >
              첫 카테고리 열기
              <ArrowRight size={15} />
            </Link>
          </>
        }
      >
        <StatCardGrid cols={4}>
          <StatCard label="전체 퍼블리싱 화면" value={`${PUBLISHING_SCREENS.length}장`} icon={<LayoutGrid />} description="현재 운영 라우트 기준" />
          <StatCard label="도메인 묶음" value={`${PUBLISHING_CATEGORIES.length}개`} icon={<FolderKanban />} variant="mint" description="카테고리별 탐색" />
          <StatCard label="대시보드 / 목록" value={`${totalCounts.dashboard + totalCounts.list}장`} icon={<PanelsTopLeft />} variant="peach" description="운영 화면 중심" />
          <StatCard label="입력 / 상세" value={`${totalCounts.form + totalCounts.detail + totalCounts.entry}장`} icon={<MonitorPlay />} description="등록, 수정, 확인 흐름" />
        </StatCardGrid>
      </PageHeader>

      <div className="grid gap-lg lg:grid-cols-2 xl:grid-cols-3">
        {PUBLISHING_CATEGORIES.map((category) => {
          const screens = getPublishingScreensByCategory(category.slug);
          const counts = getPublishingCountsByKind(screens);

          return (
            <Link key={category.slug} href={`/publishing/${category.slug}`} className="block">
              <Card
                variant="elevated"
                padding="lg"
                className="group h-full overflow-hidden border-primary/5 transition-all hover:-translate-y-[3px] hover:border-primary/30"
              >
                <div className={`mb-md rounded-[22px] bg-gradient-to-br ${category.gradient} p-lg`}>
                  <div className="mb-sm flex items-center justify-between">
                    <StatusBadge variant="peach">{category.label}</StatusBadge>
                    <span className="text-[12px] font-semibold text-content-secondary">{screens.length}장</span>
                  </div>
                  <h3 className="text-[22px] font-bold text-content">{category.label} Publishing</h3>
                  <p className="mt-xs text-[13px] leading-6 text-content-secondary">{category.description}</p>
                </div>

                <div className="mb-md grid grid-cols-3 gap-sm">
                  <div className="app-panel-muted rounded-[18px] px-md py-md">
                    <p className="text-[11px] font-semibold text-content-tertiary">대시보드</p>
                    <p className="mt-[2px] text-[18px] font-bold text-content">{counts.dashboard}</p>
                  </div>
                  <div className="app-panel-muted rounded-[18px] px-md py-md">
                    <p className="text-[11px] font-semibold text-content-tertiary">목록/운영</p>
                    <p className="mt-[2px] text-[18px] font-bold text-content">{counts.list}</p>
                  </div>
                  <div className="app-panel-muted rounded-[18px] px-md py-md">
                    <p className="text-[11px] font-semibold text-content-tertiary">입력/상세</p>
                    <p className="mt-[2px] text-[18px] font-bold text-content">{counts.form + counts.detail + counts.entry}</p>
                  </div>
                </div>

                <div className="space-y-sm">
                  {screens.slice(0, 4).map((screen) => (
                    <div key={screen.route} className="flex items-start justify-between rounded-[18px] border border-line/70 bg-white/72 px-md py-md">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-content">{screen.title}</p>
                        <p className="mt-[3px] truncate font-mono text-[11px] text-content-tertiary">{screen.route}</p>
                      </div>
                      <StatusBadge variant="secondary">{screen.kind}</StatusBadge>
                    </div>
                  ))}
                </div>

                <div className="mt-md flex items-center justify-between text-[13px] font-semibold text-primary">
                  <span>카테고리 열기</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}
