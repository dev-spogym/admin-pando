/** 브라우저 localStorage에서 branchId 가져오기 (SSR 안전) */
export const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export const getBranchIdStr = (): string => {
  if (typeof window === 'undefined') return '1';
  return localStorage.getItem('branchId') || '1';
};
