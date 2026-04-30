/**
 * 상담 이력 API - Supabase 연동
 * 테이블: consultations
 */
import { supabase } from '@/lib/supabase';
import { AUDIT_ACTIONS, createAuditLog } from './auditLog';

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

const getCurrentUser = (): { id: number; name: string | null } => {
  if (typeof window === 'undefined') return { id: 0, name: null };
  const stored = localStorage.getItem('auth_user');
  if (!stored) return { id: 0, name: null };

  try {
    const parsed = JSON.parse(stored) as { id?: number | string; name?: string };
    return {
      id: parsed.id ? Number(parsed.id) : 0,
      name: parsed.name ?? null,
    };
  } catch {
    return { id: 0, name: null };
  }
};

/** 상담 유형 */
export type ConsultationType = '상담' | 'OT' | '체험' | '재등록상담';

/** 상담 상태 */
export type ConsultationStatus = '예정' | '완료' | '취소' | '노쇼';

/** 상담 결과 */
export type ConsultationResult = '등록' | '미등록' | '보류';

/** 상담 채널 */
export type ConsultationChannel = '방문' | '전화' | '카카오톡' | 'DM' | 'SNS' | '기타';

/** 상담 이력 */
export interface Consultation {
  id: number;
  memberId: number;
  consultedAt: string;
  type: ConsultationType;
  channel: ConsultationChannel | null;
  staffName: string | null;
  content: string | null;
  status: ConsultationStatus;
  result: ConsultationResult | null;
  nextAction: string | null;
  linkedSaleId: number | null;
  createdAt: string;
}

/** 상담 생성 요청 */
export interface CreateConsultationInput {
  memberId: number;
  consultedAt: string;
  type: ConsultationType;
  channel?: ConsultationChannel | null;
  staffName?: string | null;
  content?: string | null;
  status: ConsultationStatus;
  result?: ConsultationResult | null;
  nextAction?: string | null;
  linkedSaleId?: number | null;
}

const STATUS_TO_DB: Record<ConsultationStatus, string> = {
  예정: 'scheduled',
  완료: 'completed',
  취소: 'cancelled',
  노쇼: 'no_show',
};

const STATUS_TO_UI: Record<string, ConsultationStatus> = {
  scheduled: '예정',
  pending: '예정',
  완료예정: '예정',
  completed: '완료',
  done: '완료',
  cancelled: '취소',
  canceled: '취소',
  no_show: '노쇼',
  noshow: '노쇼',
  noShow: '노쇼',
};

const normalizeStatus = (status: unknown): ConsultationStatus => {
  if (typeof status !== 'string') return '예정';
  if (status === '예정' || status === '완료' || status === '취소' || status === '노쇼') return status;
  return STATUS_TO_UI[status] ?? '예정';
};

const toDbStatus = (status: ConsultationStatus | undefined): string | undefined => {
  if (status === undefined) return undefined;
  return STATUS_TO_DB[status] ?? status;
};

/** row → Consultation 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToConsultation(row: Record<string, any>): Consultation {
  const consultedAt =
    row.consultedAt ??
    row.consulted_at ??
    row.completedAt ??
    row.completed_at ??
    row.scheduledAt ??
    row.scheduled_at ??
    '';

  return {
    id: row.id,
    memberId: row.memberId ?? row.member_id,
    consultedAt,
    type: row.type,
    channel: row.channel ?? null,
    staffName: row.staffName ?? row.staff_name ?? null,
    content: row.content ?? null,
    status: normalizeStatus(row.status),
    result: row.result ?? null,
    nextAction: row.nextAction ?? row.next_action ?? null,
    linkedSaleId: row.linkedSaleId ?? row.linked_sale_id ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

/** 회원 상담 이력 목록 조회 */
export async function getConsultations(memberId: number): Promise<Consultation[]> {
  const branchId = getBranchId();
  const query = await supabase
    .from('consultations')
    .select('*')
    .eq('memberId', memberId)
    .eq('branchId', branchId)
    .order('completedAt', { ascending: false, nullsFirst: false })
    .order('scheduledAt', { ascending: false, nullsFirst: false });

  if (query.error || !query.data) return [];
  return query.data.map(rowToConsultation);
}

/** 상담 이력 생성 */
export async function createConsultation(input: CreateConsultationInput): Promise<Consultation> {
  const branchId = getBranchId();
  const currentUser = getCurrentUser();
  const staffName = input.staffName?.trim() || currentUser.name || '담당자 미지정';
  const scheduledAt = input.consultedAt;
  const dbStatus = toDbStatus(input.status) ?? 'scheduled';
  const completedAt = dbStatus === 'completed' ? input.consultedAt : null;

  const insertPayload = {
    memberId: input.memberId,
    staffId: currentUser.id,
    branchId,
    type: input.type,
    channel: input.channel ?? null,
    staffName,
    content: input.content ?? '',
    status: dbStatus,
    result: input.result ?? null,
    nextAction: input.nextAction ?? null,
    linkedSaleId: input.linkedSaleId ?? null,
    scheduledAt,
    completedAt,
  };

  const { data, error } = await supabase
    .from('consultations')
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? '상담 이력 저장 실패');
  }

  const created = rowToConsultation(data);
  await createAuditLog({
    action: AUDIT_ACTIONS.CREATE,
    targetType: 'consultation',
    targetId: created.id,
    fromBranchId: branchId,
    afterValue: {
      memberId: created.memberId,
      type: created.type,
      status: created.status,
      scheduledAt,
      channel: created.channel,
    },
    detail: { message: '상담 이력 추가됨', memberId: created.memberId },
  });

  return created;
}

/** 상담 이력 수정 */
export async function updateConsultation(id: number, input: Partial<CreateConsultationInput>): Promise<void> {
  const currentUser = getCurrentUser();
  const branchId = getBranchId();
  const { data: before } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const payload: Record<string, unknown> = {};

  if (input.consultedAt !== undefined) {
    payload.scheduledAt = input.consultedAt;
    const nextStatus = input.status ? toDbStatus(input.status) : before?.status;
    if (nextStatus === 'completed') {
      payload.completedAt = input.consultedAt;
    }
  }
  if (input.type !== undefined) payload.type = input.type;
  if (input.channel !== undefined) payload.channel = input.channel;
  if (input.staffName !== undefined) payload.staffName = input.staffName?.trim() || currentUser.name || '담당자 미지정';
  if (input.content !== undefined) payload.content = input.content;
  if (input.status !== undefined) {
    const dbStatus = toDbStatus(input.status);
    payload.status = dbStatus;
    if (dbStatus === 'completed' && input.consultedAt === undefined) {
      payload.completedAt = new Date().toISOString();
    }
    if (dbStatus !== 'completed') {
      payload.completedAt = null;
    }
  }
  if (input.result !== undefined) payload.result = input.result;
  if (input.nextAction !== undefined) payload.nextAction = input.nextAction;
  if (input.linkedSaleId !== undefined) payload.linkedSaleId = input.linkedSaleId;
  payload.updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('consultations')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE,
    targetType: 'consultation',
    targetId: id,
    fromBranchId: branchId,
    beforeValue: before ? {
      memberId: before.memberId,
      type: before.type,
      status: normalizeStatus(before.status),
      scheduledAt: before.scheduledAt,
      channel: before.channel ?? null,
    } : undefined,
    afterValue: {
      memberId: data?.memberId ?? before?.memberId ?? input.memberId,
      type: data?.type ?? input.type,
      status: data ? normalizeStatus(data.status) : input.status,
      scheduledAt: data?.scheduledAt ?? input.consultedAt,
      channel: data?.channel ?? input.channel ?? null,
      message: '상담 이력 수정됨',
    },
    detail: { message: '상담 이력 수정됨', memberId: data?.memberId ?? before?.memberId ?? input.memberId ?? null },
  });
}

/** 상담 이력 삭제 */
export async function deleteConsultation(id: number): Promise<void> {
  const branchId = getBranchId();
  const { data: before } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  await createAuditLog({
    action: AUDIT_ACTIONS.DELETE,
    targetType: 'consultation',
    targetId: id,
    fromBranchId: branchId,
    beforeValue: before ? {
      memberId: before.memberId,
      type: before.type,
      status: normalizeStatus(before.status),
      scheduledAt: before.scheduledAt,
      channel: before.channel ?? null,
    } : undefined,
    detail: { message: '상담 이력 삭제됨', memberId: before?.memberId ?? null },
  });
}
