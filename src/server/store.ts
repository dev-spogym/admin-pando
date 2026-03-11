// ============================================================
// FitGenie CRM 2.0 - In-Memory Store with localStorage Persistence
// ============================================================

import {
  SEED_MEMBERS,
  SEED_STAFF,
  SEED_STAFF_ATTENDANCE,
  SEED_SALES,
  SEED_PRODUCTS,
  SEED_ATTENDANCE,
  SEED_LOCKERS,
  SEED_DASHBOARD_STATS,
  SEED_BIRTHDAY_MEMBERS,
  SEED_UNPAID_MEMBERS,
  SEED_HOLDING_MEMBERS,
  SEED_EXPIRING_MEMBERS,
} from './mockData';

import type {
  Member,
  Staff,
  StaffAttendance,
  Sale,
  Product,
  AttendanceRecord,
  Locker,
  DashboardStats,
  BirthdayMember,
  UnpaidMember,
  HoldingMember,
  ExpiringMember,
} from './types';

// --- Storage Key Prefix ---
const STORAGE_PREFIX = 'fitgenie_';

// --- Generic Collection Store ---
class Collection<T extends { id: number | string }> {
  private items: T[];
  private storageKey: string;
  private listeners: Set<() => void> = new Set();

  constructor(key: string, seedData: T[]) {
    this.storageKey = STORAGE_PREFIX + key;
    this.items = this.loadFromStorage() ?? [...seedData];
  }

  private loadFromStorage(): T[] | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch {
      // localStorage full or unavailable - continue with in-memory only
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- CRUD ---

  getAll(): T[] {
    return [...this.items];
  }

  getById(id: number | string): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  query(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  paginate(page: number, pageSize: number, predicate?: (item: T) => boolean) {
    const filtered = predicate ? this.items.filter(predicate) : [...this.items];
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);
    return { data, total, page, pageSize, totalPages };
  }

  create(item: T): T {
    this.items.push(item);
    this.saveToStorage();
    this.notify();
    return item;
  }

  update(id: number | string, partial: Partial<T>): T | null {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...partial };
    this.saveToStorage();
    this.notify();
    return this.items[index];
  }

  delete(id: number | string): boolean {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    this.saveToStorage();
    this.notify();
    return true;
  }

  nextId(): number {
    const maxId = this.items.reduce((max, item) => {
      const numId = typeof item.id === 'number' ? item.id : parseInt(item.id, 10);
      return isNaN(numId) ? max : Math.max(max, numId);
    }, 0);
    return maxId + 1;
  }

  count(predicate?: (item: T) => boolean): number {
    return predicate ? this.items.filter(predicate).length : this.items.length;
  }

  reset(seedData: T[]): void {
    this.items = [...seedData];
    this.saveToStorage();
    this.notify();
  }
}

// --- Singleton Value Store ---
class ValueStore<T> {
  private value: T;
  private storageKey: string;

  constructor(key: string, seedData: T) {
    this.storageKey = STORAGE_PREFIX + key;
    const stored = this.loadFromStorage();
    this.value = stored ?? structuredClone(seedData);
  }

  private loadFromStorage(): T | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.value));
    } catch {
      // continue in-memory
    }
  }

  get(): T {
    return structuredClone(this.value);
  }

  set(newValue: T): void {
    this.value = structuredClone(newValue);
    this.saveToStorage();
  }

  update(partial: Partial<T>): void {
    this.value = { ...this.value, ...partial };
    this.saveToStorage();
  }
}

// ============================================================
// Store Instances
// ============================================================

export const memberStore = new Collection<Member>('members', SEED_MEMBERS);
export const staffStore = new Collection<Staff>('staff', SEED_STAFF);
export const staffAttendanceStore = new Collection<StaffAttendance>('staffAttendance', SEED_STAFF_ATTENDANCE);
export const salesStore = new Collection<Sale>('sales', SEED_SALES);
export const productStore = new Collection<Product>('products', SEED_PRODUCTS);
export const attendanceStore = new Collection<AttendanceRecord>('attendance', SEED_ATTENDANCE);
export const lockerStore = new Collection<Locker>('lockers', SEED_LOCKERS);

export const dashboardStatsStore = new ValueStore<DashboardStats>('dashboardStats', SEED_DASHBOARD_STATS);
export const birthdayMemberStore = new Collection<BirthdayMember>('birthdayMembers', SEED_BIRTHDAY_MEMBERS);
export const unpaidMemberStore = new Collection<UnpaidMember>('unpaidMembers', SEED_UNPAID_MEMBERS);
export const holdingMemberStore = new Collection<HoldingMember>('holdingMembers', SEED_HOLDING_MEMBERS);
export const expiringMemberStore = new Collection<ExpiringMember>('expiringMembers', SEED_EXPIRING_MEMBERS);

// --- Reset all data to seed ---
export function resetAllStores(): void {
  memberStore.reset(SEED_MEMBERS);
  staffStore.reset(SEED_STAFF);
  staffAttendanceStore.reset(SEED_STAFF_ATTENDANCE);
  salesStore.reset(SEED_SALES);
  productStore.reset(SEED_PRODUCTS);
  attendanceStore.reset(SEED_ATTENDANCE);
  lockerStore.reset(SEED_LOCKERS);
  dashboardStatsStore.set(SEED_DASHBOARD_STATS);
  birthdayMemberStore.reset(SEED_BIRTHDAY_MEMBERS);
  unpaidMemberStore.reset(SEED_UNPAID_MEMBERS);
  holdingMemberStore.reset(SEED_HOLDING_MEMBERS);
  expiringMemberStore.reset(SEED_EXPIRING_MEMBERS);

  // Clear all localStorage keys with our prefix
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}
