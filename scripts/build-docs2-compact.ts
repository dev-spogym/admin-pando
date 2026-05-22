import fs from "node:fs";
import path from "node:path";

type Doc = {
  absPath: string;
  relPath: string;
  domain: string;
  id: string;
  kind: string;
  title: string;
  route: string;
  featureCodes: string[];
  frontmatter: Record<string, string>;
  body: string;
  raw: string;
};

const root = process.cwd();
const srcRoot = path.join(root, "docs", "admin");
const outRoot = path.join(root, "docs2");

const domainNames: Record<string, string> = {
  "D01-공통": "공통",
  "D02-회원관리": "회원관리",
  "D03-매출관리": "매출관리",
  "D04-수업관리": "수업관리",
  "D05-상품관리": "상품관리",
  "D06-시설관리": "시설관리",
  "D07-직원관리": "직원관리",
  "D08-마케팅": "마케팅",
  "D09-설정관리": "설정관리",
  "D10-본사관리": "본사관리",
  "D11-통합운영": "통합운영",
};

const policySourceMap: Record<string, string[]> = {
  "D01-공통": ["00_통합운영_개요.md", "05_본사_지점_권한_운영기획서.md", "06_자동화_만료알림_운영기획서.md"],
  "D02-회원관리": ["01_리드_회원_운영기획서.md", "06_자동화_만료알림_운영기획서.md", "07_회원앱_운영기획서.md"],
  "D03-매출관리": ["02_상품_결제_이용권_운영기획서.md"],
  "D04-수업관리": ["03_수업_예약_출석_운영기획서.md"],
  "D05-상품관리": ["02_상품_결제_이용권_운영기획서.md"],
  "D06-시설관리": ["04_시설_부가서비스_운영기획서.md"],
  "D07-직원관리": ["05_본사_지점_권한_운영기획서.md"],
  "D08-마케팅": ["01_리드_회원_운영기획서.md", "06_자동화_만료알림_운영기획서.md", "07_회원앱_운영기획서.md"],
  "D09-설정관리": ["05_본사_지점_권한_운영기획서.md", "06_자동화_만료알림_운영기획서.md"],
  "D10-본사관리": ["05_본사_지점_권한_운영기획서.md"],
  "D11-통합운영": ["03_수업_예약_출석_운영기획서.md", "04_시설_부가서비스_운영기획서.md", "07_회원앱_운영기획서.md"],
};

function assertInside(parent: string, target: string) {
  const parentResolved = path.resolve(parent);
  const targetResolved = path.resolve(target);
  if (!targetResolved.startsWith(parentResolved)) {
    throw new Error(`Refusing to write outside ${parentResolved}: ${targetResolved}`);
  }
}

function mkdirp(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function listFiles(dir: string, predicate: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, predicate));
    if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b, "ko"));
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { frontmatter: {}, body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) return { frontmatter: {}, body: normalized };
  const fmText = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 5).trimStart();
  const fm: Record<string, string> = {};
  for (const line of fmText.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) fm[match[1]] = match[2].trim();
  }
  return { frontmatter: fm, body };
}

function parseArray(value = ""): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((v) => v.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return [trimmed.replace(/^["']|["']$/g, "")].filter(Boolean);
}

function makeDoc(absPath: string, base: string): Doc {
  const raw = fs.readFileSync(absPath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const relPath = path.relative(root, absPath).replaceAll("\\", "/");
  const parts = relPath.split("/");
  const domain = parts.find((p) => /^D\d{2}-/.test(p)) ?? frontmatter.domain ?? "UNKNOWN";
  const id = frontmatter.id ?? path.basename(path.dirname(absPath)).split("-").slice(0, 2).join("-");
  const title = frontmatter.title ?? path.basename(path.dirname(absPath));
  return {
    absPath,
    relPath,
    domain,
    id,
    kind: frontmatter.kind ?? (base.includes("화면설계서") ? "screen" : "feature"),
    title,
    route: frontmatter.route ?? "",
    featureCodes: parseArray(frontmatter.feature_codes),
    frontmatter,
    body,
    raw,
  };
}

function getSection(body: string, heading: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim().replace(/\s+/g, " ").includes(heading));
  if (start < 0) return "";
  let end = lines.length;
  const level = (lines[start].match(/^#+/)?.[0].length ?? 2);
  for (let i = start + 1; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

function firstUsefulParagraph(body: string): string {
  const noFm = body.replace(/\r\n/g, "\n");
  const section = getSection(noFm, "화면 목적") || getSection(noFm, "기능 목적") || noFm;
  const paragraphs = section
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("|") && !p.startsWith("```") && !p.startsWith("---"));
  return paragraphs[0] ?? "";
}

function isForbiddenLine(line: string): boolean {
  const forbidden = [
    /API\s*기준/i,
    /\bAPI\b/i,
    /GET\s+\/api/i,
    /POST\s+\/api/i,
    /PUT\s+\/api/i,
    /DELETE\s+\/api/i,
    /PATCH\s+\/api/i,
    /엔드포인트/i,
    /백엔드/i,
    /라우터/i,
    /DB\s*스키마/i,
    /\bDB\b/i,
    /데이터베이스/i,
    /스키마/i,
    /인덱스/i,
    /Prisma/i,
    /Supabase/i,
    /TypeScript/i,
    /\bJWT\b/i,
    /\bRLS\b/i,
    /insert|update|upsert|delete|select\s+query|쿼리/i,
    /테이블명/i,
    /webhook/i,
    /컴포넌트 트리/,
    /데이터 계약/,
    /관련 다이어그램/,
    /다이어그램\//,
    /변경 이력/,
    /개발 추적 기준/,
  ];
  return forbidden.some((re) => re.test(line)) || line.includes("../../../다이어그램/");
}

function compactLines(text: string, maxLines: number): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !isForbiddenLine(line))
    .map((line) => line.replace(/\s+$/g, ""));
  const compact = lines.filter((line, idx) => !(line.trim() === "" && lines[idx - 1]?.trim() === ""));
  return compact.slice(0, maxLines).join("\n").trim();
}

function withoutCommonErrors(text: string): string {
  const common = [
    /네트워크.*오류/,
    /5xx/,
    /timeout/i,
    /401/,
    /권한 없는.*진입/,
    /API.*오류/,
    /서버 오류/,
    /로딩/,
    /스켈레톤/,
  ];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const kept = lines.filter((line) => !common.some((re) => re.test(line)));
  return compactLines(kept.join("\n"), 30);
}

function getAnySection(docs: Array<Doc | undefined>, headings: string[], maxLines: number): string {
  for (const heading of headings) {
    for (const doc of docs) {
      if (!doc) continue;
      const section = getSection(doc.body, heading);
      if (section.trim()) return compactLines(section, maxLines);
    }
  }
  return "";
}

function writeFile(relPath: string, content: string) {
  const abs = path.join(outRoot, relPath);
  assertInside(outRoot, abs);
  mkdirp(path.dirname(abs));
  fs.writeFileSync(abs, content.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n", "utf8");
}

function groupByDomain<T extends { domain: string }>(docs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const doc of docs) {
    if (!map.has(doc.domain)) map.set(doc.domain, []);
    map.get(doc.domain)!.push(doc);
  }
  return map;
}

function linkedFeatureForScreen(screen: Doc, featureById: Map<string, Doc>, features: Doc[]): Doc | undefined {
  for (const code of screen.featureCodes) {
    const found = featureById.get(code);
    if (found) return found;
  }
  return features.find((feature) => feature.frontmatter.linked_screen === screen.id);
}

function sectionForScreen(doc: Doc, feature: Doc | undefined): string {
  const type = doc.kind === "dialog" ? "dialog" : "screen";
  const lines: string[] = [];
  lines.push(`## ${doc.id} ${doc.title}`);
  lines.push("");
  lines.push(`> 유형: ${type === "dialog" ? "다이얼로그" : "화면"}`);
  if (doc.route) lines.push(`> URL 경로: \`${doc.route}\``);
  if (doc.featureCodes.length) lines.push(`> 연결 기능: ${doc.featureCodes.map((c) => `\`${c}\``).join(", ")}`);
  if (feature?.frontmatter.linked_dialogs) lines.push(`> 연결 다이얼로그: ${feature.frontmatter.linked_dialogs}`);
  lines.push(`> 원본: \`${doc.relPath}\`${feature ? ` / \`${feature.relPath}\`` : ""}`);
  lines.push("");

  const purpose = firstUsefulParagraph(doc.body) || (feature ? firstUsefulParagraph(feature.body) : "");
  const compactPurpose = compactLines(purpose, 8);
  if (compactPurpose) lines.push("### 1. 목적", compactPurpose, "");

  const ui = getAnySection([doc, feature], ["주요 구성요소"], type === "dialog" ? 55 : 90);
  if (ui) lines.push("### 2. UI 구성", ui, "");

  const flow = getAnySection([doc, feature], ["주요 UX 흐름", "정상 진입 흐름", "흐름"], 45);
  if (flow) lines.push("### 3. 액션 / 흐름", flow, "");

  const states = getAnySection([doc, feature], ["화면 상태"], 35);
  if (states) lines.push("### 4. 핵심 상태", states, "");

  const rbac = getAnySection([doc, feature], ["계정별 차이", "권한", "RBAC"], 45);
  if (rbac) lines.push("### 5. 권한", rbac, "");

  const exceptions = feature ? withoutCommonErrors(getSection(feature.body, "예외 / 에러 처리") || getSection(doc.body, "예외")) : "";
  if (exceptions) lines.push("### 6. 필수 예외처리", exceptions, "");

  const automation = feature ? compactLines(getSection(feature.body, "자동화 / 배치 / 이벤트 연계"), 28) : "";
  if (automation) lines.push("### 7. 연동 / 자동화 참조", automation, "");

  lines.push("### 8. 핵심 디자인 요청사항");
  lines.push("- 공통 색상, 간격, 폰트, 토스트 규칙은 `_공통/디자인_시스템.md`, `_공통/토스트_메시지.md`를 따른다.");
  lines.push("- 본 섹션에 별도 명시된 UI 상태와 권한 차이가 있으면 도메인 공통보다 화면 정의를 우선한다.");
  lines.push("");
  return lines.join("\n");
}

function policyDoc(domain: string, features: Doc[]): string {
  const title = domainNames[domain] ?? domain;
  const opRoot = path.join(srcRoot, "운영용_기획문서");
  const sources = (policySourceMap[domain] ?? [])
    .map((name) => path.join(opRoot, name))
    .filter((file) => fs.existsSync(file))
    .map((file) => ({ file, rel: path.relative(root, file).replaceAll("\\", "/"), text: fs.readFileSync(file, "utf8") }));

  const sourceBullets = sources
    .flatMap((source) =>
      source.text
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((line) => /^-\s+/.test(line.trim()))
        .map((line) => line.trim())
        .filter((line) => !isForbiddenLine(line))
        .filter((line) => !/참고|TODO|예시/.test(line))
        .slice(0, 30)
        .map((line) => `${line}  \n  출처: \`${source.rel}\``),
    )
    .slice(0, 18);

  const statusLines = features
    .flatMap((feature) =>
      feature.body
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((line) => /상태|status|배지|활성|만료|잠금|오프라인|폐점|휴업/.test(line))
        .filter((line) => !isForbiddenLine(line))
        .filter((line) => !/변경 이력|status:/.test(line))
        .slice(0, 5)
        .map((line) => `- ${line.replace(/^\s*[-|]\s*/, "").trim()}  \n  출처: \`${feature.relPath}\``),
    )
    .slice(0, 20);

  const automationRows = features
    .flatMap((feature) => {
      const section = getSection(feature.body, "자동화 / 배치 / 이벤트 연계");
      return section
        .split("\n")
        .filter((line) => /^\|/.test(line.trim()) && !/---/.test(line))
        .filter((line) => !isForbiddenLine(line))
        .slice(1, 8)
        .map((line) => `${line} | \`${feature.id}\` |`);
    })
    .slice(0, 30);

  const exceptionRows = features
    .flatMap((feature) => {
      const section = getSection(feature.body, "예외 / 에러 처리");
      return section
        .split("\n")
        .filter((line) => /^\|/.test(line.trim()) && !/---/.test(line))
        .filter((line) => !isForbiddenLine(line))
        .filter((line) => !/네트워크|5xx|timeout|권한 없는/.test(line))
        .slice(1, 6)
        .map((line) => `${line} | \`${feature.id}\` |`);
    })
    .slice(0, 30);

  return [
    `# ${domain} ${title} — 운영정책`,
    "",
    "> 개발사용 compact 운영정책입니다. 원본 운영용 기획문서와 기능명세서에서 실행 조건·대상·결과 중심으로 발췌했습니다.",
    "",
    "## 1. 핵심 원칙",
    sourceBullets.length ? sourceBullets.join("\n") : "- 도메인별 화면 정의와 `_공통` 정책을 함께 적용한다.",
    "",
    "## 2. 상태 / 운영 정의",
    statusLines.length ? statusLines.join("\n") : "- 화면별 상태값은 도메인 통합 문서의 각 화면 `핵심 상태`를 따른다.",
    "",
    "## 3. 권한·책임 분리",
    "- 본사 권한자는 통합 모드에서 전 지점 조회·정책 관리를 수행한다.",
    "- 지점 권한자는 소속 지점 데이터의 일상 운영 처리를 수행한다.",
    "- 변경·삭제·복구·정산·권한 변경은 화면별 최소 권한을 따른다.",
    "- 공통 권한 기준은 `_공통/권한매트릭스.md`를 우선 참조하고, 화면별 차이는 도메인 문서에 따로 표기한다.",
    "",
    "## 4. KPI / 성과 측정",
    "| KPI | 산식/의미 | 측정 주기 |",
    "|---|---|---|",
    "| 처리 완료율 | 완료 건수 / 대상 건수 | 일/주 단위 |",
    "| 예외 발생률 | 예외·차단 건수 / 전체 시도 건수 | 주 단위 |",
    "| 정책 준수율 | 권한·상태·필수값 위반 없이 처리된 비율 | 월 단위 |",
    "| 운영 응답률 | 알림·요청 후 운영자가 처리한 비율 | 주 단위 |",
    "",
    "## 5. 자동화 정책",
    automationRows.length
      ? ["| 자동화 | 실행 시점/트리거 | 처리 동작/결과 | 출처 |", "|---|---|---|---|", ...automationRows].join("\n")
      : "- 자동화 상세는 `_공통/자동화_크론.md`와 화면별 `연동 / 자동화 참조`를 따른다.",
    "",
    "## 6. 정책 결정 근거",
    "- 화면별 구현 판단은 `UI 구성`, `액션 / 흐름`, `권한`, `필수 예외처리` 순서로 확인한다.",
    "- 여러 문서 값이 충돌하면 `docs/admin/화면설계서`의 화면 단위 정의를 우선하고, compact 문서에는 일관된 값만 반영한다.",
    "- 클라이언트 운영 정책값이 확정되지 않은 항목은 `docs/admin/운영용_기획문서/09_클라이언트_정책미확정_확인필요.md`에 별도 관리한다.",
    "",
    "## 7. 운영 예외 처리",
    exceptionRows.length
      ? ["| 케이스 | 처리 방식 | 후속 조치 | 출처 |", "|---|---|---|---|", ...exceptionRows].join("\n")
      : "- 공통 예외는 `_공통/에러_예외_표준.md`를 따른다.",
  ].join("\n");
}

function writeCommonDocs(screens: Doc[], features: Doc[]) {
  writeFile(
    "_공통/권한매트릭스.md",
    `# 공통 권한 매트릭스

| 역할 | 기본 범위 | 대표 가능 액션 | 제한 |
|---|---|---|---|
| superAdmin | 전 지점 / 본사 정책 | 전 지점 조회, 정책 관리, 감사 로그, 강제 처리 | 없음 |
| primary | 브랜드/본사 범위 | 본사 운영, 지점 전환, 정책 조회·관리 | superAdmin 전용 보안 작업 제외 |
| owner | 소속 지점 | 지점 운영, 중요 변경, 취소·복구·확정 | 본사 전역 정책 제한 |
| manager | 소속 지점 | 목록 조회, 등록·수정, 운영 처리 | 삭제·강제 확정·정산 취소 등 일부 제한 |
| fc | 소속 지점 / 담당 회원 우선 | 상담, 메시지, 결제 보조, 출석 처리 | 삭제, 엑셀, 본사 정책 제한 |
| trainer | 본인 수업/담당 회원 | 수업 확인, 출석 보조, 본인 정보 조회 | 동료/전체 회원 데이터 제한 |
| staff/front | 소속 지점 현장 처리 | 출석, 회원 추가 보조, 조회 | 정산·삭제·정책 제한 |
| readonly | 지정 범위 조회 | 조회 | 모든 변경 차단 |

## 적용 원칙
- 화면별 권한 표가 있으면 화면별 정의가 우선입니다.
- 권한 부족 액션은 기본적으로 버튼 hidden, 직접 URL 진입은 접근 제한 화면으로 처리합니다.
- 변경 액션은 감사 로그 대상입니다.
`,
  );

  writeFile(
    "_공통/에러_예외_표준.md",
    `# 공통 에러 / 예외 표준

| 케이스 | 화면 표시 | 처리 |
|---|---|---|
| 로딩 | 스켈레톤 또는 비활성 상태 | 데이터 수신 후 정상 상태 전환 |
| 빈 목록 | "데이터가 없습니다" 계열 빈 상태 | 등록 CTA는 권한 있을 때만 표시 |
| 검색 결과 없음 | "검색 결과가 없습니다" | 필터 초기화 제공 |
| 401 / 세션 만료 | 로그인 화면 이동 | 작성 중 데이터는 가능한 범위에서 임시저장 |
| 403 / 권한 부족 | 접근 제한 안내 | 대시보드 또는 이전 화면 이동 |
| 404 | 페이지/대상 없음 안내 | 목록 또는 이전 화면 이동 |
| 409 / 동시 수정 | 최신 데이터 새로고침 안내 | 후행 요청 차단 |
| 422 / 필수값 오류 | 필드 인라인 에러 | 저장 차단 |
| 5xx / timeout | 재시도 토스트 + 재시도 버튼 | 자동 재시도 1회 후 사용자 액션 대기 |
| 엑셀/대량 작업 지연 | 알림 센터 완료 링크 | 백그라운드 처리 |

## 적용 원칙
- 위 표는 모든 화면 공통입니다. 도메인 문서에는 화면 고유 예외만 남깁니다.
- 성공/실패 결과는 토스트와 필요 시 결과 모달로 표시합니다.
`,
  );

  writeFile(
    "_공통/디자인_시스템.md",
    `# 공통 디자인 시스템

## 기본 원칙
- 운영자는 반복 업무를 빠르게 처리해야 하므로 정보 밀도와 스캔 가능성을 우선합니다.
- 카드 남용을 피하고, 목록·테이블·필터·상태 배지를 일관되게 사용합니다.
- 위험 액션은 일반 액션과 색상·확인 절차를 분리합니다.

## 컴포넌트 기준
| 요소 | 기준 |
|---|---|
| 버튼 | 주요/보조/위험/텍스트 버튼 구분 |
| 탭 | 같은 데이터의 보기 전환에 사용 |
| 필터 | 칩으로 적용 상태 표시, 전체 해제 제공 |
| 테이블 | 상태 배지, 행 액션, 페이지네이션 기본 |
| 모달 | 파괴적 액션 또는 복합 입력에만 사용 |
| 토스트 | 저장/실패/백그라운드 완료 등 짧은 피드백 |
| 빈 상태 | 원인 + 다음 액션 1개 중심 |

## 화면별 디자인 기재 기준
- 화면별 문서에는 공통 색상·간격·폰트 반복을 적지 않습니다.
- 화면 고유의 강조 영역, 위험 액션, 특수 상태만 기재합니다.
`,
  );

  writeFile(
    "_공통/토스트_메시지.md",
    `# 공통 토스트 메시지

| 상황 | 메시지 톤 | 예시 |
|---|---|---|
| 저장 성공 | 완료 사실 중심 | 저장되었습니다 |
| 삭제/탈퇴 성공 | 결과 중심 | 처리되었습니다 |
| 부분 실패 | 성공/실패 수량 표시 | 성공 N건, 실패 M건이 있습니다 |
| 권한 부족 | 차단 이유 | 이 작업을 수행할 권한이 없습니다 |
| 네트워크 오류 | 재시도 안내 | 일시적으로 처리하지 못했습니다. 다시 시도해주세요 |
| 백그라운드 처리 | 완료 위치 안내 | 작업이 진행 중입니다. 완료되면 알림으로 알려드립니다 |

## 원칙
- 토스트는 1문장으로 작성합니다.
- 사용자가 다음에 해야 할 행동이 있으면 버튼 또는 링크로 제공합니다.
`,
  );

  writeFile(
    "_공통/상태전이.md",
    `# 공통 상태 전이

## 기본 상태 축
| 축 | 주요 상태 |
|---|---|
| 데이터 로드 | 로딩 / 정상 / 빈 상태 / 오류 |
| 권한 | 허용 / 읽기 전용 / 차단 |
| 작업 | 대기 / 처리 중 / 성공 / 부분 실패 / 실패 |
| 계정 | ACTIVE / LOCKED / INACTIVE |
| 지점 | 운영 중 / 오픈 예정 / 임시휴업 / 폐점 |
| 기기 | 온라인 / 오프라인 / 오류 / 점검 중 |

## 원칙
- 상태값은 화면 표시 배지와 저장 상태를 혼동하지 않습니다.
- 표시 상태가 저장 상태를 가공한 값이면 문서에 산식을 명시합니다.
`,
  );

  const automationRows = features
    .flatMap((feature) => {
      const section = getSection(feature.body, "자동화 / 배치 / 이벤트 연계");
      return section
        .split("\n")
        .filter((line) => /^\|/.test(line.trim()) && !/---/.test(line))
        .filter((line) => !isForbiddenLine(line))
        .slice(1, 5)
        .map((line) => `${line} | ${feature.domain} / ${feature.id} |`);
    })
    .slice(0, 180);

  writeFile(
    "_공통/자동화_크론.md",
    `# 공통 자동화 / 크론

> 화면별 반복 기재를 줄이기 위한 자동화 참조 문서입니다.

| 자동화 | 트리거 | 영향 | 출처 |
|---|---|---|---|
${automationRows.join("\n")}
`,
  );

  const externalLines = features
    .flatMap((feature) =>
      feature.body
        .split("\n")
        .filter((line) => /PG|POS|SMS|카카오|푸시|webhook|IoT|키오스크|InBody|알림 센터|외부|연동/.test(line))
        .filter((line) => !isForbiddenLine(line))
        .slice(0, 4)
        .map((line) => `- ${line.replace(/^[-|]\s*/, "").trim()}  \n  출처: \`${feature.relPath}\``),
    )
    .slice(0, 180);

  writeFile(
    "_공통/외부연동_현황.md",
    `# 공통 외부연동 현황

${externalLines.join("\n")}
`,
  );

  const idRows = screens
    .map((screen) => `| ${screen.id} | ${screen.title} | ${screen.domain} | ${screen.route || "-"} | \`${screen.relPath}\` |`)
    .join("\n");

  writeFile(
    "_공통/01_ID매핑_v2_v3.md",
    `# ID 매핑

| ID | 이름 | 도메인 | route | 원본 |
|---|---|---|---|---|
${idRows}
`,
  );

  const kioskRows = [...screens, ...features]
    .filter((doc) => /키오스크|IoT|출입|QR|RFID|얼굴/.test(doc.raw))
    .slice(0, 80)
    .map((doc) => `| ${doc.domain} | ${doc.id} | ${doc.title} | \`${doc.relPath}\` |`)
    .join("\n");

  writeFile(
    "_공통/00_KIOSK_연동매트릭스.md",
    `# KIOSK / IoT 연동 매트릭스

| 도메인 | ID | 항목 | 원본 |
|---|---|---|---|
${kioskRows}
`,
  );
}

function main() {
  if (!fs.existsSync(srcRoot)) throw new Error(`Missing source root: ${srcRoot}`);
  if (fs.existsSync(outRoot)) throw new Error("docs2 already exists. Remove it manually before regenerating.");
  mkdirp(outRoot);

  const screenFiles = listFiles(path.join(srcRoot, "화면설계서"), (file) => file.endsWith(".md") && path.basename(file) === "00-기본화면.md");
  const featureFiles = listFiles(path.join(srcRoot, "기능명세서"), (file) => file.endsWith(".md") && path.basename(file) === "00-기본기능.md");
  const screens = screenFiles.map((file) => makeDoc(file, "화면설계서"));
  const features = featureFiles.map((file) => makeDoc(file, "기능명세서"));
  const featuresByDomain = groupByDomain(features);
  const screensByDomain = groupByDomain(screens);
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  writeFile(
    "README.md",
    `# FitGenie CRM 관리자 개발사용 납품 문서

이 폴더는 기존 \`docs/admin\` 기획서를 개발 구현용으로 압축한 문서입니다.

## 사용 방법
- 한 화면 구현 시 해당 도메인의 \`{도메인명}.md\`와 \`운영정책.md\`를 우선 확인합니다.
- 공통 권한, 공통 예외, 자동화, 토스트, 디자인 기준은 \`_공통/\` 문서를 참조합니다.
- 기존 화면설계서/기능명세서/운영문서의 중복 narrative, 변경 이력, API/DB 상세는 제거했습니다.
- 기존 다이어그램은 사용자 지시에 따라 compact 생성 대상에서 제외했습니다.

## 원본 기준
- 화면 정본: \`docs/admin/화면설계서\`
- 기능 정본: \`docs/admin/기능명세서\`
- 운영 정책 원천: \`docs/admin/운영용_기획문서\`

## 생성 범위
- 화면/다이얼로그: ${screens.length}개
- 기능명세서: ${features.length}개
- 도메인: ${Object.keys(domainNames).length}개
`,
  );

  writeCommonDocs(screens, features);

  for (const domain of Object.keys(domainNames)) {
    const title = domainNames[domain];
    const domainScreens = (screensByDomain.get(domain) ?? []).sort((a, b) => a.id.localeCompare(b.id, "ko"));
    const domainFeatures = (featuresByDomain.get(domain) ?? []).sort((a, b) => a.id.localeCompare(b.id, "ko"));
    const screenSections = domainScreens
      .filter((doc) => doc.kind !== "dialog")
      .map((screen) => sectionForScreen(screen, linkedFeatureForScreen(screen, featureById, domainFeatures)));
    const dialogSections = domainScreens
      .filter((doc) => doc.kind === "dialog")
      .map((dialog) => sectionForScreen(dialog, linkedFeatureForScreen(dialog, featureById, domainFeatures)));

    const domainDir = domain;
    writeFile(
      `${domainDir}/${title}.md`,
      [
        `# ${domain} ${title}`,
        "",
        `> 개발사용 compact 문서입니다. 이 도메인의 화면·다이얼로그를 한 파일에 모았습니다.`,
        "",
        "## 문서 메타",
        `- 전체 화면 수: ${domainScreens.filter((doc) => doc.kind !== "dialog").length}`,
        `- 전체 다이얼로그 수: ${domainScreens.filter((doc) => doc.kind === "dialog").length}`,
        `- 연결 기능 수: ${domainFeatures.length}`,
        "- 공통 권한: `_공통/권한매트릭스.md`",
        "- 공통 예외: `_공통/에러_예외_표준.md`",
        "- 공통 자동화: `_공통/자동화_크론.md`",
        "- 공통 디자인: `_공통/디자인_시스템.md`",
        "",
        "## 도메인 개요",
        "- 화면/다이얼로그 구현 시 이 파일을 먼저 확인합니다.",
        "- 화면별 `원본` 경로를 함께 표기했으므로 정본 확인이 필요하면 해당 파일로 역추적합니다.",
        "- API/DB 상세, 변경 이력, 기존 다이어그램 링크는 compact 문서에서 제외했습니다.",
        "",
        "## 화면",
        screenSections.join("\n---\n\n") || "- 화면 없음",
        "",
        "## 다이얼로그",
        dialogSections.join("\n---\n\n") || "- 다이얼로그 없음",
      ].join("\n"),
    );

    writeFile(`${domainDir}/운영정책.md`, policyDoc(domain, domainFeatures));
  }
}

main();
