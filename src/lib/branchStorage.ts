const getScopedKey = (key: string, branchId?: string | number) => {
  const resolvedBranchId = String(branchId ?? localStorage.getItem('branchId') ?? '1');
  return `settings_${resolvedBranchId}_${key}`;
};

export function readBranchJson<T>(key: string, fallback: T, branchId?: string | number): T {
  try {
    const raw = localStorage.getItem(getScopedKey(key, branchId));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeBranchJson<T>(key: string, value: T, branchId?: string | number): void {
  localStorage.setItem(getScopedKey(key, branchId), JSON.stringify(value));
}

export function removeBranchValue(key: string, branchId?: string | number): void {
  localStorage.removeItem(getScopedKey(key, branchId));
}
