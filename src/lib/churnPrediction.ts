/**
 * 회원 이탈 예측 모델
 *
 * 5가지 변수로 이탈 위험도를 0~100 점수로 계산:
 * - 최근 출석 빈도 감소 (30%)
 * - 만료일 임박 (20%)
 * - PT 잔여 횟수 소진 (15%)
 * - 장기 미방문 (25%)
 * - 상담 미응답 (10%)
 *
 * 위험 등급:
 * - 🔴 높음 (70+)
 * - 🟡 보통 (40~69)
 * - 🟢 낮음 (<40)
 */

export type ChurnRisk = 'high' | 'medium' | 'low';

export interface ChurnPrediction {
  score: number;         // 0~100
  risk: ChurnRisk;       // high/medium/low
  factors: string[];     // 위험 요인 목록
}

interface MemberChurnData {
  status: string;
  membershipExpiry?: string | null;
  lastVisitDate?: string | null;
  remainingSessions?: number | null;
  recentAttendanceCount?: number;   // 최근 2주 출석 수
  previousAttendanceCount?: number; // 이전 2주 출석 수
  hasUnrespondedConsultation?: boolean;
}

/**
 * 회원의 이탈 위험도를 계산합니다.
 */
export function predictChurn(member: MemberChurnData): ChurnPrediction {
  let score = 0;
  const factors: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 만료 회원은 이미 이탈
  if (member.status === 'EXPIRED') {
    return { score: 95, risk: 'high', factors: ['회원권 만료'] };
  }

  // 홀딩/정지 중은 별도 처리
  if (member.status !== 'ACTIVE') {
    return { score: 30, risk: 'low', factors: ['비활성 상태'] };
  }

  // 1. 출석 빈도 감소 (30%)
  const recent = member.recentAttendanceCount ?? 0;
  const previous = member.previousAttendanceCount ?? 0;
  if (previous > 0 && recent < previous * 0.5) {
    score += 30;
    factors.push('출석 빈도 50%+ 감소');
  } else if (previous > 0 && recent < previous * 0.7) {
    score += 15;
    factors.push('출석 빈도 감소 추세');
  }

  // 2. 만료일 임박 (20%)
  if (member.membershipExpiry) {
    const expiry = new Date(member.membershipExpiry);
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) {
      score += 20;
      factors.push(`만료 D-${daysLeft}`);
    } else if (daysLeft <= 30) {
      score += 10;
      factors.push(`만료 D-${daysLeft}`);
    }
  }

  // 3. PT 잔여 횟수 소진 (15%)
  if (member.remainingSessions !== null && member.remainingSessions !== undefined) {
    if (member.remainingSessions <= 0) {
      score += 15;
      factors.push('PT 횟수 소진');
    } else if (member.remainingSessions <= 3) {
      score += 8;
      factors.push(`PT 잔여 ${member.remainingSessions}회`);
    }
  }

  // 4. 장기 미방문 (25%)
  if (member.lastVisitDate) {
    const lastVisit = new Date(member.lastVisitDate);
    lastVisit.setHours(0, 0, 0, 0);
    const daysSinceVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceVisit >= 30) {
      score += 25;
      factors.push(`${daysSinceVisit}일 미방문`);
    } else if (daysSinceVisit >= 14) {
      score += 15;
      factors.push(`${daysSinceVisit}일 미방문`);
    } else if (daysSinceVisit >= 7) {
      score += 5;
      factors.push(`${daysSinceVisit}일 미방문`);
    }
  } else {
    // 방문 기록 없음
    score += 20;
    factors.push('방문 기록 없음');
  }

  // 5. 상담 미응답 (10%)
  if (member.hasUnrespondedConsultation) {
    score += 10;
    factors.push('재등록 상담 미응답');
  }

  // 점수 제한
  score = Math.min(100, Math.max(0, score));

  // 위험 등급 결정
  let risk: ChurnRisk;
  if (score >= 70) risk = 'high';
  else if (score >= 40) risk = 'medium';
  else risk = 'low';

  return { score, risk, factors };
}

/**
 * 위험 등급에 따른 배지 색상 반환
 */
export function getChurnBadgeColor(risk: ChurnRisk): string {
  switch (risk) {
    case 'high': return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'low': return 'bg-green-100 text-green-700';
  }
}

/**
 * 위험 등급 한글 라벨
 */
export function getChurnLabel(risk: ChurnRisk): string {
  switch (risk) {
    case 'high': return '이탈 위험';
    case 'medium': return '주의 필요';
    case 'low': return '안정';
  }
}
