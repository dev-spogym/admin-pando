// ============================================================
// FitGenie CRM 2.0 - API Client
// ============================================================
// fetch() 와 동일한 인터페이스로 가상 서버 호출
// 나중에 실제 서버로 전환 시 baseURL만 변경하면 됨

import { virtualFetch, type VirtualResponse } from './api';
import type { HttpMethod } from './types';

// --- Configuration ---
interface ClientConfig {
  baseUrl: string;
  defaultDelay: number;
  useVirtual: boolean; // true = 가상서버, false = 실제서버
}

const config: ClientConfig = {
  baseUrl: '/api',
  defaultDelay: 300,
  useVirtual: true, // ← 실제 서버 전환 시 false로 변경
};

export function configureClient(partial: Partial<ClientConfig>) {
  Object.assign(config, partial);
}

// --- API Client ---
class ApiClient {
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    options: { params?: Record<string, any>; body?: any } = {}
  ): Promise<VirtualResponse<T>> {
    const url = `/api${endpoint}`;

    if (config.useVirtual) {
      return virtualFetch<T>(url, {
        method,
        params: options.params,
        body: options.body,
        delay: config.defaultDelay,
      });
    }

    // 실제 서버 모드 (향후 전환용)
    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let fetchUrl = `${config.baseUrl}${endpoint}`;
    if (options.params && method === 'GET') {
      const qs = new URLSearchParams(
        Object.entries(options.params)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString();
      if (qs) fetchUrl += `?${qs}`;
    }

    const res = await fetch(fetchUrl, fetchOptions);
    const data = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  get<T>(endpoint: string, params?: Record<string, any>) {
    return this.request<T>('GET', endpoint, { params });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>('POST', endpoint, { body });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>('PUT', endpoint, { body });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>('PATCH', endpoint, { body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>('DELETE', endpoint);
  }
}

export const api = new ApiClient();

// ============================================================
// Domain-Specific API Functions
// ============================================================

import type {
  Member,
  Staff,
  Sale,
  Product,
  AttendanceRecord,
  Locker,
  PaginatedResponse,
} from './types';

// --- Members ---
export const memberApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<Member[]>('/members', params),

  getPage: (page: number, pageSize: number, filters?: Record<string, any>) =>
    api.get<PaginatedResponse<Member>>('/members', { page, pageSize, ...filters }),

  getById: (id: number) =>
    api.get<Member>(`/members/${id}`),

  create: (data: Omit<Member, 'id'>) =>
    api.post<Member>('/members', data),

  update: (id: number, data: Partial<Member>) =>
    api.put<Member>(`/members/${id}`, data),

  patch: (id: number, data: Partial<Member>) =>
    api.patch<Member>(`/members/${id}`, data),

  delete: (id: number) =>
    api.delete(`/members/${id}`),

  getStats: () =>
    api.get('/members/stats/summary'),
};

// --- Staff ---
export const staffApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<Staff[]>('/staff', params),

  getById: (id: number) =>
    api.get<Staff>(`/staff/${id}`),

  create: (data: Omit<Staff, 'id'>) =>
    api.post<Staff>('/staff', data),

  update: (id: number, data: Partial<Staff>) =>
    api.put<Staff>(`/staff/${id}`, data),

  delete: (id: number) =>
    api.delete(`/staff/${id}`),

  getAttendance: (date?: string) =>
    api.get('/staff/attendance', date ? { date } : undefined),
};

// --- Sales ---
export const salesApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<Sale[]>('/sales', params),

  getPage: (page: number, pageSize: number, filters?: Record<string, any>) =>
    api.get<PaginatedResponse<Sale>>('/sales', { page, pageSize, ...filters }),

  getById: (id: number) =>
    api.get<Sale>(`/sales/${id}`),

  create: (data: Omit<Sale, 'id'>) =>
    api.post<Sale>('/sales', data),

  update: (id: number, data: Partial<Sale>) =>
    api.put<Sale>(`/sales/${id}`, data),

  delete: (id: number) =>
    api.delete(`/sales/${id}`),

  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/sales/stats/summary', params),
};

// --- Products ---
export const productApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<Product[]>('/products', params),

  getById: (id: number) =>
    api.get<Product>(`/products/${id}`),

  create: (data: Omit<Product, 'id'>) =>
    api.post<Product>('/products', data),

  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data),

  delete: (id: number) =>
    api.delete(`/products/${id}`),
};

// --- Attendance ---
export const attendanceApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<AttendanceRecord[]>('/attendance', params),

  create: (data: Omit<AttendanceRecord, 'id'>) =>
    api.post<AttendanceRecord>('/attendance', data),
};

// --- Lockers ---
export const lockerApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<Locker[]>('/lockers', params),

  getById: (id: string) =>
    api.get<Locker>(`/lockers/${id}`),

  update: (id: string, data: Partial<Locker>) =>
    api.patch<Locker>(`/lockers/${id}`, data),
};

// --- Dashboard ---
export const dashboardApi = {
  getStats: () =>
    api.get('/dashboard/stats'),

  getBirthdayMembers: () =>
    api.get('/dashboard/birthday-members'),

  getUnpaidMembers: () =>
    api.get('/dashboard/unpaid-members'),

  getHoldingMembers: () =>
    api.get('/dashboard/holding-members'),

  getExpiringMembers: () =>
    api.get('/dashboard/expiring-members'),
};

// --- System ---
export const systemApi = {
  health: () =>
    api.get('/system/health'),

  reset: () =>
    api.post('/system/reset'),
};
