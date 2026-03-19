/**
 * 상담 이력 API - Supabase 연동
 * 테이블: consultations
 */
import { supabase } from '@/lib/supabase';

/** 상담 유형 */
export type ConsultationType = '상담' | 'OT' | '체험' | '재등록상담';

/** 상담 상태 */
export type ConsultationStatus = '예정' | '완료' | '취소' | '노쇼';

/** 상담 이력 */
export interface Consultation {
  id: number;
  memberId: number;
  consultedAt: string;
  type: ConsultationType;
  staffName: string | null;
  content: string | null;
  status: ConsultationStatus;
  createdAt: string;
}

/** 상담 생성 요청 */
export interface CreateConsultationInput {
  memberId: number;
  consultedAt: string;
  type: ConsultationType;
  staffName?: string | null;
  content?: string | null;
  status: ConsultationStatus;
}

/** row → Consultation 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToConsultation(row: Record<string, any>): Consultation {
  return {
    id: row.id,
    memberId: row.memberId,
    consultedAt: row.consultedAt ?? row.consulted_at ?? '',
    type: row.type,
    staffName: row.staffName ?? row.staff_name ?? null,
    content: row.content ?? null,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

/** 회원 상담 이력 목록 조회 */
export async function getConsultations(memberId: number): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('memberId', memberId)
    .order('consultedAt', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToConsultation);
}

/** 상담 이력 생성 */
export async function createConsultation(input: CreateConsultationInput): Promise<Consultation> {
  const { data, error } = await supabase
    .from('consultations')
    .insert({
      memberId: input.memberId,
      consultedAt: input.consultedAt,
      type: input.type,
      staffName: input.staffName ?? null,
      content: input.content ?? null,
      status: input.status,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? '상담 이력 저장 실패');
  return rowToConsultation(data);
}

/** 상담 이력 수정 */
export async function updateConsultation(id: number, input: Partial<CreateConsultationInput>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.consultedAt !== undefined) payload.consultedAt = input.consultedAt;
  if (input.type !== undefined) payload.type = input.type;
  if (input.staffName !== undefined) payload.staffName = input.staffName;
  if (input.content !== undefined) payload.content = input.content;
  if (input.status !== undefined) payload.status = input.status;

  const { error } = await supabase
    .from('consultations')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** 상담 이력 삭제 */
export async function deleteConsultation(id: number): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
