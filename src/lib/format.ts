/** 금액 포맷 (₩1,234,567) */
export const formatKRW = (amount: number | null | undefined): string => {
  if (amount == null) return '₩0';
  return `₩${amount.toLocaleString()}`;
};

/** 금액 포맷 (원 단위 없이 숫자만: 1,234,567) */
export const formatNumber = (n: number | null | undefined): string => {
  if (n == null) return '0';
  return n.toLocaleString();
};

/** 건수 포맷 (123건) */
export const formatCount = (n: number | null | undefined, unit = '건'): string => {
  if (n == null) return `0${unit}`;
  return `${n.toLocaleString()}${unit}`;
};

/** 날짜 포맷 (2026-04-13) */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
};

/** 날짜+시간 포맷 (2026-04-13 09:30) */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

/** 전화번호 포맷 (010-1234-5678) */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  return phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
};
