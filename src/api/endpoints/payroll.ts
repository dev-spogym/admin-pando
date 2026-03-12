/**
 * 급여 관련 API 함수 (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 급여 항목 */
export interface Payroll {
  id: number;
  staffId: number;
  staffName: string;
  year: number;
  month: number;
  baseSalary: number;
  bonus?: number;
  deduction?: number;
  netSalary: number;
  paidAt?: string;
  status: 'PENDING' | 'PAID';
  details?: PayrollDetail[];
}

/** 급여 명세 항목 */
export interface PayrollDetail {
  label: string;
  amount: number;
  type: 'INCOME' | 'DEDUCTION';
}

/** 급여 명세서 */
export interface PayrollStatement {
  payroll: Payroll;
  details: PayrollDetail[];
}

/** 급여 생성 요청 */
export interface PayrollRequest {
  staffId: number;
  staffName: string;
  year: number;
  month: number;
  baseSalary: number;
  bonus?: number;
  deduction?: number;
  details?: PayrollDetail[];
}

/** 급여 목록 조회 */
export const getPayroll = async (
  params?: PaginationParams & { year?: number; month?: number; staffId?: number }
): Promise<ApiResponse<PaginatedResponse<Payroll>>> => {
  try {
    const page = params?.page ?? 1;
    const size = params?.size ?? 20;
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = supabase
      .from('payroll')
      .select('*', { count: 'exact' })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .range(from, to);

    if (params?.year) {
      query = query.eq('year', params.year);
    }

    if (params?.month) {
      query = query.eq('month', params.month);
    }

    if (params?.staffId) {
      query = query.eq('staffId', params.staffId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    return {
      success: true,
      data: {
        data: (data ?? []) as Payroll[],
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '급여 목록 조회에 실패했습니다.';
    return { success: false, data: { data: [], pagination: { page: 1, size: 20, total: 0, totalPages: 0 } }, message };
  }
};

/** 급여 명세서 조회 */
export const getPayrollStatement = async (payrollId: number): Promise<ApiResponse<PayrollStatement>> => {
  try {
    const { data, error } = await supabase
      .from('payroll')
      .select('*')
      .eq('id', payrollId)
      .single();

    if (error) throw error;

    const payroll = data as Payroll;
    const details: PayrollDetail[] = Array.isArray(payroll.details) ? payroll.details : [];

    return {
      success: true,
      data: { payroll, details },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '급여 명세서 조회에 실패했습니다.';
    return { success: false, data: null as unknown as PayrollStatement, message };
  }
};

/** 급여 생성 */
export const createPayroll = async (data: PayrollRequest): Promise<ApiResponse<Payroll>> => {
  try {
    const netSalary = data.baseSalary + (data.bonus ?? 0) - (data.deduction ?? 0);

    const { data: inserted, error } = await supabase
      .from('payroll')
      .insert({
        ...data,
        netSalary,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: inserted as Payroll,
      message: '급여가 등록되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '급여 등록에 실패했습니다.';
    return { success: false, data: null as unknown as Payroll, message };
  }
};

/** 급여 지급 처리 */
export const processPayroll = async (payrollId: number): Promise<ApiResponse<Payroll>> => {
  try {
    const { data: updated, error } = await supabase
      .from('payroll')
      .update({
        status: 'PAID',
        paidAt: new Date().toISOString(),
      })
      .eq('id', payrollId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updated as Payroll,
      message: '급여가 지급 처리되었습니다.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '급여 지급 처리에 실패했습니다.';
    return { success: false, data: null as unknown as Payroll, message };
  }
};
