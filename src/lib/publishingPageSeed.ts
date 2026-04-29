import { getKstDateString } from '@/lib/kpiCenterSeed';

export { getKstDateString };

export type PublishingSeedRoute =
  | '/class-feedback'
  | '/class-waitlist'
  | '/analytics/forecast'
  | '/attendance/qr'
  | '/cleaning-schedule'
  | '/class-recording'
  | '/consumables'
  | '/equipment-check'
  | '/products/catalog'
  | '/products/compare'
  | '/products/inventory'
  | '/products/seasonal-price'
  | '/members/family'
  | '/members/segment';

export type ForecastDirection = 'up' | 'down';

export interface ClassFeedbackSeedPayload {
  feedbacks: Array<{
    id: number;
    member: string;
    class: string;
    instructor: string;
    date: string;
    rating: number;
    comment: string;
  }>;
  summary: {
    monthlyReviews: number;
    responseRate: number;
    fiveStarRate: number;
  };
}

export interface ClassWaitlistSeedPayload {
  waitlist: Array<{
    id: number;
    member: string;
    class: string;
    requested: string;
    rank: number;
    status: '대기중' | '배정가능' | '취소';
  }>;
  summary: {
    notificationSent: number;
  };
}

export interface ClassRecordingSeedPayload {
  recordings: Array<{
    id: number;
    class: string;
    instructor: string;
    date: string;
    duration: string;
    size: string;
    status: '완료' | '처리중' | '오류';
    viewers: number;
  }>;
  summary: {
    monthlyRecordings: number;
    totalStorageGb: number;
    totalViews: number;
    remainingStorageGb: number;
  };
}

export interface AnalyticsForecastSeedPayload {
  predictions: Array<{
    metric: string;
    value: string;
    change: string;
    direction: ForecastDirection;
    confidence: number;
    basis: string;
  }>;
  riskMembers: Array<{
    name: string;
    risk: number;
    lastVisit: string;
    signal: string;
  }>;
}

export interface AttendanceQrSeedPayload {
  recentCheckins: Array<{
    id: number;
    member: string;
    time: string;
    class: string;
    method: 'QR' | '수동';
    status: '출석' | '지각' | '결석';
  }>;
  summary: {
    present: number;
    late: number;
    absent: number;
    qr: number;
    manual: number;
    qrRate: number;
  };
}

export interface CleaningScheduleSeedPayload {
  schedule: Array<{
    id: number;
    area: string;
    frequency: string;
    time: string;
    assignee: string;
    lastDone: string;
    status: '완료' | '예정';
  }>;
  todayLog: Array<{
    time: string;
    area: string;
    staff: string;
    done: boolean;
  }>;
  summary: {
    weekCompletionRate: number;
  };
}

export interface ConsumablesSeedPayload {
  consumables: Array<{
    id: number;
    name: string;
    unit: string;
    stock: number;
    minStock: number;
    reorderPoint: number;
    lastOrder: string;
    status: '충분' | '부족' | '발주필요';
  }>;
}

export interface EquipmentCheckSeedPayload {
  equipment: Array<{
    id: number;
    name: string;
    location: string;
    lastCheck: string;
    nextCheck: string;
    status: '정상' | '점검필요' | '수리중';
    issue: string | null;
  }>;
}

export interface ProductCatalogSeedPayload {
  products: Array<{
    id: number;
    name: string;
    category: string;
    price: number;
    desc: string;
    active: boolean;
    popular: boolean;
  }>;
}

export interface ProductCompareSeedPayload {
  compareProducts: Array<{
    name: string;
    price: number;
    category: string;
    duration: string;
    sessions: string;
    groupClass: boolean;
    locker: boolean;
    gx: boolean;
    transfer: boolean;
  }>;
}

export interface ProductInventorySeedPayload {
  inventory: Array<{
    id: number;
    name: string;
    category: string;
    stock: number;
    sold: number;
    remaining: number;
    alert: boolean;
  }>;
  history: Array<{
    date: string;
    product: string;
    type: '입고' | '판매';
    qty: number;
    balance: number;
  }>;
}

export interface ProductSeasonalPriceSeedPayload {
  seasonalPrices: Array<{
    id: number;
    name: string;
    product: string;
    original: number;
    discounted: number;
    rate: number;
    start: string;
    end: string;
    status: '진행중' | '예정' | '종료';
  }>;
}

export interface MemberFamilySeedPayload {
  families: Array<{
    id: number;
    main: string;
    members: string[];
    joined: string;
  }>;
}

export interface MemberSegmentSeedPayload {
  segments: Array<{
    id: number;
    name: string;
    desc: string;
    count: number;
    color: string;
    auto: boolean;
  }>;
}

export type PublishingPageSeedPayloadMap = {
  '/class-feedback': ClassFeedbackSeedPayload;
  '/class-waitlist': ClassWaitlistSeedPayload;
  '/class-recording': ClassRecordingSeedPayload;
  '/analytics/forecast': AnalyticsForecastSeedPayload;
  '/attendance/qr': AttendanceQrSeedPayload;
  '/cleaning-schedule': CleaningScheduleSeedPayload;
  '/consumables': ConsumablesSeedPayload;
  '/equipment-check': EquipmentCheckSeedPayload;
  '/products/catalog': ProductCatalogSeedPayload;
  '/products/compare': ProductCompareSeedPayload;
  '/products/inventory': ProductInventorySeedPayload;
  '/products/seasonal-price': ProductSeasonalPriceSeedPayload;
  '/members/family': MemberFamilySeedPayload;
  '/members/segment': MemberSegmentSeedPayload;
};

export type PublishingPageSeedPayload = PublishingPageSeedPayloadMap[PublishingSeedRoute];

export const PUBLISHING_SEED_ROUTES: PublishingSeedRoute[] = [
  '/class-feedback',
  '/class-waitlist',
  '/class-recording',
  '/analytics/forecast',
  '/attendance/qr',
  '/cleaning-schedule',
  '/consumables',
  '/equipment-check',
  '/products/catalog',
  '/products/compare',
  '/products/inventory',
  '/products/seasonal-price',
  '/members/family',
  '/members/segment',
];

const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '송'];
const firstNames = [
  '민준',
  '서연',
  '지훈',
  '유리',
  '현우',
  '하윤',
  '도윤',
  '수아',
  '지우',
  '태민',
  '예린',
  '준호',
  '나은',
  '서준',
  '다현',
  '지민',
];
const instructors = ['이효리', '김태희', '정지훈', '박재범', '한지우', '오승현'];
const classNames = ['필라테스 A반', '요가 기초반', '스피닝 B반', 'PT 기초반', '근력순환반', '재활 스트레칭'];
const classSlots = ['월 11:00', '화 10:00', '수 18:00', '목 09:00', '금 20:00', '토 12:00'];
const reviewComments = [
  '강사님이 자세를 바로 잡아줘서 다음 수업도 예약했습니다.',
  '수업 흐름은 좋았지만 대기 공간 안내가 조금 더 필요합니다.',
  '운동 강도가 적절하고 설명이 쉬워서 만족도가 높았습니다.',
  '음악 볼륨과 마이크 밸런스를 조정하면 더 좋겠습니다.',
  '초보자도 따라갈 수 있게 난이도 조절이 잘 되었습니다.',
  '수업 후 피드백이 구체적이라 재수강 의향이 있습니다.',
];
const riskSignals = ['방문 빈도 급감', '만료 D-10 미재등록', '장기 미방문', '최근 예약 취소 3회', '출석률 30%대'];
const consumableTemplates = [
  { name: '위생 타월', unit: '롤', minStock: 20, reorderPoint: 30 },
  { name: '소독제 (500ml)', unit: '병', minStock: 10, reorderPoint: 15 },
  { name: '운동복 (S)', unit: '벌', minStock: 10, reorderPoint: 20 },
  { name: '운동복 (M)', unit: '벌', minStock: 10, reorderPoint: 20 },
  { name: '일회용 물병', unit: '박스', minStock: 10, reorderPoint: 15 },
  { name: '손소독제 (1L)', unit: '통', minStock: 5, reorderPoint: 8 },
];
const cleaningAreas = ['탈의실 A', '헬스장 메인', '필라테스룸', '샤워실', '수영장', '로비', '상담실'];
const cleaningTeams = ['청소팀 A', '청소팀 B', '청소팀 C', '운영팀'];
const cleaningStaff = ['김청소', '이청소', '박청소', '최시설', '정운영'];
const equipmentTemplates = [
  { name: '트레드밀 #1', location: 'A존', issue: '벨트 장력 점검' },
  { name: '레그프레스 #2', location: 'B존', issue: '소음 발생' },
  { name: '스미스머신 #1', location: 'C존', issue: '안전바 유격' },
  { name: '러닝머신 #3', location: 'A존', issue: '벨트 마모' },
  { name: '케이블머신 #2', location: 'B존', issue: '풀리 교체' },
  { name: '덤벨 랙 #1', location: 'D존', issue: '고정핀 교체' },
];
const productTemplates = [
  { name: 'PT 10회권', category: 'PT', price: 500000, desc: '1:1 퍼스널 트레이닝 10회 이용권', stockMin: 110, stockMax: 180 },
  { name: '3개월 이용권', category: '이용권', price: 180000, desc: '헬스장 3개월 자유 이용', stockMin: 150, stockMax: 240 },
  { name: '필라테스 월정액', category: 'GX', price: 120000, desc: '필라테스 그룹 수업 월 무제한', stockMin: 60, stockMax: 110 },
  { name: 'PT 20회권', category: 'PT', price: 900000, desc: '1:1 퍼스널 트레이닝 20회 이용권', stockMin: 80, stockMax: 140 },
  { name: '6개월 이용권', category: '이용권', price: 320000, desc: '헬스장 6개월 자유 이용', stockMin: 90, stockMax: 160 },
  { name: '요가 10회권', category: 'GX', price: 80000, desc: '요가 그룹 수업 10회 이용권', stockMin: 50, stockMax: 95 },
];
const familyRelations = ['배우자', '자녀', '부모', '형제/자매'];
const segmentTemplates = [
  { name: '만료 임박 회원', desc: '30일 이내 이용권 만료 예정', color: 'text-red-600 bg-red-50 border-red-200' },
  { name: '장기 미방문', desc: '30일 이상 방문 없는 회원', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { name: '신규 가입 (30일)', desc: '최근 30일 이내 등록 회원', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { name: 'PT 미구매 회원', desc: 'PT 이용권 미보유 활성 회원', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { name: '생일 회원 (이번달)', desc: '이번 달 생일인 회원', color: 'text-pink-600 bg-pink-50 border-pink-200' },
];

export function isPublishingSeedRoute(route: string): route is PublishingSeedRoute {
  return PUBLISHING_SEED_ROUTES.includes(route as PublishingSeedRoute);
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

function rngFor(snapshotDate: string, branchId: number, route: string) {
  return mulberry32(hashSeed(`${snapshotDate}:${branchId}:${route}:v1`));
}

function int(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, values: readonly T[]) {
  return values[int(rng, 0, values.length - 1)];
}

function signedPct(rng: () => number, min: number, max: number) {
  const value = int(rng, min, max);
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function money(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function memberName(rng: () => number) {
  return `${pick(rng, surnames)}${pick(rng, firstNames)}`;
}

function dateOffset(snapshotDate: string, offset: number, separator: '-' | '.' = '-') {
  const [year, month, day] = snapshotDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return separator === '.' ? `${yyyy}.${mm}.${dd}` : `${yyyy}-${mm}-${dd}`;
}

function classFeedbackPayload(snapshotDate: string, branchId: number, branchName: string): ClassFeedbackSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/class-feedback');
  const feedbacks = Array.from({ length: 7 }, (_, index) => {
    const rating = Math.min(5, Math.max(3, int(rng, 3, 5) + (index % 3 === 0 ? 1 : 0)));
    return {
      id: branchId * 1000 + index + 1,
      member: memberName(rng),
      class: pick(rng, classNames),
      instructor: pick(rng, instructors),
      date: dateOffset(snapshotDate, -int(rng, 0, 5)),
      rating,
      comment: `${branchName} ${pick(rng, reviewComments)}`,
    };
  });
  const fiveStarCount = feedbacks.filter(item => item.rating === 5).length;

  return {
    feedbacks,
    summary: {
      monthlyReviews: int(rng, 42, 88),
      responseRate: int(rng, 64, 84),
      fiveStarRate: Math.round((fiveStarCount / feedbacks.length) * 100),
    },
  };
}

function classWaitlistPayload(snapshotDate: string, branchId: number): ClassWaitlistSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/class-waitlist');
  const waitlist = Array.from({ length: int(rng, 5, 9) }, (_, index) => {
    const status: ClassWaitlistSeedPayload['waitlist'][number]['status'] =
      index < 2 ? '배정가능' : pick(rng, ['대기중', '대기중', '취소'] as const);
    const className = `${pick(rng, classNames)} (${pick(rng, classSlots)})`;
    return {
      id: branchId * 1000 + index + 1,
      member: memberName(rng),
      class: className,
      requested: `${dateOffset(snapshotDate, -int(rng, 0, 3))} ${String(int(rng, 8, 21)).padStart(2, '0')}:${String(int(rng, 0, 59)).padStart(2, '0')}`,
      rank: int(rng, 1, 4),
      status,
    };
  });

  return {
    waitlist,
    summary: {
      notificationSent: waitlist.filter(item => item.status === '배정가능').length + int(rng, 1, 3),
    },
  };
}

function classRecordingPayload(snapshotDate: string, branchId: number): ClassRecordingSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/class-recording');
  const recordings = Array.from({ length: 6 }, (_, index) => {
    const status: ClassRecordingSeedPayload['recordings'][number]['status'] =
      index === 2 ? '처리중' : pick(rng, ['완료', '완료', '완료', '오류'] as const);
    const size = int(rng, 14, 28) / 10;
    return {
      id: branchId * 1000 + index + 1,
      class: pick(rng, classNames),
      instructor: pick(rng, instructors),
      date: dateOffset(snapshotDate, -index),
      duration: `${int(rng, 45, 60)}분`,
      size: `${size.toFixed(1)}GB`,
      status,
      viewers: status === '완료' ? int(rng, 4, 28) : 0,
    };
  });
  const totalViews = recordings.reduce((sum, item) => sum + item.viewers, 0);

  return {
    recordings,
    summary: {
      monthlyRecordings: int(rng, 36, 64),
      totalStorageGb: int(rng, 72, 126),
      totalViews,
      remainingStorageGb: int(rng, 320, 480),
    },
  };
}

function analyticsForecastPayload(snapshotDate: string, branchId: number, branchName: string): AnalyticsForecastSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/analytics/forecast');
  const revenue = int(rng, 3800, 7200) * 10000;
  const newMembers = int(rng, 24, 52);
  const riskCount = int(rng, 16, 34);
  const expiring = int(rng, 48, 86);

  return {
    predictions: [
      {
        metric: '다음 달 예상 매출',
        value: money(revenue),
        change: signedPct(rng, 4, 13),
        direction: 'up',
        confidence: int(rng, 78, 91),
        basis: `${branchName} 최근 90일 매출 + 재등록 예정`,
      },
      {
        metric: '예상 신규 등록',
        value: `${newMembers}명`,
        change: signedPct(rng, 6, 17),
        direction: 'up',
        confidence: int(rng, 68, 82),
        basis: '리드 전환율 + 캠페인 반응',
      },
      {
        metric: '예상 이탈 위험 회원',
        value: `${riskCount}명`,
        change: `+${int(rng, 2, 8)}명`,
        direction: 'up',
        confidence: int(rng, 76, 88),
        basis: '방문 패턴 이상 + 만료 임박',
      },
      {
        metric: '예상 만료 처리',
        value: `${expiring}명`,
        change: `-${int(rng, 2, 7)}%`,
        direction: 'down',
        confidence: int(rng, 86, 95),
        basis: '이용권 만료일 + 재등록 상담 일정',
      },
    ],
    riskMembers: Array.from({ length: 5 }, (_, index) => ({
      name: memberName(rng),
      risk: int(rng, 65 + index * 4, 95),
      lastVisit: `${int(rng, 14, 34)}일 전`,
      signal: pick(rng, riskSignals),
    })).sort((a, b) => b.risk - a.risk),
  };
}

function attendanceQrPayload(snapshotDate: string, branchId: number): AttendanceQrSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/attendance/qr');
  const recentCheckins = Array.from({ length: 7 }, (_, index) => {
    const status = pick(rng, ['출석', '출석', '출석', '지각', '결석'] as const);
    return {
      id: branchId * 1000 + index + 1,
      member: memberName(rng),
      time: `${String(int(rng, 8, 21)).padStart(2, '0')}:${String(int(rng, 0, 59)).padStart(2, '0')}`,
      class: pick(rng, classNames),
      method: pick(rng, ['QR', 'QR', 'QR', '수동'] as const),
      status,
    };
  });
  const present = int(rng, 34, 72);
  const late = int(rng, 2, 8);
  const absent = int(rng, 4, 12);
  const qr = int(rng, Math.round(present * 0.72), present + late);
  const manual = Math.max(1, present + late - qr);

  return {
    recentCheckins,
    summary: {
      present,
      late,
      absent,
      qr,
      manual,
      qrRate: Math.round((qr / Math.max(qr + manual, 1)) * 100),
    },
  };
}

function cleaningSchedulePayload(snapshotDate: string, branchId: number): CleaningScheduleSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/cleaning-schedule');
  const schedule = cleaningAreas.map((area, index) => {
    const status = index < 4 ? '완료' : pick(rng, ['완료', '예정'] as const);
    return {
      id: branchId * 1000 + index + 1,
      area,
      frequency: area === '수영장' ? '주 3회' : '매일',
      time: pick(rng, ['06:00, 14:00, 20:00', '07:00, 15:00', '09:00, 18:00', '08:00, 17:00']),
      assignee: pick(rng, cleaningTeams),
      lastDone: status === '완료' ? `오늘 ${String(int(rng, 6, 10)).padStart(2, '0')}:00` : dateOffset(snapshotDate, -1),
      status,
    };
  });
  const todayLog = schedule.slice(0, 6).map((item, index) => ({
    time: ['06:00', '06:30', '07:00', '08:00', '09:00', '13:30'][index] ?? '15:00',
    area: item.area,
    staff: pick(rng, cleaningStaff),
    done: item.status === '완료',
  }));
  const doneCount = todayLog.filter(log => log.done).length;

  return {
    schedule,
    todayLog,
    summary: {
      weekCompletionRate: int(rng, Math.max(82, doneCount * 12), 98),
    },
  };
}

function consumablesPayload(snapshotDate: string, branchId: number): ConsumablesSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/consumables');
  return {
    consumables: consumableTemplates.map((item, index) => {
      const stock = int(rng, Math.max(1, item.minStock - 6), item.reorderPoint + 22);
      const status = stock < item.minStock ? '발주필요' : stock < item.reorderPoint ? '부족' : '충분';
      return {
        id: branchId * 1000 + index + 1,
        ...item,
        stock,
        lastOrder: dateOffset(snapshotDate, -int(rng, 5, 42)),
        status,
      };
    }),
  };
}

function equipmentCheckPayload(snapshotDate: string, branchId: number): EquipmentCheckSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/equipment-check');
  const statuses = ['정상', '정상', '정상', '점검필요', '수리중'] as const;

  return {
    equipment: equipmentTemplates.map((item, index) => {
      const status = pick(rng, statuses);
      return {
        id: branchId * 1000 + index + 1,
        name: item.name,
        location: item.location,
        lastCheck: dateOffset(snapshotDate, -int(rng, 5, 35)),
        nextCheck: dateOffset(snapshotDate, int(rng, 3, 30)),
        status,
        issue: status === '정상' ? null : item.issue,
      };
    }),
  };
}

function productCatalogPayload(snapshotDate: string, branchId: number): ProductCatalogSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/products/catalog');
  return {
    products: productTemplates.map((product, index) => ({
      id: branchId * 1000 + index + 1,
      name: product.name,
      category: product.category,
      price: Math.round(product.price * int(rng, 92, 108) / 100 / 1000) * 1000,
      desc: product.desc,
      active: index !== 5 || int(rng, 0, 1) === 1,
      popular: index < 2 || int(rng, 0, 8) > 6,
    })),
  };
}

function productComparePayload(snapshotDate: string, branchId: number): ProductCompareSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/products/compare');
  const catalog = productCatalogPayload(snapshotDate, branchId).products;
  return {
    compareProducts: catalog.slice(0, 3).map((product, index) => ({
      name: product.name,
      price: product.price,
      category: product.category,
      duration: index === 0 ? '3개월' : index === 1 ? '3개월' : '1개월',
      sessions: product.category === 'PT' ? `${index === 0 ? 10 : 20}회` : '무제한',
      groupClass: product.category !== 'PT' || int(rng, 0, 1) === 1,
      locker: int(rng, 0, 1) === 1,
      gx: product.category === 'GX' || int(rng, 0, 1) === 1,
      transfer: product.category === 'PT',
    })),
  };
}

function productInventoryPayload(snapshotDate: string, branchId: number): ProductInventorySeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/products/inventory');
  const inventory = productTemplates.map((product, index) => {
    const stock = int(rng, product.stockMin, product.stockMax);
    const sold = int(rng, Math.round(stock * 0.18), Math.round(stock * 0.82));
    const remaining = stock - sold;
    return {
      id: branchId * 1000 + index + 1,
      name: product.name,
      category: product.category,
      stock,
      sold,
      remaining,
      alert: remaining <= Math.round(stock * 0.2),
    };
  });

  return {
    inventory,
    history: Array.from({ length: 5 }, (_, index) => {
      const item = pick(rng, inventory);
      const type = pick(rng, ['입고', '판매'] as const);
      const qty = int(rng, type === '입고' ? 8 : 1, type === '입고' ? 40 : 7);
      return {
        date: dateOffset(snapshotDate, -index),
        product: item.name,
        type,
        qty,
        balance: Math.max(0, item.remaining + (type === '판매' ? -qty : qty)),
      };
    }),
  };
}

function productSeasonalPricePayload(snapshotDate: string, branchId: number): ProductSeasonalPriceSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/products/seasonal-price');
  const names = ['여름 특가', '신년 이벤트', '봄 프로모션', '가을 패키지'];
  const statuses = ['진행중', '예정', '종료', '예정'] as const;

  return {
    seasonalPrices: names.map((name, index) => {
      const product = productTemplates[index % productTemplates.length];
      const rate = int(rng, 10, 24);
      const original = product.price;
      return {
        id: branchId * 1000 + index + 1,
        name,
        product: product.name,
        original,
        discounted: Math.round(original * (100 - rate) / 100 / 1000) * 1000,
        rate,
        start: dateOffset(snapshotDate, index === 2 ? -45 : index * 30),
        end: dateOffset(snapshotDate, index === 2 ? 15 : index * 30 + 28),
        status: statuses[index],
      };
    }),
  };
}

function memberFamilyPayload(snapshotDate: string, branchId: number): MemberFamilySeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/members/family');
  const familyCount = int(rng, 3, 6);

  return {
    families: Array.from({ length: familyCount }, (_, index) => {
      const memberCount = int(rng, 1, 3);
      const members = Array.from({ length: memberCount }, () => `${memberName(rng)} (${pick(rng, familyRelations)})`);
      return {
        id: branchId * 1000 + index + 1,
        main: memberName(rng),
        members,
        joined: dateOffset(snapshotDate, -int(rng, 30, 420), '.'),
      };
    }),
  };
}

function memberSegmentPayload(snapshotDate: string, branchId: number): MemberSegmentSeedPayload {
  const rng = rngFor(snapshotDate, branchId, '/members/segment');
  return {
    segments: segmentTemplates.map((segment, index) => ({
      id: branchId * 1000 + index + 1,
      ...segment,
      count: int(rng, index === 3 ? 80 : 8, index === 3 ? 180 : 58),
      auto: true,
    })),
  };
}

export function buildPublishingPageSeed<R extends PublishingSeedRoute>(params: {
  route: R;
  snapshotDate?: string;
  branchId: number;
  branchName?: string;
}): PublishingPageSeedPayloadMap[R] {
  const snapshotDate = params.snapshotDate ?? getKstDateString();
  const branchName = params.branchName ?? '센터';

  switch (params.route) {
    case '/class-feedback':
      return classFeedbackPayload(snapshotDate, params.branchId, branchName) as PublishingPageSeedPayloadMap[R];
    case '/class-waitlist':
      return classWaitlistPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/class-recording':
      return classRecordingPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/analytics/forecast':
      return analyticsForecastPayload(snapshotDate, params.branchId, branchName) as PublishingPageSeedPayloadMap[R];
    case '/attendance/qr':
      return attendanceQrPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/cleaning-schedule':
      return cleaningSchedulePayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/consumables':
      return consumablesPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/equipment-check':
      return equipmentCheckPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/products/catalog':
      return productCatalogPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/products/compare':
      return productComparePayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/products/inventory':
      return productInventoryPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/products/seasonal-price':
      return productSeasonalPricePayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/members/family':
      return memberFamilyPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    case '/members/segment':
      return memberSegmentPayload(snapshotDate, params.branchId) as PublishingPageSeedPayloadMap[R];
    default:
      throw new Error(`Unsupported publishing seed route: ${params.route}`);
  }
}
