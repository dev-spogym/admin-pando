interface FrontmatterResult {
  data: Record<string, unknown>;
  content: string;
}

function coerceScalar(rawValue: string): unknown {
  const value = rawValue.trim();
  if (!value) return "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => coerceScalar(item));
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  return value;
}

function parseObjectBlock(lines: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("- ")) continue;

    const match = trimmed.match(/^([^:#]+):\s*(.*)$/);
    if (!match) continue;
    result[match[1].trim()] = coerceScalar(match[2]);
  }

  return result;
}

function parseArrayBlock(lines: string[]): unknown[] {
  const result: unknown[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!trimmed.startsWith("- ")) continue;

    const inlineValue = trimmed.slice(2).trim();
    const nested: string[] = [];

    while (i + 1 < lines.length) {
      const next = lines[i + 1];
      if (!next.trim()) {
        nested.push(next);
        i += 1;
        continue;
      }

      const indent = next.match(/^(\s*)/)?.[1].length ?? 0;
      if (indent < 2) break;

      nested.push(next);
      i += 1;
    }

    if (!inlineValue) {
      result.push(parseObjectBlock(nested));
      continue;
    }

    if (inlineValue.includes(":")) {
      result.push(
        parseObjectBlock([`  ${inlineValue}`, ...nested])
      );
      continue;
    }

    result.push(coerceScalar(inlineValue));
  }

  return result;
}

function parseBlock(lines: string[]): unknown {
  const meaningful = lines.filter((line) => line.trim());
  if (meaningful.length === 0) return [];

  const normalized = meaningful.map((line) => line.replace(/^\s{2}/, ""));
  const first = normalized[0].trim();

  if (first.startsWith("- ")) {
    return parseArrayBlock(normalized);
  }

  return parseObjectBlock(normalized);
}

export function parseFrontmatter(raw: string): FrontmatterResult {
  const normalized = raw.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines[0] !== "---") {
    return {
      data: {},
      content: raw,
    };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === "---" || lines[i] === "...") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return {
      data: {},
      content: raw,
    };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const content = lines.slice(endIndex + 1).join("\n");
  const data: Record<string, unknown> = {};

  for (let i = 0; i < frontmatterLines.length; i += 1) {
    const line = frontmatterLines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (indent !== 0) continue;

    const match = line.match(/^([^:#]+):\s*(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    const inlineValue = match[2].trim();

    if (inlineValue) {
      data[key] = coerceScalar(inlineValue);
      continue;
    }

    const block: string[] = [];
    while (i + 1 < frontmatterLines.length) {
      const next = frontmatterLines[i + 1];
      if (!next.trim()) {
        block.push(next);
        i += 1;
        continue;
      }

      const nextIndent = next.match(/^(\s*)/)?.[1].length ?? 0;
      if (nextIndent <= indent) break;

      block.push(next);
      i += 1;
    }

    data[key] = parseBlock(block);
  }

  return { data, content };
}
