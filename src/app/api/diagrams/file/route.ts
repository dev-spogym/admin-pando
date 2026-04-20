import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'docs/다이어그램');

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
    const content = await fs.readFile(full, 'utf8');
    const blocks = [...content.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    const meta = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    return NextResponse.json({ path: normalized, content, mermaidBlocks: blocks, meta });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
