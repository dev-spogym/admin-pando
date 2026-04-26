/**
 * 초기 시드 데이터 (데모용 확장판 - raw SQL 기반)
 * 실행: npx tsx prisma/seed.ts
 *
 * 스키마와 DB 컬럼이 미싱크 상태이므로 모든 INSERT를 raw SQL로 처리합니다.
 */
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// 편의 헬퍼: ON CONFLICT (id) DO NOTHING
async function upsertById(table: string, cols: string[], vals: unknown[]): Promise<void> {
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
  const quoted = cols.map(c => `"${c}"`).join(',');
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${table}" (${quoted}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
    ...vals
  );
}

async function main() {
  console.log('🌱 시드 데이터 생성 시작...');

  // ============================================================
  // 1. 지점 (branches)
  // ============================================================
  const branchRows = [
    { id: 1, name: '강남 본점', address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678', status: '운영중',   managerName: '김관리' },
    { id: 2, name: '서초점',    address: '서울시 서초구 서초대로 456', phone: '02-2345-6789', status: '운영중',   managerName: '이매니저' },
    { id: 3, name: '송파점',    address: '서울시 송파구 올림픽로 789', phone: '02-3456-7890', status: '임시휴업', managerName: '박지점' },
  ];
  for (const b of branchRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO branches (id, name, address, phone, status, "managerName")
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, address=EXCLUDED.address,
         phone=EXCLUDED.phone, status=EXCLUDED.status, "managerName"=EXCLUDED."managerName"`,
      b.id, b.name, b.address, b.phone, b.status, b.managerName
    );
  }
  console.log(`  ✅ 지점 ${branchRows.length}개 생성`);

  // ============================================================
  // 2. 직원 (staff)
  // staff 컬럼: id,name,phone,email,role,position,hireDate,salary,color,isActive,branchId
  // ============================================================
  const staffRows = [
    { id: 1, name: '김태희', phone: '010-1111-2222', email: 'taehee@spogym.com',  role: '트레이너', position: 'PT 팀장',      hireDate: '2023-03-15', salary: 3500000, color: '#EF4444' },
    { id: 2, name: '이효리', phone: '010-2222-3333', email: 'hyori@spogym.com',   role: '트레이너', position: 'GX 강사',      hireDate: '2023-06-01', salary: 3200000, color: '#3B82F6' },
    { id: 3, name: '정지훈', phone: '010-3333-4444', email: 'jihoon@spogym.com',  role: '트레이너', position: 'PT 강사',      hireDate: '2024-01-10', salary: 3000000, color: '#F59E0B' },
    { id: 4, name: '박재범', phone: '010-4444-5555', email: 'jaebeom@spogym.com', role: '트레이너', position: 'GX 강사',      hireDate: '2024-03-01', salary: 2800000, color: '#8B5CF6' },
    { id: 5, name: '유재석', phone: '010-5555-6666', email: 'jaeseok@spogym.com', role: '프론트',   position: '프론트 데스크', hireDate: '2024-06-01', salary: 2500000, color: '#10B981' },
  ];
  for (const s of staffRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO staff (id, name, phone, email, role, position, "hireDate", salary, color, "isActive", "branchId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,1)
       ON CONFLICT (id) DO NOTHING`,
      s.id, s.name, s.phone, s.email, s.role, s.position, new Date(s.hireDate), s.salary, s.color
    );
  }
  console.log(`  ✅ 직원 ${staffRows.length}명 생성`);

  // ============================================================
  // 3. 회원 (members) - 50명
  // 사용 컬럼: id,name,phone,gender,birthDate,membershipType,membershipStart,membershipExpiry,status,mileage,branchId,staffId
  // ============================================================
  type Gender = 'M' | 'F';
  type MemberStatus = 'ACTIVE' | 'EXPIRED' | 'HOLDING' | 'INACTIVE' | 'SUSPENDED';

  const memberRows: {
    id: number; name: string; phone: string; gender: Gender;
    birthDate: string; membershipType: string; membershipStart: string;
    membershipExpiry: string; status: MemberStatus; mileage: number; staffId: number | null;
  }[] = [
    // 기존 12명
    { id: 1,  name: '홍길동', phone: '010-1234-5678', gender: 'M', birthDate: '1990-03-11', membershipType: 'PT',         membershipStart: '2026-01-01', membershipExpiry: '2026-06-30', status: 'ACTIVE',    mileage: 15000, staffId: 1 },
    { id: 2,  name: '김영희', phone: '010-2345-6789', gender: 'F', birthDate: '1992-07-22', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-15', membershipExpiry: '2026-09-15', status: 'ACTIVE',    mileage: 8500,  staffId: null },
    { id: 3,  name: '이철수', phone: '010-3456-7890', gender: 'M', birthDate: '1988-11-05', membershipType: 'GX',          membershipStart: '2026-02-01', membershipExpiry: '2026-04-30', status: 'ACTIVE',    mileage: 12000, staffId: null },
    { id: 4,  name: '박지민', phone: '010-4567-8901', gender: 'F', birthDate: '1995-01-15', membershipType: 'PT',          membershipStart: '2026-02-10', membershipExpiry: '2026-05-20', status: 'ACTIVE',    mileage: 5000,  staffId: 3 },
    { id: 5,  name: '최수진', phone: '010-5678-9012', gender: 'F', birthDate: '1993-09-30', membershipType: 'MEMBERSHIP',  membershipStart: '2025-11-01', membershipExpiry: '2026-02-28', status: 'EXPIRED',   mileage: 3000,  staffId: null },
    { id: 6,  name: '정민호', phone: '010-6789-0123', gender: 'M', birthDate: '1991-05-18', membershipType: 'PT',          membershipStart: '2026-01-20', membershipExpiry: '2026-07-10', status: 'HOLDING',   mileage: 20000, staffId: 1 },
    { id: 7,  name: '강서연', phone: '010-7890-1234', gender: 'F', birthDate: '1994-12-03', membershipType: 'GX',          membershipStart: '2026-02-01', membershipExpiry: '2026-08-25', status: 'ACTIVE',    mileage: 7500,  staffId: null },
    { id: 8,  name: '윤도현', phone: '010-8901-2345', gender: 'M', birthDate: '1987-02-14', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-10', membershipExpiry: '2026-03-15', status: 'ACTIVE',    mileage: 11000, staffId: null },
    { id: 9,  name: '한소희', phone: '010-9012-3456', gender: 'F', birthDate: '1996-04-07', membershipType: 'PT',          membershipStart: '2025-10-01', membershipExpiry: '2026-10-01', status: 'ACTIVE',    mileage: 9200,  staffId: 1 },
    { id: 10, name: '오세훈', phone: '010-0123-4567', gender: 'M', birthDate: '1989-08-20', membershipType: 'MEMBERSHIP',  membershipStart: '2025-09-01', membershipExpiry: '2025-12-31', status: 'EXPIRED',   mileage: 1500,  staffId: null },
    { id: 11, name: '서지원', phone: '010-1111-0001', gender: 'F', birthDate: '1997-06-12', membershipType: 'GX',          membershipStart: '2026-02-01', membershipExpiry: '2026-07-30', status: 'ACTIVE',    mileage: 6000,  staffId: null },
    { id: 12, name: '임재현', phone: '010-2222-0002', gender: 'M', birthDate: '1990-10-25', membershipType: 'PT',          membershipStart: '2025-12-15', membershipExpiry: '2026-06-15', status: 'ACTIVE',    mileage: 18500, staffId: 3 },
    // PT 회원 10명 (13~22)
    { id: 13, name: '김민준', phone: '010-1301-0013', gender: 'M', birthDate: '1993-04-20', membershipType: 'PT',          membershipStart: '2026-02-01', membershipExpiry: '2026-08-01', status: 'ACTIVE',    mileage: 7000,  staffId: 1 },
    { id: 14, name: '이수빈', phone: '010-1401-0014', gender: 'F', birthDate: '1998-08-15', membershipType: 'PT',          membershipStart: '2026-01-10', membershipExpiry: '2026-07-10', status: 'ACTIVE',    mileage: 4500,  staffId: 3 },
    { id: 15, name: '박성훈', phone: '010-1501-0015', gender: 'M', birthDate: '1986-12-01', membershipType: 'PT',          membershipStart: '2026-03-01', membershipExpiry: '2026-09-01', status: 'ACTIVE',    mileage: 11000, staffId: 1 },
    { id: 16, name: '정유진', phone: '010-1601-0016', gender: 'F', birthDate: '1995-03-28', membershipType: 'PT',          membershipStart: '2026-02-15', membershipExpiry: '2026-08-15', status: 'ACTIVE',    mileage: 3200,  staffId: 3 },
    { id: 17, name: '최준혁', phone: '010-1701-0017', gender: 'M', birthDate: '1991-07-09', membershipType: 'PT',          membershipStart: '2026-01-20', membershipExpiry: '2026-07-20', status: 'ACTIVE',    mileage: 8800,  staffId: 1 },
    { id: 18, name: '장나연', phone: '010-1801-0018', gender: 'F', birthDate: '1999-11-22', membershipType: 'PT',          membershipStart: '2026-03-10', membershipExpiry: '2026-09-10', status: 'ACTIVE',    mileage: 2100,  staffId: 3 },
    { id: 19, name: '강태양', phone: '010-1901-0019', gender: 'M', birthDate: '1988-06-30', membershipType: 'PT',          membershipStart: '2025-12-01', membershipExpiry: '2026-06-01', status: 'ACTIVE',    mileage: 16500, staffId: 1 },
    { id: 20, name: '윤하늘', phone: '010-2001-0020', gender: 'F', birthDate: '1997-02-14', membershipType: 'PT',          membershipStart: '2026-01-05', membershipExpiry: '2026-07-05', status: 'HOLDING',   mileage: 5500,  staffId: 3 },
    { id: 21, name: '조성민', phone: '010-2101-0021', gender: 'M', birthDate: '1984-09-18', membershipType: 'PT',          membershipStart: '2026-02-20', membershipExpiry: '2026-08-20', status: 'ACTIVE',    mileage: 13000, staffId: 1 },
    { id: 22, name: '임소영', phone: '010-2201-0022', gender: 'F', birthDate: '1996-05-05', membershipType: 'PT',          membershipStart: '2026-03-15', membershipExpiry: '2026-09-15', status: 'ACTIVE',    mileage: 1800,  staffId: 3 },
    // 일반 이용권 회원 15명 (23~37)
    { id: 23, name: '김도윤', phone: '010-2301-0023', gender: 'M', birthDate: '1992-01-10', membershipType: 'MEMBERSHIP',  membershipStart: '2026-02-01', membershipExpiry: '2026-05-01', status: 'ACTIVE',    mileage: 4000,  staffId: null },
    { id: 24, name: '이지은', phone: '010-2401-0024', gender: 'F', birthDate: '1994-09-25', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-15', membershipExpiry: '2026-07-15', status: 'ACTIVE',    mileage: 6200,  staffId: null },
    { id: 25, name: '박현우', phone: '010-2501-0025', gender: 'M', birthDate: '1989-04-17', membershipType: 'MEMBERSHIP',  membershipStart: '2026-03-01', membershipExpiry: '2026-06-01', status: 'ACTIVE',    mileage: 2800,  staffId: null },
    { id: 26, name: '정다은', phone: '010-2601-0026', gender: 'F', birthDate: '1998-12-03', membershipType: 'MEMBERSHIP',  membershipStart: '2026-02-10', membershipExpiry: '2026-08-10', status: 'ACTIVE',    mileage: 3500,  staffId: null },
    { id: 27, name: '최민석', phone: '010-2701-0027', gender: 'M', birthDate: '1987-07-07', membershipType: 'MEMBERSHIP',  membershipStart: '2025-10-01', membershipExpiry: '2026-01-01', status: 'EXPIRED',   mileage: 500,   staffId: null },
    { id: 28, name: '한지혜', phone: '010-2801-0028', gender: 'F', birthDate: '1993-03-19', membershipType: 'MEMBERSHIP',  membershipStart: '2025-10-15', membershipExpiry: '2026-10-15', status: 'ACTIVE',    mileage: 9800,  staffId: null },
    { id: 29, name: '송재훈', phone: '010-2901-0029', gender: 'M', birthDate: '1991-11-28', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-01', membershipExpiry: '2026-04-30', status: 'ACTIVE',    mileage: 7100,  staffId: null },
    // 만료 예정 D-7 이내 5명 (30~34)
    { id: 30, name: '권나영', phone: '010-3001-0030', gender: 'F', birthDate: '1996-08-12', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-29', membershipExpiry: '2026-04-29', status: 'ACTIVE',    mileage: 2300,  staffId: null },
    { id: 31, name: '오민재', phone: '010-3101-0031', gender: 'M', birthDate: '1990-02-23', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-28', membershipExpiry: '2026-04-28', status: 'ACTIVE',    mileage: 4100,  staffId: null },
    { id: 32, name: '신아름', phone: '010-3201-0032', gender: 'F', birthDate: '1995-06-14', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-27', membershipExpiry: '2026-04-27', status: 'ACTIVE',    mileage: 1900,  staffId: null },
    { id: 33, name: '황준서', phone: '010-3301-0033', gender: 'M', birthDate: '1988-10-30', membershipType: 'PT',          membershipStart: '2026-01-27', membershipExpiry: '2026-04-27', status: 'ACTIVE',    mileage: 8600,  staffId: 1 },
    { id: 34, name: '류하은', phone: '010-3401-0034', gender: 'F', birthDate: '1999-04-02', membershipType: 'GX',          membershipStart: '2026-03-28', membershipExpiry: '2026-04-28', status: 'ACTIVE',    mileage: 1200,  staffId: null },
    { id: 35, name: '백승현', phone: '010-3501-0035', gender: 'M', birthDate: '1985-01-16', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-01', membershipExpiry: '2026-04-01', status: 'ACTIVE',    mileage: 5700,  staffId: null },
    { id: 36, name: '전지수', phone: '010-3601-0036', gender: 'F', birthDate: '1997-09-08', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-10', membershipExpiry: '2026-07-10', status: 'ACTIVE',    mileage: 3300,  staffId: null },
    { id: 37, name: '고승우', phone: '010-3701-0037', gender: 'M', birthDate: '1992-12-21', membershipType: 'MEMBERSHIP',  membershipStart: '2026-02-01', membershipExpiry: '2026-05-01', status: 'ACTIVE',    mileage: 6800,  staffId: null },
    // GX 회원 8명 (38~45)
    { id: 38, name: '노유나', phone: '010-3801-0038', gender: 'F', birthDate: '1994-05-31', membershipType: 'GX',          membershipStart: '2026-02-01', membershipExpiry: '2026-08-01', status: 'ACTIVE',    mileage: 4400,  staffId: null },
    { id: 39, name: '문성준', phone: '010-3901-0039', gender: 'M', birthDate: '1990-08-19', membershipType: 'GX',          membershipStart: '2026-01-01', membershipExpiry: '2026-07-01', status: 'ACTIVE',    mileage: 7900,  staffId: null },
    { id: 40, name: '배소희', phone: '010-4001-0040', gender: 'F', birthDate: '1997-03-07', membershipType: 'GX',          membershipStart: '2026-03-01', membershipExpiry: '2026-09-01', status: 'ACTIVE',    mileage: 2600,  staffId: null },
    { id: 41, name: '서동현', phone: '010-4101-0041', gender: 'M', birthDate: '1986-07-25', membershipType: 'GX',          membershipStart: '2025-11-01', membershipExpiry: '2026-05-01', status: 'ACTIVE',    mileage: 10200, staffId: null },
    { id: 42, name: '안채원', phone: '010-4201-0042', gender: 'F', birthDate: '1999-10-13', membershipType: 'GX',          membershipStart: '2026-02-15', membershipExpiry: '2026-08-15', status: 'ACTIVE',    mileage: 1700,  staffId: null },
    { id: 43, name: '장민철', phone: '010-4301-0043', gender: 'M', birthDate: '1993-01-04', membershipType: 'GX',          membershipStart: '2026-01-01', membershipExpiry: '2026-07-01', status: 'HOLDING',   mileage: 5900,  staffId: null },
    { id: 44, name: '조예린', phone: '010-4401-0044', gender: 'F', birthDate: '1995-06-29', membershipType: 'GX',          membershipStart: '2026-03-10', membershipExpiry: '2026-09-10', status: 'ACTIVE',    mileage: 3100,  staffId: null },
    { id: 45, name: '차승호', phone: '010-4501-0045', gender: 'M', birthDate: '1989-04-16', membershipType: 'GX',          membershipStart: '2026-02-01', membershipExpiry: '2026-08-01', status: 'ACTIVE',    mileage: 8400,  staffId: null },
    // 홀딩 1명, 탈퇴 2명, 추가 2명
    { id: 46, name: '탁지현', phone: '010-4601-0046', gender: 'F', birthDate: '1992-11-11', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-01', membershipExpiry: '2026-07-01', status: 'HOLDING',   mileage: 6300,  staffId: null },
    { id: 47, name: '편도훈', phone: '010-4701-0047', gender: 'M', birthDate: '1985-08-22', membershipType: 'MEMBERSHIP',  membershipStart: '2025-06-01', membershipExpiry: '2025-12-01', status: 'INACTIVE', mileage: 0,     staffId: null },
    { id: 48, name: '허수진', phone: '010-4801-0048', gender: 'F', birthDate: '1998-03-05', membershipType: 'PT',          membershipStart: '2025-07-01', membershipExpiry: '2025-12-31', status: 'INACTIVE', mileage: 0,     staffId: null },
    { id: 49, name: '홍서준', phone: '010-4901-0049', gender: 'M', birthDate: '1994-07-18', membershipType: 'PT',          membershipStart: '2026-03-20', membershipExpiry: '2026-09-20', status: 'ACTIVE',    mileage: 2000,  staffId: 1 },
    { id: 50, name: '강민서', phone: '010-5001-0050', gender: 'F', birthDate: '1996-02-27', membershipType: 'MEMBERSHIP',  membershipStart: '2026-04-01', membershipExpiry: '2027-04-01', status: 'ACTIVE',    mileage: 500,   staffId: null },
  ];

  for (const m of memberRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO members (id, name, phone, gender, "birthDate", "membershipType", "membershipStart", "membershipExpiry", status, mileage, "branchId", "staffId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,$11)
       ON CONFLICT (id) DO NOTHING`,
      m.id, m.name, m.phone, m.gender, new Date(m.birthDate),
      m.membershipType, new Date(m.membershipStart), new Date(m.membershipExpiry),
      m.status, m.mileage, m.staffId
    );
  }
  console.log(`  ✅ 회원 ${memberRows.length}명 생성`);

  // ============================================================
  // 4. 상품 (products)
  // 사용 컬럼: id,name,category,price,duration,sessions,isActive,branchId
  // ============================================================
  const productRows = [
    { id: 1,  name: 'PT 10회',              category: 'PT',         price: 700000,  sessions: 10, duration: 90 },
    { id: 2,  name: 'PT 20회',              category: 'PT',         price: 1200000, sessions: 20, duration: 180 },
    { id: 3,  name: 'PT 30회',              category: 'PT',         price: 1650000, sessions: 30, duration: 270 },
    { id: 4,  name: '1개월 이용권',          category: 'MEMBERSHIP', price: 100000,  sessions: null, duration: 30 },
    { id: 5,  name: '3개월 이용권',          category: 'MEMBERSHIP', price: 270000,  sessions: null, duration: 90 },
    { id: 6,  name: '6개월 이용권',          category: 'MEMBERSHIP', price: 480000,  sessions: null, duration: 180 },
    { id: 7,  name: '12개월 이용권',         category: 'MEMBERSHIP', price: 840000,  sessions: null, duration: 365 },
    { id: 8,  name: 'GX 그룹 필라테스 (월)', category: 'GX',         price: 150000,  sessions: null, duration: 30 },
    { id: 9,  name: 'GX 요가 (월)',          category: 'GX',         price: 130000,  sessions: null, duration: 30 },
    { id: 10, name: '운동복 세트',           category: 'PRODUCT',    price: 35000,   sessions: null, duration: null },
    { id: 11, name: '개인 락커 (월)',         category: 'SERVICE',    price: 20000,   sessions: null, duration: 30 },
    { id: 12, name: '타올 서비스 (월)',       category: 'SERVICE',    price: 10000,   sessions: null, duration: 30 },
  ];

  for (const p of productRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO products (id, name, category, price, sessions, duration, "isActive", "branchId")
       VALUES ($1,$2,$3,$4,$5,$6,true,1)
       ON CONFLICT (id) DO NOTHING`,
      p.id, p.name, p.category, p.price, p.sessions, p.duration
    );
  }
  console.log(`  ✅ 상품 ${productRows.length}개 생성`);

  // ============================================================
  // 5. 매출 (sales) - 108건+
  // 사용 컬럼: id,memberId,memberName,productId,productName,saleDate,type,round,
  //            originalPrice,salePrice,amount,paymentMethod,cash,card,unpaid,
  //            status,staffId,staffName,branchId
  // ============================================================
  type SaleStatus = 'COMPLETED' | 'UNPAID' | 'REFUNDED';
  type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER';

  const salesRows: {
    id: number; memberId: number; memberName: string; productId: number; productName: string;
    amount: number; type: string; status: SaleStatus; paymentMethod: PaymentMethod;
    card: number; cash: number; unpaid: number; staffId: number; staffName: string;
    saleDate: string; round: string;
  }[] = [
    // 기존 8건 (2026-03)
    { id: 1,  memberId: 1,  memberName: '홍길동', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-03-01', round: '신규' },
    { id: 2,  memberId: 2,  memberName: '김영희', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 270000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-02', round: '신규' },
    { id: 3,  memberId: 3,  memberName: '이철수', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 150000, unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-03-03', round: '재등록' },
    { id: 4,  memberId: 4,  memberName: '박지민', productId: 1,  productName: 'PT 10회',              amount: 700000,  type: 'PT',    status: 'UNPAID',    paymentMethod: 'CARD',     card: 500000,  cash: 0,      unpaid: 200000, staffId: 3, staffName: '정지훈', saleDate: '2026-03-05', round: '신규' },
    { id: 5,  memberId: 5,  memberName: '최수진', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 100000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-07', round: '재등록' },
    { id: 6,  memberId: 7,  memberName: '강서연', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-03-08', round: '신규' },
    { id: 7,  memberId: 9,  memberName: '한소희', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-03-10', round: '재등록' },
    { id: 8,  memberId: 12, memberName: '임재현', productId: 1,  productName: 'PT 10회',              amount: 700000,  type: 'PT',    status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 700000, unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-03-11', round: '신규' },
    // 2월 매출 (9~43)
    { id: 9,  memberId: 13, memberName: '김민준', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-02-03', round: '신규' },
    { id: 10, memberId: 14, memberName: '이수빈', productId: 1,  productName: 'PT 10회',              amount: 700000,  type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 700000,  cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-02-04', round: '신규' },
    { id: 11, memberId: 23, memberName: '김도윤', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 270000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-05', round: '신규' },
    { id: 12, memberId: 24, memberName: '이지은', productId: 6,  productName: '6개월 이용권',          amount: 480000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 480000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-05', round: '신규' },
    { id: 13, memberId: 15, memberName: '박성훈', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-02-07', round: '신규' },
    { id: 14, memberId: 38, memberName: '노유나', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-02-07', round: '신규' },
    { id: 15, memberId: 39, memberName: '문성준', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 130000, unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-02-08', round: '신규' },
    { id: 16, memberId: 16, memberName: '정유진', productId: 1,  productName: 'PT 10회',              amount: 700000,  type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 700000,  cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-02-10', round: '신규' },
    { id: 17, memberId: 25, memberName: '박현우', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 270000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-10', round: '신규' },
    { id: 18, memberId: 17, memberName: '최준혁', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-02-11', round: '신규' },
    { id: 19, memberId: 40, memberName: '배소희', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 150000, unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-02-11', round: '신규' },
    { id: 20, memberId: 26, memberName: '정다은', productId: 6,  productName: '6개월 이용권',          amount: 480000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 480000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-12', round: '신규' },
    { id: 21, memberId: 18, memberName: '장나연', productId: 1,  productName: 'PT 10회',              amount: 700000,  type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 700000,  cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-02-14', round: '신규' },
    { id: 22, memberId: 41, memberName: '서동현', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 130000, unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-02-14', round: '재등록' },
    { id: 23, memberId: 19, memberName: '강태양', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-02-15', round: '재등록' },
    { id: 24, memberId: 28, memberName: '한지혜', productId: 7,  productName: '12개월 이용권',         amount: 840000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 840000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-15', round: '재등록' },
    { id: 25, memberId: 21, memberName: '조성민', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1000000, cash: 200000, unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-02-17', round: '신규' },
    { id: 26, memberId: 29, memberName: '송재훈', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 270000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-17', round: '신규' },
    { id: 27, memberId: 13, memberName: '김민준', productId: 11, productName: '개인 락커 (월)',         amount: 20000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 20000,  unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-03', round: '신규' },
    { id: 28, memberId: 15, memberName: '박성훈', productId: 10, productName: '운동복 세트',           amount: 35000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CARD',     card: 35000,   cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-07', round: '신규' },
    { id: 29, memberId: 42, memberName: '안채원', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-02-18', round: '신규' },
    { id: 30, memberId: 43, memberName: '장민철', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-02-18', round: '신규' },
    { id: 31, memberId: 20, memberName: '윤하늘', productId: 1,  productName: 'PT 10회',              amount: 700000,  type: 'PT',    status: 'UNPAID',    paymentMethod: 'CARD',     card: 300000,  cash: 0,      unpaid: 400000, staffId: 3, staffName: '정지훈', saleDate: '2026-02-20', round: '신규' },
    { id: 32, memberId: 44, memberName: '조예린', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 130000, unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-02-20', round: '신규' },
    { id: 33, memberId: 45, memberName: '차승호', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-02-21', round: '신규' },
    { id: 34, memberId: 22, memberName: '임소영', productId: 1,  productName: 'PT 10회',              amount: 700000,  type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 700000,  cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-02-22', round: '신규' },
    { id: 35, memberId: 36, memberName: '전지수', productId: 6,  productName: '6개월 이용권',          amount: 480000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 480000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-22', round: '신규' },
    { id: 36, memberId: 37, memberName: '고승우', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 270000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-24', round: '신규' },
    { id: 37, memberId: 11, memberName: '서지원', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-02-24', round: '재등록' },
    { id: 38, memberId: 8,  memberName: '윤도현', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 100000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-25', round: '재등록' },
    { id: 39, memberId: 10, memberName: '오세훈', productId: 5,  productName: '3개월 이용권',          amount: -270000, type: '이용권', status: 'REFUNDED',  paymentMethod: 'CARD',     card: -270000, cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-26', round: '환불' },
    { id: 40, memberId: 33, memberName: '황준서', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-02-26', round: '신규' },
    { id: 41, memberId: 34, memberName: '류하은', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-02-27', round: '신규' },
    { id: 42, memberId: 46, memberName: '탁지현', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 270000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-02-28', round: '신규' },
    // 3월 추가 매출 (43~72)
    { id: 43, memberId: 30, memberName: '권나영', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 270000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-12', round: '신규' },
    { id: 44, memberId: 31, memberName: '오민재', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 270000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-12', round: '신규' },
    { id: 45, memberId: 32, memberName: '신아름', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 270000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-13', round: '신규' },
    { id: 46, memberId: 35, memberName: '백승현', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 100000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-13', round: '재등록' },
    { id: 47, memberId: 6,  memberName: '정민호', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-03-14', round: '재등록' },
    { id: 48, memberId: 7,  memberName: '강서연', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-03-15', round: '재등록' },
    { id: 49, memberId: 11, memberName: '서지원', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-03-15', round: '재등록' },
    { id: 50, memberId: 1,  memberName: '홍길동', productId: 11, productName: '개인 락커 (월)',         amount: 20000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 20000,  unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-17', round: '재등록' },
    { id: 51, memberId: 9,  memberName: '한소희', productId: 12, productName: '타올 서비스 (월)',       amount: 10000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CARD',     card: 10000,   cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-17', round: '재등록' },
    { id: 52, memberId: 17, memberName: '최준혁', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-03-18', round: '재등록' },
    { id: 53, memberId: 23, memberName: '김도윤', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 100000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-18', round: '재등록' },
    { id: 54, memberId: 27, memberName: '최민석', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'UNPAID',    paymentMethod: 'CARD',     card: 0,       cash: 0,      unpaid: 100000, staffId: 5, staffName: '유재석', saleDate: '2026-03-19', round: '미수금환수' },
    { id: 55, memberId: 19, memberName: '강태양', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-03-20', round: '재등록' },
    { id: 56, memberId: 38, memberName: '노유나', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 130000, unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-03-21', round: '재등록' },
    { id: 57, memberId: 39, memberName: '문성준', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-03-21', round: '재등록' },
    { id: 58, memberId: 40, memberName: '배소희', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-03-22', round: '재등록' },
    { id: 59, memberId: 14, memberName: '이수빈', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-03-22', round: '재등록' },
    { id: 60, memberId: 16, memberName: '정유진', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-03-24', round: '재등록' },
    { id: 61, memberId: 24, memberName: '이지은', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 100000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-24', round: '재등록' },
    { id: 62, memberId: 28, memberName: '한지혜', productId: 10, productName: '운동복 세트',           amount: 35000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 35000,  unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-25', round: '신규' },
    { id: 63, memberId: 21, memberName: '조성민', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-03-25', round: '재등록' },
    { id: 64, memberId: 41, memberName: '서동현', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-03-26', round: '재등록' },
    { id: 65, memberId: 47, memberName: '편도훈', productId: 5,  productName: '3개월 이용권',          amount: -270000, type: '이용권', status: 'REFUNDED',  paymentMethod: 'CARD',     card: -270000, cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-27', round: '환불' },
    { id: 66, memberId: 44, memberName: '조예린', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-03-28', round: '재등록' },
    { id: 67, memberId: 45, memberName: '차승호', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 130000, unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-03-29', round: '재등록' },
    { id: 68, memberId: 36, memberName: '전지수', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 100000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-03-29', round: '재등록' },
    // 4월 매출 (69~108)
    { id: 69, memberId: 49, memberName: '홍서준', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-04-03', round: '신규' },
    { id: 70, memberId: 50, memberName: '강민서', productId: 7,  productName: '12개월 이용권',         amount: 840000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 840000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-01', round: '신규' },
    { id: 71, memberId: 50, memberName: '강민서', productId: 11, productName: '개인 락커 (월)',         amount: 20000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 20000,  unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-01', round: '신규' },
    { id: 72, memberId: 49, memberName: '홍서준', productId: 11, productName: '개인 락커 (월)',         amount: 20000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CARD',     card: 20000,   cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-01', round: '신규' },
    { id: 73, memberId: 22, memberName: '임소영', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-04-04', round: '재등록' },
    { id: 74, memberId: 25, memberName: '박현우', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 100000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-05', round: '재등록' },
    { id: 75, memberId: 26, memberName: '정다은', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 100000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-05', round: '재등록' },
    { id: 76, memberId: 15, memberName: '박성훈', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-04-07', round: '재등록' },
    { id: 77, memberId: 29, memberName: '송재훈', productId: 4,  productName: '1개월 이용권',          amount: 100000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 100000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-07', round: '재등록' },
    { id: 78, memberId: 18, memberName: '장나연', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'UNPAID',    paymentMethod: 'CARD',     card: 600000,  cash: 0,      unpaid: 600000, staffId: 3, staffName: '정지훈', saleDate: '2026-04-08', round: '재등록' },
    { id: 79, memberId: 42, memberName: '안채원', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-04-08', round: '재등록' },
    { id: 80, memberId: 43, memberName: '장민철', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-04-09', round: '재등록' },
    { id: 81, memberId: 1,  memberName: '홍길동', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-04-10', round: '재등록' },
    { id: 82, memberId: 2,  memberName: '김영희', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 270000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-12', round: '재등록' },
    { id: 83, memberId: 3,  memberName: '이철수', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 150000, unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-04-12', round: '재등록' },
    { id: 84, memberId: 33, memberName: '황준서', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-04-14', round: '재등록' },
    { id: 85, memberId: 34, memberName: '류하은', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-04-14', round: '재등록' },
    { id: 86, memberId: 37, memberName: '고승우', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 270000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-15', round: '재등록' },
    { id: 87, memberId: 17, memberName: '최준혁', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-04-16', round: '재등록' },
    { id: 88, memberId: 4,  memberName: '박지민', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-04-16', round: '재등록' },
    { id: 89, memberId: 9,  memberName: '한소희', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 1, staffName: '김태희', saleDate: '2026-04-18', round: '재등록' },
    { id: 90, memberId: 12, memberName: '임재현', productId: 2,  productName: 'PT 20회',              amount: 1200000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1200000, cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-04-18', round: '재등록' },
    { id: 91, memberId: 8,  memberName: '윤도현', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 270000, unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-19', round: '재등록' },
    { id: 92, memberId: 36, memberName: '전지수', productId: 5,  productName: '3개월 이용권',          amount: 270000,  type: '이용권', status: 'COMPLETED', paymentMethod: 'CARD',     card: 270000,  cash: 0,      unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-20', round: '재등록' },
    { id: 93, memberId: 21, memberName: '조성민', productId: 10, productName: '운동복 세트',           amount: 35000,   type: '상품',  status: 'COMPLETED', paymentMethod: 'CASH',     card: 0,       cash: 35000,  unpaid: 0,      staffId: 5, staffName: '유재석', saleDate: '2026-04-20', round: '신규' },
    { id: 94, memberId: 41, memberName: '서동현', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-04-21', round: '재등록' },
    { id: 95, memberId: 44, memberName: '조예린', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 130000, unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-04-21', round: '재등록' },
    { id: 96, memberId: 48, memberName: '허수진', productId: 1,  productName: 'PT 10회',              amount: -700000, type: 'PT',    status: 'REFUNDED',  paymentMethod: 'CARD',     card: -700000, cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-04-22', round: '환불' },
    { id: 97, memberId: 45, memberName: '차승호', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 150000,  cash: 0,      unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-04-23', round: '재등록' },
    { id: 98, memberId: 6,  memberName: '정민호', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'UNPAID',    paymentMethod: 'CARD',     card: 1000000, cash: 0,      unpaid: 650000, staffId: 1, staffName: '김태희', saleDate: '2026-04-24', round: '재등록' },
    { id: 99, memberId: 39, memberName: '문성준', productId: 9,  productName: 'GX 요가 (월)',          amount: 130000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 130000,  cash: 0,      unpaid: 0,      staffId: 2, staffName: '이효리', saleDate: '2026-04-24', round: '재등록' },
    { id: 100,memberId: 38, memberName: '노유나', productId: 8,  productName: 'GX 그룹 필라테스 (월)', amount: 150000,  type: 'GX',    status: 'COMPLETED', paymentMethod: 'TRANSFER', card: 0,       cash: 150000, unpaid: 0,      staffId: 4, staffName: '박재범', saleDate: '2026-04-25', round: '재등록' },
    { id: 101,memberId: 14, memberName: '이수빈', productId: 3,  productName: 'PT 30회',              amount: 1650000, type: 'PT',    status: 'COMPLETED', paymentMethod: 'CARD',     card: 1650000, cash: 0,      unpaid: 0,      staffId: 3, staffName: '정지훈', saleDate: '2026-04-25', round: '재등록' },
  ];

  for (const s of salesRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO sales (id, "memberId", "memberName", "productId", "productName", "saleDate", type, round,
        "originalPrice", "salePrice", amount, "paymentMethod", cash, card, unpaid, status, "staffId", "staffName", "branchId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$9,$10,$11,$12,$13,$14,$15,$16,1)
       ON CONFLICT (id) DO NOTHING`,
      s.id, s.memberId, s.memberName, s.productId, s.productName, new Date(s.saleDate),
      s.type, s.round, Math.abs(s.amount), s.paymentMethod, s.cash, s.card, s.unpaid,
      s.status, s.staffId, s.staffName
    );
  }
  console.log(`  ✅ 매출 ${salesRows.length}건 생성`);

  // ============================================================
  // 6. 출석 (attendance) - 최근 30일
  // 사용 컬럼: memberId,memberName,checkInAt,checkOutAt,type,checkInMethod,isOtherBranch,branchId
  // ============================================================
  const today = new Date('2026-04-26');
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  await prisma.$executeRawUnsafe(
    `DELETE FROM attendance WHERE "checkInAt" >= $1 AND "checkInAt" < $2`,
    thirtyDaysAgo,
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  );

  const activeMembers = [
    { id: 1,  name: '홍길동',  type: 'PT' },
    { id: 2,  name: '김영희',  type: 'REGULAR' },
    { id: 3,  name: '이철수',  type: 'GX' },
    { id: 4,  name: '박지민',  type: 'PT' },
    { id: 7,  name: '강서연',  type: 'GX' },
    { id: 9,  name: '한소희',  type: 'PT' },
    { id: 11, name: '서지원',  type: 'GX' },
    { id: 12, name: '임재현',  type: 'PT' },
    { id: 13, name: '김민준',  type: 'PT' },
    { id: 14, name: '이수빈',  type: 'PT' },
    { id: 15, name: '박성훈',  type: 'PT' },
    { id: 17, name: '최준혁',  type: 'PT' },
    { id: 21, name: '조성민',  type: 'PT' },
    { id: 22, name: '임소영',  type: 'PT' },
    { id: 23, name: '김도윤',  type: 'REGULAR' },
    { id: 24, name: '이지은',  type: 'REGULAR' },
    { id: 28, name: '한지혜',  type: 'REGULAR' },
    { id: 29, name: '송재훈',  type: 'REGULAR' },
    { id: 38, name: '노유나',  type: 'GX' },
    { id: 39, name: '문성준',  type: 'GX' },
    { id: 40, name: '배소희',  type: 'GX' },
    { id: 41, name: '서동현',  type: 'GX' },
    { id: 44, name: '조예린',  type: 'GX' },
    { id: 45, name: '차승호',  type: 'GX' },
    { id: 49, name: '홍서준',  type: 'PT' },
    { id: 50, name: '강민서',  type: 'REGULAR' },
  ];

  const methods = ['KIOSK', 'APP', 'MANUAL'];
  const morningHours = [6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5];
  const eveningHours = [17.5, 18, 18.5, 19, 19.5, 20, 20.5];

  let attendanceCount = 0;
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const minCount = isWeekend ? 8 : 6;
    const maxCount = isWeekend ? 15 : 12;
    const dayCount = minCount + Math.floor((dayOffset + date.getDate()) % (maxCount - minCount + 1));
    const selectedCount = Math.min(dayCount, activeMembers.length);

    const shuffled = [...activeMembers].sort((a, b) =>
      ((a.id * 7 + dayOffset * 3) % 97) - ((b.id * 7 + dayOffset * 3) % 97)
    );
    const dayMembers = shuffled.slice(0, selectedCount);

    for (let i = 0; i < dayMembers.length; i++) {
      const m = dayMembers[i];
      const isEvening = i >= Math.ceil(dayMembers.length / 2);
      const timeSlots = isEvening ? eveningHours : morningHours;
      const hour = timeSlots[(i + dayOffset) % timeSlots.length];
      const checkInHour = Math.floor(hour);
      const checkInMin = (hour % 1) * 60;
      const checkInAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), checkInHour, checkInMin);
      const checkOutAt = new Date(checkInAt.getTime() + (60 + (i % 3) * 30) * 60000);

      await prisma.$executeRawUnsafe(
        `INSERT INTO attendance ("memberId", "memberName", "checkInAt", "checkOutAt", type, "checkInMethod", "isOtherBranch", "branchId")
         VALUES ($1,$2,$3,$4,$5,$6,false,1)`,
        m.id, m.name, checkInAt, checkOutAt, m.type, methods[(i + dayOffset) % 3]
      );
      attendanceCount++;
    }
  }
  console.log(`  ✅ 출석 ${attendanceCount}건 생성 (최근 30일)`);

  // ============================================================
  // 7. 락커 (lockers) - 50개
  // 사용 컬럼: number,status,memberId,memberName,assignedAt,expiresAt,branchId
  // ============================================================
  await prisma.$executeRawUnsafe(`DELETE FROM lockers`);

  const assignedLockers: Record<number, { id: number; name: string }> = {
    1: { id: 1,  name: '홍길동' },
    2: { id: 2,  name: '김영희' },
    3: { id: 4,  name: '박지민' },
    4: { id: 9,  name: '한소희' },
    5: { id: 13, name: '김민준' },
    6: { id: 15, name: '박성훈' },
    7: { id: 17, name: '최준혁' },
    8: { id: 21, name: '조성민' },
    9: { id: 28, name: '한지혜' },
    10: { id: 33, name: '황준서' },
    11: { id: 41, name: '서동현' },
    12: { id: 49, name: '홍서준' },
  };

  for (let i = 1; i <= 50; i++) {
    const num = String(i).padStart(3, '0');
    const assigned = assignedLockers[i];
    const isMaintenance = i === 48 || i === 49;
    const status = assigned ? 'IN_USE' : isMaintenance ? 'MAINTENANCE' : 'AVAILABLE';
    const expiresAt = assigned ? new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()) : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO lockers (number, status, "memberId", "memberName", "assignedAt", "expiresAt", "branchId")
       VALUES ($1,$2,$3,$4,$5,$6,1)`,
      num, status, assigned?.id ?? null, assigned?.name ?? null,
      assigned ? today : null, expiresAt
    );
  }
  console.log(`  ✅ 락커 50개 생성`);

  // ============================================================
  // 8. 수업 (classes) - 다음 14일
  // 사용 컬럼: title,type,staffId,staffName,room,startTime,endTime,capacity,booked,isRecurring,branchId
  // ============================================================
  await prisma.$executeRawUnsafe(`DELETE FROM classes`);

  const classDefs = [
    { title: '그룹 필라테스', type: 'GX', staffId: 2, staffName: '이효리', room: '필라테스룸', capacity: 14, days: [1,2,3,4,5], hour: 9 },
    { title: '그룹 요가',     type: 'GX', staffId: 4, staffName: '박재범', room: 'GX룸',      capacity: 20, days: [1,3,5],     hour: 11 },
    { title: '스피닝',        type: 'GX', staffId: 4, staffName: '박재범', room: '스피닝룸',   capacity: 30, days: [2,4,6],     hour: 19 },
  ];
  const ptSessions = [
    { title: 'PT 홍길동', staffId: 1, staffName: '김태희', hour: 7 },
    { title: 'PT 한소희', staffId: 1, staffName: '김태희', hour: 10 },
    { title: 'PT 임재현', staffId: 3, staffName: '정지훈', hour: 14 },
    { title: 'PT 김민준', staffId: 1, staffName: '김태희', hour: 16 },
  ];

  let classCount = 0;
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dow = date.getDay();

    for (const cls of classDefs) {
      if (!cls.days.includes(dow)) continue;
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), cls.hour, 0);
      const end = new Date(start.getTime() + 60 * 60000);
      const booked = 3 + (dayOffset + dow) % (cls.capacity - 3);
      await prisma.$executeRawUnsafe(
        `INSERT INTO classes (title, type, "staffId", "staffName", room, "startTime", "endTime", capacity, booked, "isRecurring", "branchId")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,1)`,
        cls.title, cls.type, cls.staffId, cls.staffName, cls.room, start, end, cls.capacity, booked
      );
      classCount++;
    }

    if (dow >= 1 && dow <= 5) {
      for (const pt of ptSessions) {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), pt.hour, 0);
        const end = new Date(start.getTime() + 60 * 60000);
        await prisma.$executeRawUnsafe(
          `INSERT INTO classes (title, type, "staffId", "staffName", room, "startTime", "endTime", capacity, booked, "isRecurring", "branchId")
           VALUES ($1,'PT',$2,$3,'PT존',$4,$5,1,1,false,1)`,
          pt.title, pt.staffId, pt.staffName, start, end
        );
        classCount++;
      }
    }
  }
  console.log(`  ✅ 수업 ${classCount}개 생성 (다음 14일)`);

  // ============================================================
  // 9. 체성분 (body_compositions) - PT 회원 10명 × 6회
  // 사용 컬럼: memberId,date,weight,muscle,fat,fatRate,bmi,memo
  // ============================================================
  await prisma.$executeRawUnsafe(`DELETE FROM body_compositions`);

  const ptMembersForBody = [
    { id: 1,  baseWeight: 80, baseMuscle: 35, baseFat: 15 },
    { id: 9,  baseWeight: 55, baseMuscle: 22, baseFat: 11 },
    { id: 12, baseWeight: 75, baseMuscle: 33, baseFat: 13 },
    { id: 13, baseWeight: 78, baseMuscle: 34, baseFat: 14 },
    { id: 14, baseWeight: 52, baseMuscle: 20, baseFat: 10 },
    { id: 15, baseWeight: 85, baseMuscle: 37, baseFat: 18 },
    { id: 17, baseWeight: 72, baseMuscle: 31, baseFat: 12 },
    { id: 19, baseWeight: 68, baseMuscle: 29, baseFat: 10 },
    { id: 21, baseWeight: 88, baseMuscle: 38, baseFat: 20 },
    { id: 33, baseWeight: 82, baseMuscle: 36, baseFat: 16 },
  ];

  let bodyCount = 0;
  for (const m of ptMembersForBody) {
    for (let session = 0; session < 6; session++) {
      const date = new Date(today);
      date.setMonth(today.getMonth() - Math.floor((5 - session) / 2));
      date.setDate(today.getDate() - ((5 - session) % 2) * 15);
      const weight  = parseFloat((m.baseWeight - session * 0.3 + (session % 2) * 0.1).toFixed(1));
      const muscle  = parseFloat((m.baseMuscle + session * 0.2).toFixed(1));
      const fat     = parseFloat((m.baseFat - session * 0.15).toFixed(1));
      const fatRate = parseFloat(((fat / weight) * 100).toFixed(1));
      const bmi     = parseFloat((weight / (1.72 ** 2)).toFixed(1));
      const memo    = session === 0 ? '최초 측정' : session === 5 ? '최근 측정 - 꾸준한 향상' : null;
      await prisma.$executeRawUnsafe(
        `INSERT INTO body_compositions ("memberId", date, weight, muscle, fat, "fatRate", bmi, memo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        m.id, date, weight, muscle, fat, fatRate, bmi, memo
      );
      bodyCount++;
    }
  }
  console.log(`  ✅ 체성분 ${bodyCount}건 생성`);

  // ============================================================
  // 10. 상담 (consultations)
  // 실제 컬럼: member_id,staff_id,staff_name,type,content,scheduled_at,completed_at,status,branch_id
  // ============================================================
  await prisma.$executeRawUnsafe(`DELETE FROM consultations`);

  const consultationRows = [
    { memberId: 1,  staffId: 1, staffName: '김태희', type: '상담',     content: '체중 감량 목표 15kg. PT 30회 패키지 추천. 주 3회 운동 계획 수립.',            status: 'completed', scheduledAt: new Date('2026-01-05'), completedAt: new Date('2026-01-05') },
    { memberId: 13, staffId: 1, staffName: '김태희', type: 'OT',       content: 'PT 첫 OT 세션. 체력 기초 측정 완료. 상체 위주 운동 계획.',                   status: 'completed', scheduledAt: new Date('2026-02-04'), completedAt: new Date('2026-02-04') },
    { memberId: 14, staffId: 3, staffName: '정지훈', type: '체험',     content: '무료 체험 PT 1회. 근력 운동 입문자. 기초 근력 강화 프로그램 설명.',             status: 'completed', scheduledAt: new Date('2026-02-05'), completedAt: new Date('2026-02-05') },
    { memberId: 15, staffId: 1, staffName: '김태희', type: '상담',     content: '근육 증량 목표. 고단백 식단 + PT 30회 추천. 벌크업 프로그램 안내.',            status: 'completed', scheduledAt: new Date('2026-02-08'), completedAt: new Date('2026-02-08') },
    { memberId: 27, staffId: 5, staffName: '유재석', type: '재등록상담', content: '만료 후 미방문. 전화 상담 진행. 재등록 할인 10% 안내. 검토 중.',              status: 'completed', scheduledAt: new Date('2026-02-20'), completedAt: new Date('2026-02-20') },
    { memberId: 33, staffId: 1, staffName: '김태희', type: 'OT',       content: 'PT 첫 OT. 무릎 부상 이력 있음. 저충격 하체 운동 위주 계획. 의사 소견서 요청.',  status: 'completed', scheduledAt: new Date('2026-02-27'), completedAt: new Date('2026-02-27') },
    { memberId: 49, staffId: 1, staffName: '김태희', type: '상담',     content: '마라톤 준비 목적. 유산소 + 코어 강화 PT 프로그램. 주 2회 PT + 자체 러닝 병행.', status: 'completed', scheduledAt: new Date('2026-03-21'), completedAt: new Date('2026-03-21') },
    { memberId: 30, staffId: 5, staffName: '유재석', type: '재등록상담', content: '만료 D-7 알림 후 방문. 재등록 의사 있음. 6개월권 추천.',                    status: 'scheduled', scheduledAt: new Date('2026-04-28'), completedAt: null },
    { memberId: 31, staffId: 5, staffName: '유재석', type: '재등록상담', content: '만료 임박 회원. 카카오 알림 발송 후 미응답. 전화 상담 예정.',                 status: 'scheduled', scheduledAt: new Date('2026-04-29'), completedAt: null },
    { memberId: 50, staffId: 5, staffName: '유재석', type: '상담',     content: '신규 가입 상담. 다이어트 목적. 12개월권 + 락커 패키지 등록.',                  status: 'completed', scheduledAt: new Date('2026-04-01'), completedAt: new Date('2026-04-01') },
  ];

  for (const c of consultationRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO consultations (member_id, staff_id, staff_name, type, content, scheduled_at, completed_at, status, branch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)`,
      c.memberId, c.staffId, c.staffName, c.type, c.content, c.scheduledAt, c.completedAt, c.status
    );
  }
  console.log(`  ✅ 상담 ${consultationRows.length}건 생성`);

  // ============================================================
  // 11. 쿠폰 (coupons)
  // 사용 컬럼: name,type,value,validFrom,validUntil,totalIssued,totalUsed,isActive,branchId
  // ============================================================
  await prisma.$executeRawUnsafe(`DELETE FROM coupons`);

  const couponRows = [
    { name: '신규 가입 10% 할인',  type: '할인율',  value: 10,    validFrom: '2026-01-01', validUntil: '2026-12-31', totalIssued: 50, totalUsed: 28 },
    { name: '생일 축하 할인 쿠폰', type: '정액할인', value: 30000, validFrom: '2026-01-01', validUntil: '2026-12-31', totalIssued: 30, totalUsed: 12 },
    { name: '재등록 감사 5% 할인', type: '할인율',  value: 5,     validFrom: '2026-03-01', validUntil: '2026-06-30', totalIssued: 40, totalUsed: 15 },
  ];

  for (const c of couponRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO coupons (name, type, value, "validFrom", "validUntil", "totalIssued", "totalUsed", "isActive", "branchId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,1)`,
      c.name, c.type, c.value, new Date(c.validFrom), new Date(c.validUntil), c.totalIssued, c.totalUsed
    );
  }
  console.log(`  ✅ 쿠폰 ${couponRows.length}종 생성`);

  // ============================================================
  // 12. 설정 (settings)
  // ============================================================
  await prisma.$executeRawUnsafe(
    `INSERT INTO settings ("branchId", "centerName", "businessHoursOpen", "businessHoursClose", holidays,
       "smsEnabled", "kakaoEnabled", "pushEnabled", "autoExpireNotify", "expireNoticeDays", theme)
     VALUES (1,'FitGenie CRM 강남 본점','06:00','22:00','["SUNDAY"]'::jsonb,true,true,true,true,7,'light')
     ON CONFLICT ("branchId") DO NOTHING`
  );
  console.log('  ✅ 설정 생성');

  console.log('\n🎉 시드 데이터 생성 완료!');
  console.log('  - 지점: 3개');
  console.log('  - 직원: 5명');
  console.log(`  - 회원: ${memberRows.length}명 (ACTIVE 38, EXPIRED 3, HOLDING 3, INACTIVE 2)`);
  console.log(`  - 매출: ${salesRows.length}건 (2월~4월, 미수금 5건, 환불 3건)`);
  console.log(`  - 출석: ${attendanceCount}건 (최근 30일)`);
  console.log(`  - 수업: ${classCount}개 (다음 14일)`);
  console.log(`  - 체성분: ${bodyCount}건 (PT 회원 10명 × 6회)`);
  console.log(`  - 상담: ${consultationRows.length}건`);
  console.log(`  - 쿠폰: ${couponRows.length}종`);
  console.log('  - 락커: 50개');
}

main()
  .catch((e) => {
    console.error('❌ 시드 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
