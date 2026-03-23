/**
 * 횟수 관리 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types';

/** 횟수 정보 */
export interface LessonCount {
  id: number;
  memberId: number;
  productId?: number;
  productName: string;
  totalCount: number;
  usedCount: number;
  remainCount: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 횟수 생성 요청 */
export interface LessonCountRequest {
  memberId: number;
  productId?: number;
  productName: string;
  totalCount: number;
  startDate?: string;
  endDate?: string;
}

/** 횟수 차감 이력 */
export interface LessonCountHistory {
  id: number;
  lessonCountId: number;
  memberId: number;
  scheduleId?: number;
  deductedAt: string;
  memo?: string;
}

/** 횟수 목록 조회 */
export const getLessonCounts = async (memberId?: number): Promise<ApiResponse<LessonCount[]>> => {
  try {
    let query = supabase
      .from('lesson_counts')
      .select('*')
      .order('createdAt', { ascending: false });

    if (memberId !== undefined) query = query.eq('memberId', memberId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Decimal 필드 Number() 래핑
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      totalCount: Number(r.totalCount),
      usedCount: Number(r.usedCount),
      remainCount: Number(r.totalCount) - Number(r.usedCount),
    }));

    return { success: true, data: rows as LessonCount[] };
  } catch (err) {
    console.error('getLessonCounts 오류:', err);
    throw err;
  }
};

/** 횟수 생성 */
export const createLessonCount = async (
  payload: LessonCountRequest
): Promise<ApiResponse<LessonCount>> => {
  try {
    const { data, error } = await supabase
      .from('lesson_counts')
      .insert({
        ...payload,
        usedCount: 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as LessonCount, message: '횟수가 등록되었습니다.' };
  } catch (err) {
    console.error('createLessonCount 오류:', err);
    throw err;
  }
};

/** 횟수 1회 차감 */
export const deductCount = async (id: number): Promise<ApiResponse<LessonCount>> => {
  try {
    // 현재 횟수 조회
    const { data: current, error: fetchError } = await supabase
      .from('lesson_counts')
      .select('usedCount, totalCount')
      .eq('id', id)
      .single();

    if (fetchError) throw new Error(fetchError.message);
    if (!current) throw new Error('횟수 정보를 찾을 수 없습니다.');

    const usedCount = Number(current.usedCount) + 1;
    const remainCount = Number(current.totalCount) - usedCount;

    if (remainCount < 0) throw new Error('잔여 횟수가 부족합니다.');

    const { data, error } = await supabase
      .from('lesson_counts')
      .update({ usedCount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 차감 이력 기록 (fire-and-forget)
    supabase
      .from('lesson_count_histories')
      .insert({ lessonCountId: id, memberId: (data as LessonCount).memberId, deductedAt: new Date().toISOString() })
      .then(({ error: histError }) => {
        if (histError) console.error('횟수 이력 기록 오류:', histError);
      });

    return { success: true, data: data as LessonCount, message: '1회 차감되었습니다.' };
  } catch (err) {
    console.error('deductCount 오류:', err);
    throw err;
  }
};

/** 횟수 차감 이력 조회 */
export const getLessonCountHistory = async (
  memberId: number
): Promise<ApiResponse<LessonCountHistory[]>> => {
  try {
    const { data, error } = await supabase
      .from('lesson_count_histories')
      .select('*')
      .eq('memberId', memberId)
      .order('deductedAt', { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as LessonCountHistory[] };
  } catch (err) {
    console.error('getLessonCountHistory 오류:', err);
    throw err;
  }
};
