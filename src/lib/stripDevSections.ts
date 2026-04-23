// 개발 섹션 필터 — Cmd+/ 오버레이 및 다이어그램 뷰어에서 "개발 상세" 섹션을 감춤.
// 내부 문서(파일)에는 그대로 유지되고, API 응답에서만 해당 섹션을 잘라 돌려줌.
//
// 차단 판정: 헤더(##/###/...) 제목이 아래 패턴 중 하나에 매칭되면 다음 동일/상위
// 헤더가 나올 때까지 본문을 드롭.
//
// 사용처:
//   - /api/design-doc  (Cmd+/ 오버레이)
//   - /api/diagrams/file  (다이어그램 뷰어)
//
// 신규 섹션 작성 시 `## 🛠 개발: 제목` 형태로 prefix 붙이면 자동 필터링됨.

const DEV_SECTION_PATTERNS: RegExp[] = [
  /🛠\s*개발/,
  /컴포넌트\s*트리/,
  /데이터\s*계약/,
  /API\s*(?:호출|엔드포인트|통합|스펙|명세|요청|계약)/,
  /전역\s*상태/,
  /\bStore\b/,
  /스토어/,
  /바이브코딩/,
  /구현\s*상세/,
  /기술\s*스펙/,
  /타입\s*정의/,
  /TypeScript/i,
  /Prisma/,
  /스키마\s*정의/,
  /DB\s*스키마/,
];

export function stripDevSections(markdown: string): string {
  if (!markdown) return markdown;
  const lines = markdown.split('\n');
  const out: string[] = [];
  let skipLevel = 0; // 0 = 출력, >0 = 해당 레벨의 헤더가 나올 때까지 드롭

  for (const line of lines) {
    const headerMatch = line.match(/^(#{2,6})\s+(.+?)\s*$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2];
      if (skipLevel > 0 && level <= skipLevel) {
        skipLevel = 0;
      }
      if (skipLevel === 0 && DEV_SECTION_PATTERNS.some((re) => re.test(title))) {
        skipLevel = level;
        continue;
      }
    }
    if (skipLevel === 0) out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
