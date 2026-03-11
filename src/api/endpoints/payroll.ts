/**
 * 급여 관련 API 함수
 */
import apiClient from '../client';
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
}

/** 급여 명세서 */
export interface PayrollStatement {
  payroll: Payroll;
  details: {
    label: string;
    amount: number;
    type: 'INCOME' | 'DEDUCTION';
  }[];
}

/** 급여 목록 조회 */
export const getPayroll = async (
  params?: PaginationParams & { year?: number; month?: number; staffId?: number }
): Promise<ApiResponse<PaginatedResponse<Payroll>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Payroll>>>('/payroll', { params });
  // return response.data;

  void apiClient; void params;
  const mockList: Payroll[] = [
    { id: 1, staffId: 1, staffName: '김트레이너', year: 2024, month: 3, baseSalary: 3000000, bonus: 200000, deduction: 150000, netSalary: 3050000, status: 'PAID' },
    { id: 2, staffId: 2, staffName: '이매니저', year: 2024, month: 3, baseSalary: 4000000, deduction: 200000, netSalary: 3800000, status: 'PENDING' },
  ];
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 10, total: 2, totalPages: 1 },
    },
  };
};

/** 급여 명세서 조회 */
export const getPayrollStatement = async (payrollId: number): Promise<ApiResponse<PayrollStatement>> => {
  // const response = await apiClient.get<ApiResponse<PayrollStatement>>(`/payroll/${payrollId}/statement`);
  // return response.data;

  void payrollId;
  return {
    success: true,
    data: {
      payroll: {
        id: payrollId,
        staffId: 1,
        staffName: '김트레이너',
        year: 2024,
        month: 3,
        baseSalary: 3000000,
        bonus: 200000,
        deduction: 150000,
        netSalary: 3050000,
        status: 'PAID',
      },
      details: [
        { label: '기본급', amount: 3000000, type: 'INCOME' },
        { label: '성과급', amount: 200000, type: 'INCOME' },
        { label: '국민연금', amount: 90000, type: 'DEDUCTION' },
        { label: '건강보험', amount: 60000, type: 'DEDUCTION' },
      ],
    },
  };
};
