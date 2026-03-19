/**
 * 운동 이력 API - Supabase 연동
 * 테이블: exercise_logs
 */
import { supabase } from '@/lib/supabase';

/** 운동 이력 */
export interface ExerciseLog {
  id: number;
  memberId: number;
  logDate: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  durationMin: number | null;
  distanceKm: number | null;
  memo: string | null;
  createdAt: string;
}

/** 운동 이력 생성 요청 */
export interface CreateExerciseLogInput {
  memberId: number;
  logDate: string;
  exerciseName: string;
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  memo?: string | null;
}

/** row → ExerciseLog 변환 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToExerciseLog(row: Record<string, any>): ExerciseLog {
  return {
    id: row.id,
    memberId: row.memberId,
    logDate: row.logDate ?? row.log_date ?? '',
    exerciseName: row.exerciseName ?? row.exercise_name ?? '',
    sets: row.sets != null ? Number(row.sets) : null,
    reps: row.reps != null ? Number(row.reps) : null,
    weightKg: row.weightKg != null ? Number(row.weightKg) : null,
    durationMin: row.durationMin != null ? Number(row.durationMin) : null,
    distanceKm: row.distanceKm != null ? Number(row.distanceKm) : null,
    memo: row.memo ?? null,
    createdAt: row.createdAt ?? row.created_at ?? '',
  };
}

/** 회원 운동 이력 목록 조회 */
export async function getExerciseLogs(memberId: number): Promise<ExerciseLog[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('memberId', memberId)
    .order('logDate', { ascending: false });

  if (error || !data) return [];
  return data.map(rowToExerciseLog);
}

/** 운동 이력 생성 */
export async function createExerciseLog(input: CreateExerciseLogInput): Promise<ExerciseLog> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .insert({
      memberId: input.memberId,
      logDate: input.logDate,
      exerciseName: input.exerciseName,
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      weightKg: input.weightKg ?? null,
      durationMin: input.durationMin ?? null,
      distanceKm: input.distanceKm ?? null,
      memo: input.memo ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? '운동 이력 저장 실패');
  return rowToExerciseLog(data);
}

/** 운동 이력 삭제 */
export async function deleteExerciseLog(id: number): Promise<void> {
  const { error } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
