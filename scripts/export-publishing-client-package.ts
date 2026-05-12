import { chromium, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PUBLISHING_CATEGORIES,
  PUBLISHING_SCREENS,
  type PublishingScreen,
} from "../src/lib/publishingCatalog";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const BASE_URL = process.env.PUBLISHING_BASE_URL ?? "http://localhost:3000";
const generatedDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const OUT_DIR = path.resolve(
  repoRoot,
  process.env.PUBLISHING_OUT_DIR ?? `client-deliverables/publishing-qa-${generatedDate}`,
);
const START_INDEX = Number(process.env.PUBLISHING_START ?? 0);
const LIMIT = process.env.PUBLISHING_LIMIT ? Number(process.env.PUBLISHING_LIMIT) : null;

type ButtonStatus = "active" | "disabled" | "blocked";

type ButtonRecord = {
  no: number;
  selectorId: string;
  tag: string;
  label: string;
  disabled: boolean;
  status: ButtonStatus;
  actionability: "ok" | "disabled" | "fail";
  detail: string;
  rect: { x: number; y: number; width: number; height: number };
};

type ScreenReport = {
  index: number;
  title: string;
  route: string;
  previewUrl: string;
  category: string;
  categorySlug: string;
  kind: string;
  summary: string;
  loadStatus: string;
  finalUrl: string;
  screenshot: string;
  buttonCount: number;
  activeCount: number;
  disabledCount: number;
  blockedCount: number;
  consoleErrors: string[];
  buttons: ButtonRecord[];
};

type GalleryReport = {
  label: string;
  route: string;
  screenshot: string;
  loadStatus: string;
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function toPosix(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function relativeOut(filePath: string) {
  return toPosix(path.relative(OUT_DIR, filePath));
}

function sanitizeFilePart(input: string) {
  const normalized = input
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return normalized || "screen";
}

function htmlEscape(input: string | number | null | undefined) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvCell(input: string | number | boolean) {
  const value = String(input).replace(/"/g, '""');
  return `"${value}"`;
}

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: "publishing-client-review",
      name: "퍼블리싱검수관리자",
      email: "publishing-review@example.com",
      role: "ADMIN",
      branchId: "1",
      branchName: "전체 지점 (통합)",
      tenantId: "1",
      isSuperAdmin: true,
      currentBranchId: null,
    };
    localStorage.setItem("auth_token", "mock-publishing-client-review");
    localStorage.setItem("auth_user", JSON.stringify(user));
    localStorage.setItem("branchId", "1");
    localStorage.setItem("tenantId", "1");
  });
}

async function collectButtons(page: Page): Promise<ButtonRecord[]> {
  return page.evaluate(() => {
    const selector =
      'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"]';
    return Array.from(document.querySelectorAll(selector))
      .map((el, index) => {
        const html = el as HTMLElement;
        if (html.closest("[data-publishing-button-overlay]")) return null;
        if (html.getAttribute("data-close-button") === "true") return null;

        const input = el as HTMLInputElement;
        const rect = html.getBoundingClientRect();
        const style = window.getComputedStyle(html);
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity || "1") > 0.01;
        if (!visible) return null;

        const selectorId = `btn-${index}`;
        html.setAttribute("data-publishing-button-id", selectorId);
        const label =
          (html.innerText || input.value || html.getAttribute("aria-label") || html.getAttribute("title") || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120) || `${el.tagName.toLowerCase()}#${index + 1}`;
        const disabled = Boolean(
          input.disabled ||
            html.getAttribute("aria-disabled") === "true" ||
            html.hasAttribute("disabled") ||
            style.pointerEvents === "none",
        );

        return {
          no: index + 1,
          selectorId,
          tag: el.tagName.toLowerCase(),
          label,
          disabled,
          status: disabled ? "disabled" : "active",
          actionability: disabled ? "disabled" : "ok",
          detail: "",
          rect: {
            x: Math.round(rect.x + window.scrollX),
            y: Math.round(rect.y + window.scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      })
      .filter(Boolean) as ButtonRecord[];
  });
}

async function verifyButtons(page: Page, buttons: ButtonRecord[]): Promise<ButtonRecord[]> {
  const verified: ButtonRecord[] = [];

  for (const button of buttons) {
    if (button.disabled) {
      verified.push({
        ...button,
        status: "disabled",
        actionability: "disabled",
        detail: "비활성 상태",
      });
      continue;
    }

    try {
      await page.locator(`[data-publishing-button-id="${button.selectorId}"]`).click({
        trial: true,
        timeout: 1500,
      });
      verified.push({
        ...button,
        status: "active",
        actionability: "ok",
        detail: "클릭 가능",
      });
    } catch (error) {
      const detail = String(error instanceof Error ? error.message : error).split("\n")[0].slice(0, 240);
      verified.push({
        ...button,
        status: "blocked",
        actionability: "fail",
        detail,
      });
    }
  }

  return verified;
}

async function injectButtonOverlay(page: Page, buttons: ButtonRecord[]) {
  await page.evaluate((items) => {
    document.querySelectorAll("[data-publishing-button-overlay]").forEach((node) => node.remove());

    const style = document.createElement("style");
    style.setAttribute("data-publishing-button-overlay", "style");
    style.textContent = `
      [data-publishing-button-overlay] {
        box-sizing: border-box;
        pointer-events: none;
        position: absolute;
        z-index: 2147483647;
        font-family: Arial, sans-serif;
      }
      .publishing-button-box {
        border-radius: 8px;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 4px var(--marker-color);
      }
      .publishing-button-chip {
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        border-radius: 999px;
        background: var(--marker-color);
        color: white;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        transform: translate(-7px, -9px);
        box-shadow: 0 2px 8px rgba(15,23,42,0.24);
      }
    `;
    document.head.appendChild(style);

    for (const item of items) {
      const color =
        item.status === "active" ? "#16a34a" : item.status === "disabled" ? "#64748b" : "#dc2626";
      const box = document.createElement("div");
      box.setAttribute("data-publishing-button-overlay", "box");
      box.className = "publishing-button-box";
      box.style.setProperty("--marker-color", color);
      box.style.left = `${item.rect.x}px`;
      box.style.top = `${item.rect.y}px`;
      box.style.width = `${item.rect.width}px`;
      box.style.height = `${item.rect.height}px`;

      const chip = document.createElement("span");
      chip.className = "publishing-button-chip";
      chip.textContent = String(item.no);
      box.appendChild(chip);
      document.body.appendChild(box);
    }
  }, buttons);
}

async function capturePage(page: Page, route: string, screenshotPath: string) {
  let loadStatus = "ok";
  try {
    const response = await page.goto(`${BASE_URL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 40_000,
    });
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
    await page.waitForTimeout(100);
    if (response && response.status() >= 400) {
      loadStatus = `http ${response.status()}`;
    }
  } catch (error) {
    loadStatus = `load-failed: ${String(error instanceof Error ? error.message : error).slice(0, 180)}`;
  }

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });

  return loadStatus;
}

async function captureGalleryPages(page: Page, galleryDir: string): Promise<GalleryReport[]> {
  const pages = [
    { label: "퍼블리싱 개요", route: "/publishing" },
    ...PUBLISHING_CATEGORIES.map((category) => ({
      label: `${category.label} Publishing Folder`,
      route: `/publishing/${category.slug}`,
    })),
  ];

  const reports: GalleryReport[] = [];
  for (let index = 0; index < pages.length; index += 1) {
    const item = pages[index];
    const screenshotPath = path.join(galleryDir, `${String(index + 1).padStart(2, "0")}-${item.route.replace(/[/?=&]+/g, "-").replace(/^-+|-+$/g, "")}.png`);
    const loadStatus = await capturePage(page, item.route, screenshotPath);
    reports.push({
      label: item.label,
      route: item.route,
      screenshot: relativeOut(screenshotPath),
      loadStatus,
    });
    console.log(`[gallery ${index + 1}/${pages.length}] ${item.route} ${loadStatus}`);
  }
  return reports;
}

async function capturePublishingScreen(
  page: Page,
  screen: PublishingScreen,
  index: number,
  screensDir: string,
): Promise<ScreenReport> {
  const consoleErrors: string[] = [];
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text().slice(0, 500));
    }
  };
  const onPageError = (error: Error) => {
    consoleErrors.push(error.message.slice(0, 500));
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  let loadStatus = "ok";
  let finalUrl = "";
  let buttons: ButtonRecord[] = [];
  const fileBase = `${String(index + 1).padStart(3, "0")}-${screen.categorySlug}-${sanitizeFilePart(screen.route)}`;
  const screenshotPath = path.join(screensDir, `${fileBase}.png`);

  try {
    const response = await page.goto(`${BASE_URL}${screen.previewUrl}`, {
      waitUntil: "domcontentloaded",
      timeout: 40_000,
    });
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
    await page.waitForTimeout(100);
    finalUrl = page.url();
    if (response && response.status() >= 400) {
      loadStatus = `http ${response.status()}`;
    }
    buttons = await collectButtons(page);
    buttons = await verifyButtons(page, buttons);

    await page.goto(`${BASE_URL}${screen.previewUrl}`, {
      waitUntil: "domcontentloaded",
      timeout: 40_000,
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
    await page.waitForTimeout(100);
    const freshButtons = await collectButtons(page);
    const statusByNo = new Map(buttons.map((button) => [button.no, button]));
    const screenshotButtons = freshButtons.map((button) => {
      const verified = statusByNo.get(button.no);
      return verified
        ? {
            ...button,
            status: verified.status,
            actionability: verified.actionability,
            detail: verified.detail,
          }
        : button;
    });
    await injectButtonOverlay(page, screenshotButtons);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });
  } catch (error) {
    loadStatus = `load-failed: ${String(error instanceof Error ? error.message : error).slice(0, 180)}`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    }).catch(() => undefined);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }

  const activeCount = buttons.filter((button) => button.status === "active").length;
  const disabledCount = buttons.filter((button) => button.status === "disabled").length;
  const blockedCount = buttons.filter((button) => button.status === "blocked").length;

  return {
    index: index + 1,
    title: screen.title,
    route: screen.route,
    previewUrl: screen.previewUrl,
    category: screen.category,
    categorySlug: screen.categorySlug,
    kind: screen.kind,
    summary: screen.summary,
    loadStatus,
    finalUrl,
    screenshot: relativeOut(screenshotPath),
    buttonCount: buttons.length,
    activeCount,
    disabledCount,
    blockedCount,
    consoleErrors: Array.from(new Set(consoleErrors)),
    buttons,
  };
}

function statusBadge(status: ButtonStatus) {
  const label = status === "active" ? "클릭 가능" : status === "disabled" ? "비활성" : "확인 필요";
  return `<span class="badge ${status}">${label}</span>`;
}

function writeCsv(reports: ScreenReport[]) {
  const rows = [
    [
      "screenIndex",
      "category",
      "title",
      "route",
      "buttonNo",
      "label",
      "tag",
      "status",
      "actionability",
      "detail",
      "screenshot",
    ].map(csvCell).join(","),
  ];

  for (const report of reports) {
    for (const button of report.buttons) {
      rows.push(
        [
          report.index,
          report.category,
          report.title,
          report.route,
          button.no,
          button.label,
          button.tag,
          button.status,
          button.actionability,
          button.detail,
          report.screenshot,
        ].map(csvCell).join(","),
      );
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "button-status.csv"), rows.join("\n"), "utf-8");
}

function writeReadme(summary: {
  generatedAt: string;
  screenCount: number;
  categoryCount: number;
  buttonCount: number;
  activeCount: number;
  disabledCount: number;
  blockedCount: number;
  warningCount: number;
}) {
  const md = `# 퍼블리싱 클라이언트 검수 패키지

- 생성 시각: ${summary.generatedAt}
- 퍼블리싱 카테고리: ${summary.categoryCount}개
- 검수 화면: ${summary.screenCount}개
- 버튼/링크성 컨트롤: ${summary.buttonCount}개
- 클릭 가능: ${summary.activeCount}개
- 비활성: ${summary.disabledCount}개
- 확인 필요: ${summary.blockedCount}개
- 콘솔 경고/오류: ${summary.warningCount}건

## 파일 구성

- \`index.html\`: 클라이언트 공유용 요약 리포트
- \`publishing-report.json\`: 전체 검수 원본 데이터
- \`button-status.csv\`: 버튼별 상태표
- \`screenshots/gallery/\`: 퍼블리싱 갤러리 화면
- \`screenshots/screens/\`: 각 실제 화면에 버튼 번호를 표시한 스크린샷

## 버튼 표시 기준

- 초록색: 클릭 가능한 상태
- 회색: 비활성 상태
- 빨간색: 화면상 존재하지만 Playwright actionability 기준으로 클릭 확인이 필요한 상태

이 패키지는 실제 클릭 실행이 아니라, 클라이언트에게 퍼블리싱 화면과 버튼 상태를 보여주기 위한 시각 검수 자료입니다.
`;
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), md, "utf-8");
}

function writeHtml(galleries: GalleryReport[], reports: ScreenReport[]) {
  const generatedAt = new Date().toISOString();
  const buttonCount = reports.reduce((sum, report) => sum + report.buttonCount, 0);
  const activeCount = reports.reduce((sum, report) => sum + report.activeCount, 0);
  const disabledCount = reports.reduce((sum, report) => sum + report.disabledCount, 0);
  const blockedCount = reports.reduce((sum, report) => sum + report.blockedCount, 0);
  const warningCount = reports.reduce((sum, report) => sum + report.consoleErrors.length, 0);

  const categoryRows = PUBLISHING_CATEGORIES.map((category) => {
    const items = reports.filter((report) => report.categorySlug === category.slug);
    const buttons = items.reduce((sum, report) => sum + report.buttonCount, 0);
    const blocked = items.reduce((sum, report) => sum + report.blockedCount, 0);
    return `<tr>
      <td>${htmlEscape(category.label)}</td>
      <td>${items.length}</td>
      <td>${buttons}</td>
      <td>${items.reduce((sum, report) => sum + report.activeCount, 0)}</td>
      <td>${items.reduce((sum, report) => sum + report.disabledCount, 0)}</td>
      <td>${blocked}</td>
    </tr>`;
  }).join("\n");

  const galleryCards = galleries.map((gallery) => `
    <article class="gallery-card">
      <a href="${htmlEscape(gallery.screenshot)}" target="_blank">
        <img src="${htmlEscape(gallery.screenshot)}" alt="${htmlEscape(gallery.label)}" loading="lazy" />
      </a>
      <div>
        <h3>${htmlEscape(gallery.label)}</h3>
        <p><code>${htmlEscape(gallery.route)}</code></p>
        <p class="muted">load: ${htmlEscape(gallery.loadStatus)}</p>
      </div>
    </article>
  `).join("\n");

  const screenSections = reports.map((report) => {
    const issueHtml = report.consoleErrors.length
      ? `<div class="issue"><strong>콘솔 경고</strong><ul>${report.consoleErrors
          .map((error) => `<li>${htmlEscape(error)}</li>`)
          .join("")}</ul></div>`
      : "";
    const buttonRows = report.buttons.map((button) => `
      <tr>
        <td>${button.no}</td>
        <td>${htmlEscape(button.label)}</td>
        <td><code>${htmlEscape(button.tag)}</code></td>
        <td>${statusBadge(button.status)}</td>
        <td>${htmlEscape(button.detail)}</td>
      </tr>
    `).join("\n");

    return `
      <section class="screen" id="screen-${report.index}">
        <div class="screen-head">
          <div>
            <p class="eyebrow">${htmlEscape(report.category)} · ${htmlEscape(report.kind)}</p>
            <h2>${report.index}. ${htmlEscape(report.title)}</h2>
            <p><code>${htmlEscape(report.route)}</code></p>
            <p class="muted">${htmlEscape(report.summary)}</p>
          </div>
          <div class="counts">
            <span>${report.buttonCount} controls</span>
            <span>${report.activeCount} active</span>
            <span>${report.disabledCount} disabled</span>
            <span>${report.blockedCount} check</span>
          </div>
        </div>
        ${issueHtml}
        <a href="${htmlEscape(report.screenshot)}" target="_blank" class="shot-link">
          <img src="${htmlEscape(report.screenshot)}" alt="${htmlEscape(report.title)}" loading="lazy" />
        </a>
        <details>
          <summary>버튼별 상태표 보기</summary>
          <table>
            <thead>
              <tr><th>No</th><th>버튼/링크명</th><th>Tag</th><th>상태</th><th>확인 내용</th></tr>
            </thead>
            <tbody>${buttonRows || '<tr><td colspan="5">화면 내 버튼형 컨트롤 없음</td></tr>'}</tbody>
          </table>
        </details>
      </section>
    `;
  }).join("\n");

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FitGenie CRM 퍼블리싱 검수 리포트</title>
  <style>
    :root {
      --bg: #f6f7fb;
      --card: #ffffff;
      --line: #dfe4ec;
      --text: #172033;
      --muted: #667085;
      --primary: #e85d4f;
      --green: #16a34a;
      --gray: #64748b;
      --red: #dc2626;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, "Noto Sans KR", sans-serif; }
    header { padding: 40px 48px 24px; background: #fff; border-bottom: 1px solid var(--line); }
    h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
    h2 { margin: 4px 0 6px; font-size: 22px; }
    h3 { margin: 0 0 8px; font-size: 16px; }
    p { margin: 0; line-height: 1.55; }
    code { font-family: Consolas, "SFMono-Regular", monospace; font-size: 12px; color: #334155; }
    main { padding: 28px 48px 64px; }
    .muted { color: var(--muted); font-size: 13px; }
    .eyebrow { color: var(--primary); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
    .metric { padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
    .metric strong { display: block; font-size: 24px; margin-top: 6px; }
    .panel { margin-top: 24px; padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
    .gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .gallery-card { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #fff; }
    .gallery-card img { width: 100%; height: 260px; object-fit: cover; object-position: top; display: block; border-bottom: 1px solid var(--line); }
    .gallery-card div { padding: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid var(--line); padding: 10px 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; color: #475467; font-size: 12px; }
    .screen { margin-top: 24px; padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
    .screen-head { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
    .counts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; min-width: 260px; }
    .counts span { height: 28px; padding: 6px 10px; border-radius: 999px; background: #f1f5f9; font-size: 12px; font-weight: 700; color: #475467; }
    .shot-link img { width: 100%; max-height: 900px; object-fit: contain; object-position: top; border: 1px solid var(--line); border-radius: 10px; background: #eef2f7; display: block; }
    details { margin-top: 14px; }
    summary { cursor: pointer; font-weight: 800; padding: 12px 0; }
    .badge { display: inline-flex; height: 24px; align-items: center; padding: 0 9px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: 800; }
    .badge.active { background: var(--green); }
    .badge.disabled { background: var(--gray); }
    .badge.blocked { background: var(--red); }
    .issue { margin: 12px 0; padding: 12px 14px; border: 1px solid #fed7aa; background: #fff7ed; border-radius: 10px; color: #9a3412; font-size: 13px; }
    .issue ul { margin: 8px 0 0 18px; padding: 0; }
    @media (max-width: 1100px) {
      header, main { padding-left: 20px; padding-right: 20px; }
      .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .gallery { grid-template-columns: 1fr; }
      .screen-head { display: block; }
      .counts { justify-content: flex-start; margin-top: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">FitGenie CRM</p>
    <h1>퍼블리싱 클라이언트 검수 리포트</h1>
    <p class="muted">생성 시각: ${htmlEscape(generatedAt)} · 기준 URL: <code>${htmlEscape(BASE_URL)}</code></p>
    <div class="summary">
      <div class="metric">카테고리<strong>${PUBLISHING_CATEGORIES.length}</strong></div>
      <div class="metric">화면<strong>${reports.length}</strong></div>
      <div class="metric">컨트롤<strong>${buttonCount}</strong></div>
      <div class="metric">클릭 가능<strong>${activeCount}</strong></div>
      <div class="metric">비활성<strong>${disabledCount}</strong></div>
      <div class="metric">확인 필요<strong>${blockedCount}</strong></div>
    </div>
  </header>
  <main>
    <section class="panel">
      <h2>카테고리 요약</h2>
      <table>
        <thead><tr><th>카테고리</th><th>화면</th><th>컨트롤</th><th>클릭 가능</th><th>비활성</th><th>확인 필요</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </section>
    <section class="panel">
      <h2>퍼블리싱 폴더 화면</h2>
      <div class="gallery">${galleryCards}</div>
    </section>
    ${screenSections}
  </main>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf-8");

  return {
    generatedAt,
    screenCount: reports.length,
    categoryCount: PUBLISHING_CATEGORIES.length,
    buttonCount,
    activeCount,
    disabledCount,
    blockedCount,
    warningCount,
  };
}

async function main() {
  ensureDir(OUT_DIR);
  const galleryDir = path.join(OUT_DIR, "screenshots", "gallery");
  const screensDir = path.join(OUT_DIR, "screenshots", "screens");
  const dataDir = path.join(OUT_DIR, "data");
  ensureDir(galleryDir);
  ensureDir(screensDir);
  ensureDir(dataDir);

  const allScreens = PUBLISHING_SCREENS.slice(START_INDEX, LIMIT === null ? undefined : START_INDEX + LIMIT);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await seedAuth(page);

  const galleries = await captureGalleryPages(page, galleryDir);
  const reports: ScreenReport[] = [];

  for (let index = 0; index < allScreens.length; index += 1) {
    const screen = allScreens[index];
    const report = await capturePublishingScreen(page, screen, START_INDEX + index, screensDir);
    reports.push(report);
    fs.writeFileSync(
      path.join(dataDir, "publishing-report.partial.json"),
      JSON.stringify({ baseUrl: BASE_URL, outDir: OUT_DIR, galleries, screens: reports }, null, 2),
      "utf-8",
    );
    console.log(
      `[screen ${index + 1}/${allScreens.length}] ${screen.route} buttons=${report.buttonCount} blocked=${report.blockedCount} warnings=${report.consoleErrors.length}`,
    );
  }

  await browser.close();

  fs.writeFileSync(
    path.join(OUT_DIR, "publishing-report.json"),
    JSON.stringify({ baseUrl: BASE_URL, outDir: OUT_DIR, galleries, screens: reports }, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(dataDir, "publishing-report.json"),
    JSON.stringify({ baseUrl: BASE_URL, outDir: OUT_DIR, galleries, screens: reports }, null, 2),
    "utf-8",
  );
  fs.rmSync(path.join(dataDir, "publishing-report.partial.json"), { force: true });
  writeCsv(reports);
  const summary = writeHtml(galleries, reports);
  writeReadme(summary);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`HTML ${path.join(OUT_DIR, "index.html")}`);
  console.log(`CSV ${path.join(OUT_DIR, "button-status.csv")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
