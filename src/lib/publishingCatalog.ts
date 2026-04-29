import { ROUTE_TO_DOC } from "@/lib/designDocMap";

export type PublishingCategorySlug =
  | "auth"
  | "hq"
  | "member"
  | "sales"
  | "class"
  | "facility"
  | "setting"
  | "marketing"
  | "staff"
  | "product";

export type PublishingScreenKind = "dashboard" | "list" | "form" | "detail" | "entry";

export interface PublishingCategoryMeta {
  slug: PublishingCategorySlug;
  label: string;
  description: string;
  gradient: string;
}

export interface PublishingScreen {
  route: string;
  title: string;
  category: string;
  categorySlug: PublishingCategorySlug;
  kind: PublishingScreenKind;
  functionalFile?: string;
  previewUrl: string;
  summary: string;
}

const PUBLISHING_SCENARIO_SCREENS: PublishingScreen[] = [
  {
    route: "/members?scenario=default",
    title: "회원 목록 - 기본",
    category: "회원관리",
    categorySlug: "member",
    kind: "list",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members?scenario=default"),
    summary: "회원관리 기본 목록 상태를 preview 모드로 확인합니다.",
  },
  {
    route: "/members?scenario=expired&status=EXPIRED",
    title: "회원 목록 - 만료 회원",
    category: "회원관리",
    categorySlug: "member",
    kind: "list",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members?scenario=expired&status=EXPIRED"),
    summary: "만료 상태 필터가 적용된 회원 목록 상태입니다.",
  },
  {
    route: "/members?scenario=favorites",
    title: "회원 목록 - 관심회원",
    category: "회원관리",
    categorySlug: "member",
    kind: "list",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members?scenario=favorites"),
    summary: "관심회원만 모아보는 운영 상태입니다.",
  },
  {
    route: "/members?scenario=empty",
    title: "회원 목록 - 빈 상태",
    category: "회원관리",
    categorySlug: "member",
    kind: "list",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members?scenario=empty"),
    summary: "검색/필터 결과가 비어 있는 상태를 확인합니다.",
  },
  {
    route: "/members?scenario=product&mainTab=product",
    title: "회원 목록 - 상품별 탭",
    category: "회원관리",
    categorySlug: "member",
    kind: "list",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members?scenario=product&mainTab=product"),
    summary: "상품 기준으로 회원을 묶어 보는 상태입니다.",
  },
  {
    route: "/members?scenario=pass&mainTab=pass",
    title: "회원 목록 - 이용권 탭",
    category: "회원관리",
    categorySlug: "member",
    kind: "list",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members?scenario=pass&mainTab=pass"),
    summary: "이용권 중심 테이블 상태를 확인합니다.",
  },
  {
    route: "/members/new?scenario=create",
    title: "회원 등록 - 신규 입력",
    category: "회원관리",
    categorySlug: "member",
    kind: "form",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members/new?scenario=create"),
    summary: "신규 회원 등록 기본 상태입니다.",
  },
  {
    route: "/members/edit?id=1001&scenario=edit",
    title: "회원 등록 - 수정 모드",
    category: "회원관리",
    categorySlug: "member",
    kind: "form",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members/edit?id=1001&scenario=edit"),
    summary: "기존 회원 정보를 불러온 수정 상태입니다.",
  },
  {
    route: "/members/detail?id=1001&tab=info&scenario=active",
    title: "회원 상세 - 기본 정보",
    category: "회원관리",
    categorySlug: "member",
    kind: "detail",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members/detail?id=1001&tab=info&scenario=active"),
    summary: "활성 회원의 기본 정보 탭 상태입니다.",
  },
  {
    route: "/members/detail?id=1002&tab=payment&scenario=expired",
    title: "회원 상세 - 만료/결제 탭",
    category: "회원관리",
    categorySlug: "member",
    kind: "detail",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members/detail?id=1002&tab=payment&scenario=expired"),
    summary: "만료 회원의 결제 이력 탭 상태입니다.",
  },
  {
    route: "/members/detail?id=1001&tab=body&scenario=active",
    title: "회원 상세 - 체성분 탭",
    category: "회원관리",
    categorySlug: "member",
    kind: "detail",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members/detail?id=1001&tab=body&scenario=active"),
    summary: "회원 상세 내 체성분 탭 상태입니다.",
  },
  {
    route: "/members/transfer?memberId=1001&scenario=eligible",
    title: "회원 이관 - 가능 상태",
    category: "회원관리",
    categorySlug: "member",
    kind: "form",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members/transfer?memberId=1001&scenario=eligible"),
    summary: "이관 체크리스트를 통과한 상태입니다.",
  },
  {
    route: "/members/transfer?memberId=1002&scenario=blocked",
    title: "회원 이관 - 차단 상태",
    category: "회원관리",
    categorySlug: "member",
    kind: "form",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/members/transfer?memberId=1002&scenario=blocked"),
    summary: "미납/락커 등으로 이관이 차단된 상태입니다.",
  },
  {
    route: "/body-composition?memberId=1001&scenario=default",
    title: "체성분 관리 - 추이 화면",
    category: "회원관리",
    categorySlug: "member",
    kind: "detail",
    functionalFile: "회원관리.md",
    previewUrl: buildPreviewUrl("/body-composition?memberId=1001&scenario=default"),
    summary: "체성분 추이와 목표 관리를 함께 보여주는 상태입니다.",
  },
];

const CATEGORY_META_BY_LABEL: Record<string, PublishingCategoryMeta> = {
  인증: {
    slug: "auth",
    label: "인증",
    description: "로그인과 공통 진입 흐름을 확인하는 퍼블리싱 묶음입니다.",
    gradient: "from-slate-500/15 via-slate-400/10 to-white",
  },
  본사관리: {
    slug: "hq",
    label: "본사관리",
    description: "대시보드, KPI, 리포트, 지점 운영 화면을 묶은 퍼블리싱입니다.",
    gradient: "from-sky-500/20 via-cyan-400/10 to-white",
  },
  회원관리: {
    slug: "member",
    label: "회원관리",
    description: "회원 목록, 상세, 등록, 이관, 체성분 등 회원 도메인 화면입니다.",
    gradient: "from-emerald-500/18 via-teal-400/10 to-white",
  },
  매출관리: {
    slug: "sales",
    label: "매출관리",
    description: "POS, 결제, 환불, 미수금, 선수익금 관련 퍼블리싱입니다.",
    gradient: "from-amber-500/18 via-orange-400/10 to-white",
  },
  수업관리: {
    slug: "class",
    label: "수업관리",
    description: "수업 캘린더, 시간표, 템플릿, 레슨 운영 화면입니다.",
    gradient: "from-violet-500/18 via-fuchsia-400/10 to-white",
  },
  시설관리: {
    slug: "facility",
    label: "시설관리",
    description: "락커, RFID, 운동룸, 골프 타석, 운동복 관리 화면입니다.",
    gradient: "from-cyan-500/18 via-sky-400/10 to-white",
  },
  설정관리: {
    slug: "setting",
    label: "설정관리",
    description: "센터 설정, 권한, 키오스크, IoT, 구독 운영 화면입니다.",
    gradient: "from-slate-600/18 via-slate-400/10 to-white",
  },
  마케팅: {
    slug: "marketing",
    label: "마케팅",
    description: "리드, 메시지, 자동 알림, 쿠폰, 전자계약 화면입니다.",
    gradient: "from-pink-500/18 via-rose-400/10 to-white",
  },
  직원관리: {
    slug: "staff",
    label: "직원관리",
    description: "직원 목록, 등록, 퇴사, 근태, 급여 관련 퍼블리싱입니다.",
    gradient: "from-orange-500/18 via-red-400/10 to-white",
  },
  상품관리: {
    slug: "product",
    label: "상품관리",
    description: "상품 목록, 등록, 수정, 할인 설정 화면입니다.",
    gradient: "from-lime-500/18 via-emerald-400/10 to-white",
  },
};

const CATEGORY_ORDER: PublishingCategorySlug[] = [
  "auth",
  "hq",
  "member",
  "sales",
  "class",
  "facility",
  "setting",
  "marketing",
  "staff",
  "product",
];

function buildPreviewUrl(route: string): string {
  return route.includes("?") ? `${route}&preview=1` : `${route}?preview=1`;
}

function inferKind(route: string, title: string): PublishingScreenKind {
  if (route === "/login" || title.includes("로그인")) return "entry";
  if (title.includes("대시보드") || title.includes("리포트") || title.includes("현황")) return "dashboard";
  if (
    /\/new$|\/edit$|\/payment$|\/permissions$|\/kiosk$|\/iot$|\/transfer$|\/resignation$/.test(route) ||
    /(등록|수정|설정|결제|이관|퇴사)/.test(title)
  ) {
    return "form";
  }
  if (/detail|preview|statements/.test(route) || /(상세|명세서|프리뷰)/.test(title)) {
    return "detail";
  }
  return "list";
}

function buildSummary(title: string, category: string, kind: PublishingScreenKind): string {
  const kindLabel =
    kind === "entry" ? "진입 화면" :
    kind === "dashboard" ? "대시보드/요약 화면" :
    kind === "form" ? "입력/설정 화면" :
    kind === "detail" ? "상세/확인 화면" :
    "목록/운영 화면";

  return `${category} 도메인의 ${title} 실제 라우트를 ${kindLabel} 기준으로 프리뷰합니다.`;
}

export const PUBLISHING_CATEGORIES: PublishingCategoryMeta[] = CATEGORY_ORDER.map((slug) => {
  const item = Object.values(CATEGORY_META_BY_LABEL).find((category) => category.slug === slug);
  if (!item) {
    throw new Error(`Missing publishing category meta for slug: ${slug}`);
  }
  return item;
});

export const PUBLISHING_SCREENS: PublishingScreen[] = Object.entries(ROUTE_TO_DOC)
  .reduce<PublishingScreen[]>((screens, [route, config]) => {
    const categoryMeta = CATEGORY_META_BY_LABEL[config.category];
    if (!categoryMeta) return screens;

    const kind = inferKind(route, config.title);
    screens.push({
      route,
      title: config.title,
      category: config.category,
      categorySlug: categoryMeta.slug,
      kind,
      functionalFile: config.functional?.file,
      previewUrl: buildPreviewUrl(route),
      summary: buildSummary(config.title, config.category, kind),
    } satisfies PublishingScreen);

    return screens;
  }, [])
  .sort((a, b) => {
    const categoryGap = CATEGORY_ORDER.indexOf(a.categorySlug) - CATEGORY_ORDER.indexOf(b.categorySlug);
    if (categoryGap !== 0) return categoryGap;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.title.localeCompare(b.title, "ko");
  })
  .concat(PUBLISHING_SCENARIO_SCREENS)
  .sort((a, b) => {
    const categoryGap = CATEGORY_ORDER.indexOf(a.categorySlug) - CATEGORY_ORDER.indexOf(b.categorySlug);
    if (categoryGap !== 0) return categoryGap;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.title.localeCompare(b.title, "ko");
  });

export function getPublishingCategory(slug: string): PublishingCategoryMeta | null {
  return PUBLISHING_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getPublishingScreensByCategory(slug: string): PublishingScreen[] {
  return PUBLISHING_SCREENS.filter((screen) => screen.categorySlug === slug);
}

export function getPublishingCountsByKind(screens: PublishingScreen[]): Record<PublishingScreenKind, number> {
  return screens.reduce<Record<PublishingScreenKind, number>>(
    (acc, screen) => {
      acc[screen.kind] += 1;
      return acc;
    },
    {
      dashboard: 0,
      list: 0,
      form: 0,
      detail: 0,
      entry: 0,
    }
  );
}
