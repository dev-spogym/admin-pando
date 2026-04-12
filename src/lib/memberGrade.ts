// 회원 등급 유틸 - 가입일 기준 기간제 등급

export type MemberGrade = {
  grade: "bronze" | "silver" | "gold" | "diamond";
  label: string;
  emoji: string;
  color: string; // 배경색 (Tailwind 클래스)
};

/**
 * 가입일로부터 경과 기간에 따라 등급 반환
 * - 브론즈: 기본 (3개월 미만)
 * - 실버: 3개월 이상
 * - 골드: 6개월 이상
 * - 다이아: 12개월 이상
 */
export function getMemberGrade(registeredAt: string | null | undefined): MemberGrade {
  if (!registeredAt) {
    return { grade: "bronze", label: "브론즈", emoji: "🥉", color: "bg-amber-100 text-amber-700" };
  }

  const registered = new Date(registeredAt);
  const now = new Date();
  const diffMonths =
    (now.getFullYear() - registered.getFullYear()) * 12 +
    (now.getMonth() - registered.getMonth());

  if (diffMonths >= 12) {
    return { grade: "diamond", label: "다이아", emoji: "💎", color: "bg-cyan-100 text-cyan-700" };
  }
  if (diffMonths >= 6) {
    return { grade: "gold", label: "골드", emoji: "🥇", color: "bg-yellow-100 text-yellow-700" };
  }
  if (diffMonths >= 3) {
    return { grade: "silver", label: "실버", emoji: "🥈", color: "bg-slate-100 text-slate-600" };
  }
  return { grade: "bronze", label: "브론즈", emoji: "🥉", color: "bg-amber-100 text-amber-700" };
}
