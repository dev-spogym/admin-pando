export type TodayTaskCategory =
  | "상담"
  | "재등록"
  | "출석회복"
  | "PT관리"
  | "운영"
  | "매출"
  | "수업";

export type TodayTaskPriority = "긴급" | "높음" | "보통";
export type TodayTaskStatus = "대기" | "진행중" | "완료";

export interface TodayTask {
  id: string;
  title: string;
  description: string;
  category: TodayTaskCategory;
  priority: TodayTaskPriority;
  status: TodayTaskStatus;
  assigneeRole: "hq" | "branch" | "fc" | "trainer" | "staff";
  branchName: string;
  dueLabel: string;
  memberName?: string;
}

const categoryTemplates: Array<{
  category: TodayTaskCategory;
  priority: TodayTaskPriority;
  assigneeRole: TodayTask["assigneeRole"];
  titlePrefix: string;
  descriptionPrefix: string;
}> = [
  { category: "상담", priority: "높음", assigneeRole: "fc", titlePrefix: "신규 상담 후속 연락", descriptionPrefix: "상담 이력 확인 후 후속 연락을 진행하세요." },
  { category: "재등록", priority: "긴급", assigneeRole: "fc", titlePrefix: "만료 임박 재등록 안내", descriptionPrefix: "만료 임박 회원에게 재등록 제안을 전달하세요." },
  { category: "출석회복", priority: "높음", assigneeRole: "fc", titlePrefix: "장기 미방문 회복 연락", descriptionPrefix: "최근 방문이 없는 회원의 복귀를 유도하세요." },
  { category: "PT관리", priority: "보통", assigneeRole: "trainer", titlePrefix: "PT 잔여 세션 체크", descriptionPrefix: "세션 소진 임박 회원의 상태를 확인하세요." },
  { category: "운영", priority: "보통", assigneeRole: "branch", titlePrefix: "운영 점검 확인", descriptionPrefix: "당일 운영 체크리스트를 완료하세요." },
  { category: "매출", priority: "높음", assigneeRole: "branch", titlePrefix: "미수금 결제 일정 확인", descriptionPrefix: "미수금 회원의 결제 일정과 응답 상태를 점검하세요." },
  { category: "수업", priority: "보통", assigneeRole: "trainer", titlePrefix: "수업 참석률 확인", descriptionPrefix: "당일 수업 예약자와 결석 위험 회원을 확인하세요." },
  { category: "운영", priority: "긴급", assigneeRole: "hq", titlePrefix: "지점 KPI 이슈 확인", descriptionPrefix: "성과 저하 지점의 원인과 조치 계획을 확인하세요." },
  { category: "운영", priority: "보통", assigneeRole: "staff", titlePrefix: "프론트 응대 품질 점검", descriptionPrefix: "프론트 응대 로그와 누락된 요청을 정리하세요." },
  { category: "PT관리", priority: "높음", assigneeRole: "trainer", titlePrefix: "노쇼 회원 재예약", descriptionPrefix: "노쇼 회원에게 재예약 가능 시간을 제안하세요." },
];

const memberNames = [
  "김민지", "이도현", "박세린", "정유나", "최서준",
  "한지민", "오민석", "강하늘", "윤수아", "조현우",
];

const branchNames = ["강남점", "송도점", "분당점", "마곡점", "잠실점"];
const dueLabels = ["즉시", "오늘 11:00", "오늘 14:00", "오늘 17:00", "퇴근 전", "이번 주"];

const TASK_POOL: TodayTask[] = Array.from({ length: 100 }, (_, index) => {
  const template = categoryTemplates[index % categoryTemplates.length];
  const memberName = memberNames[index % memberNames.length];
  const branchName = branchNames[index % branchNames.length];
  const dueLabel = dueLabels[index % dueLabels.length];

  return {
    id: `hq-task-${index + 1}`,
    title: `${template.titlePrefix} ${index + 1}`,
    description: `${template.descriptionPrefix} 대상 회원: ${memberName}`,
    category: template.category,
    priority: template.priority,
    status: index % 7 === 0 ? "완료" : index % 5 === 0 ? "진행중" : "대기",
    assigneeRole: template.assigneeRole,
    branchName,
    dueLabel,
    memberName,
  };
});

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededShuffle<T>(items: T[], seedValue: string): T[] {
  const result = [...items];
  let seed = hashSeed(seedValue);

  for (let i = result.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function mapUserRoleToTaskRole(role: string, isSuperAdmin: boolean): TodayTask["assigneeRole"] {
  if (isSuperAdmin) return "hq";

  switch (role) {
    case "OWNER":
    case "MANAGER":
    case "primary":
    case "owner":
    case "manager":
      return "branch";
    case "TRAINER":
      return "trainer";
    case "STAFF":
    case "RECEPTIONIST":
      return "staff";
    case "fc":
      return "fc";
    default:
      return "branch";
  }
}

export function getTodayTasks(params: {
  dateKey: string;
  branchName?: string;
  role: string;
  isSuperAdmin?: boolean;
}): TodayTask[] {
  const taskRole = mapUserRoleToTaskRole(params.role, params.isSuperAdmin ?? false);
  const shuffled = seededShuffle(TASK_POOL, `${params.dateKey}-${params.branchName ?? "전체"}-${taskRole}`);

  const filtered = shuffled.filter((task) => {
    const roleMatch = taskRole === "hq" ? true : task.assigneeRole === taskRole || task.assigneeRole === "branch";
    const branchMatch = !params.branchName || params.branchName === "전체 지점" ? true : task.branchName === params.branchName;
    return roleMatch && branchMatch;
  });

  return filtered.slice(0, taskRole === "hq" ? 18 : 12);
}
