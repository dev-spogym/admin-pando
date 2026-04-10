/**
 * 상담 이력 API - Supabase 연동
 * 테이블: consultations
 */
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

const getCurrentUser = (): { id: number; name: string | null } => {
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
    status: row.status,
    result: row.result ?? null,
    nextAction: row.nextAction ?? row.next_action ?? null,
    linkedSaleId: row.linkedSaleId ?? row.linked_sale_id ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

const isSchemaError = (message: string | undefined, columnNames: string[]): boolean => {
  if (!message) return false;
  return columnNames.some((column) => message.includes(column));
};

/** 회원 상담 이력 목록 조회 */
export async function getConsultations(memberId: number): Promise<Consultation[]> {
  const branchId = getBranchId();
  const modernQuery = await supabase
    .from('consultations')
    .select('*')
    .eq('memberId', memberId)
    .eq('branchId', branchId)
    .order('completedAt', { ascending: false, nullsFirst: false })
    .order('scheduledAt', { ascending: false, nullsFirst: false });

  if (!modernQuery.error && modernQuery.data) {
    return modernQuery.data.map(rowToConsultation);
  }

  const legacyQuery = await supabase
    .from('consultations')
    .select('*')
    .eq('member_id', memberId)
    .eq('branch_id', branchId)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('scheduled_at', { ascending: false, nullsFirst: false });

  if (legacyQuery.error || !legacyQuery.data) return [];
  return legacyQuery.data.map(rowToConsultation);
}

/** 상담 이력 생성 */
export async function createConsultation(input: CreateConsultationInput): Promise<Consultation> {
  const branchId = getBranchId();
  const currentUser = getCurrentUser();
  const staffName = input.staffName?.trim() || currentUser.name || '담당자 미지정';
  const scheduleTime = input.consultedAt;
  const completedTime = input.status === '완료' ? input.consultedAt : null;

  const modernInsertPayload = {
    memberId: input.memberId,
    staffId: currentUser.id,
    branchId,
    type: input.type,
    staffName,
    content: input.content ?? '',
    status: input.status,
    result: input.result ?? null,
    nextAction: input.nextAction ?? null,
    linkedSaleId: input.linkedSaleId ?? null,
    consultedAt: input.consultedAt,
    scheduledAt: scheduleTime,
    completedAt: completedTime,
  };

  const modernInsert = await supabase
    .from('consultations')
    .insert(modernInsertPayload)
    .select()
    .single();

  if (!modernInsert.error && modernInsert.data) {
    return rowToConsultation(modernInsert.data);
  }

  const legacyInsertPayload = {
    member_id: input.memberId,
    staff_id: currentUser.id,
    branch_id: branchId,
    type: input.type,
    staff_name: staffName,
    content: input.content ?? '',
    status: input.status,
    result: input.result ?? null,
    next_action: input.nextAction ?? null,
    linked_sale_id: input.linkedSaleId ?? null,
    scheduled_at: scheduleTime,
    completed_at: completedTime,
  };

  const fallbackInsertPayload = isSchemaError(modernInsert.error?.message, ['result', 'nextAction', 'linkedSaleId'])
    ? {
        memberId: input.memberId,
        staffId: currentUser.id,
        branchId,
        type: input.type,
        staffName,
        content: input.content ?? '',
        status: input.status,
        consultedAt: input.consultedAt,
      }
    : legacyInsertPayload;

  const legacyInsert = await supabase
    .from('consultations')
    .insert(fallbackInsertPayload)
    .select()
    .single();

  if (legacyInsert.error || !legacyInsert.data) {
    throw new Error(legacyInsert.error?.message ?? modernInsert.error?.message ?? '상담 이력 저장 실패');
  }

  return rowToConsultation(legacyInsert.data);
}

/** 상담 이력 수정 */
export async function updateConsultation(id: number, input: Partial<CreateConsultationInput>): Promise<void> {
  const currentUser = getCurrentUser();
  const payload: Record<string, unknown> = {};

  if (input.consultedAt !== undefined) {
    payload.consultedAt = input.consultedAt;
    payload.scheduledAt = input.consultedAt;
    if (input.status === '완료' || input.status === undefined) {
      payload.completedAt = input.consultedAt;
    }
  }
  if (input.type !== undefined) payload.type = input.type;
  if (input.staffName !== undefined) payload.staffName = input.staffName?.trim() || currentUser.name || '담당자 미지정';
  if (input.content !== undefined) payload.content = input.content;
  if (input.status !== undefined) {
    payload.status = input.status;
    if (input.status === '완료' && input.consultedAt === undefined) {
      payload.completedAt = new Date().toISOString();
    }
    if (input.status !== '완료') {
      payload.completedAt = null;
    }
  }
  if (input.result !== undefined) payload.result = input.result;
  if (input.nextAction !== undefined) payload.nextAction = input.nextAction;
  if (input.linkedSaleId !== undefined) payload.linkedSaleId = input.linkedSaleId;

  const modernUpdate = await supabase
    .from('consultations')
    .update(payload)
    .eq('id', id);

  if (!modernUpdate.error) return;

  const legacyPayload: Record<string, unknown> = {};

  if (input.consultedAt !== undefined) {
    legacyPayload.scheduled_at = input.consultedAt;
    if (input.status === '완료' || input.status === undefined) {
      legacyPayload.completed_at = input.consultedAt;
    }
  }
  if (input.type !== undefined) legacyPayload.type = input.type;
  if (input.staffName !== undefined) legacyPayload.staff_name = input.staffName?.trim() || currentUser.name || '담당자 미지정';
  if (input.content !== undefined) legacyPayload.content = input.content;
  if (input.status !== undefined) {
    legacyPayload.status = input.status;
    if (input.status === '완료' && input.consultedAt === undefined) {
      legacyPayload.completed_at = new Date().toISOString();
    }
    if (input.status !== '완료') {
      legacyPayload.completed_at = null;
    }
  }
  if (input.result !== undefined) legacyPayload.result = input.result;
  if (input.nextAction !== undefined) legacyPayload.next_action = input.nextAction;
  if (input.linkedSaleId !== undefined) legacyPayload.linked_sale_id = input.linkedSaleId;

  const fallbackLegacyPayload = isSchemaError(modernUpdate.error?.message, ['result', 'nextAction', 'linkedSaleId'])
    ? Object.fromEntries(
        Object.entries(payload).filter(([key]) => !['result', 'nextAction', 'linkedSaleId', 'scheduledAt', 'completedAt'].includes(key))
      )
    : legacyPayload;

  const legacyUpdate = await supabase
    .from('consultations')
    .update(fallbackLegacyPayload)
    .eq('id', id);

  if (legacyUpdate.error) throw new Error(legacyUpdate.error.message);
}

/** 상담 이력 삭제 */
export async function deleteConsultation(id: number): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
