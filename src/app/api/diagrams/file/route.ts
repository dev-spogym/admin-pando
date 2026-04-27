import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractMermaidBlocks, extractMeta } from '@/lib/mermaid-utils';
import { stripDevSections } from '@/lib/stripDevSections';

const ROOT = path.resolve(process.cwd(), 'docs/admin/다이어그램');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get('path') ?? '';

  const normalized = path.posix.normalize(rel);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  const full = path.join(ROOT, normalized);
  if (!full.startsWith(ROOT)) {
    return NextResponse.json({ error: 'out of scope' }, { status: 400 });
  }

  try {
    const raw = await fs.readFile(full, 'utf8');
    // 기획 관점 노출: 개발 전용 섹션은 감춤 (원본 파일은 그대로 유지).
    const content = stripDevSections(raw);
    const blocks = extractMermaidBlocks(content);
    const meta = extractMeta(content);
    return NextResponse.json({ path: normalized, content, mermaidBlocks: blocks, meta });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
