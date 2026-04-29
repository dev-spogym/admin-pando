export type BoardKey = 'hq' | 'branch' | 'fc' | 'trainer' | 'operations';
export type Tone = 'success' | 'info' | 'default' | 'error';
export type MetricIconKey =
  | 'activity'
  | 'bell'
  | 'building'
  | 'calendar'
  | 'coins'
  | 'message'
  | 'refresh'
  | 'shield'
  | 'target'
  | 'trending'
  | 'userCheck'
  | 'users'
  | 'alert';

export interface KpiCenterMetric {
  label: string;
  value: string;
  description: string;
  iconKey: MetricIconKey;
  variant?: 'default' | 'mint' | 'peach';
}

export interface KpiCenterQueueItem {
  title: string;
  owner: string;
  due: string;
  level: Tone;
}

export interface KpiCenterRankingItem {
  label: string;
  value: string;
  delta: string;
}

export interface KpiCenterFunnelItem {
  step: string;
  value: string;
  change: string;
}

export interface KpiCenterRuleItem {
  label: string;
  status: string;
  tone: Tone;
}

export interface KpiCenterGoalItem {
  label: string;
  rate: string;
}

export interface KpiCenterRiskItem {
  label: string;
  count: string;
  tone: Tone;
}

export interface KpiCenterBoardContent {
  subtitle: string;
  metrics: KpiCenterMetric[];
  queueTitle: string;
  queue: KpiCenterQueueItem[];
  rankingTitle: string;
  ranking: KpiCenterRankingItem[];
  funnelTitle: string;
  funnel: KpiCenterFunnelItem[];
  insightTitle: string;
  insights: string[];
  rules: KpiCenterRuleItem[];
  goals: KpiCenterGoalItem[];
  risks: KpiCenterRiskItem[];
}

export const KPI_CENTER_BOARD_KEYS: BoardKey[] = ['hq', 'branch', 'fc', 'trainer', 'operations'];

export function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(snapshotDate: string, branchId: number, boardKey: BoardKey) {
  return mulberry32(hashSeed(`${snapshotDate}:${branchId}:${boardKey}`));
}

function int(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, values: readonly T[]) {
  return values[int(rng, 0, values.length - 1)];
}

function pickUnique<T>(rng: () => number, values: readonly T[], count: number) {
  const pool = [...values];
  const result: T[] = [];

  while (pool.length > 0 && result.length < count) {
    const index = int(rng, 0, pool.length - 1);
    const [item] = pool.splice(index, 1);
    result.push(item);
  }

  return result;
}

function signedPct(rng: () => number, min: number, max: number) {
  const value = int(rng, min, max);
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function percent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function count(value: number) {
  return value.toLocaleString('ko-KR');
}

function moneyMan(man: number) {
  if (man >= 10000) return `${(man / 10000).toFixed(2)}억`;
  return `${count(man)}만원`;
}

const branches = ['강남점', '송도점', '분당점', '마곡점', '수원점', '판교점'];
const fcNames = ['FC 김민지', 'FC 박서연', 'FC 이지훈', 'FC 최유나', 'FC 정하준'];
const trainerNames = ['PT 이도현', 'PT 한지우', 'PT 박세린', 'PT 권태민', 'PT 오승현'];
const operationNames = ['프론트 정유나', '운영 김도윤', 'CRM 매니저', '시스템', '마케팅'];

function commonRules(rng: () => number): KpiCenterRuleItem[] {
  return [
    { label: 'Welcome Flow', status: int(rng, 55, 72) >= 60 ? '정상' : '관심', tone: int(rng, 0, 10) > 2 ? 'success' : 'info' },
    { label: '만료 예정 리마인드', status: int(rng, 28, 44) >= 32 ? '정상' : '관심', tone: int(rng, 0, 10) > 2 ? 'success' : 'info' },
    { label: 'Today Tasks 배정', status: int(rng, 86, 99) >= 90 ? '정상' : '점검', tone: int(rng, 0, 10) > 1 ? 'success' : 'default' },
  ];
}

function commonGoals(rng: () => number): KpiCenterGoalItem[] {
  return [
    { label: `신규 상담 ${int(rng, 8, 18)}건`, rate: `${int(rng, 48, 86)}%` },
    { label: `재등록 ${int(rng, 5, 12)}건`, rate: `${int(rng, 36, 78)}%` },
    { label: `노쇼 복구 ${int(rng, 2, 6)}건`, rate: `${int(rng, 28, 69)}%` },
  ];
}

function commonRisks(rng: () => number): KpiCenterRiskItem[] {
  return [
    { label: '10일 미방문 + PT 잔여', count: `${int(rng, 3, 11)}명`, tone: 'error' },
    { label: '만료 D-1 미응답', count: `${int(rng, 2, 9)}명`, tone: 'info' },
    { label: '리드 미응답 30분 초과', count: `${int(rng, 1, 7)}건`, tone: 'error' },
  ];
}

function hqBoard(snapshotDate: string): KpiCenterBoardContent {
  const rng = rngFor(snapshotDate, 0, 'hq');
  const revenue = int(rng, 42000, 64000);
  const activeMembers = int(rng, 2800, 4200);
  const [topBranch, retentionBranch, repurchaseBranch] = pickUnique(rng, branches, 3);
  const refund = int(rng, 1200, 3600);
  const renewal = int(rng, 512, 688) / 10;
  const lead = int(rng, 980, 1480);
  const consult = Math.round(lead * int(rng, 52, 67) / 100);
  const registered = Math.round(consult * int(rng, 31, 43) / 100);
  const renewals = Math.round(registered * int(rng, 54, 72) / 100);

  return {
    subtitle: '전사 성장률, 지점 비교, 이탈위험, 자동화 효율을 한 번에 관리합니다.',
    metrics: [
      { label: '전사 매출', value: moneyMan(revenue), description: `전월 대비 ${signedPct(rng, 4, 17)}`, iconKey: 'coins', variant: 'peach' },
      { label: '전사 활성 회원', value: `${count(activeMembers)}명`, description: '전 지점 활성 회원 합계', iconKey: 'users', variant: 'mint' },
      { label: '지점 성과 랭킹 1위', value: topBranch, description: `목표 달성 ${int(rng, 111, 128)}%`, iconKey: 'trending' },
      { label: 'FC 상담 전환율 평균', value: percent(int(rng, 318, 421) / 10), description: '전 지점 FC 평균', iconKey: 'message' },
      { label: '전사 환불 규모', value: moneyMan(refund), description: '지점별 환불액 SUM + 분산', iconKey: 'alert', variant: 'peach' },
      { label: '전사 재등록률', value: percent(renewal), description: '전지점 등록 / 재등록 상담', iconKey: 'refresh' },
      { label: '매출 편차율', value: `${int(rng, 12, 24)}%`, description: '지점 간 매출 표준편차 기준', iconKey: 'activity' },
    ],
    queueTitle: '본사 액션 큐',
    queue: [
      { title: '재등록 성공률 40% 이하 지점 코칭', owner: '운영총괄', due: '오늘 14:00', level: 'error' },
      { title: '환불 집중 지점 본사 개입 검토', owner: '운영총괄', due: '오늘', level: 'error' },
      { title: '신규 리드 응답 지연 지점 점검', owner: 'CRM 매니저', due: '오늘 16:00', level: 'info' },
      { title: '자동알림 시나리오 승인', owner: '마케팅', due: '내일', level: 'default' },
      { title: '운영비 급증 지점 원인 확인', owner: '재무', due: '이번 주', level: 'success' },
    ],
    rankingTitle: '지점 성과 랭킹',
    ranking: [
      { label: topBranch, value: `목표 달성 ${int(rng, 112, 132)}%`, delta: signedPct(rng, 8, 21) },
      { label: retentionBranch, value: `유지율 ${percent(int(rng, 884, 936) / 10)}`, delta: signedPct(rng, 2, 9) },
      { label: repurchaseBranch, value: `PT 재구매 ${int(rng, 31, 43)}%`, delta: signedPct(rng, 4, 12) },
      { label: '전지점 표준편차', value: `${count(int(rng, 620, 1120))}만원`, delta: '매출 격차 정량화' },
    ],
    funnelTitle: '전사 퍼널 요약',
    funnel: [
      { step: '리드 유입', value: count(lead), change: signedPct(rng, 6, 18) },
      { step: '상담 완료', value: count(consult), change: signedPct(rng, 3, 12) },
      { step: '등록 전환', value: count(registered), change: signedPct(rng, 2, 9) },
      { step: '재등록', value: count(renewals), change: signedPct(rng, 1, 7) },
    ],
    insightTitle: '전사 인사이트',
    insights: [
      `${topBranch}의 목표 달성률이 가장 높고, 응답 속도 30분 이내 비중도 상위권입니다.`,
      '환불 규모가 높은 지점은 고객 불만, 결제 오류, 계약 이슈를 분리해 본사 개입 여부를 판단합니다.',
      '매출 편차율이 커지면 운영 표준화와 지점 교육 우선순위를 재조정합니다.',
    ],
    rules: commonRules(rng),
    goals: commonGoals(rng),
    risks: commonRisks(rng),
  };
}

function branchBoard(snapshotDate: string, branchId: number, branchName: string): KpiCenterBoardContent {
  const rng = rngFor(snapshotDate, branchId, 'branch');
  const revenue = int(rng, 2800, 5600);
  const newMembers = int(rng, 18, 46);
  const renewal = int(rng, 522, 704) / 10;
  const unpaid = int(rng, 120, 620);
  const consult = int(rng, 72, 128);
  const visited = Math.round(consult * int(rng, 58, 76) / 100);
  const registered = Math.round(visited * int(rng, 36, 52) / 100);

  return {
    subtitle: '지점장이 오늘 바로 확인해야 할 목표, 팀 실행률, 재등록 우선순위를 모읍니다.',
    metrics: [
      { label: '이번달 매출', value: moneyMan(revenue), description: `월 목표 ${int(rng, 72, 96)}% 달성`, iconKey: 'coins', variant: 'peach' },
      { label: '신규 등록', value: `${newMembers}명`, description: '이번달 신규 회원', iconKey: 'users', variant: 'mint' },
      { label: '재등록 성공률', value: percent(renewal), description: '등록 / 재등록 상담 전체', iconKey: 'calendar' },
      { label: '미수금 총액', value: moneyMan(unpaid), description: '미결제 누적 금액', iconKey: 'shield' },
    ],
    queueTitle: '오늘 우선 액션',
    queue: [
      { title: '만료 예정 회원 재등록 상담 배정', owner: 'FC팀', due: '오늘', level: 'error' },
      { title: 'PT 노쇼 복구 메시지 발송', owner: '트레이너', due: '오늘', level: 'info' },
      { title: '저녁 시간대 GX 증설 여부 확인', owner: '운영', due: '오늘', level: 'default' },
      { title: '미수금 회원 결제 일정 확인', owner: '프론트', due: '18:00', level: 'success' },
    ],
    rankingTitle: `${branchName} 팀 KPI 스냅샷`,
    ranking: [
      { label: pick(rng, fcNames), value: `상담 전환 ${int(rng, 34, 48)}%`, delta: signedPct(rng, 2, 9) },
      { label: pick(rng, trainerNames), value: `재구매 ${int(rng, 28, 42)}%`, delta: signedPct(rng, 2, 8) },
      { label: 'GX 박세린', value: `출석률 ${int(rng, 78, 91)}%`, delta: signedPct(rng, 1, 5) },
      { label: pick(rng, operationNames), value: `태스크 완료 ${int(rng, 88, 98)}%`, delta: signedPct(rng, 3, 13) },
    ],
    funnelTitle: '지점 운영 퍼널',
    funnel: [
      { step: '신규 상담', value: count(consult), change: signedPct(rng, 5, 14) },
      { step: '방문', value: count(visited), change: signedPct(rng, 3, 10) },
      { step: '등록', value: count(registered), change: signedPct(rng, 2, 8) },
      { step: '초기 활성화', value: count(Math.round(registered * int(rng, 70, 88) / 100)), change: signedPct(rng, 1, 6) },
    ],
    insightTitle: '지점 인사이트',
    insights: [
      '방문 이후 등록 전환은 양호하지만 신규 상담 예약 단계에서 이탈이 큽니다.',
      '저녁 7시 이후 출석 비중이 높아 해당 시간대 트레이너 배치를 늘릴 필요가 있습니다.',
      '만료예정 회원 중 PT 잔여 세션 보유자가 재구매 우선순위 상단에 올라와 있습니다.',
    ],
    rules: commonRules(rng),
    goals: commonGoals(rng),
    risks: commonRisks(rng),
  };
}

function fcBoard(snapshotDate: string, branchId: number): KpiCenterBoardContent {
  const rng = rngFor(snapshotDate, branchId, 'fc');
  const leads = int(rng, 24, 48);
  const firstResponse = Math.round(leads * int(rng, 76, 92) / 100);
  const booked = Math.round(firstResponse * int(rng, 42, 58) / 100);
  const registered = Math.round(booked * int(rng, 48, 68) / 100);

  return {
    subtitle: 'FC가 신규 리드와 재등록 리스트를 놓치지 않도록 응대 큐와 전환 지표 중심으로 구성합니다.',
    metrics: [
      { label: '신규 리드', value: `${leads}건`, description: `오늘 유입 / 미응답 ${leads - firstResponse}건`, iconKey: 'users', variant: 'mint' },
      { label: 'TI 방문 전환율', value: `${int(rng, 31, 43)}%`, description: '전화문의 중 대면 상담 전환', iconKey: 'message' },
      { label: 'WI 등록률', value: `${int(rng, 44, 58)}%`, description: '방문문의 중 등록 완료', iconKey: 'trending', variant: 'peach' },
      { label: 'TI 등록률', value: `${int(rng, 24, 36)}%`, description: '전화문의 중 등록 완료', iconKey: 'bell' },
    ],
    queueTitle: 'FC 실행 큐',
    queue: [
      { title: `10분 이상 미응답 리드 ${int(rng, 2, 6)}건`, owner: '나', due: '즉시', level: 'error' },
      { title: '어제 방문 후 미등록 회원 후속 연락', owner: '나', due: '13:30', level: 'info' },
      { title: '만료 D-1 회원 재등록 제안', owner: '나', due: '오늘', level: 'default' },
      { title: '상담 결과 미기입 정리', owner: '나', due: '퇴근 전', level: 'success' },
    ],
    rankingTitle: 'FC 개인 KPI',
    ranking: [
      { label: '상담 건수', value: `${leads}건`, delta: '담당자별' },
      { label: '상담→등록률', value: `${Math.round(registered / Math.max(leads, 1) * 100)}%`, delta: '등록 / 전체' },
      { label: '등록 건수', value: `${registered}건`, delta: 'A열=등록' },
      { label: '미응답 리드', value: `${leads - firstResponse}건`, delta: '즉시 처리' },
    ],
    funnelTitle: 'FC 퍼널',
    funnel: [
      { step: '리드 유입', value: count(leads), change: signedPct(rng, 2, 9) },
      { step: '첫 응답', value: count(firstResponse), change: `${Math.round(firstResponse / leads * 100)}%` },
      { step: '상담 예약', value: count(booked), change: `${Math.round(booked / leads * 100)}%` },
      { step: '등록 완료', value: count(registered), change: `${Math.round(registered / leads * 100)}%` },
    ],
    insightTitle: '응대 인사이트',
    insights: [
      '리드 유입은 충분하지만 첫 응답 속도 편차가 커서 예약률이 흔들릴 수 있습니다.',
      '체험 완료 회원의 후속조치 메모가 정리되면 등록 전환 관리가 쉬워집니다.',
      '만료 예정 회원 중 출석 빈도가 높은 회원은 재등록 가능성이 높습니다.',
    ],
    rules: commonRules(rng),
    goals: commonGoals(rng),
    risks: commonRisks(rng),
  };
}

function trainerBoard(snapshotDate: string, branchId: number): KpiCenterBoardContent {
  const rng = rngFor(snapshotDate, branchId, 'trainer');
  const ptSales = int(rng, 820, 1680);
  const otAssigned = int(rng, 12, 26);
  const otCompleted = Math.round(otAssigned * int(rng, 62, 84) / 100);
  const otRegistered = Math.round(otCompleted * int(rng, 42, 68) / 100);

  return {
    subtitle: '트레이너가 회원 세션 상태, 노쇼 복구, 재구매 기회를 바로 확인할 수 있도록 구성합니다.',
    metrics: [
      { label: '이번달 PT 매출', value: moneyMan(ptSales), description: '개인 PT 누적 매출', iconKey: 'coins', variant: 'peach' },
      { label: 'OT 배정 합계', value: `${otAssigned}건`, description: '[강습업무보고] E열 합계', iconKey: 'users', variant: 'mint' },
      { label: 'OT 등록 전환율', value: `${Math.round(otRegistered / Math.max(otCompleted, 1) * 100)}%`, description: '등록 / OT 진행', iconKey: 'activity' },
      { label: 'OT 체험→등록률', value: `${int(rng, 23, 37)}%`, description: 'OT 체험 등록 / 체험 대상', iconKey: 'trending' },
    ],
    queueTitle: '트레이너 액션 큐',
    queue: [
      { title: `노쇼 회원 ${int(rng, 1, 4)}명 재예약 제안`, owner: '나', due: '수업 후', level: 'error' },
      { title: '잔여 2회 회원 재구매 상담 요청', owner: 'FC 연계', due: '오늘', level: 'info' },
      { title: '체험 회원 후기 회수', owner: '나', due: '오늘', level: 'default' },
      { title: '주간 소화율 70% 미만 회원 체크', owner: '나', due: '이번 주', level: 'success' },
    ],
    rankingTitle: '트레이너 개인 KPI',
    ranking: [
      { label: '신규 매출', value: moneyMan(int(rng, 340, 720)), delta: '주간신규' },
      { label: '재등록 매출', value: moneyMan(int(rng, 520, 980)), delta: '주간재등록' },
      { label: 'OT 1차 예정', value: `${int(rng, 3, 8)}건`, delta: '이번 주' },
      { label: 'OT 2차 예정', value: `${int(rng, 2, 6)}건`, delta: '후속 진행' },
    ],
    funnelTitle: 'PT 퍼널',
    funnel: [
      { step: '체험 제안', value: count(int(rng, 18, 30)), change: signedPct(rng, 2, 8) },
      { step: '체험 참여', value: count(otCompleted), change: `${Math.round(otCompleted / otAssigned * 100)}%` },
      { step: '구매', value: count(otRegistered), change: `${Math.round(otRegistered / Math.max(otCompleted, 1) * 100)}%` },
      { step: '재구매', value: count(int(rng, 3, 8)), change: `${int(rng, 14, 26)}%` },
    ],
    insightTitle: '세션 인사이트',
    insights: [
      '체험 참여까지는 무난하지만 첫 4회 정착률을 높일 여지가 있습니다.',
      '노쇼 회원은 24시간 이내 재연락 시 복구율이 높습니다.',
      '완강 직전 회원에게 체형 변화나 성과 요약을 보여주면 재구매 전환이 좋아집니다.',
    ],
    rules: commonRules(rng),
    goals: commonGoals(rng),
    risks: commonRisks(rng),
  };
}

function operationsBoard(snapshotDate: string, branchId: number): KpiCenterBoardContent {
  const rng = rngFor(snapshotDate, branchId, 'operations');
  const attendance = int(rng, 130, 240);
  const expiring = int(rng, 32, 74);
  const unpaidCount = int(rng, 7, 18);
  const gxRate = int(rng, 68, 88);
  const trigger = int(rng, 190, 310);
  const generated = Math.round(trigger * int(rng, 94, 99) / 100);
  const sent = Math.round(generated * int(rng, 93, 98) / 100);

  return {
    subtitle: '자동알림, Today Tasks, 중복방지, 운영 로그 상태를 한 화면에서 관리합니다.',
    metrics: [
      { label: '오늘 출석', value: `${attendance}명`, description: '오늘 센터 출석 회원수', iconKey: 'userCheck', variant: 'mint' },
      { label: '만료 예정', value: `${expiring}명`, description: '30일 내 이용권 만료 회원', iconKey: 'calendar' },
      { label: '미결제 건수', value: `${unpaidCount}건`, description: '미수금 처리 대기 건수', iconKey: 'alert', variant: 'peach' },
      { label: '이번달 GX 가동률', value: `${gxRate}%`, description: 'GX 수업 정원 대비 출석률', iconKey: 'activity' },
    ],
    queueTitle: '자동화 운영 큐',
    queue: [
      { title: '만료 D-1 실패 발송 재시도', owner: '시스템', due: '즉시', level: 'error' },
      { title: '7일 미방문 트리거 템플릿 점검', owner: '운영', due: '오늘', level: 'info' },
      { title: 'PT 잔여 세션 알림 규칙 검수', owner: 'CRM', due: '이번 주', level: 'default' },
      { title: '중복 방지 로그 정리', owner: '운영', due: '정기', level: 'success' },
    ],
    rankingTitle: '운영 모듈 상태',
    ranking: [
      { label: 'Welcome Flow', value: '정상', delta: `오픈율 ${int(rng, 55, 72)}%` },
      { label: '만료 리마인드', value: '정상', delta: `응답률 ${int(rng, 27, 42)}%` },
      { label: '미방문 회복', value: pick(rng, ['관심', '정상']), delta: '전환 추적' },
      { label: 'PT 잔여 알림', value: '확장 가능', delta: '룰 추가' },
    ],
    funnelTitle: '운영 실행 흐름',
    funnel: [
      { step: 'Trigger 감지', value: count(trigger), change: signedPct(rng, 8, 22) },
      { step: '메시지 생성', value: count(generated), change: `${Math.round(generated / trigger * 100)}%` },
      { step: '발송 완료', value: count(sent), change: `${Math.round(sent / generated * 100)}%` },
      { step: '후속 액션 생성', value: count(Math.round(sent * int(rng, 14, 24) / 100)), change: `${int(rng, 14, 24)}%` },
    ],
    insightTitle: '운영 인사이트',
    insights: [
      '환영 알림과 만료 리마인드는 규칙 기반으로만 운영해도 충분히 효과를 볼 수 있습니다.',
      'Today Tasks는 본사 업무 풀을 랜덤 배정하는 방식으로 먼저 운영할 수 있습니다.',
      '중복방지 로그와 발송 상태를 같이 보여주면 운영자가 규칙 신뢰도를 쉽게 판단할 수 있습니다.',
    ],
    rules: commonRules(rng),
    goals: commonGoals(rng),
    risks: commonRisks(rng),
  };
}

export function buildKpiCenterBoards(params: {
  snapshotDate: string;
  branchId: number;
  branchName?: string;
}): Record<BoardKey, KpiCenterBoardContent> {
  const branchName = params.branchName || '센터';
  return {
    hq: hqBoard(params.snapshotDate),
    branch: branchBoard(params.snapshotDate, params.branchId, branchName),
    fc: fcBoard(params.snapshotDate, params.branchId),
    trainer: trainerBoard(params.snapshotDate, params.branchId),
    operations: operationsBoard(params.snapshotDate, params.branchId),
  };
}
