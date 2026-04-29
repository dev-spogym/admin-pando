type StoredAuthUser = {
  isSuperAdmin?: boolean;
  branchId?: string | number | null;
  currentBranchId?: string | number | null;
};

export function isAllBranchValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || value === 'all';
}

function readStoredUser(): StoredAuthUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) as StoredAuthUser : null;
  } catch {
    return null;
  }
}

function parseBranchId(value: unknown): number | null {
  if (isAllBranchValue(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getBranchScope(): { isAllBranches: boolean; branchId: number } {
  const user = readStoredUser();
  const storedBranchId = typeof window !== 'undefined' ? localStorage.getItem('branchId') : null;
  const currentBranchId = user?.currentBranchId;
  const isAllBranches = user?.isSuperAdmin === true && isAllBranchValue(currentBranchId);

  const branchId =
    parseBranchId(currentBranchId) ??
    parseBranchId(storedBranchId) ??
    parseBranchId(user?.branchId) ??
    1;

  return { isAllBranches, branchId };
}

export function getScopedBranchId(): number {
  return getBranchScope().branchId;
}

export function isAllBranchesSelected(): boolean {
  return getBranchScope().isAllBranches;
}
