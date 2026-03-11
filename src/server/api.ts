// ============================================================
// FitGenie CRM 2.0 - Virtual API Router & Handlers
// ============================================================
// REST API 패턴을 그대로 사용하되, 실제 네트워크 없이 in-memory로 동작
// 네트워크 지연을 시뮬레이션하여 실제 서버와 동일한 UX 제공

import type { RouteHandler, HttpMethod } from './types';
import {
  memberStore,
  staffStore,
  staffAttendanceStore,
  salesStore,
  productStore,
  attendanceStore,
  lockerStore,
  dashboardStatsStore,
  birthdayMemberStore,
  unpaidMemberStore,
  holdingMemberStore,
  expiringMemberStore,
  resetAllStores,
} from './store';

// --- Network Delay Simulation ---
const DEFAULT_DELAY = 300; // ms
const MIN_DELAY = 100;
const MAX_DELAY = 800;

function randomDelay(): number {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY)) + MIN_DELAY;
}

async function simulateDelay(ms?: number): Promise<void> {
  const delay = ms ?? randomDelay();
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// --- Route Registration ---
const routes: RouteHandler[] = [];

function route(method: HttpMethod, pattern: string, handler: RouteHandler['handler']) {
  // Convert "/api/members/:id" → /^\/api\/members\/([^/]+)$/
  const regexStr = pattern
    .replace(/:[a-zA-Z]+/g, '([^/]+)')
    .replace(/\//g, '\\/');
  routes.push({ method, pattern: new RegExp(`^${regexStr}$`), handler });
}

// ============================================================
// API Routes
// ============================================================

// --- Members ---
route('GET', '/api/members', (params) => {
  const { page, pageSize, status, search, gender, manager } = params;
  const predicate = (m: any) => {
    if (status && status !== 'all' && m.status !== status) return false;
    if (gender && m.gender !== gender) return false;
    if (manager && m.manager !== manager) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.attendanceNo?.includes(q);
    }
    return true;
  };
  if (page && pageSize) {
    return memberStore.paginate(Number(page), Number(pageSize), predicate);
  }
  return memberStore.query(predicate);
});

route('GET', '/api/members/:id', (_params, _body, pathParams) => {
  const member = memberStore.getById(Number(pathParams!.id));
  if (!member) throw { code: 404, message: '회원을 찾을 수 없습니다.' };
  return member;
});

route('POST', '/api/members', (_params, body) => {
  const newMember = { ...body, id: memberStore.nextId() };
  return memberStore.create(newMember);
});

route('PUT', '/api/members/:id', (_params, body, pathParams) => {
  const updated = memberStore.update(Number(pathParams!.id), body);
  if (!updated) throw { code: 404, message: '회원을 찾을 수 없습니다.' };
  return updated;
});

route('PATCH', '/api/members/:id', (_params, body, pathParams) => {
  const updated = memberStore.update(Number(pathParams!.id), body);
  if (!updated) throw { code: 404, message: '회원을 찾을 수 없습니다.' };
  return updated;
});

route('DELETE', '/api/members/:id', (_params, _body, pathParams) => {
  const deleted = memberStore.delete(Number(pathParams!.id));
  if (!deleted) throw { code: 404, message: '회원을 찾을 수 없습니다.' };
  return { deleted: true };
});

// --- Members Stats ---
route('GET', '/api/members/stats/summary', () => {
  const all = memberStore.getAll();
  return {
    total: all.length,
    active: all.filter((m) => m.status === 'active').length,
    imminent: all.filter((m) => m.status === 'imminent').length,
    expired: all.filter((m) => m.status === 'expired').length,
    holding: all.filter((m) => m.status === 'holding').length,
    pending: all.filter((m) => m.status === 'pending').length,
  };
});

// --- Staff ---
route('GET', '/api/staff', (params) => {
  const { status, role, search } = params;
  return staffStore.query((s) => {
    if (status && status !== 'all' && s.status !== status) return false;
    if (role && s.role !== role) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.contact.includes(q);
    }
    return true;
  });
});

route('GET', '/api/staff/:id', (_params, _body, pathParams) => {
  const staff = staffStore.getById(Number(pathParams!.id));
  if (!staff) throw { code: 404, message: '직원을 찾을 수 없습니다.' };
  return staff;
});

route('POST', '/api/staff', (_params, body) => {
  return staffStore.create({ ...body, id: staffStore.nextId() });
});

route('PUT', '/api/staff/:id', (_params, body, pathParams) => {
  const updated = staffStore.update(Number(pathParams!.id), body);
  if (!updated) throw { code: 404, message: '직원을 찾을 수 없습니다.' };
  return updated;
});

route('DELETE', '/api/staff/:id', (_params, _body, pathParams) => {
  const deleted = staffStore.delete(Number(pathParams!.id));
  if (!deleted) throw { code: 404, message: '직원을 찾을 수 없습니다.' };
  return { deleted: true };
});

// --- Staff Attendance ---
route('GET', '/api/staff/attendance', (params) => {
  const { date } = params;
  if (date) {
    return staffAttendanceStore.query((a) => a.date === date);
  }
  return staffAttendanceStore.getAll();
});

// --- Sales ---
route('GET', '/api/sales', (params) => {
  const { page, pageSize, type, status, search, startDate, endDate } = params;
  const predicate = (s: any) => {
    if (type && type !== 'all' && s.type !== type) return false;
    if (status && status !== 'all' && s.status !== status) return false;
    if (startDate && s.purchaseDate < startDate) return false;
    if (endDate && s.purchaseDate > endDate + ' 23:59:59') return false;
    if (search) {
      const q = search.toLowerCase();
      return s.buyer.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q) ||
        s.manager.toLowerCase().includes(q);
    }
    return true;
  };
  if (page && pageSize) {
    return salesStore.paginate(Number(page), Number(pageSize), predicate);
  }
  return salesStore.query(predicate);
});

route('GET', '/api/sales/:id', (_params, _body, pathParams) => {
  const sale = salesStore.getById(Number(pathParams!.id));
  if (!sale) throw { code: 404, message: '매출 정보를 찾을 수 없습니다.' };
  return sale;
});

route('POST', '/api/sales', (_params, body) => {
  return salesStore.create({ ...body, id: salesStore.nextId() });
});

route('PUT', '/api/sales/:id', (_params, body, pathParams) => {
  const updated = salesStore.update(Number(pathParams!.id), body);
  if (!updated) throw { code: 404, message: '매출 정보를 찾을 수 없습니다.' };
  return updated;
});

route('DELETE', '/api/sales/:id', (_params, _body, pathParams) => {
  const deleted = salesStore.delete(Number(pathParams!.id));
  if (!deleted) throw { code: 404, message: '매출 정보를 찾을 수 없습니다.' };
  return { deleted: true };
});

// --- Sales Summary ---
route('GET', '/api/sales/stats/summary', (params) => {
  const { startDate, endDate } = params;
  const sales = salesStore.query((s) => {
    if (startDate && s.purchaseDate < startDate) return false;
    if (endDate && s.purchaseDate > endDate + ' 23:59:59') return false;
    return true;
  });
  return sales.reduce(
    (acc, curr) => ({
      totalSales: acc.totalSales + curr.salePrice,
      totalCash: acc.totalCash + curr.cash,
      totalCard: acc.totalCard + curr.card,
      totalMileage: acc.totalMileage + curr.mileage,
      totalUnpaid: acc.totalUnpaid + curr.unpaid,
      totalDiscount: acc.totalDiscount + curr.discountPrice,
      count: acc.count + 1,
    }),
    { totalSales: 0, totalCash: 0, totalCard: 0, totalMileage: 0, totalUnpaid: 0, totalDiscount: 0, count: 0 }
  );
});

// --- Products ---
route('GET', '/api/products', (params) => {
  const { categoryKey, status, search } = params;
  return productStore.query((p) => {
    if (categoryKey && categoryKey !== 'all' && p.categoryKey !== categoryKey) return false;
    if (status && p.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.subCategory.toLowerCase().includes(q);
    }
    return true;
  });
});

route('GET', '/api/products/:id', (_params, _body, pathParams) => {
  const product = productStore.getById(Number(pathParams!.id));
  if (!product) throw { code: 404, message: '상품을 찾을 수 없습니다.' };
  return product;
});

route('POST', '/api/products', (_params, body) => {
  return productStore.create({ ...body, id: productStore.nextId() });
});

route('PUT', '/api/products/:id', (_params, body, pathParams) => {
  const updated = productStore.update(Number(pathParams!.id), body);
  if (!updated) throw { code: 404, message: '상품을 찾을 수 없습니다.' };
  return updated;
});

route('DELETE', '/api/products/:id', (_params, _body, pathParams) => {
  const deleted = productStore.delete(Number(pathParams!.id));
  if (!deleted) throw { code: 404, message: '상품을 찾을 수 없습니다.' };
  return { deleted: true };
});

// --- Attendance ---
route('GET', '/api/attendance', (params) => {
  const { date, type, status, search } = params;
  return attendanceStore.query((a) => {
    if (type && type !== 'all' && a.type !== type) return false;
    if (status && status !== 'all' && a.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.memberName.toLowerCase().includes(q) || a.tel.includes(q);
    }
    return true;
  });
});

route('POST', '/api/attendance', (_params, body) => {
  return attendanceStore.create({ ...body, id: attendanceStore.nextId() });
});

// --- Lockers ---
route('GET', '/api/lockers', (params) => {
  const { type, area, status } = params;
  return lockerStore.query((l) => {
    if (type && l.type !== type) return false;
    if (area && l.area !== area) return false;
    if (status && status !== 'all' && l.status !== status) return false;
    return true;
  });
});

route('GET', '/api/lockers/:id', (_params, _body, pathParams) => {
  const locker = lockerStore.getById(pathParams!.id);
  if (!locker) throw { code: 404, message: '락커를 찾을 수 없습니다.' };
  return locker;
});

route('PATCH', '/api/lockers/:id', (_params, body, pathParams) => {
  const updated = lockerStore.update(pathParams!.id, body);
  if (!updated) throw { code: 404, message: '락커를 찾을 수 없습니다.' };
  return updated;
});

// --- Dashboard ---
route('GET', '/api/dashboard/stats', () => {
  return dashboardStatsStore.get();
});

route('GET', '/api/dashboard/birthday-members', () => {
  return birthdayMemberStore.getAll();
});

route('GET', '/api/dashboard/unpaid-members', () => {
  return unpaidMemberStore.getAll();
});

route('GET', '/api/dashboard/holding-members', () => {
  return holdingMemberStore.getAll();
});

route('GET', '/api/dashboard/expiring-members', () => {
  return expiringMemberStore.getAll();
});

// --- System ---
route('POST', '/api/system/reset', () => {
  resetAllStores();
  return { message: '모든 데이터가 초기화되었습니다.' };
});

route('GET', '/api/system/health', () => {
  return { status: 'ok', timestamp: new Date().toISOString(), mode: 'virtual' };
});

// ============================================================
// Virtual API Router
// ============================================================

export interface VirtualResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  message?: string;
  timestamp: string;
}

export async function virtualFetch<T = any>(
  url: string,
  options: {
    method?: HttpMethod;
    params?: Record<string, any>;
    body?: any;
    delay?: number;
  } = {}
): Promise<VirtualResponse<T>> {
  const method = options.method ?? 'GET';
  const timestamp = new Date().toISOString();

  // Simulate network delay
  await simulateDelay(options.delay ?? DEFAULT_DELAY);

  // Build full URL with query params for GET
  let fullUrl = url;
  if (options.params && method === 'GET') {
    const queryString = Object.entries(options.params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    if (queryString) fullUrl += `?${queryString}`;
  }

  // Find matching route
  for (const r of routes) {
    if (r.method !== method) continue;

    // Extract path (without query string)
    const path = fullUrl.split('?')[0];
    const match = path.match(r.pattern);
    if (!match) continue;

    // Extract path params
    const pathParamNames = (url.match(/:[a-zA-Z]+/g) || []).map((p) => p.slice(1));
    const pathParams: Record<string, string> = {};
    pathParamNames.forEach((name, i) => {
      pathParams[name] = match[i + 1];
    });

    // Merge query params
    const allParams = { ...options.params };
    if (method === 'GET' && fullUrl.includes('?')) {
      const searchParams = new URLSearchParams(fullUrl.split('?')[1]);
      searchParams.forEach((v, k) => {
        allParams[k] = v;
      });
    }

    try {
      const data = r.handler(allParams, options.body, pathParams);
      console.log(`[VirtualAPI] ${method} ${url} → 200`, data);
      return { ok: true, status: 200, data: data as T, timestamp };
    } catch (err: any) {
      const code = err?.code ?? 500;
      const message = err?.message ?? '서버 오류가 발생했습니다.';
      console.warn(`[VirtualAPI] ${method} ${url} → ${code}`, message);
      return { ok: false, status: code, data: null as any, message, timestamp };
    }
  }

  // No route matched
  console.warn(`[VirtualAPI] ${method} ${url} → 404 (No route)`);
  return {
    ok: false,
    status: 404,
    data: null as any,
    message: `API 엔드포인트를 찾을 수 없습니다: ${method} ${url}`,
    timestamp,
  };
}
