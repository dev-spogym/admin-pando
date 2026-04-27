import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'docs/admin/다이어그램');

type Node = {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: Node[];
};

async function walk(dir: string, rel = ''): Promise<Node[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: Node[] = [];
  for (const e of entries
    .filter((e) => !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))) {
    const full = path.join(dir, e.name);
    const relPath = path.posix.join(rel, e.name);
    if (e.isDirectory()) {
      result.push({
        name: e.name,
        path: relPath,
        type: 'dir',
        children: await walk(full, relPath),
      });
    } else if (e.name.endsWith('.md')) {
      result.push({ name: e.name, path: relPath, type: 'file' });
    }
  }
  return result;
}

export async function GET() {
  try {
    const tree = await walk(ROOT);
    return NextResponse.json({ tree });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
