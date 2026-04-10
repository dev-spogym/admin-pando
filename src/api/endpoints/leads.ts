/**
 * 리드(잠재고객) 관리 API - Supabase 연동
 * 테이블: leads
 */
import { supabase } from '@/lib/supabase';

/** 리드 유입 경로 */
export type LeadSource = '간판' | '인터넷' | '전단지' | '추천' | 'SNS' | '카카오톡' | '전화문의' | '방문' | '기타';

/** 리드 상태 */
export type LeadStatus = '신규' | '연락완료' | '상담예정' | '방문완료' | '등록완료' | '미전환' | '보류';

/** 리드 */
export interface Lead {
  id: number;
  branchId: number;
  name: string;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  assignedFc: string | null;
  memo: string | null;
  inquiryDate: string;
  followUpDate: string | null;
  convertedMemberId: number | null;
  createdAt: string;
}

/** 리드 생성 요청 */
export interface CreateLeadInput {
  branchId: number;
  name: string;
  phone?: string | null;
  source: LeadSource;
  status?: LeadStatus;
  assignedFc?: string | null;
  memo?: string | null;
  inquiryDate?: string;
  followUpDate?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLead(row: Record<string, any>): Lead {
  return {
    id: row.id,
    branchId: row.branchId ?? row.branch_id,
    name: row.name ?? '',
    phone: row.phone ?? null,
    source: row.source ?? '기타',
    status: row.status ?? '신규',
    assignedFc: row.assignedFc ?? row.assigned_fc ?? null,
    memo: row.memo ?? null,
    inquiryDate: row.inquiryDate ?? row.inquiry_date ?? '',
    followUpDate: row.followUpDate ?? row.follow_up_date ?? null,
    convertedMemberId: row.convertedMemberId ?? row.converted_member_id ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

/** 리드 목록 조회 */
export async function getLeads(branchId: number): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('branchId', branchId)
    .order('createdAt', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToLead);
}

/** 리드 생성 */
export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      branchId: input.branchId,
      name: input.name,
      phone: input.phone ?? null,
      source: input.source,
      status: input.status ?? '신규',
      assignedFc: input.assignedFc ?? null,
      memo: input.memo ?? null,
      inquiryDate: input.inquiryDate ?? new Date().toISOString().slice(0, 10),
      followUpDate: input.followUpDate ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? '리드 저장 실패');
  return rowToLead(data);
}

/** 리드 수정 */
export async function updateLead(id: number, input: Partial<CreateLeadInput>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.source !== undefined) payload.source = input.source;
  if (input.status !== undefined) payload.status = input.status;
  if (input.assignedFc !== undefined) payload.assignedFc = input.assignedFc;
  if (input.memo !== undefined) payload.memo = input.memo;
  if (input.followUpDate !== undefined) payload.followUpDate = input.followUpDate;

  const { error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** 리드 삭제 */
export async function deleteLead(id: number): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** 리드 통계 */
export async function getLeadStats(branchId: number) {
  const leads = await getLeads(branchId);
  const total = leads.length;
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
    bySource[lead.source] = (bySource[lead.source] ?? 0) + 1;
  }

  const converted = byStatus['등록완료'] ?? 0;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const pending = (byStatus['신규'] ?? 0) + (byStatus['연락완료'] ?? 0);
  const missedRate = total > 0 ? Math.round(((byStatus['미전환'] ?? 0) / total) * 100) : 0;

  return { total, converted, conversionRate, pending, missedRate, byStatus, bySource };
}
