/**
 * 초기 시드 데이터
 * 실행: npx tsx prisma/seed.ts
 */
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 시드 데이터 생성 시작...');

  // ============================================================
  // 1. 지점 (Branches)
  // ============================================================
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: '강남 본점',
        address: '서울시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        status: '운영중',
        managerName: '김관리',
      },
    }),
    prisma.branch.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: '서초점',
        address: '서울시 서초구 서초대로 456',
        phone: '02-2345-6789',
        status: '운영중',
        managerName: '이매니저',
      },
    }),
    prisma.branch.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        name: '송파점',
        address: '서울시 송파구 올림픽로 789',
        phone: '02-3456-7890',
        status: '임시휴업',
        managerName: '박지점',
      },
    }),
  ]);
  console.log(`  ✅ 지점 ${branches.length}개 생성`);

  // ============================================================
  // 2. 사용자 (Users) - 로그인 계정
  // ============================================================
  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: 'password123', // TODO: bcrypt 해싱
        name: '운영관리자',
        email: 'admin@spogym.com',
        role: 'ADMIN',
        branchId: 1,
      },
    }),
    prisma.user.upsert({
      where: { username: 'manager1' },
      update: {},
      create: {
        username: 'manager1',
        password: 'password123',
        name: '김관리',
        email: 'manager1@spogym.com',
        role: 'MANAGER',
        branchId: 1,
      },
    }),
    prisma.user.upsert({
      where: { username: 'trainer1' },
      update: {},
      create: {
        username: 'trainer1',
        password: 'password123',
        name: '김태희',
        email: 'trainer1@spogym.com',
        role: 'TRAINER',
        branchId: 1,
      },
    }),
  ]);
  console.log(`  ✅ 사용자 ${users.length}개 생성`);

  // ============================================================
  // 3. 직원 (Staff)
  // ============================================================
  const staffList = await Promise.all([
    prisma.staff.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: '김태희',
        phone: '010-1111-2222',
        email: 'taehee@spogym.com',
        role: '트레이너',
        position: 'PT 팀장',
        hireDate: new Date('2023-03-15'),
        salary: 3500000,
        color: '#EF4444',
        branchId: 1,
      },
    }),
    prisma.staff.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: '이효리',
        phone: '010-2222-3333',
        email: 'hyori@spogym.com',
        role: '트레이너',
        position: 'GX 강사',
        hireDate: new Date('2023-06-01'),
        salary: 3200000,
        color: '#3B82F6',
        branchId: 1,
      },
    }),
    prisma.staff.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        name: '정지훈',
        phone: '010-3333-4444',
        email: 'jihoon@spogym.com',
        role: '트레이너',
        position: 'PT 강사',
        hireDate: new Date('2024-01-10'),
        salary: 3000000,
        color: '#F59E0B',
        branchId: 1,
      },
    }),
    prisma.staff.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        name: '박재범',
        phone: '010-4444-5555',
        email: 'jaebeom@spogym.com',
        role: '트레이너',
        position: 'GX 강사',
        hireDate: new Date('2024-03-01'),
        salary: 2800000,
        color: '#8B5CF6',
        branchId: 1,
      },
    }),
    prisma.staff.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        name: '유재석',
        phone: '010-5555-6666',
        email: 'jaeseok@spogym.com',
        role: '프론트',
        position: '프론트 데스크',
        hireDate: new Date('2024-06-01'),
        salary: 2500000,
        color: '#10B981',
        branchId: 1,
      },
    }),
  ]);
  console.log(`  ✅ 직원 ${staffList.length}명 생성`);

  // ============================================================
  // 4. 회원 (Members)
  // ============================================================
  const memberData = [
    { name: '홍길동', phone: '010-1234-5678', gender: 'M' as const, birthDate: new Date('1990-03-11'), membershipType: 'PT', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-06-30'), mileage: 15000 },
    { name: '김영희', phone: '010-2345-6789', gender: 'F' as const, birthDate: new Date('1992-07-22'), membershipType: 'MEMBERSHIP', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-09-15'), mileage: 8500 },
    { name: '이철수', phone: '010-3456-7890', gender: 'M' as const, birthDate: new Date('1988-11-05'), membershipType: 'GX', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-04-30'), mileage: 12000 },
    { name: '박지민', phone: '010-4567-8901', gender: 'F' as const, birthDate: new Date('1995-01-15'), membershipType: 'PT', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-05-20'), mileage: 5000 },
    { name: '최수진', phone: '010-5678-9012', gender: 'F' as const, birthDate: new Date('1993-09-30'), membershipType: 'MEMBERSHIP', status: 'EXPIRED' as const, membershipExpiry: new Date('2026-02-28'), mileage: 3000 },
    { name: '정민호', phone: '010-6789-0123', gender: 'M' as const, birthDate: new Date('1991-05-18'), membershipType: 'PT', status: 'HOLDING' as const, membershipExpiry: new Date('2026-07-10'), mileage: 20000 },
    { name: '강서연', phone: '010-7890-1234', gender: 'F' as const, birthDate: new Date('1994-12-03'), membershipType: 'GX', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-08-25'), mileage: 7500 },
    { name: '윤도현', phone: '010-8901-2345', gender: 'M' as const, birthDate: new Date('1987-02-14'), membershipType: 'MEMBERSHIP', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-03-15'), mileage: 11000 },
    { name: '한소희', phone: '010-9012-3456', gender: 'F' as const, birthDate: new Date('1996-04-07'), membershipType: 'PT', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-10-01'), mileage: 9200 },
    { name: '오세훈', phone: '010-0123-4567', gender: 'M' as const, birthDate: new Date('1989-08-20'), membershipType: 'MEMBERSHIP', status: 'INACTIVE' as const, membershipExpiry: new Date('2025-12-31'), mileage: 1500 },
    { name: '서지원', phone: '010-1111-0001', gender: 'F' as const, birthDate: new Date('1997-06-12'), membershipType: 'GX', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-07-30'), mileage: 6000 },
    { name: '임재현', phone: '010-2222-0002', gender: 'M' as const, birthDate: new Date('1990-10-25'), membershipType: 'PT', status: 'ACTIVE' as const, membershipExpiry: new Date('2026-06-15'), mileage: 18500 },
  ];

  for (const m of memberData) {
    await prisma.member.upsert({
      where: { id: memberData.indexOf(m) + 1 },
      update: {},
      create: {
        name: m.name,
        phone: m.phone,
        gender: m.gender,
        birthDate: m.birthDate,
        membershipType: m.membershipType,
        membershipExpiry: m.membershipExpiry,
        status: m.status,
        mileage: m.mileage,
        branchId: 1,
      },
    });
  }
  console.log(`  ✅ 회원 ${memberData.length}명 생성`);

  // ============================================================
  // 5. 상품 (Products)
  // ============================================================
  const productData = [
    { name: 'PT 10회', category: 'PT' as const, price: 700000, sessions: 10, duration: 90 },
    { name: 'PT 20회', category: 'PT' as const, price: 1200000, sessions: 20, duration: 180 },
    { name: 'PT 30회', category: 'PT' as const, price: 1650000, sessions: 30, duration: 270 },
    { name: '1개월 이용권', category: 'MEMBERSHIP' as const, price: 100000, duration: 30 },
    { name: '3개월 이용권', category: 'MEMBERSHIP' as const, price: 270000, duration: 90 },
    { name: '6개월 이용권', category: 'MEMBERSHIP' as const, price: 480000, duration: 180 },
    { name: '12개월 이용권', category: 'MEMBERSHIP' as const, price: 840000, duration: 365 },
    { name: 'GX 그룹 필라테스 (월)', category: 'GX' as const, price: 150000, duration: 30 },
    { name: 'GX 요가 (월)', category: 'GX' as const, price: 130000, duration: 30 },
    { name: '운동복 세트', category: 'PRODUCT' as const, price: 35000 },
    { name: '개인 락커 (월)', category: 'SERVICE' as const, price: 20000, duration: 30 },
    { name: '타올 서비스 (월)', category: 'SERVICE' as const, price: 10000, duration: 30 },
  ];

  for (let i = 0; i < productData.length; i++) {
    const p = productData[i];
    await prisma.product.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        name: p.name,
        category: p.category,
        price: p.price,
        sessions: p.sessions ?? null,
        duration: p.duration ?? null,
        branchId: 1,
      },
    });
  }
  console.log(`  ✅ 상품 ${productData.length}개 생성`);

  // ============================================================
  // 6. 매출 (Sales)
  // ============================================================
  const salesData = [
    { memberId: 1, memberName: '홍길동', productId: 2, productName: 'PT 20회', amount: 1200000, type: 'PT', status: 'COMPLETED' as const, paymentMethod: 'CARD' as const, card: 1200000, staffId: 1, staffName: '김태희', saleDate: new Date('2026-03-01') },
    { memberId: 2, memberName: '김영희', productId: 5, productName: '3개월 이용권', amount: 270000, type: '이용권', status: 'COMPLETED' as const, paymentMethod: 'CARD' as const, card: 270000, staffId: 5, staffName: '유재석', saleDate: new Date('2026-03-02') },
    { memberId: 3, memberName: '이철수', productId: 8, productName: 'GX 그룹 필라테스 (월)', amount: 150000, type: 'GX', status: 'COMPLETED' as const, paymentMethod: 'CASH' as const, cash: 150000, staffId: 2, staffName: '이효리', saleDate: new Date('2026-03-03') },
    { memberId: 4, memberName: '박지민', productId: 1, productName: 'PT 10회', amount: 700000, type: 'PT', status: 'UNPAID' as const, paymentMethod: 'CARD' as const, card: 500000, unpaid: 200000, staffId: 3, staffName: '정지훈', saleDate: new Date('2026-03-05') },
    { memberId: 5, memberName: '최수진', productId: 4, productName: '1개월 이용권', amount: 100000, type: '이용권', status: 'COMPLETED' as const, paymentMethod: 'TRANSFER' as const, cash: 100000, staffId: 5, staffName: '유재석', saleDate: new Date('2026-03-07') },
    { memberId: 7, memberName: '강서연', productId: 9, productName: 'GX 요가 (월)', amount: 130000, type: 'GX', status: 'COMPLETED' as const, paymentMethod: 'CARD' as const, card: 130000, staffId: 4, staffName: '박재범', saleDate: new Date('2026-03-08') },
    { memberId: 9, memberName: '한소희', productId: 3, productName: 'PT 30회', amount: 1650000, type: 'PT', status: 'COMPLETED' as const, paymentMethod: 'CARD' as const, card: 1650000, staffId: 1, staffName: '김태희', saleDate: new Date('2026-03-10') },
    { memberId: 12, memberName: '임재현', productId: 1, productName: 'PT 10회', amount: 700000, type: 'PT', status: 'COMPLETED' as const, paymentMethod: 'CASH' as const, cash: 700000, staffId: 3, staffName: '정지훈', saleDate: new Date('2026-03-11') },
  ];

  for (let i = 0; i < salesData.length; i++) {
    const s = salesData[i];
    await prisma.sale.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        memberId: s.memberId,
        memberName: s.memberName,
        productId: s.productId,
        productName: s.productName,
        amount: s.amount,
        salePrice: s.amount,
        originalPrice: s.amount,
        type: s.type,
        status: s.status,
        paymentMethod: s.paymentMethod,
        card: s.card ?? 0,
        cash: s.cash ?? 0,
        unpaid: s.unpaid ?? 0,
        staffId: s.staffId,
        staffName: s.staffName,
        saleDate: s.saleDate,
        branchId: 1,
      },
    });
  }
  console.log(`  ✅ 매출 ${salesData.length}건 생성`);

  // ============================================================
  // 7. 출석 (Attendance) - 오늘 기준
  // ============================================================
  const today = new Date();
  const attendanceData = [
    { memberId: 1, memberName: '홍길동', type: 'PT' as const, checkInMethod: 'KIOSK' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 30) },
    { memberId: 2, memberName: '김영희', type: 'REGULAR' as const, checkInMethod: 'APP' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 15) },
    { memberId: 3, memberName: '이철수', type: 'GX' as const, checkInMethod: 'KIOSK' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0) },
    { memberId: 4, memberName: '박지민', type: 'PT' as const, checkInMethod: 'KIOSK' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0) },
    { memberId: 7, memberName: '강서연', type: 'GX' as const, checkInMethod: 'APP' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0) },
    { memberId: 9, memberName: '한소희', type: 'PT' as const, checkInMethod: 'KIOSK' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30) },
    { memberId: 11, memberName: '서지원', type: 'REGULAR' as const, checkInMethod: 'KIOSK' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0) },
    { memberId: 12, memberName: '임재현', type: 'PT' as const, checkInMethod: 'APP' as const, checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0) },
  ];

  // 기존 오늘 출석 삭제 후 재생성
  await prisma.attendance.deleteMany({
    where: {
      checkInAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    },
  });

  for (const a of attendanceData) {
    await prisma.attendance.create({
      data: {
        memberId: a.memberId,
        memberName: a.memberName,
        type: a.type,
        checkInMethod: a.checkInMethod,
        checkInAt: a.checkInAt,
        branchId: 1,
      },
    });
  }
  console.log(`  ✅ 출석 ${attendanceData.length}건 생성`);

  // ============================================================
  // 8. 락커 (Lockers) - 50개
  // ============================================================
  await prisma.locker.deleteMany({});
  const lockerData = [];
  for (let i = 1; i <= 50; i++) {
    const num = String(i).padStart(3, '0');
    let status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' = 'AVAILABLE';
    let memberId: number | null = null;
    let memberName: string | null = null;

    if (i <= 4) {
      // 첫 4개는 회원 배정
      const assigned = [
        { id: 1, name: '홍길동' },
        { id: 2, name: '김영희' },
        { id: 4, name: '박지민' },
        { id: 9, name: '한소희' },
      ];
      status = 'IN_USE';
      memberId = assigned[i - 1].id;
      memberName = assigned[i - 1].name;
    } else if (i === 48 || i === 49) {
      status = 'MAINTENANCE';
    }

    lockerData.push({
      number: num,
      status,
      memberId,
      memberName,
      assignedAt: memberId ? new Date() : null,
      expiresAt: memberId ? new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()) : null,
      branchId: 1,
    });
  }

  for (const l of lockerData) {
    await prisma.locker.create({ data: l });
  }
  console.log(`  ✅ 락커 ${lockerData.length}개 생성`);

  // ============================================================
  // 9. 수업 (Classes)
  // ============================================================
  const classData = [
    { title: '그룹 필라테스', type: 'GX', staffId: 1, staffName: '김태희', room: '필라테스룸', capacity: 14, booked: 8, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0) },
    { title: '그룹 요가', type: 'GX', staffId: 2, staffName: '이효리', room: 'GX룸', capacity: 20, booked: 12, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0), endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0) },
    { title: 'PT 홍길동', type: 'PT', staffId: 3, staffName: '정지훈', room: 'PT존', capacity: 1, booked: 1, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0) },
    { title: '스피닝', type: 'GX', staffId: 4, staffName: '박재범', room: '스피닝룸', capacity: 30, booked: 18, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0), endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 0) },
  ];

  await prisma.class.deleteMany({});
  for (const c of classData) {
    await prisma.class.create({
      data: { ...c, branchId: 1 },
    });
  }
  console.log(`  ✅ 수업 ${classData.length}개 생성`);

  // ============================================================
  // 10. 설정 (Settings)
  // ============================================================
  await prisma.settings.upsert({
    where: { branchId: 1 },
    update: {},
    create: {
      branchId: 1,
      centerName: '스포짐 강남 본점',
      businessHoursOpen: '06:00',
      businessHoursClose: '22:00',
      holidays: ['SUNDAY'],
      smsEnabled: true,
      kakaoEnabled: true,
      pushEnabled: true,
      autoExpireNotify: true,
      expireNoticeDays: 7,
      theme: 'light',
    },
  });
  console.log('  ✅ 설정 생성');

  console.log('\n🎉 시드 데이터 생성 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
