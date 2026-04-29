'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBranchId } from '@/lib/getBranchId';

interface PageSeedState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  branchId: number;
  snapshotDate: string | null;
  updatedAt: string | null;
  seeded: boolean;
  reload: (force?: boolean) => Promise<void>;
}

export function usePageSeed<T>(route: string, fallback: T): PageSeedState<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState(1);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const reload = useCallback(
    async (force = false) => {
      const currentBranchId = getBranchId();
      setBranchId(currentBranchId);
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          route,
          branchId: String(currentBranchId),
        });
        if (force) params.set('force', '1');

        const response = await fetch(`/api/page-seed?${params.toString()}`, {
          cache: 'no-store',
        });
        const json = await response.json();

        if (!response.ok || !json.ok) {
          throw new Error(json.error ?? 'Supabase seed snapshot load failed.');
        }

        setData(json.payload as T);
        setSnapshotDate(json.snapshotDate ?? null);
        setUpdatedAt(json.updatedAt ?? null);
        setSeeded(Boolean(json.seeded));
      } catch (err) {
        setData(fallback);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [fallback, route],
  );

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { data, loading, error, branchId, snapshotDate, updatedAt, seeded, reload };
}
