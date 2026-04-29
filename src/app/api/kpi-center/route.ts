import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  KPI_CENTER_BOARD_KEYS,
  buildKpiCenterBoards,
  getKstDateString,
  type BoardKey,
  type KpiCenterBoardContent,
} from '@/lib/kpiCenterSeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HQ_SNAPSHOT_BRANCH_ID = 1;
const BRANCH_SCOPED_BOARD_KEYS = KPI_CENTER_BOARD_KEYS.filter(boardKey => boardKey !== 'hq');

type KpiCenterRow = {
  boardKey: BoardKey;
  content: KpiCenterBoardContent;
  updatedAt: string;
};

const globalForKpiCenter = globalThis as typeof globalThis & {
  __kpiCenterPool?: Pool;
};

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for KPI Center Supabase snapshots.');
  }

  if (!globalForKpiCenter.__kpiCenterPool) {
    globalForKpiCenter.__kpiCenterPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return globalForKpiCenter.__kpiCenterPool;
}

async function ensureSchema(pool: Pool) {
  await pool.query(`
    create table if not exists public.kpi_center_daily_snapshots (
      id bigserial primary key,
      "snapshotDate" date not null,
      "branchId" integer not null references public.branches(id) on delete cascade,
      "boardKey" text not null check ("boardKey" in ('hq', 'branch', 'fc', 'trainer', 'operations')),
      content jsonb not null,
      "createdAt" timestamp with time zone not null default now(),
      "updatedAt" timestamp with time zone not null default now(),
      constraint kpi_center_daily_snapshots_unique unique ("snapshotDate", "branchId", "boardKey")
    );

    create index if not exists kpi_center_daily_snapshots_branch_date_idx
      on public.kpi_center_daily_snapshots ("branchId", "snapshotDate" desc);
  `);
}

async function getBranchName(pool: Pool, branchId: number) {
  const { rows } = await pool.query<{ name: string }>(
    'select name from public.branches where id = $1 limit 1',
    [branchId],
  );
  return rows[0]?.name ?? '센터';
}

async function seedDailySnapshots(params: {
  pool: Pool;
  snapshotDate: string;
  branchId: number;
  branchName: string;
  force: boolean;
}) {
  const { pool, snapshotDate, branchId, branchName, force } = params;

  if (!force) {
    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count
       from public.kpi_center_daily_snapshots
       where "snapshotDate" = $1
         and (
           ("branchId" = $2 and "boardKey" = 'hq')
           or ("branchId" = $3 and "boardKey" <> 'hq')
         )`,
      [snapshotDate, HQ_SNAPSHOT_BRANCH_ID, branchId],
    );

    if (Number(rows[0]?.count ?? 0) >= KPI_CENTER_BOARD_KEYS.length) {
      return false;
    }
  } else {
    await pool.query(
      `delete from public.kpi_center_daily_snapshots
       where "snapshotDate" = $1
         and (
           ("branchId" = $2 and "boardKey" = 'hq')
           or ("branchId" = $3 and "boardKey" <> 'hq')
         )`,
      [snapshotDate, HQ_SNAPSHOT_BRANCH_ID, branchId],
    );
  }

  const boards = buildKpiCenterBoards({ snapshotDate, branchId, branchName });

  await pool.query(
    `insert into public.kpi_center_daily_snapshots
      ("snapshotDate", "branchId", "boardKey", content)
     values ($1, $2, 'hq', $3::jsonb)
     on conflict ("snapshotDate", "branchId", "boardKey")
     do update set content = excluded.content, "updatedAt" = now()`,
    [snapshotDate, HQ_SNAPSHOT_BRANCH_ID, JSON.stringify(boards.hq)],
  );

  await Promise.all(
    BRANCH_SCOPED_BOARD_KEYS.map(boardKey =>
      pool.query(
        `insert into public.kpi_center_daily_snapshots
          ("snapshotDate", "branchId", "boardKey", content)
         values ($1, $2, $3, $4::jsonb)
         on conflict ("snapshotDate", "branchId", "boardKey")
         do update set content = excluded.content, "updatedAt" = now()`,
        [snapshotDate, branchId, boardKey, JSON.stringify(boards[boardKey])],
      ),
    ),
  );

  return true;
}

async function fetchSnapshots(pool: Pool, snapshotDate: string, branchId: number) {
  const { rows } = await pool.query<KpiCenterRow>(
    `select
        "boardKey" as "boardKey",
        content,
        "updatedAt"::text as "updatedAt"
     from public.kpi_center_daily_snapshots
     where "snapshotDate" = $1
       and (
         ("branchId" = $2 and "boardKey" = 'hq')
         or ("branchId" = $3 and "boardKey" <> 'hq')
       )
     order by "boardKey"`,
    [snapshotDate, HQ_SNAPSHOT_BRANCH_ID, branchId],
  );

  const boards = {} as Record<BoardKey, KpiCenterBoardContent>;
  for (const row of rows) {
    boards[row.boardKey] = row.content;
  }

  const updatedAt = rows
    .map(row => row.updatedAt)
    .sort()
    .at(-1) ?? new Date().toISOString();

  return { boards, updatedAt };
}

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    await ensureSchema(pool);

    const branchIdParam = Number(request.nextUrl.searchParams.get('branchId') ?? 1);
    const branchId = Number.isFinite(branchIdParam) && branchIdParam > 0 ? branchIdParam : 1;
    const snapshotDate = request.nextUrl.searchParams.get('date') ?? getKstDateString();
    const force = request.nextUrl.searchParams.get('force') === '1';
    const branchName = await getBranchName(pool, branchId);
    const seeded = await seedDailySnapshots({ pool, snapshotDate, branchId, branchName, force });
    const { boards, updatedAt } = await fetchSnapshots(pool, snapshotDate, branchId);

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      seeded,
      branchId,
      branchName,
      snapshotDate,
      updatedAt,
      boards,
    });
  } catch (error) {
    console.error('[api/kpi-center] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
