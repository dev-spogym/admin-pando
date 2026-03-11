// ============================================================
// FitGenie CRM 2.0 - Mock Data (Initial Seed)
// ============================================================

import type {
  Member,
  Staff,
  StaffAttendance,
  Sale,
  Product,
  AttendanceRecord,
  Locker,
  LockerStatus,
  BirthdayMember,
  UnpaidMember,
  HoldingMember,
  ExpiringMember,
  DashboardStats,
} from './types';

// --- Members ---
export const SEED_MEMBERS: Member[] = [
  {
    id: 1, name: '김철수', gender: '남', birthDate: '1990-05-15', age: 34,
    phone: '010-1234-5678', status: 'active', statusLabel: '활성',
    tickets: [{ name: 'PT 20회', status: '사용중', expiry: '2026-12-31' }],
    rental: '락커(102호)', subscription: '프리미엄 플랜', lockerNo: '102',
    finalExpiryDate: '2026-12-31', remainingDays: 315, lastVisit: '2026-02-18',
    lastContract: '2026-01-05', firstRegDate: '2025-01-10', manager: '이지원',
    attendanceNo: '5678', company: '블루프린트소프트',
    email: 'chulsoo@example.com', address: '서울시 강남구 역삼동',
  },
  {
    id: 2, name: '이영희', gender: '여', birthDate: '1988-11-20', age: 36,
    phone: '010-9876-5432', status: 'imminent', statusLabel: '임박',
    tickets: [{ name: '헬스 3개월', status: '임박', expiry: '2026-02-28' }],
    rental: '운동복', subscription: '-', lockerNo: '-',
    finalExpiryDate: '2026-02-28', remainingDays: 9, lastVisit: '2026-02-19',
    lastContract: '2025-11-28', firstRegDate: '2025-05-20', manager: '김민수',
    attendanceNo: '5432', company: '-',
    email: 'younghee@example.com', address: '서울시 서초구 서초동',
  },
  {
    id: 3, name: '박지성', gender: '남', birthDate: '1992-03-10', age: 32,
    phone: '010-5555-4444', status: 'expired', statusLabel: '만료',
    tickets: [{ name: '요가 10회', status: '만료', expiry: '2026-01-15' }],
    rental: '-', subscription: '-', lockerNo: '45',
    finalExpiryDate: '2026-01-15', remainingDays: -35, lastVisit: '2026-01-10',
    lastContract: '2025-10-15', firstRegDate: '2024-10-15', manager: '최유리',
    attendanceNo: '4444', company: 'JS스포츠',
    email: 'jisung@example.com', address: '경기도 성남시 분당구',
  },
  {
    id: 4, name: '정수연', gender: '여', birthDate: '1995-07-22', age: 29,
    phone: '010-1111-2222', status: 'holding', statusLabel: '홀딩',
    tickets: [{ name: '필라테스 30회', status: '정지', expiry: '2026-08-20' }],
    rental: '-', subscription: '-', lockerNo: '-',
    finalExpiryDate: '2026-08-20', remainingDays: 182, lastVisit: '2026-02-01',
    lastContract: '2026-01-20', firstRegDate: '2026-01-20', manager: '이지원',
    attendanceNo: '2222', company: '-',
    email: 'sooyeon@example.com', address: '서울시 마포구 합정동',
  },
  {
    id: 5, name: '한상우', gender: '남', birthDate: '1985-02-14', age: 39,
    phone: '010-3333-7777', status: 'pending', statusLabel: '예정',
    tickets: [{ name: '헬스 12개월', status: '대기', expiry: '2027-03-01' }],
    rental: '락커(205호)', subscription: '베이직 플랜', lockerNo: '205',
    finalExpiryDate: '2027-03-01', remainingDays: 375, lastVisit: '-',
    lastContract: '2026-02-15', firstRegDate: '2026-02-15', manager: '김민수',
    attendanceNo: '7777', company: '테크윈',
    email: 'sangwoo@example.com', address: '서울시 종로구 종로동',
  },
  {
    id: 6, name: '최수지', gender: '여', birthDate: '1993-08-05', age: 31,
    phone: '010-6666-3333', status: 'active', statusLabel: '활성',
    tickets: [{ name: '그룹필라테스 24회', status: '사용중', expiry: '2026-09-30' }],
    rental: '운동복', subscription: '프리미엄 플랜', lockerNo: '88',
    finalExpiryDate: '2026-09-30', remainingDays: 224, lastVisit: '2026-02-20',
    lastContract: '2026-02-01', firstRegDate: '2025-08-10', manager: '이지원',
    attendanceNo: '3333', company: '-',
    email: 'suji@example.com', address: '서울시 송파구 잠실동',
  },
  {
    id: 7, name: '유재석', gender: '남', birthDate: '1972-08-14', age: 52,
    phone: '010-7777-1111', status: 'active', statusLabel: '활성',
    tickets: [{ name: '프리미엄 연간회원', status: '사용중', expiry: '2026-12-31' }],
    rental: '락커(001호)', subscription: '프리미엄 플랜', lockerNo: '001',
    finalExpiryDate: '2026-12-31', remainingDays: 315, lastVisit: '2026-02-20',
    lastContract: '2026-01-01', firstRegDate: '2024-01-01', manager: '최유리',
    attendanceNo: '1111', company: '-',
    email: 'jaeseok@example.com', address: '서울시 강남구 청담동',
  },
  {
    id: 8, name: '강소라', gender: '여', birthDate: '1990-02-18', age: 34,
    phone: '010-8888-4444', status: 'holding', statusLabel: '홀딩',
    tickets: [{ name: '요가 10회', status: '정지', expiry: '2026-06-30' }],
    rental: '-', subscription: '-', lockerNo: '-',
    finalExpiryDate: '2026-06-30', remainingDays: 132, lastVisit: '2026-01-20',
    lastContract: '2025-12-30', firstRegDate: '2025-06-15', manager: '김민수',
    attendanceNo: '4444', company: '-',
    email: 'sora@example.com', address: '경기도 과천시',
  },
  {
    id: 9, name: '지석진', gender: '남', birthDate: '1966-02-10', age: 58,
    phone: '010-9999-5555', status: 'imminent', statusLabel: '임박',
    tickets: [{ name: '헬스 3개월', status: '임박', expiry: '2026-03-10' }],
    rental: '-', subscription: '-', lockerNo: '150',
    finalExpiryDate: '2026-03-10', remainingDays: 0, lastVisit: '2026-03-08',
    lastContract: '2025-12-10', firstRegDate: '2025-06-10', manager: '이지원',
    attendanceNo: '5555', company: '-',
    email: 'sukjin@example.com', address: '서울시 용산구',
  },
  {
    id: 10, name: '박서준', gender: '남', birthDate: '1988-12-16', age: 36,
    phone: '010-2222-8888', status: 'active', statusLabel: '활성',
    tickets: [{ name: 'PT 30회', status: '사용중', expiry: '2026-10-15' }],
    rental: '락커(300호)', subscription: '프리미엄 플랜', lockerNo: '300',
    finalExpiryDate: '2026-10-15', remainingDays: 239, lastVisit: '2026-02-19',
    lastContract: '2026-02-10', firstRegDate: '2025-02-10', manager: '최유리',
    attendanceNo: '8888', company: '스타엔터',
    email: 'seojun@example.com', address: '서울시 강남구 논현동',
  },
];

// --- Staff ---
export const SEED_STAFF: Staff[] = [
  {
    id: 1, status: 'active', name: '김철수', gender: '남', contact: '010-1234-5678',
    role: 'trainer', jobGroup: 'PT강사', position: '팀장', team: 'PT 1팀',
    joinDate: '2024-01-02', adminId: 'chulsoo_k', memo: '경력 5년, 재활 전문',
    workType: '정규직', attendanceStatus: 'on_time',
  },
  {
    id: 2, status: 'active', name: '이영희', gender: '여', contact: '010-2345-6789',
    role: 'fc', jobGroup: 'FC', position: '사원', team: '운영팀',
    joinDate: '2024-02-15', adminId: 'younghee_l', memo: 'CS 우수 사원',
    workType: '정규직', attendanceStatus: 'on_time',
  },
  {
    id: 3, status: 'active', name: '박지민', gender: '남', contact: '010-3456-7890',
    role: 'owner', jobGroup: '매니저', position: '센터장', team: '총괄',
    joinDate: '2023-10-10', adminId: 'jimin_p', memo: '-',
    workType: '정규직', attendanceStatus: 'on_time',
  },
  {
    id: 4, status: 'resigned', name: '최성호', gender: '남', contact: '010-4567-8901',
    role: 'trainer', jobGroup: 'GX강사', position: '외부강사', team: 'GX팀',
    joinDate: '2024-03-01', adminId: 'sungho_c', memo: '요가/필라테스',
    workType: '파트타임', attendanceStatus: 'not_attended',
  },
  {
    id: 5, status: 'active', name: '정수진', gender: '여', contact: '010-5678-9012',
    role: 'trainer', jobGroup: 'PT강사', position: '사원', team: 'PT 2팀',
    joinDate: '2024-05-20', adminId: 'sujin_j', memo: '여성 다이어트 전문',
    workType: '정규직', attendanceStatus: 'late',
  },
];

export const SEED_STAFF_ATTENDANCE: StaffAttendance[] = [
  { id: 1, name: '김철수', date: '2026-02-20', checkIn: '08:55', checkOut: '18:05', status: '정상', workTime: '8h 10m' },
  { id: 2, name: '이영희', date: '2026-02-20', checkIn: '09:02', checkOut: '18:00', status: '지각', workTime: '7h 58m' },
  { id: 3, name: '정수진', date: '2026-02-20', checkIn: '13:50', checkOut: '22:05', status: '정상', workTime: '8h 15m' },
  { id: 4, name: '박지민', date: '2026-02-20', checkIn: '08:40', checkOut: '19:30', status: '연장', workTime: '10h 50m' },
];

// --- Sales ---
export const SEED_SALES: Sale[] = [
  {
    id: 1, no: 10, purchaseDate: '2026-02-19 14:30:05', type: '회원권',
    productName: '프리미엄 12개월권', manager: '홍길동', buyer: '김철수', buyerId: 101,
    round: '신규', quantity: 1, originalPrice: 1200000, salePrice: 1000000,
    discountPrice: 200000, paymentMethod: '단말기연동', paymentType: '일시불',
    paymentTool: '카드', cash: 0, card: 1000000, mileage: 0,
    cardCompany: '신한카드', cardNumber: '4518-****-****-1234', approvalNo: '98237412',
    unpaid: 0, serviceDays: 30, serviceCount: 0, servicePoints: 0,
    status: '정상', category: '신규', memo: '오픈 이벤트 적용',
  },
  {
    id: 2, no: 9, purchaseDate: '2026-02-19 13:15:20', type: '수강권',
    productName: '1:1 PT 20회', manager: '이영희', buyer: '박지민', buyerId: 102,
    round: '재등록(2회차)', quantity: 1, originalPrice: 1500000, salePrice: 1300000,
    discountPrice: 200000, paymentMethod: '수기등록', paymentType: '3개월 할부',
    paymentTool: '카드', cash: 0, card: 1300000, mileage: 0,
    cardCompany: '국민카드', cardNumber: '5243-****-****-5678', approvalNo: '12458796',
    unpaid: 0, serviceDays: 0, serviceCount: 2, servicePoints: 0,
    status: '정상', category: '재등록', memo: '지인 추천 할인',
  },
  {
    id: 3, no: 8, purchaseDate: '2026-02-19 11:05:40', type: '락커',
    productName: '개인 사물함 6개월', manager: '김민수', buyer: '최유리', buyerId: 103,
    round: '신규', quantity: 1, originalPrice: 60000, salePrice: 50000,
    discountPrice: 10000, paymentMethod: '단말기연동', paymentType: '일시불',
    paymentTool: '현금', cash: 50000, card: 0, mileage: 0,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 7, serviceCount: 0, servicePoints: 0,
    status: '정상', category: '신규', memo: '',
  },
  {
    id: 4, no: 7, purchaseDate: '2026-02-18 17:20:10', type: '회원권',
    productName: '모닝 특별권 3개월', manager: '홍길동', buyer: '정현우', buyerId: 104,
    round: '미수금환수', quantity: 1, originalPrice: 300000, salePrice: 300000,
    discountPrice: 0, paymentMethod: '운톡마켓', paymentType: '일시불',
    paymentTool: '카드', card: 300000, cash: 0, mileage: 0,
    cardCompany: '삼성카드', cardNumber: '3779-****-****-9012', approvalNo: '77412589',
    unpaid: 100000, serviceDays: 0, serviceCount: 0, servicePoints: 0,
    status: '환불', category: '재등록', memo: '미수금 발생 주의',
  },
  {
    id: 5, no: 6, purchaseDate: '2026-02-18 10:00:00', type: '일반',
    productName: '단백질 쉐이크(초코)', manager: '관리자', buyer: '이철수', buyerId: 105,
    round: '신규', quantity: 2, originalPrice: 10000, salePrice: 9000,
    discountPrice: 1000, paymentMethod: '수기등록', paymentType: '일시불',
    paymentTool: '마일리지', cash: 0, card: 0, mileage: 9000,
    cardCompany: '-', cardNumber: '-', approvalNo: '-',
    unpaid: 0, serviceDays: 0, serviceCount: 0, servicePoints: 500,
    status: '정상', category: '신규', memo: '마일리지 전액 결제',
  },
];

// --- Products ---
export const SEED_PRODUCTS: Product[] = [
  {
    id: 1, category: '시설이용', categoryKey: 'facility', subCategory: '헬스',
    name: '헬스 12개월 (연간회원권)', cashPrice: 600000, cardPrice: 660000,
    period: '12개월', kioskExposure: true, status: '사용', createdAt: '2026-01-15',
  },
  {
    id: 2, category: '시설이용', categoryKey: 'facility', subCategory: '골프',
    name: '골프 3개월 패키지', cashPrice: 450000, cardPrice: 495000,
    period: '3개월', kioskExposure: true, status: '사용', createdAt: '2026-02-01',
  },
  {
    id: 3, category: '1:1수업', categoryKey: 'pt', subCategory: 'PT',
    name: 'PT 20회 (바디프로필반)', cashPrice: 1200000, cardPrice: 1320000,
    period: '90일', kioskExposure: false, status: '사용', createdAt: '2025-12-20',
  },
  {
    id: 4, category: '그룹수업', categoryKey: 'group', subCategory: '그룹필라테스',
    name: '그룹필라테스 24회', cashPrice: 480000, cardPrice: 528000,
    period: '6개월', kioskExposure: true, status: '사용', createdAt: '2026-02-10',
  },
  {
    id: 5, category: '옵션', categoryKey: 'option', subCategory: '개인락카',
    name: '개인락카 1개월', cashPrice: 10000, cardPrice: 11000,
    period: '1개월', kioskExposure: true, status: '사용', createdAt: '2026-01-05',
  },
  {
    id: 6, category: '시설이용', categoryKey: 'facility', subCategory: '헬스',
    name: '헬스 일일입장권', cashPrice: 20000, cardPrice: 22000,
    period: '1일', kioskExposure: true, status: '미사용', createdAt: '2025-11-30',
  },
];

// --- Attendance ---
export const SEED_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 1, type: '회원', status: '성공', category: '입장 출석', door: '정문 게이트 #1',
    memberName: '김철수', memberId: 101, presence: '재실', gender: '남',
    tel: '010-1234-5678', inTime: '09:12:45', outTime: '-', visitCount: 24,
    passInfo: '헬스 3개월권 (잔여 12일)', expiryDate: '2026-03-02', lockerNo: 'A-12',
    isOtherBranch: false, address: '서울시 종로구',
  },
  {
    id: 2, type: '직원', status: '성공', category: '출근', door: '직원 전용 통로',
    memberName: '이영희 (트레이너)', memberId: 201, presence: '재실', gender: '여',
    tel: '010-9876-5432', inTime: '08:55:02', outTime: '-', visitCount: 156,
    passInfo: '직원 근태 관리', expiryDate: '-', lockerNo: '-',
    isOtherBranch: false, address: '서울시 강남구',
  },
  {
    id: 3, type: '회원', status: '실패', category: '입장 거부', door: '정문 게이트 #2',
    memberName: '박지민', memberId: 105, presence: '부재', gender: '여',
    tel: '010-5555-4444', inTime: '10:05:30', outTime: '10:05:31', visitCount: 12,
    passInfo: '요가 10회권 (잔여 0회)', expiryDate: '2026-02-10', lockerNo: '-',
    isOtherBranch: true, address: '수원시 팔달구',
  },
  {
    id: 4, type: '회원', status: '성공', category: '입장 출석', door: '정문 게이트 #1',
    memberName: '최강호', memberId: 110, presence: '부재', gender: '남',
    tel: '010-1111-2222', inTime: '07:30:15', outTime: '09:00:22', visitCount: 45,
    passInfo: '프리미엄 연간회원', expiryDate: '2026-12-31', lockerNo: 'B-05',
    isOtherBranch: false, address: '서울시 중구',
  },
  {
    id: 5, type: '회원', status: '성공', category: '입장 출석', door: '정문 게이트 #2',
    memberName: '한소희', memberId: 120, presence: '재실', gender: '여',
    tel: '010-9999-8888', inTime: '14:20:00', outTime: '-', visitCount: 8,
    passInfo: '필라테스 패키지', expiryDate: '2026-05-20', lockerNo: 'C-21',
    isOtherBranch: false, address: '서울시 서대문구',
  },
];

// --- Lockers ---
function generateLockers(): Locker[] {
  const statuses: LockerStatus[] = ['available', 'in_use', 'expiring', 'expired', 'unavailable'];
  const names = ['김민수', '이영희', '박지성', '최유나', '정재욱'];
  const lockers: Locker[] = [];

  // Personal lockers
  for (let i = 0; i < 40; i++) {
    const hasUser = Math.random() > 0.4;
    lockers.push({
      id: `p-${i + 1}`,
      number: i + 1,
      type: 'personal',
      area: i < 20 ? 'A구역' : 'B구역',
      status: hasUser ? statuses[Math.floor(Math.random() * 4) + 1] : 'available',
      memberName: hasUser ? names[Math.floor(Math.random() * names.length)] : undefined,
      expiryDate: hasUser ? '2026-03-15' : undefined,
    });
  }

  // Daily lockers
  for (let i = 0; i < 30; i++) {
    const hasUser = Math.random() > 0.7;
    lockers.push({
      id: `d-${i + 1}`,
      number: 100 + i + 1,
      type: 'daily',
      area: i < 15 ? '남자' : '여자',
      status: hasUser ? 'in_use' : 'available',
      memberName: hasUser ? '임시회원' : undefined,
      gender: i < 15 ? 'M' : 'F',
      lastUpdated: '10:30',
    });
  }

  // Golf lockers
  for (let i = 0; i < 20; i++) {
    const hasUser = Math.random() > 0.5;
    lockers.push({
      id: `g-${i + 1}`,
      number: 500 + i + 1,
      type: 'golf',
      area: '골프구역',
      status: hasUser ? (['in_use', 'expired'] as LockerStatus[])[Math.floor(Math.random() * 2)] : 'available',
      memberName: hasUser ? '골프회원' : undefined,
      expiryDate: hasUser ? '2026-04-01' : undefined,
    });
  }

  return lockers;
}

export const SEED_LOCKERS: Locker[] = generateLockers();

// --- Dashboard ---
export const SEED_DASHBOARD_STATS: DashboardStats = {
  totalMembers: 1284,
  activeMembers: 945,
  expiringMembers: 42,
  expiredMembers: 156,
  pendingMembers: 28,
  unregisteredMembers: 113,
};

export const SEED_BIRTHDAY_MEMBERS: BirthdayMember[] = [
  { id: 1, name: '김태희', birth: '1995-05-20', status: '활성' },
  { id: 2, name: '이동건', birth: '1988-05-21', status: '활성' },
  { id: 3, name: '최수지', birth: '1992-05-20', status: '만료' },
];

export const SEED_UNPAID_MEMBERS: UnpaidMember[] = [
  { id: 1, name: '정우성', amount: '155,000', item: 'PT 20회' },
  { id: 2, name: '한지민', amount: '42,000', item: '필라테스 10회' },
];

export const SEED_HOLDING_MEMBERS: HoldingMember[] = [
  { id: 1, name: '박서준', period: '05.10 ~ 06.10', remaining: 21 },
  { id: 2, name: '강소라', period: '05.15 ~ 05.30', remaining: 11 },
];

export const SEED_EXPIRING_MEMBERS: ExpiringMember[] = [
  { id: 1, name: '유재석', expiry: '2026.03.15', dday: 'D-5' },
  { id: 2, name: '지석진', expiry: '2026.03.12', dday: 'D-2' },
];
