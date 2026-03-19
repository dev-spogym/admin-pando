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
      .eq('branchId', resolvedBranchId)
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
      .insert({ ...payload, branchId })
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
  try {
    const { data, error } = await supabase
      .from('class_templates')
      .update(payload)
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
