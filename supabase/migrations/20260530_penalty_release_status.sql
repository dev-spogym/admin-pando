-- SCR-C008 페널티 관리: 삭제 대신 적용/해제 상태를 보존한다.

ALTER TABLE public.penalties
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "releasedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "releasedBy" text,
  ADD COLUMN IF NOT EXISTS "releaseReason" text;

UPDATE public.penalties
   SET status = 'ACTIVE'
 WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_penalties_branch_status_applied
  ON public.penalties ("branchId", status, "appliedAt" DESC);

NOTIFY pgrst, 'reload schema';
