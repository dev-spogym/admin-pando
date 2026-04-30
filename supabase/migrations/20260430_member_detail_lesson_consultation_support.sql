-- 회원 상세 상담/레슨 실제 저장 보강
-- - consultations.channel: 상담 이력의 유입/상담 채널 보존
-- - classes.memo: 회원 상세 레슨 기록의 운동 내용 메모 보존

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS channel text DEFAULT NULL;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS memo text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_branch_member
  ON public.consultations ("branchId", "memberId", "scheduledAt" DESC);

CREATE INDEX IF NOT EXISTS idx_classes_member_status_time
  ON public.classes (member_id, lesson_status, "startTime" DESC);

NOTIFY pgrst, 'reload schema';
