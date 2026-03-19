/**
 * 종합평가 API - Supabase 연동
 * 테이블: member_evaluations
 */
import { supabase } from '@/lib/supabase';

/** 평가 카테고리 */
export type EvaluationCategory = '체력' | '자세' | '유연성' | '근력' | '목표달성';

/** 종합평가 */
export interface MemberEvaluation {
  id: number;
  memberId: number;
  evaluatedAt: string;
  category: EvaluationCategory;
  score: number; // 1~10
  content: string | null;
  evaluatorName: string | null;
  createdAt: string;
}

/** 종합평가 생성 요청 */
export interface CreateEvaluationInput {
  memberId: number;
  evaluatedAt: string;
  category: EvaluationCategory;
  score: number;
  content?: string | null;
  evaluatorName?: string | null;
}

/** row → MemberEvaluation 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEvaluation(row: Record<string, any>): MemberEvaluation {
  return {
    id: row.id,
    memberId: row.memberId,
    evaluatedAt: row.evaluatedAt ?? row.evaluated_at ?? '',
    category: row.category,
    score: Number(row.score),
    content: row.content ?? null,
    evaluatorName: row.evaluatorName ?? row.evaluator_name ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

/** 회원 종합평가 목록 조회 */
export async function getMemberEvaluations(memberId: number): Promise<MemberEvaluation[]> {
  const { data, error } = await supabase
    .from('member_evaluations')
    .select('*')
    .eq('memberId', memberId)
    .order('evaluatedAt', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToEvaluation);
}

/** 종합평가 생성 */
export async function createMemberEvaluation(input: CreateEvaluationInput): Promise<MemberEvaluation> {
  const { data, error } = await supabase
    .from('member_evaluations')
    .insert({
      memberId: input.memberId,
      evaluatedAt: input.evaluatedAt,
      category: input.category,
      score: input.score,
      content: input.content ?? null,
      evaluatorName: input.evaluatorName ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? '종합평가 저장 실패');
  return rowToEvaluation(data);
}

/** 종합평가 수정 */
export async function updateMemberEvaluation(id: number, input: Partial<CreateEvaluationInput>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.evaluatedAt !== undefined) payload.evaluatedAt = input.evaluatedAt;
  if (input.category !== undefined) payload.category = input.category;
  if (input.score !== undefined) payload.score = input.score;
  if (input.content !== undefined) payload.content = input.content;
  if (input.evaluatorName !== undefined) payload.evaluatorName = input.evaluatorName;

  const { error } = await supabase
    .from('member_evaluations')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** 종합평가 삭제 */
export async function deleteMemberEvaluation(id: number): Promise<void> {
  const { error } = await supabase
    .from('member_evaluations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
