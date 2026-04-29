export const LESSON_SESSION_TYPES = ['PT', '필라테스', '스트레칭', '테라피'] as const;

export type LessonSessionType = (typeof LESSON_SESSION_TYPES)[number];
export type LessonSessionBucket = LessonSessionType | '기타';

export type LessonSessionCounts = Record<LessonSessionType, number>;

export function createLessonSessionCounts(): LessonSessionCounts {
  return {
    PT: 0,
    필라테스: 0,
    스트레칭: 0,
    테라피: 0,
  };
}

export function formatLessonSessionType(type: LessonSessionBucket): string {
  if (type === '필라테스') return '필라';
  return type;
}

export function deriveLessonSessionType(...values: unknown[]): LessonSessionBucket {
  const text = values
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map((value) => String(value).toLowerCase())
    .join(' ');

  if (!text) return '기타';
  if (text.includes('스트레칭') || text.includes('stretch')) return '스트레칭';
  if (text.includes('테라피') || text.includes('therapy')) return '테라피';
  if (text.includes('필라') || text.includes('pilates')) return '필라테스';
  if (/\bp\.?t\b/i.test(text) || text.includes('피티') || text.includes('personal')) return 'PT';
  return '기타';
}
