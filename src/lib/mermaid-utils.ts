const FENCED_MERMAID_BLOCK_RE =
  /^[ \t]{0,3}(?<fence>`{3,}|~{3,})[ \t]*mermaid[ \t]*\n(?<body>[\s\S]*?)^[ \t]{0,3}(?<close>\k<fence>)[ \t]*$/gim;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const MERMAID_DIAGRAM_START_RE =
  /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie(?:\s+title)?|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|kanban|architecture-beta|block-beta|packet-beta|xychart-beta|sankey|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/im;
const FLOWCHART_START_RE = /^(?:flowchart|graph)\b/im;

const FLOWCHART_NODE_PATTERNS = [
  { re: /(\b[A-Za-z][\w-]*)\(\(([^()\r\n][^\r\n]*?)\)\)/g, open: '((', close: '))' },
  { re: /(\b[A-Za-z][\w-]*)\(\[([^\r\n]*?)\]\)/g, open: '([', close: '])' },
  { re: /(\b[A-Za-z][\w-]*)\[\(([^\r\n]*?)\)\]/g, open: '[(', close: ')]' },
  { re: /(\b[A-Za-z][\w-]*)\[\[([^\r\n]*?)\]\]/g, open: '[[', close: ']]' },
  { re: /(\b[A-Za-z][\w-]*)\((?!\(|\[)([^\r\n]*?)\)/g, open: '(', close: ')' },
  { re: /(\b[A-Za-z][\w-]*)\{([^\r\n]*?)\}/g, open: '{', close: '}' },
  { re: /(\b[A-Za-z][\w-]*)\[(?!\[|\()([^\r\n]*?)\]/g, open: '[', close: ']' },
] as const;

export function normalizeContent(content: string) {
  return content.replace(/\r\n?/g, '\n');
}

export function isRenderableMermaidBlock(content: string) {
  return MERMAID_DIAGRAM_START_RE.test(content.trim());
}

export function extractMermaidBlocks(content: string) {
  const normalized = normalizeContent(content);
  const blocks = [...normalized.matchAll(FENCED_MERMAID_BLOCK_RE)]
    .map((match) => match.groups?.body?.trim() ?? '')
    .filter(Boolean)
    .filter(isRenderableMermaidBlock);

  if (blocks.length > 0) {
    return blocks;
  }

  const rawStart = normalized.search(MERMAID_DIAGRAM_START_RE);
  if (rawStart >= 0) {
    const raw = normalized.slice(rawStart).trim();
    if (raw) {
      return [raw];
    }
  }

  return [];
}

export function extractMeta(content: string) {
  const normalized = normalizeContent(content);
  return normalized.match(FRONTMATTER_RE)?.[1] ?? '';
}

function escapeMermaidLabel(label: string) {
  return label
    .replace(/"/g, '&quot;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/\(/g, '&#40;')
    .replace(/\)/g, '&#41;');
}

function sanitizeFlowchartNodeLabels(source: string) {
  let sanitized = source.replace(
    /(\b[A-Za-z][\w-]*)\[\/([^\r\n\]]*?[^/])\]/g,
    (_, id: string, label: string) => `${id}["/${escapeMermaidLabel(label)}"]`,
  );

  for (const pattern of FLOWCHART_NODE_PATTERNS) {
    sanitized = sanitized.replace(pattern.re, (_, id: string, label: string) => {
      if (!label || !/[()[\]{}"]/.test(label)) {
        return `${id}${pattern.open}${label}${pattern.close}`;
      }
      return `${id}${pattern.open}${escapeMermaidLabel(label)}${pattern.close}`;
    });
  }
  return sanitized;
}

function sanitizeFlowchartEdgeLabels(source: string) {
  return source.replace(/\|([^|\r\n]+)\|/g, (_, label: string) => {
    const trimmed = label.trim();
    const unwrapped =
      trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
    if (!/[()[\]{}"]/.test(unwrapped)) {
      return `|${trimmed}|`;
    }
    return `|"${escapeMermaidLabel(unwrapped)}"|`;
  });
}

export function sanitizeMermaidSource(source: string) {
  const normalized = normalizeContent(source).trim();

  if (!FLOWCHART_START_RE.test(normalized)) {
    return normalized;
  }

  return sanitizeFlowchartNodeLabels(sanitizeFlowchartEdgeLabels(normalized));
}
