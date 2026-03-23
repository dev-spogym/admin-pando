/**
 * 그룹수업 템플릿 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 그룹수업 템플릿 */
export interface ClassTemplate {
  id: number;
  branchId: number;
  name: string;
  type: string; // GX | PT | PILATES | YOGA
  defaultCapacity: number;
  defaultDurationMin: number;
  description: string | null;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 템플릿 생성/수정 요청 */
export interface ClassTemplateRequest {
  branchId?: number;
  name: string;
  type: string;
  defaultCapacity: number;
  defaultDurationMin: number;
  description?: string | null;
  color: string;
  isActive: boolean;
}

/** 템플릿 목록 조회 */
export const getClassTemplates = async (
  branchId?: number
): Promise<ApiResponse<ClassTemplate[]>> => {
  const resolvedBranchId = branchId ?? getBranchId();
  try {
    const { data, error } = await supabase
      .from('class_templates')
      .select('*')
      .eq('branch_id', resolvedBranchId)
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []) as ClassTemplate[] };
  } catch (err) {
    console.error('getClassTemplates 오류:', err);
    throw err;
  }
};

/** 템플릿 생성 */
export const createClassTemplate = async (
  payload: ClassTemplateRequest
): Promise<ApiResponse<ClassTemplate>> => {
  const branchId = payload.branchId ?? getBranchId();
  try {
    const { data, error } = await supabase
      .from('class_templates')
      .insert({
        branch_id: branchId,
        name: payload.name,
        type: payload.type,
        default_capacity: payload.defaultCapacity,
        default_duration: payload.defaultDurationMin,
        description: payload.description ?? null,
        color: payload.color,
        is_active: payload.isActive,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, data: data as ClassTemplate, message: '템플릿이 등록되었습니다.' };
  } catch (err) {
    console.error('createClassTemplate 오류:', err);
    throw err;
  }
};

/** 템플릿 수정 */
export const updateClassTemplate = async (
  id: number,
  payload: Partial<ClassTemplateRequest>
): Promise<ApiResponse<ClassTemplate>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbPayload: Record<string, any> = {};
  if (payload.name !== undefined) dbPayload.name = payload.name;
  if (payload.type !== undefined) dbPayload.type = payload.type;
  if (payload.defaultCapacity !== undefined) dbPayload.default_capacity = payload.defaultCapacity;
  if (payload.defaultDurationMin !== undefined) dbPayload.default_duration = payload.defaultDurationMin;
  if (payload.description !== undefined) dbPayload.description = payload.description;
  if (payload.color !== undefined) dbPayload.color = payload.color;
  if (payload.isActive !== undefined) dbPayload.is_active = payload.isActive;
  try {
    const { data, error } = await supabase
      .from('class_templates')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, data: data as ClassTemplate, message: '템플릿이 수정되었습니다.' };
  } catch (err) {
    console.error('updateClassTemplate 오류:', err);
    throw err;
  }
};

/** 템플릿 삭제 */
export const deleteClassTemplate = async (id: number): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.from('class_templates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, data: null, message: '템플릿이 삭제되었습니다.' };
  } catch (err) {
    console.error('deleteClassTemplate 오류:', err);
    throw err;
  }
};
