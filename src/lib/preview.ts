import { useAuthStore } from "@/stores/authStore";

type SearchParamsLike = {
  get(name: string): string | null;
} | null | undefined;

function readWindowSearchParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

export function isPreviewMode(searchParams?: SearchParamsLike): boolean {
  const value = searchParams?.get("preview");
  if (value !== undefined && value !== null) {
    return value === "1";
  }

  return readWindowSearchParams().get("preview") === "1";
}

export function getPreviewScenario(searchParams?: SearchParamsLike, fallback = "default"): string {
  const value = searchParams?.get("scenario");
  if (value) return value;

  return readWindowSearchParams().get("scenario") || fallback;
}

export function getPreviewQuerySnapshot(): Record<string, string> {
  const params = readWindowSearchParams();
  const result: Record<string, string> = {};

  const preview = params.get("preview");
  const scenario = params.get("scenario");

  if (preview) result.preview = preview;
  if (scenario) result.scenario = scenario;

  return result;
}

export function buildPreviewAwarePath(path: string, params?: Record<string, string | number>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    query.set(key, String(value));
  }

  const previewQuery = getPreviewQuerySnapshot();
  for (const [key, value] of Object.entries(previewQuery)) {
    if (!query.has(key)) query.set(key, value);
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function ensurePreviewSession() {
  if (typeof window === "undefined") return;

  const store = useAuthStore.getState();
  if (store.isAuthenticated) {
    if (!localStorage.getItem("branchId")) localStorage.setItem("branchId", "1");
    if (!localStorage.getItem("tenantId")) localStorage.setItem("tenantId", "1");
    return;
  }

  store.login(
    {
      id: "preview-user",
      name: "퍼블리싱 매니저",
      email: "preview@fitgenie.local",
      role: "manager",
      branchId: "1",
      branchName: "FitGenie Preview Center",
      tenantId: "1",
      isSuperAdmin: false,
      currentBranchId: "1",
    },
    "preview-token"
  );
}
