/**
 * 신체정보 API - Supabase 연동
 * 테이블: member_body_info
 */
import { supabase } from '@/lib/supabase';

/** 신체정보 */
export interface MemberBodyInfo {
  id: number;
  memberId: number;
  measuredAt: string;
  height: number | null;
  weight: number | null;
  bloodPressureSystolic: number | null;  // 수축기 혈압
  bloodPressureDiastolic: number | null; // 이완기 혈압
  heartRate: number | null;
  memo: string | null;
  createdAt: string;
}

/** 신체정보 생성 요청 */
export interface CreateBodyInfoInput {
  memberId: number;
  measuredAt: string;
  height?: number | null;
  weight?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  memo?: string | null;
}

/** row → MemberBodyInfo 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBodyInfo(row: Record<string, any>): MemberBodyInfo {
  return {
    id: row.id,
    memberId: row.memberId,
    measuredAt: row.measuredAt ?? row.measured_at ?? '',
    height: row.height != null ? Number(row.height) : null,
    weight: row.weight != null ? Number(row.weight) : null,
    bloodPressureSystolic: row.bloodPressureSystolic != null ? Number(row.bloodPressureSystolic) : null,
    bloodPressureDiastolic: row.bloodPressureDiastolic != null ? Number(row.bloodPressureDiastolic) : null,
    heartRate: row.heartRate != null ? Number(row.heartRate) : null,
    memo: row.memo ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

/** 회원 신체정보 목록 조회 */
export async function getMemberBodyInfos(memberId: number): Promise<MemberBodyInfo[]> {
  const { data, error } = await supabase
    .from('member_body_info')
    .select('*')
    .eq('memberId', memberId)
    .order('measuredAt', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToBodyInfo);
}

/** 신체정보 생성 */
export async function createMemberBodyInfo(input: CreateBodyInfoInput): Promise<MemberBodyInfo> {
  const { data, error } = await supabase
    .from('member_body_info')
    .insert({
      memberId: input.memberId,
      measuredAt: input.measuredAt,
      height: input.height ?? null,
      weight: input.weight ?? null,
      bloodPressureSystolic: input.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: input.bloodPressureDiastolic ?? null,
      heartRate: input.heartRate ?? null,
      memo: input.memo ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? '신체정보 저장 실패');
  return rowToBodyInfo(data);
}

/** 신체정보 수정 */
export async function updateMemberBodyInfo(id: number, input: Partial<CreateBodyInfoInput>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.measuredAt !== undefined) payload.measuredAt = input.measuredAt;
  if (input.height !== undefined) payload.height = input.height;
  if (input.weight !== undefined) payload.weight = input.weight;
  if (input.bloodPressureSystolic !== undefined) payload.bloodPressureSystolic = input.bloodPressureSystolic;
  if (input.bloodPressureDiastolic !== undefined) payload.bloodPressureDiastolic = input.bloodPressureDiastolic;
  if (input.heartRate !== undefined) payload.heartRate = input.heartRate;
  if (input.memo !== undefined) payload.memo = input.memo;

  const { error } = await supabase
    .from('member_body_info')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** 신체정보 삭제 */
export async function deleteMemberBodyInfo(id: number): Promise<void> {
  const { error } = await supabase
    .from('member_body_info')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
