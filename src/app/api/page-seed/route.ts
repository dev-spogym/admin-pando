import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  buildPublishingPageSeed,
  getKstDateString,
  isPublishingSeedRoute,
  type PublishingPageSeedPayload,
} from '@/lib/publishingPageSeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PublishingPageSeedRow = {
  payload: PublishingPageSeedPayload;
  updatedAt: string;
};

const globalForPublishingSeed = globalThis as typeof globalThis & {
  __publishingSeedPool?: Pool;
};

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for publishing page Supabase snapshots.');
  }

  if (!globalForPublishingSeed.__publishingSeedPool) {
    globalForPublishingSeed.__publishingSeedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return globalForPublishingSeed.__publishingSeedPool;
}

async function ensureSchema(pool: Pool) {
  await pool.query(`
    create table if not exists public.publishing_page_snapshots (
      id bigserial primary key,
      "snapshotDate" date not null,
      "branchId" integer not null references public.branches(id) on delete cascade,
      route text not null,
      payload jsonb not null,
      "seedVersion" text not null default 'v1',
      "createdAt" timestamp with time zone not null default now(),
      "updatedAt" timestamp with time zone not null default now(),
      constraint publishing_page_snapshots_unique unique ("snapshotDate", "branchId", route)
    );

    create index if not exists publishing_page_snapshots_route_branch_date_idx
      on public.publishing_page_snapshots (route, "branchId", "snapshotDate" desc);
  `);
}

async function getBranchName(pool: Pool, branchId: number) {
  const { rows } = await pool.query<{ name: string }>(
    'select name from public.branches where id = $1 limit 1',
    [branchId],
  );
  return rows[0]?.name ?? '센터';
}

async function readSnapshot(pool: Pool, route: string, branchId: number, snapshotDate: string) {
  const { rows } = await pool.query<PublishingPageSeedRow>(
    `select payload, "updatedAt"::text as "updatedAt"
     from public.publishing_page_snapshots
     where route = $1 and "branchId" = $2 and "snapshotDate" = $3
     limit 1`,
    [route, branchId, snapshotDate],
  );
  return rows[0] ?? null;
}

async function upsertSnapshot(params: {
  pool: Pool;
  route: string;
  branchId: number;
  snapshotDate: string;
  payload: PublishingPageSeedPayload;
}) {
  const { pool, route, branchId, snapshotDate, payload } = params;
  const { rows } = await pool.query<PublishingPageSeedRow>(
    `insert into public.publishing_page_snapshots
      ("snapshotDate", "branchId", route, payload, "seedVersion")
     values ($1, $2, $3, $4::jsonb, 'v1')
     on conflict ("snapshotDate", "branchId", route)
     do update set payload = excluded.payload, "seedVersion" = excluded."seedVersion", "updatedAt" = now()
     returning payload, "updatedAt"::text as "updatedAt"`,
    [snapshotDate, branchId, route, JSON.stringify(payload)],
  );
  return rows[0];
}

export async function GET(request: NextRequest) {
  try {
    const route = request.nextUrl.searchParams.get('route') ?? '';
    if (!isPublishingSeedRoute(route)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported publishing seed route: ${route || '(empty)'}`,
        },
        { status: 404 },
      );
    }

    const branchIdParam = Number(request.nextUrl.searchParams.get('branchId') ?? 1);
    const branchId = Number.isFinite(branchIdParam) && branchIdParam > 0 ? branchIdParam : 1;
    const snapshotDate = request.nextUrl.searchParams.get('date') ?? getKstDateString();
    const force = request.nextUrl.searchParams.get('force') === '1';
    const pool = getPool();

    await ensureSchema(pool);

    const branchName = await getBranchName(pool, branchId);
    const existing = force ? null : await readSnapshot(pool, route, branchId, snapshotDate);

    if (existing) {
      return NextResponse.json({
        ok: true,
        source: 'supabase',
        seeded: false,
        route,
        branchId,
        branchName,
        snapshotDate,
        updatedAt: existing.updatedAt,
        payload: existing.payload,
      });
    }

    const payload = buildPublishingPageSeed({ route, snapshotDate, branchId, branchName });
    const row = await upsertSnapshot({ pool, route, branchId, snapshotDate, payload });

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      seeded: true,
      route,
      branchId,
      branchName,
      snapshotDate,
      updatedAt: row.updatedAt,
      payload: row.payload,
    });
  } catch (error) {
    console.error('[api/page-seed] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
