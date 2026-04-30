/**
 * 회원 상세 레슨 기록 API - Supabase classes 연동
 * 모바일 앱의 레슨 완료/서명 화면과 같은 classes 레코드를 사용한다.
 */
import { supabase } from '@/lib/supabase';
import { AUDIT_ACTIONS, createAuditLog } from './auditLog';

export type MemberLessonStatus = 'scheduled' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

export interface MemberLessonRecord {
  id: number;
  date: string;
  className: string;
  trainer: string;
  memo: string;
  signatureUrl: string | null;
  signatureAt: string | null;
  completedAt: string | null;
  status: MemberLessonStatus;
}

export interface CreateMemberLessonRecordInput {
  memberId: number;
  memberName: string;
  branchId?: number | null;
  date: string;
  className: string;
  trainer: string;
  memo?: string;
  signatureDataUrl?: string;
}

type StaffRow = {
  id: number;
  name: string | null;
};

type ClassRow = {
  id: number;
  title: string | null;
  type: string | null;
  staffId: number | null;
  staffName: string | null;
  startTime: string | null;
  endTime: string | null;
  branchId: number | null;
  lesson_status: string | null;
  signature_url: string | null;
  signature_at: string | null;
  completed_at: string | null;
  memo: string | null;
};

const CLASS_SELECT = [
  'id',
  'title',
  'type',
  'staffId',
  'staffName',
  'startTime',
  'endTime',
  'branchId',
  'lesson_status',
  'signature_url',
  'signature_at',
  'completed_at',
  'memo',
].join(',');

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getCurrentUserId = (): number => {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem('auth_user');
  if (!stored) return 0;
  try {
    const parsed = JSON.parse(stored) as { id?: number | string };
    const id = Number(parsed.id);
    return Number.isFinite(id) ? id : 0;
  } catch {
    return 0;
  }
};

const normalizeStatus = (status: string | null): MemberLessonStatus => {
  if (status === 'completed' || status === 'in_progress' || status === 'no_show' || status === 'cancelled') return status;
  return 'scheduled';
};

const inferLessonType = (className: string): string => {
  const normalized = className.toLowerCase();
  if (normalized.includes('pt') || normalized.includes('피티') || normalized.includes('퍼스널')) return 'PT';
  if (
    normalized.includes('gx') ||
    normalized.includes('요가') ||
    normalized.includes('필라테스') ||
    normalized.includes('스피닝') ||
    normalized.includes('줌바') ||
    normalized.includes('에어로빅')
  ) {
    return 'GX';
  }
  if (normalized.includes('골프')) return 'GOLF';
  return 'PT';
};

const toLessonDateTime = (date: string): { startTime: string; endTime: string } => {
  const start = new Date(`${date}T12:00:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
};

const rowToRecord = (row: ClassRow): MemberLessonRecord => {
  const dateSource = row.completed_at ?? row.startTime ?? '';
  return {
    id: row.id,
    date: dateSource ? dateSource.slice(0, 10) : '',
    className: row.title ?? '-',
    trainer: row.staffName ?? '-',
    memo: row.memo ?? '',
    signatureUrl: row.signature_url ?? null,
    signatureAt: row.signature_at ?? null,
    completedAt: row.completed_at ?? null,
    status: normalizeStatus(row.lesson_status),
  };
};

const resolveStaff = async (branchId: number, trainerName: string): Promise<StaffRow> => {
  const trimmedTrainer = trainerName.trim();
  const { data: branchStaff } = await supabase
    .from('staff')
    .select('id,name')
    .eq('branchId', branchId)
    .eq('isActive', true)
    .order('id', { ascending: true })
    .limit(50);

  const rows = (branchStaff ?? []) as StaffRow[];
  const exact = rows.find((staff) => staff.name === trimmedTrainer);
  if (exact) return exact;
  if (rows[0]) return rows[0];

  const currentUserId = getCurrentUserId();
  if (currentUserId > 0) {
    const { data: currentStaff } = await supabase
      .from('staff')
      .select('id,name')
      .eq('id', currentUserId)
      .maybeSingle();
    if (currentStaff) return currentStaff as StaffRow;
  }

  const { data: fallbackStaff } = await supabase
    .from('staff')
    .select('id,name')
    .eq('isActive', true)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (fallbackStaff as StaffRow | null) ?? { id: 1, name: trimmedTrainer || '담당자 미지정' };
};

const uploadSignature = async (memberId: number, signatureDataUrl?: string): Promise<string | null> => {
  if (!signatureDataUrl) return null;
  if (!signatureDataUrl.startsWith('data:')) return signatureDataUrl;

  try {
    const blob = await (await fetch(signatureDataUrl)).blob();
    const fileName = `signatures/member_lesson_${memberId}_${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('files')
      .upload(fileName, blob, { contentType: 'image/png', upsert: true });

    if (error) return signatureDataUrl;

    const { data } = supabase.storage.from('files').getPublicUrl(fileName);
    return data.publicUrl || signatureDataUrl;
  } catch {
    return signatureDataUrl;
  }
};

export const getMemberLessonRecords = async (
  memberId: number,
  branchId?: number | null
): Promise<MemberLessonRecord[]> => {
  const resolvedBranchId = branchId && branchId > 0 ? branchId : getBranchId();
  let query = supabase
    .from('classes')
    .select(CLASS_SELECT)
    .eq('member_id', memberId)
    .order('startTime', { ascending: false });

  if (resolvedBranchId > 0) {
    query = query.eq('branchId', resolvedBranchId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as ClassRow[]).map(rowToRecord);
};

export const createMemberLessonRecord = async (
  input: CreateMemberLessonRecordInput
): Promise<MemberLessonRecord> => {
  const branchId = input.branchId && input.branchId > 0 ? input.branchId : getBranchId();
  const staff = await resolveStaff(branchId, input.trainer);
  const signatureUrl = await uploadSignature(input.memberId, input.signatureDataUrl);
  const now = new Date().toISOString();
  const { startTime, endTime } = toLessonDateTime(input.date);
  const completed = Boolean(signatureUrl);

  const insertPayload = {
    title: input.className.trim(),
    type: inferLessonType(input.className),
    staffId: staff.id,
    staffName: input.trainer.trim() || staff.name || '담당자 미지정',
    room: null,
    startTime,
    endTime,
    capacity: 1,
    booked: 1,
    isRecurring: false,
    branchId,
    targetType: 'member',
    approvalStatus: 'approved',
    lesson_status: completed ? 'completed' : 'in_progress',
    signature_url: signatureUrl,
    signature_at: completed ? now : null,
    completed_at: completed ? now : null,
    member_id: input.memberId,
    member_name: input.memberName,
    memo: input.memo?.trim() || null,
  };

  const { data, error } = await supabase
    .from('classes')
    .insert(insertPayload)
    .select(CLASS_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? '레슨 기록 저장 실패');
  }

  const created = rowToRecord(data as unknown as ClassRow);
  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    targetType: 'lesson',
    targetId: created.id,
    fromBranchId: branchId,
    afterValue: {
      memberId: input.memberId,
      memberName: input.memberName,
      className: created.className,
      trainer: created.trainer,
      status: created.status,
      signatureLinked: Boolean(created.signatureUrl),
    },
    detail: {
      message: '레슨 기록 추가됨',
      memberId: input.memberId,
      memberName: input.memberName,
      mobileSignatureLinked: true,
      signatureStatus: created.signatureUrl ? '서명 완료' : '모바일 서명 대기',
    },
  });

  return created;
};
