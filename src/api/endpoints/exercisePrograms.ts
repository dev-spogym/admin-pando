/**
 * 운동 프로그램 API - Supabase 연동
 * 테이블: exercise_programs, member_exercise_programs
 */
import { supabase } from '@/lib/supabase';

/** 운동 프로그램 난이도 */
export type ProgramLevel = '입문' | '초급' | '중급' | '고급';

/** 운동 프로그램 */
export interface ExerciseProgram {
  id: number;
  branchId: number;
  name: string;
  category: string | null;
  level: ProgramLevel | null;
  description: string | null;
  createdAt: string;
}

/** 회원 배정 운동 프로그램 */
export interface MemberExerciseProgram {
  id: number;
  memberId: number;
  programId: number;
  programName: string;
  category: string | null;
  level: ProgramLevel | null;
  assignedBy: number | null;
  assignedByName: string | null;
  assignedAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

/** row → ExerciseProgram 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProgram(row: Record<string, any>): ExerciseProgram {
  return {
    id: row.id,
    branchId: row.branchId ?? row.branch_id,
    name: row.name,
    category: row.category ?? null,
    level: row.level ?? null,
    description: row.description ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

/** row → MemberExerciseProgram 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMemberProgram(row: Record<string, any>): MemberExerciseProgram {
  return {
    id: row.id,
    memberId: row.memberId,
    programId: row.programId ?? row.program_id,
    programName: row.programName ?? row.exercise_programs?.name ?? '',
    category: row.category ?? row.exercise_programs?.category ?? null,
    level: row.level ?? row.exercise_programs?.level ?? null,
    assignedBy: row.assignedBy ?? row.assigned_by ?? null,
    assignedByName: row.assignedByName ?? row.assigned_by_name ?? null,
    assignedAt: row.assignedAt ?? row.assigned_at ?? row.createdAt ?? '',
    status: row.status ?? 'ACTIVE',
  };
}

/** 지점 운동 프로그램 목록 조회 */
export async function getExercisePrograms(branchId: number): Promise<ExerciseProgram[]> {
  const { data, error } = await supabase
    .from('exercise_programs')
    .select('*')
    .eq('branchId', branchId)
    .order('createdAt', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToProgram);
}

/** 회원 배정 운동 프로그램 목록 조회 */
export async function getMemberPrograms(memberId: number): Promise<MemberExerciseProgram[]> {
  const { data, error } = await supabase
    .from('member_exercise_programs')
    .select('*, exercise_programs(name, category, level)')
    .eq('memberId', memberId)
    .order('assignedAt', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToMemberProgram);
}

/** 운동 프로그램 배정 */
export async function assignProgram(memberId: number, programId: number, assignedBy: number): Promise<void> {
  const { error } = await supabase
    .from('member_exercise_programs')
    .insert({
      memberId,
      programId,
      assignedBy,
      assignedAt: new Date().toISOString(),
      status: 'ACTIVE',
    });

  if (error) throw new Error(error.message);
}

/** 운동 프로그램 배정 해제 */
export async function unassignProgram(id: number): Promise<void> {
  const { error } = await supabase
    .from('member_exercise_programs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** 운동 구성 항목 타입 */
export interface ExerciseItem {
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  memo: string;
}

/** 운동 프로그램 생성 */
export async function createExerciseProgram(data: {
  branchId: number;
  name: string;
  category: string | null;
  level: ProgramLevel | null;
  description: string | null;
  exercises?: ExerciseItem[];
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('exercise_programs').insert({
    branchId: data.branchId,
    name: data.name,
    category: data.category,
    difficulty: data.level,
    description: data.description,
    exercises: data.exercises ? JSON.stringify(data.exercises) : null,
    isActive: true,
  });
  return { error: error?.message ?? null };
}

/** 운동 프로그램 수정 */
export async function updateExerciseProgram(id: number, data: {
  name?: string;
  category?: string | null;
  level?: ProgramLevel | null;
  description?: string | null;
  exercises?: ExerciseItem[];
}): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { ...data };
  if (data.exercises !== undefined) {
    payload.exercises = JSON.stringify(data.exercises);
  }
  const { error } = await supabase.from('exercise_programs').update(payload).eq('id', id);
  return { error: error?.message ?? null };
}

/** 운동 프로그램 삭제 */
export async function deleteExerciseProgram(id: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from('exercise_programs').delete().eq('id', id);
  return { error: error?.message ?? null };
}
