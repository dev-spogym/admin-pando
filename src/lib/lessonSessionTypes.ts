// 강습 세션 유형은 docs4 명세(SCR-C001 등)에 따라 PT / GX / 골프 / 기타 4종으로 고정합니다.
// KPI 집계(강습세션수) 및 수업 목록·통계·강사 현황 화면에서 공통으로 사용합니다.
export const LESSON_SESSION_TYPES = ['PT', 'GX', '골프'] as const;

export type LessonSessionType = (typeof LESSON_SESSION_TYPES)[number];
export type LessonSessionBucket = LessonSessionType | '기타';

export type LessonSessionCounts = Record<LessonSessionType, number>;

export function createLessonSessionCounts(): LessonSessionCounts {
  return {
    PT: 0,
    GX: 0,
    골프: 0,
  };
}

export function formatLessonSessionType(type: LessonSessionBucket): string {
  return type;
}

export function deriveLessonSessionType(...values: unknown[]): LessonSessionBucket {
  const text = values
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map((value) => String(value).toLowerCase())
    .join(' ');

  if (!text) return '기타';
  if (text.includes('골프') || text.includes('golf')) return '골프';
  if (
    text.includes('gx') ||
    text.includes('요가') ||
    text.includes('yoga') ||
    text.includes('필라') ||
    text.includes('pilates') ||
    text.includes('스피닝') ||
    text.includes('spinning') ||
    text.includes('줌바') ||
    text.includes('zumba') ||
    text.includes('스트레칭') ||
    text.includes('stretch')
  ) {
    return 'GX';
  }
  if (/\bp\.?t\b/i.test(text) || text.includes('피티') || text.includes('personal')) return 'PT';
  return '기타';
}
