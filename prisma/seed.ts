/**
 * 초기 시드 데이터 (데모용 확장판 - raw SQL 기반)
 * 실행: npx tsx prisma/seed.ts
 *
 * 스키마와 DB 컬럼이 미싱크 상태이므로 모든 INSERT를 raw SQL로 처리합니다.
 */
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
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

  // 0. Tenant 생성 (branches.tenantId FK 필요)
  await prisma.$executeRawUnsafe(`
    INSERT INTO "tenants" (id, name, plan, "maxBranches", "isActive", "createdAt", "updatedAt")
    VALUES (1, 'FitGenie CRM', 'PREMIUM', 20, true, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // 지부 컬럼이 없으면 추가 (멱등)
  await prisma.$executeRawUnsafe(`ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "districtCode" TEXT DEFAULT ''`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "districtName" TEXT DEFAULT ''`);

  // KPI 확장 컬럼 추가 (멱등)
  await prisma.$executeRawUnsafe(`ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "inquiryType" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "source" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "saleCategory" TEXT DEFAULT '일반'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "receiptIssued" BOOLEAN DEFAULT true`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "penaltyAmount" DECIMAL DEFAULT 0`);

  // ============================================================
  // 1. 지점 (branches) - 16개 실제 지점
  // ============================================================
  const branchList = [
    { id: 1,  branchCode: 'BR001', name: '광화문',   districtName: '1지부', districtCode: 'A-1', address: '서울시 종로구', phone: '02-1234-5678' },
    { id: 2,  branchCode: 'BR002', name: '을지로',   districtName: '1지부', districtCode: 'A-1', address: '서울시 중구',   phone: '02-1234-5679' },
    { id: 3,  branchCode: 'BR003', name: '종각',     districtName: '1지부', districtCode: 'A-1', address: '서울시 종로구', phone: '02-1234-5680' },
    { id: 4,  branchCode: 'BR004', name: '종로',     districtName: '1지부', districtCode: 'A-1', address: '서울시 종로구', phone: '02-1234-5681' },
    { id: 5,  branchCode: 'BR005', name: '서교',     districtName: '1지부', districtCode: 'A-1', address: '서울시 마포구', phone: '02-1234-5682' },
    { id: 6,  branchCode: 'BR006', name: '신당',     districtName: '1지부', districtCode: 'A-1', address: '서울시 중구',   phone: '02-1234-5683' },
    { id: 7,  branchCode: 'BR007', name: '가양',     districtName: '1지부', districtCode: 'A-1', address: '서울시 강서구', phone: '02-1234-5684' },
    { id: 8,  branchCode: 'BR008', name: '고덕역',   districtName: '1지부', districtCode: 'A-1', address: '서울시 강동구', phone: '02-1234-5685' },
    { id: 9,  branchCode: 'BR009', name: '양천향교', districtName: '1지부', districtCode: 'A-1', address: '서울시 양천구', phone: '02-1234-5686' },
    { id: 10, branchCode: 'BR010', name: '용산',     districtName: '2지부', districtCode: 'A-2', address: '서울시 용산구', phone: '02-1234-5687' },
    { id: 11, branchCode: 'BR011', name: '판교',     districtName: '2지부', districtCode: 'A-2', address: '경기도 성남시', phone: '031-1234-5688' },
    { id: 12, branchCode: 'BR012', name: '판교역',   districtName: '2지부', districtCode: 'A-2', address: '경기도 성남시', phone: '031-1234-5689' },
    { id: 13, branchCode: 'BR013', name: '대치',     districtName: '2지부', districtCode: 'A-2', address: '서울시 강남구', phone: '02-1234-5690' },
    { id: 14, branchCode: 'BR014', name: '고척',     districtName: '2지부', districtCode: 'A-2', address: '서울시 구로구', phone: '02-1234-5691' },
    { id: 15, branchCode: 'BR015', name: '부천',     districtName: '2지부', districtCode: 'A-2', address: '경기도 부천시', phone: '032-1234-5692' },
    { id: 16, branchCode: 'BR016', name: '목동',     districtName: '미설정', districtCode: '-',  address: '서울시 양천구', phone: '02-1234-5693' },
  ];

  for (const b of branchList) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "branches" (id, name, address, phone, status, "isActive", "tenantId", "branchCode", "districtCode", "districtName", "branchStatus", "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,'운영중',true,1,$5,$6,$7,'ACTIVE',NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET
        name=$2, address=$3, phone=$4, "branchCode"=$5, "districtCode"=$6, "districtName"=$7, "updatedAt"=NOW()
    `, b.id, b.name, b.address, b.phone, b.branchCode, b.districtCode, b.districtName);
  }
  console.log(`  ✅ 지점 ${branchList.length}개 생성`);

  // ============================================================
  // 2. 직원 (staff)
  // staff 컬럼: id,name,phone,email,role,position,hireDate,salary,color,isActive,branchId
  // ============================================================
  const staffRows = [
    { id: 1, name: '김태희', phone: '010-1111-2222', email: 'taehee@spogym.com',  role: '트레이너', position: 'PT 팀장',      hireDate: '2023-03-15', salary: 3500000, color: '#EF4444', branchId: 1 },
    { id: 2, name: '이효리', phone: '010-2222-3333', email: 'hyori@spogym.com',   role: '트레이너', position: 'GX 강사',      hireDate: '2023-06-01', salary: 3200000, color: '#3B82F6', branchId: 2 },
    { id: 3, name: '정지훈', phone: '010-3333-4444', email: 'jihoon@spogym.com',  role: '트레이너', position: 'PT 강사',      hireDate: '2024-01-10', salary: 3000000, color: '#F59E0B', branchId: 3 },
    { id: 4, name: '박재범', phone: '010-4444-5555', email: 'jaebeom@spogym.com', role: '트레이너', position: 'GX 강사',      hireDate: '2024-03-01', salary: 2800000, color: '#8B5CF6', branchId: 4 },
    { id: 5, name: '유재석', phone: '010-5555-6666', email: 'jaeseok@spogym.com', role: '프론트',   position: '프론트 데스크', hireDate: '2024-06-01', salary: 2500000, color: '#10B981', branchId: 5 },
  ];
  for (const s of staffRows) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO staff (id, name, phone, email, role, position, "hireDate", salary, color, "isActive", "branchId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
       ON CONFLICT (id) DO NOTHING`,
      s.id, s.name, s.phone, s.email, s.role, s.position, new Date(s.hireDate), s.salary, s.color, s.branchId
    );
  }
  console.log(`  ✅ 직원 ${staffRows.length}명 생성`);

  // 나머지 지점 직원 (id 6-16) - branchId를 6~16에 분산
  const staffRows2 = [
    { id: 6,  name: '송지효', phone: '010-6001-0006', email: 'jihyo@spogym.com',   role: '매니저',   position: '지점장',        hireDate: '2023-01-10', salary: 4000000, color: '#EC4899', branchId: 6 },
    { id: 7,  name: '남주혁', phone: '010-7001-0007', email: 'joohyuk@spogym.com', role: '트레이너', position: 'PT 팀장',        hireDate: '2023-04-01', salary: 3500000, color: '#6366F1', branchId: 7 },
    { id: 8,  name: '신민아', phone: '010-8001-0008', email: 'mina@spogym.com',    role: '트레이너', position: 'GX 강사',        hireDate: '2023-09-01', salary: 3200000, color: '#14B8A6', branchId: 8 },
    { id: 9,  name: '이준기', phone: '010-9001-0009', email: 'joongi@spogym.com',  role: '프론트',   position: '프론트 데스크',  hireDate: '2024-02-01', salary: 2500000, color: '#F97316', branchId: 9 },
    { id: 10, name: '한가인', phone: '010-1002-0010', email: 'gain@spogym.com',    role: '매니저',   position: '지점장',        hireDate: '2023-02-15', salary: 3800000, color: '#A855F7', branchId: 10 },
    { id: 11, name: '원빈',   phone: '010-1102-0011', email: 'wonbin@spogym.com',  role: '트레이너', position: 'PT 강사',        hireDate: '2023-07-01', salary: 3200000, color: '#EF4444', branchId: 11 },
    { id: 12, name: '고준희', phone: '010-1202-0012', email: 'junhee@spogym.com',  role: '프론트',   position: '프론트 데스크',  hireDate: '2024-03-01', salary: 2500000, color: '#22C55E', branchId: 12 },
    { id: 13, name: '박서준', phone: '010-1301-0013', email: 'seojun@spogym.com',  role: '매니저',   position: '지점장',        hireDate: '2023-05-01', salary: 4000000, color: '#0EA5E9', branchId: 13 },
    { id: 14, name: '김지원', phone: '010-1401-0014', email: 'jiwon@spogym.com',   role: '트레이너', position: 'PT 강사',        hireDate: '2023-08-01', salary: 3200000, color: '#84CC16', branchId: 14 },
    { id: 15, name: '이서진', phone: '010-1501-0015', email: 'seojin@spogym.com',  role: '프론트',   position: '프론트 데스크',  hireDate: '2024-01-10', salary: 2500000, color: '#FB923C', branchId: 15 },
    { id: 16, name: '최우식', phone: '010-1601-0016', email: 'woosik@spogym.com',  role: '매니저',   position: '지점장',        hireDate: '2023-11-01', salary: 3800000, color: '#C084FC', branchId: 16 },
  ];
  for (const s of staffRows2) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO staff (id, name, phone, email, role, position, "hireDate", salary, color, "isActive", "branchId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
       ON CONFLICT (id) DO NOTHING`,
      s.id, s.name, s.phone, s.email, s.role, s.position, new Date(s.hireDate), s.salary, s.color, s.branchId
    );
  }
  console.log(`  ✅ 직원 추가 ${staffRows2.length}명 (각 지점 분산)`);

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

  // 기존 회원(1-50)을 16개 지점에 균등 재배분
  for (let i = 1; i <= 50; i++) {
    const branchId = ((i - 1) % 16) + 1;
    await prisma.$executeRawUnsafe(`UPDATE members SET "branchId"=$1 WHERE id=$2`, branchId, i);
  }

  // 서초점 회원 (id 51-80) + 송파점 회원 (id 81-100)
  const memberRows2: {
    id: number; name: string; phone: string; gender: Gender;
    birthDate: string; membershipType: string; membershipStart: string;
    membershipExpiry: string; status: MemberStatus; mileage: number;
    staffId: number | null; branchId: number;
  }[] = [
    // 서초점 30명 (51-80) - branchId 2~9 순환
    { id: 51, name: '구해라', phone: '010-5101-0051', gender: 'F', birthDate: '1992-03-14', membershipType: 'PT',         membershipStart: '2025-01-10', membershipExpiry: '2026-07-10', status: 'ACTIVE',   mileage: 12000, staffId: 7,  branchId: 2 },
    { id: 52, name: '민경훈', phone: '010-5201-0052', gender: 'M', birthDate: '1988-07-22', membershipType: 'MEMBERSHIP',  membershipStart: '2025-01-15', membershipExpiry: '2026-01-15', status: 'EXPIRED',  mileage: 3000,  staffId: null, branchId: 3 },
    { id: 53, name: '소이현', phone: '010-5301-0053', gender: 'F', birthDate: '1993-11-08', membershipType: 'GX',          membershipStart: '2025-02-01', membershipExpiry: '2026-08-01', status: 'ACTIVE',   mileage: 8500,  staffId: null, branchId: 4 },
    { id: 54, name: '이동욱', phone: '010-5401-0054', gender: 'M', birthDate: '1985-06-30', membershipType: 'PT',          membershipStart: '2025-02-15', membershipExpiry: '2026-08-15', status: 'ACTIVE',   mileage: 15000, staffId: 7,  branchId: 5 },
    { id: 55, name: '박보영', phone: '010-5501-0055', gender: 'F', birthDate: '1990-04-11', membershipType: 'MEMBERSHIP',  membershipStart: '2025-03-01', membershipExpiry: '2026-03-01', status: 'EXPIRED',  mileage: 2500,  staffId: null, branchId: 6 },
    { id: 56, name: '조인성', phone: '010-5601-0056', gender: 'M', birthDate: '1981-07-18', membershipType: 'PT',          membershipStart: '2025-03-10', membershipExpiry: '2026-09-10', status: 'ACTIVE',   mileage: 18000, staffId: 7,  branchId: 7 },
    { id: 57, name: '한효주', phone: '010-5701-0057', gender: 'F', birthDate: '1987-02-22', membershipType: 'GX',          membershipStart: '2025-04-01', membershipExpiry: '2026-10-01', status: 'ACTIVE',   mileage: 9200,  staffId: null, branchId: 8 },
    { id: 58, name: '장동건', phone: '010-5801-0058', gender: 'M', birthDate: '1972-03-07', membershipType: 'MEMBERSHIP',  membershipStart: '2025-04-15', membershipExpiry: '2026-04-15', status: 'ACTIVE',   mileage: 7800,  staffId: null, branchId: 9 },
    { id: 59, name: '김태리', phone: '010-5901-0059', gender: 'F', birthDate: '1994-04-24', membershipType: 'PT',          membershipStart: '2025-05-01', membershipExpiry: '2026-11-01', status: 'ACTIVE',   mileage: 11000, staffId: 7,  branchId: 10 },
    { id: 60, name: '류준열', phone: '010-6001-0060', gender: 'M', birthDate: '1986-09-25', membershipType: 'MEMBERSHIP',  membershipStart: '2025-05-15', membershipExpiry: '2025-08-15', status: 'EXPIRED',  mileage: 500,   staffId: null, branchId: 11 },
    { id: 61, name: '공효진', phone: '010-6101-0061', gender: 'F', birthDate: '1980-01-07', membershipType: 'GX',          membershipStart: '2025-06-01', membershipExpiry: '2026-06-01', status: 'ACTIVE',   mileage: 6500,  staffId: null, branchId: 12 },
    { id: 62, name: '현빈',   phone: '010-6201-0062', gender: 'M', birthDate: '1982-09-25', membershipType: 'PT',          membershipStart: '2025-06-10', membershipExpiry: '2025-12-10', status: 'EXPIRED',  mileage: 4000,  staffId: 7,  branchId: 13 },
    { id: 63, name: '손예진', phone: '010-6301-0063', gender: 'F', birthDate: '1982-01-11', membershipType: 'MEMBERSHIP',  membershipStart: '2025-07-01', membershipExpiry: '2026-07-01', status: 'ACTIVE',   mileage: 13000, staffId: null, branchId: 14 },
    { id: 64, name: '정해인', phone: '010-6401-0064', gender: 'M', birthDate: '1988-04-01', membershipType: 'PT',          membershipStart: '2025-07-15', membershipExpiry: '2026-01-15', status: 'EXPIRED',  mileage: 2000,  staffId: 7,  branchId: 15 },
    { id: 65, name: '김고은', phone: '010-6501-0065', gender: 'F', birthDate: '1991-07-02', membershipType: 'GX',          membershipStart: '2025-08-01', membershipExpiry: '2026-02-01', status: 'EXPIRED',  mileage: 1500,  staffId: null, branchId: 16 },
    { id: 66, name: '이제훈', phone: '010-6601-0066', gender: 'M', birthDate: '1986-09-15', membershipType: 'MEMBERSHIP',  membershipStart: '2025-08-15', membershipExpiry: '2026-08-15', status: 'ACTIVE',   mileage: 10500, staffId: null, branchId: 2 },
    { id: 67, name: '박신혜', phone: '010-6701-0067', gender: 'F', birthDate: '1990-02-18', membershipType: 'PT',          membershipStart: '2025-09-01', membershipExpiry: '2026-03-01', status: 'EXPIRED',  mileage: 3500,  staffId: 7,  branchId: 3 },
    { id: 68, name: '송중기', phone: '010-6801-0068', gender: 'M', birthDate: '1985-09-19', membershipType: 'MEMBERSHIP',  membershipStart: '2025-09-15', membershipExpiry: '2026-09-15', status: 'ACTIVE',   mileage: 8000,  staffId: null, branchId: 4 },
    { id: 69, name: '전지현', phone: '010-6901-0069', gender: 'F', birthDate: '1981-10-30', membershipType: 'PT',          membershipStart: '2025-10-01', membershipExpiry: '2026-04-01', status: 'ACTIVE',   mileage: 14000, staffId: 7,  branchId: 5 },
    { id: 70, name: '공유',   phone: '010-7001-0070', gender: 'M', birthDate: '1979-07-10', membershipType: 'MEMBERSHIP',  membershipStart: '2025-10-15', membershipExpiry: '2026-10-15', status: 'ACTIVE',   mileage: 9500,  staffId: null, branchId: 6 },
    { id: 71, name: '김혜수', phone: '010-7101-0071', gender: 'F', birthDate: '1970-09-05', membershipType: 'GX',          membershipStart: '2025-11-01', membershipExpiry: '2026-05-01', status: 'ACTIVE',   mileage: 6000,  staffId: null, branchId: 7 },
    { id: 72, name: '이병헌', phone: '010-7201-0072', gender: 'M', birthDate: '1970-07-12', membershipType: 'PT',          membershipStart: '2025-11-15', membershipExpiry: '2026-05-15', status: 'ACTIVE',   mileage: 17000, staffId: 7,  branchId: 8 },
    { id: 73, name: '김민희', phone: '010-7301-0073', gender: 'F', birthDate: '1982-04-14', membershipType: 'MEMBERSHIP',  membershipStart: '2025-12-01', membershipExpiry: '2026-06-01', status: 'ACTIVE',   mileage: 7500,  staffId: null, branchId: 9 },
    { id: 74, name: '유아인', phone: '010-7401-0074', gender: 'M', birthDate: '1986-10-06', membershipType: 'MEMBERSHIP',  membershipStart: '2025-12-15', membershipExpiry: '2026-06-15', status: 'ACTIVE',   mileage: 5500,  staffId: null, branchId: 10 },
    { id: 75, name: '수지',   phone: '010-7501-0075', gender: 'F', birthDate: '1994-10-10', membershipType: 'PT',          membershipStart: '2026-01-05', membershipExpiry: '2026-07-05', status: 'ACTIVE',   mileage: 4000,  staffId: 7,  branchId: 11 },
    { id: 76, name: '이민호', phone: '010-7601-0076', gender: 'M', birthDate: '1987-06-22', membershipType: 'MEMBERSHIP',  membershipStart: '2026-01-10', membershipExpiry: '2026-07-10', status: 'ACTIVE',   mileage: 3000,  staffId: null, branchId: 12 },
    { id: 77, name: '김지원', phone: '010-7701-0077', gender: 'F', birthDate: '1992-09-22', membershipType: 'GX',          membershipStart: '2026-02-01', membershipExpiry: '2026-08-01', status: 'ACTIVE',   mileage: 2500,  staffId: null, branchId: 13 },
    { id: 78, name: '박서준', phone: '010-7801-0078', gender: 'M', birthDate: '1988-12-16', membershipType: 'PT',          membershipStart: '2026-02-15', membershipExpiry: '2026-08-15', status: 'ACTIVE',   mileage: 1500,  staffId: 7,  branchId: 14 },
    { id: 79, name: '김다미', phone: '010-7901-0079', gender: 'F', birthDate: '1995-03-29', membershipType: 'MEMBERSHIP',  membershipStart: '2026-03-01', membershipExpiry: '2026-09-01', status: 'ACTIVE',   mileage: 800,   staffId: null, branchId: 15 },
    { id: 80, name: '최우식', phone: '010-8001-0080', gender: 'M', birthDate: '1990-03-26', membershipType: 'MEMBERSHIP',  membershipStart: '2026-04-01', membershipExpiry: '2027-04-01', status: 'ACTIVE',   mileage: 200,   staffId: null, branchId: 16 },
    // 송파점 20명 (81-100) - branchId 3~16 분산
    { id: 81,  name: '이나영',  phone: '010-8101-0081', gender: 'F', birthDate: '1983-02-18', membershipType: 'PT',         membershipStart: '2025-01-20', membershipExpiry: '2026-07-20', status: 'ACTIVE',   mileage: 14000, staffId: 11,   branchId: 3 },
    { id: 82,  name: '원더걸',  phone: '010-8201-0082', gender: 'M', birthDate: '1986-04-12', membershipType: 'MEMBERSHIP', membershipStart: '2025-02-01', membershipExpiry: '2025-08-01', status: 'EXPIRED',  mileage: 2000,  staffId: null, branchId: 4 },
    { id: 83,  name: '차은우',  phone: '010-8301-0083', gender: 'M', birthDate: '1997-03-30', membershipType: 'PT',         membershipStart: '2025-03-01', membershipExpiry: '2026-09-01', status: 'ACTIVE',   mileage: 16000, staffId: 11,   branchId: 5 },
    { id: 84,  name: '아이유',  phone: '010-8401-0084', gender: 'F', birthDate: '1993-05-16', membershipType: 'MEMBERSHIP', membershipStart: '2025-04-01', membershipExpiry: '2026-04-01', status: 'ACTIVE',   mileage: 8000,  staffId: null, branchId: 6 },
    { id: 85,  name: '방탄진',  phone: '010-8501-0085', gender: 'M', birthDate: '1992-12-04', membershipType: 'GX',         membershipStart: '2025-05-01', membershipExpiry: '2026-05-01', status: 'ACTIVE',   mileage: 5500,  staffId: null, branchId: 7 },
    { id: 86,  name: '오마이걸', phone: '010-8601-0086', gender: 'F', birthDate: '1996-08-07', membershipType: 'MEMBERSHIP', membershipStart: '2025-06-01', membershipExpiry: '2025-12-01', status: 'EXPIRED',  mileage: 1000,  staffId: null, branchId: 8 },
    { id: 87,  name: '황민현',  phone: '010-8701-0087', gender: 'M', birthDate: '1995-08-09', membershipType: 'PT',         membershipStart: '2025-07-01', membershipExpiry: '2026-01-01', status: 'EXPIRED',  mileage: 3500,  staffId: 11,   branchId: 9 },
    { id: 88,  name: '안소희',  phone: '010-8801-0088', gender: 'F', birthDate: '1988-12-05', membershipType: 'MEMBERSHIP', membershipStart: '2025-08-01', membershipExpiry: '2026-08-01', status: 'ACTIVE',   mileage: 9000,  staffId: null, branchId: 10 },
    { id: 89,  name: '이승기',  phone: '010-8901-0089', gender: 'M', birthDate: '1987-01-13', membershipType: 'PT',         membershipStart: '2025-09-01', membershipExpiry: '2026-03-01', status: 'ACTIVE',   mileage: 12000, staffId: 11,   branchId: 11 },
    { id: 90,  name: '강민경',  phone: '010-9001-0090', gender: 'F', birthDate: '1991-06-09', membershipType: 'GX',         membershipStart: '2025-10-01', membershipExpiry: '2026-04-01', status: 'ACTIVE',   mileage: 6500,  staffId: null, branchId: 12 },
    { id: 91,  name: '임영웅',  phone: '010-9101-0091', gender: 'M', birthDate: '1991-06-16', membershipType: 'MEMBERSHIP', membershipStart: '2025-11-01', membershipExpiry: '2026-11-01', status: 'ACTIVE',   mileage: 11000, staffId: null, branchId: 13 },
    { id: 92,  name: '이찬원',  phone: '010-9201-0092', gender: 'M', birthDate: '1998-12-05', membershipType: 'PT',         membershipStart: '2025-12-01', membershipExpiry: '2026-06-01', status: 'ACTIVE',   mileage: 7500,  staffId: 11,   branchId: 14 },
    { id: 93,  name: '장민호',  phone: '010-9301-0093', gender: 'M', birthDate: '1995-05-24', membershipType: 'MEMBERSHIP', membershipStart: '2026-01-01', membershipExpiry: '2026-07-01', status: 'ACTIVE',   mileage: 4500,  staffId: null, branchId: 15 },
    { id: 94,  name: '박은빈',  phone: '010-9401-0094', gender: 'F', birthDate: '1992-09-05', membershipType: 'PT',         membershipStart: '2026-01-15', membershipExpiry: '2026-07-15', status: 'ACTIVE',   mileage: 3000,  staffId: 11,   branchId: 16 },
    { id: 95,  name: '이도현',  phone: '010-9501-0095', gender: 'M', birthDate: '1995-04-21', membershipType: 'MEMBERSHIP', membershipStart: '2026-02-01', membershipExpiry: '2026-08-01', status: 'ACTIVE',   mileage: 2000,  staffId: null, branchId: 3 },
    { id: 96,  name: '고윤정',  phone: '010-9601-0096', gender: 'F', birthDate: '1996-01-02', membershipType: 'GX',         membershipStart: '2026-02-15', membershipExpiry: '2026-08-15', status: 'ACTIVE',   mileage: 1500,  staffId: null, branchId: 4 },
    { id: 97,  name: '변우석',  phone: '010-9701-0097', gender: 'M', birthDate: '1992-05-28', membershipType: 'PT',         membershipStart: '2026-03-01', membershipExpiry: '2026-09-01', status: 'ACTIVE',   mileage: 1000,  staffId: 11,   branchId: 5 },
    { id: 98,  name: '김혜윤',  phone: '010-9801-0098', gender: 'F', birthDate: '1999-02-20', membershipType: 'MEMBERSHIP', membershipStart: '2026-03-15', membershipExpiry: '2026-09-15', status: 'ACTIVE',   mileage: 600,   staffId: null, branchId: 6 },
    { id: 99,  name: '손석구',  phone: '010-9901-0099', gender: 'M', birthDate: '1983-10-18', membershipType: 'PT',         membershipStart: '2026-04-01', membershipExpiry: '2026-10-01', status: 'ACTIVE',   mileage: 200,   staffId: 11,   branchId: 7 },
    { id: 100, name: '문가영',  phone: '010-0002-0100', gender: 'F', birthDate: '1993-12-28', membershipType: 'MEMBERSHIP', membershipStart: '2026-04-15', membershipExpiry: '2027-04-15', status: 'ACTIVE',   mileage: 100,   staffId: null, branchId: 8 },
  ];
  for (const m of memberRows2) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO members (id, name, phone, gender, "birthDate", "membershipType", "membershipStart", "membershipExpiry", status, mileage, "branchId", "staffId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET "branchId"=$11`,
      m.id, m.name, m.phone, m.gender, new Date(m.birthDate),
      m.membershipType, new Date(m.membershipStart), new Date(m.membershipExpiry),
      m.status, m.mileage, m.branchId, m.staffId
    );
  }
  console.log(`  ✅ 회원 추가 ${memberRows2.length}명 (16개 지점 분산)`);

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

  // 매출 지점 재배분 (지점별로 균등하게)
  await prisma.$executeRawUnsafe(`UPDATE sales SET "branchId" = ((id - 1) % 16) + 1`);
  console.log(`  ✅ 매출 branchId 16개 지점 재배분 완료`);

  // 1지부(branchId 1-9) 매출 볼륨 우위 반영: id % 5 != 0 인 것은 1지부(60%)
  await prisma.$executeRawUnsafe(`
    UPDATE sales SET "branchId" = (((id - 1) % 9) + 1)
    WHERE id % 5 != 0 AND id <= 1000
  `);
  // id % 5 == 0 인 것은 2지부(branchId 10-15, 35%)
  await prisma.$executeRawUnsafe(`
    UPDATE sales SET "branchId" = (((id - 1) % 6) + 10)
    WHERE id % 5 = 0 AND id <= 1200
  `);
  // 목동(branchId 16)은 일부만 (id % 25 == 0, 약 5%)
  await prisma.$executeRawUnsafe(`
    UPDATE sales SET "branchId" = 16
    WHERE id % 25 = 0
  `);
  console.log(`  ✅ 매출 지부별 볼륨 차이 반영 완료 (1지부 60%, 2지부 35%, 목동 5%)`);

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
      `INSERT INTO consultations ("memberId", "staffId", "staffName", type, content, "scheduledAt", "completedAt", status, "branchId")
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
  // 11.5 사용자/로그인 계정 (users)
  //   - 본사부터 지점까지 테스트 로그인용 계정
  //   - 평문 비밀번호 (auth.ts fallback 모드)
  //   - 운영 시 seed-auth-users.ts 로 Supabase Auth 마이그레이션
  //   - 로그인 페이지 모달의 ACCOUNT_PRESETS 와 동기화 유지
  // ============================================================

  // Role enum 이 없는 환경 대비 (멱등)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('ADMIN', 'OWNER', 'MANAGER', 'TRAINER', 'STAFF', 'RECEPTIONIST', 'READONLY');
      END IF;
    END $$
  `);

  // 멀티테넌트 마이그레이션이 아직 적용되지 않은 환경 대비 (멱등)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenantId" INT DEFAULT 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "currentBranchId" INT`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loginFailCount" INT NOT NULL DEFAULT 0`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP`,
  );
  // branchId 슈퍼관리자(NULL) 허용
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "users" ALTER COLUMN "branchId" DROP NOT NULL`,
  ).catch(() => { /* 이미 nullable */ });

  const userSeed: Array<{
    id: number;
    username: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'OWNER' | 'MANAGER' | 'TRAINER' | 'STAFF' | 'RECEPTIONIST' | 'READONLY';
    branchId: number | null;
    isSuperAdmin: boolean;
    email?: string;
  }> = [
    // 본사
    { id: 1001, username: 'super',       password: 'super1234',   name: '슈퍼관리자',     role: 'ADMIN',        branchId: null, isSuperAdmin: true,  email: 'super@spogym.com' },
    { id: 1002, username: 'hq-ops',      password: 'hqops1234',   name: '본사 운영관리자', role: 'ADMIN',        branchId: 1,    isSuperAdmin: true,  email: 'ops@spogym.com' },

    // 지부
    { id: 1003, username: 'district1',   password: 'd1234',       name: '1지부장',        role: 'MANAGER',      branchId: 1,    isSuperAdmin: false, email: 'd1@spogym.com' },
    { id: 1004, username: 'district2',   password: 'd1234',       name: '2지부장',        role: 'MANAGER',      branchId: 10,   isSuperAdmin: false, email: 'd2@spogym.com' },

    // 지점장 (광화문, 판교, 목동)
    { id: 1005, username: 'br001',       password: 'br1234',      name: '광화문 지점장',  role: 'OWNER',        branchId: 1,    isSuperAdmin: false, email: 'br001@spogym.com' },
    { id: 1006, username: 'br011',       password: 'br1234',      name: '판교 지점장',    role: 'OWNER',        branchId: 11,   isSuperAdmin: false, email: 'br011@spogym.com' },
    { id: 1007, username: 'br016',       password: 'br1234',      name: '목동 지점장',    role: 'OWNER',        branchId: 16,   isSuperAdmin: false, email: 'br016@spogym.com' },

    // 직원 (광화문)
    { id: 1008, username: 'pt-br001',    password: 'pt1234',      name: '광화문 트레이너', role: 'TRAINER',     branchId: 1,    isSuperAdmin: false, email: 'pt001@spogym.com' },
    { id: 1009, username: 'front-br001', password: 'fr1234',      name: '광화문 프론트',  role: 'RECEPTIONIST', branchId: 1,    isSuperAdmin: false, email: 'fr001@spogym.com' },

    // 매니저 (신당)
    { id: 1010, username: 'mgr-br006',   password: 'mgr1234',     name: '신당 매니저',    role: 'MANAGER',      branchId: 6,    isSuperAdmin: false, email: 'mgr006@spogym.com' },
  ];

  let userOk = 0;
  let userFail = 0;
  for (const u of userSeed) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "users" (id, username, password, name, email, role, "branchId", "isActive", "tenantId", "isSuperAdmin", "currentBranchId", "forcePasswordChange", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6::"Role",$7,true,1,$8,$9,false,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET
           username=$2, password=$3, name=$4, email=$5, role=$6::"Role", "branchId"=$7,
           "isSuperAdmin"=$8, "currentBranchId"=$9, "updatedAt"=NOW()`,
        u.id, u.username, u.password, u.name, u.email ?? null, u.role,
        u.branchId, u.isSuperAdmin, u.branchId ?? null,
      );
      userOk += 1;
    } catch (err) {
      userFail += 1;
      console.error(`    ❌ ${u.username} (${u.name}) — ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ 사용자 계정 ${userOk}개 생성${userFail ? ` / ❌ ${userFail}개 실패` : ''}`);

  // users.id 시퀀스 보정 (수동 id 사용 후 다음 autoincrement 충돌 방지)
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"users"', 'id'), GREATEST((SELECT MAX(id) FROM "users"), 1))`,
  );

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

  // ============================================================
  // 확장 상담 데이터: 2025-01 ~ 2026-04, 16개 지점 × 월 8건
  // id 1001~ (기존 10건과 충돌 없음, ON CONFLICT DO NOTHING)
  // ============================================================
  {
    const consultationTypes = ['상담', 'OT', '체험', '재등록상담'];
    const inquiryTypes = ['WI', 'WI', 'WI', 'TI', 'TI']; // 60% WI, 40% TI
    const sources = ['온라인', '온라인', '소개', '소개', '현수막', '간판', '체험', '체험', '일일입장', '기타'];
    const results = ['등록', '등록', '등록', '미등록', '미등록', '보류'];
    const staffNames = ['김태희','이효리','정지훈','박재범','유재석','홍길동','이민정','박보검','전지현','공유','손예진','현빈'];

    let consultId = 1000;

    for (let year = 2025; year <= 2026; year++) {
      const maxMonth = year === 2025 ? 12 : 4;
      for (let month = 1; month <= maxMonth; month++) {
        for (let branchId = 1; branchId <= 16; branchId++) {
          for (let i = 0; i < 8; i++) {
            consultId++;
            const type = consultationTypes[i % consultationTypes.length];
            const inquiryType = type === '재등록상담' ? null : inquiryTypes[i % inquiryTypes.length];
            const source = sources[(branchId + i) % sources.length];
            const result = results[(i + branchId) % results.length];
            const status = i < 6 ? 'completed' : (i === 6 ? 'no_show' : 'cancelled');
            const day = Math.min(i * 3 + 1, 28);
            const consultedAt = new Date(year, month - 1, day, 10 + i, 0);
            const staffId = ((branchId - 1) % 12) + 1;
            const staffName = staffNames[staffId - 1];
            const memberId = ((branchId - 1) * 6 + i) % 100 + 1;

            await prisma.$executeRawUnsafe(`
              INSERT INTO "consultations" (id, "memberId", "staffId", "staffName", type, content, result, status, "inquiryType", source, "branchId", "scheduledAt", "createdAt", "updatedAt")
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$12)
              ON CONFLICT (id) DO NOTHING
            `, consultId, memberId, staffId, staffName, type,
              `${type} 상담 내용 - ${source} 경로 유입`,
              result, status, inquiryType, source, branchId, consultedAt);
          }
        }
      }
    }
    console.log(`  ✅ 상담 ${consultId - 1000}건 추가 (id 1001~${consultId})`);
  }

  // ============================================================
  // 확장 매출 데이터: 2025-01 ~ 2026-04, 3개 지점
  // id 102~1301 (기존 1~101과 충돌 없음)
  // ============================================================
  {
    // 헬퍼: 지점별 멤버 풀
    const branch1Members = [
      { id: 1, name: '홍길동' }, { id: 2, name: '김영희' }, { id: 3, name: '이철수' },
      { id: 4, name: '박지민' }, { id: 6, name: '정민호' }, { id: 7, name: '강서연' },
      { id: 9, name: '한소희' }, { id: 11, name: '서지원' }, { id: 12, name: '임재현' },
      { id: 13, name: '김민준' }, { id: 14, name: '이수빈' }, { id: 15, name: '박성훈' },
      { id: 17, name: '최준혁' }, { id: 19, name: '강태양' }, { id: 21, name: '조성민' },
      { id: 22, name: '임소영' }, { id: 23, name: '김도윤' }, { id: 24, name: '이지은' },
      { id: 28, name: '한지혜' }, { id: 29, name: '송재훈' }, { id: 33, name: '황준서' },
      { id: 38, name: '노유나' }, { id: 39, name: '문성준' }, { id: 40, name: '배소희' },
      { id: 41, name: '서동현' }, { id: 44, name: '조예린' }, { id: 45, name: '차승호' },
      { id: 49, name: '홍서준' }, { id: 50, name: '강민서' },
    ];
    const branch2Members = [
      { id: 51, name: '구해라' }, { id: 53, name: '소이현' }, { id: 54, name: '이동욱' },
      { id: 56, name: '조인성' }, { id: 57, name: '한효주' }, { id: 58, name: '장동건' },
      { id: 59, name: '김태리' }, { id: 61, name: '공효진' }, { id: 63, name: '손예진' },
      { id: 66, name: '이제훈' }, { id: 68, name: '송중기' }, { id: 69, name: '전지현' },
      { id: 70, name: '공유' }, { id: 71, name: '김혜수' }, { id: 72, name: '이병헌' },
      { id: 73, name: '김민희' }, { id: 74, name: '유아인' }, { id: 75, name: '수지' },
      { id: 76, name: '이민호' }, { id: 77, name: '김지원' }, { id: 78, name: '박서준' },
      { id: 79, name: '김다미' }, { id: 80, name: '최우식' },
    ];
    const branch3Members = [
      { id: 81, name: '이나영' }, { id: 83, name: '차은우' }, { id: 84, name: '아이유' },
      { id: 85, name: '방탄진' }, { id: 88, name: '안소희' }, { id: 89, name: '이승기' },
      { id: 90, name: '강민경' }, { id: 91, name: '임영웅' }, { id: 92, name: '이찬원' },
      { id: 93, name: '장민호' }, { id: 94, name: '박은빈' }, { id: 95, name: '이도현' },
      { id: 96, name: '고윤정' }, { id: 97, name: '변우석' }, { id: 98, name: '김혜윤' },
      { id: 99, name: '손석구' }, { id: 100, name: '문가영' },
    ];

    // 상품 목록 (productId, productName, amount, type)
    type ProductDef = { productId: number; productName: string; amount: number; type: string };
    const ptProducts: ProductDef[] = [
      { productId: 1, productName: 'PT 10회', amount: 700000, type: 'PT' },
      { productId: 2, productName: 'PT 20회', amount: 1200000, type: 'PT' },
      { productId: 3, productName: 'PT 30회', amount: 1650000, type: 'PT' },
    ];
    const membershipProducts: ProductDef[] = [
      { productId: 4, productName: '1개월 이용권', amount: 100000, type: '이용권' },
      { productId: 5, productName: '3개월 이용권', amount: 270000, type: '이용권' },
      { productId: 6, productName: '6개월 이용권', amount: 480000, type: '이용권' },
      { productId: 7, productName: '12개월 이용권', amount: 840000, type: '이용권' },
    ];
    const gxProducts: ProductDef[] = [
      { productId: 8, productName: 'GX 그룹 필라테스 (월)', amount: 150000, type: 'GX' },
      { productId: 9, productName: 'GX 요가 (월)', amount: 130000, type: 'GX' },
    ];
    const serviceProducts: ProductDef[] = [
      { productId: 11, productName: '개인 락커 (월)', amount: 20000, type: '상품' },
      { productId: 12, productName: '타올 서비스 (월)', amount: 10000, type: '상품' },
      { productId: 10, productName: '운동복 세트', amount: 35000, type: '상품' },
    ];

    const payMethods: PaymentMethod[] = ['CARD', 'CASH', 'TRANSFER'];
    const rounds = ['신규', '재등록', '재등록', '재등록']; // 재등록 비중 높게

    // 지점별 담당 직원
    const b1Staffs = [
      { id: 1, name: '김태희' }, { id: 2, name: '이효리' },
      { id: 3, name: '정지훈' }, { id: 4, name: '박재범' }, { id: 5, name: '유재석' },
    ];
    const b2Staffs = [
      { id: 6, name: '송지효' }, { id: 7, name: '남주혁' },
      { id: 8, name: '신민아' }, { id: 9, name: '이준기' },
    ];
    const b3Staffs = [
      { id: 10, name: '한가인' }, { id: 11, name: '원빈' }, { id: 12, name: '고준희' },
    ];

    // 결정론적 pseudo-random (seed 기반)
    const pr = (seed: number): number => {
      const x = Math.sin(seed + 1) * 10000;
      return x - Math.floor(x);
    };

    interface BranchConfig {
      branchId: number;
      members: { id: number; name: string }[];
      staffs: { id: number; name: string }[];
      perMonth: number;
      // 계절 가중치 (월 1-12)
    }

    const branchConfigs: BranchConfig[] = [
      { branchId: 1, members: branch1Members, staffs: b1Staffs, perMonth: 35 },
      { branchId: 2, members: branch2Members, staffs: b2Staffs, perMonth: 25 },
      { branchId: 3, members: branch3Members, staffs: b3Staffs, perMonth: 15 },
    ];

    // 계절 배율 (1월/9월 신규급증, 7-8월 성수기, 12월 이벤트)
    const seasonMultiplier: Record<number, number> = {
      1: 1.3, 2: 1.0, 3: 1.1, 4: 1.0, 5: 1.0, 6: 1.1,
      7: 1.2, 8: 1.2, 9: 1.3, 10: 1.0, 11: 1.0, 12: 1.2,
    };

    // 월별 날짜 패턴: 초(1-10 이용권갱신), 중(11-20 PT신규), 말(21-28 GX/서비스)
    const pickProductForDay = (day: number, seed: number): ProductDef => {
      if (day <= 10) {
        // 이용권 갱신 집중
        const pool = [...membershipProducts, ...membershipProducts, ...ptProducts];
        return pool[Math.floor(pr(seed) * pool.length)];
      } else if (day <= 20) {
        // PT 신규 등록
        const pool = [...ptProducts, ...ptProducts, ...membershipProducts];
        return pool[Math.floor(pr(seed) * pool.length)];
      } else {
        // GX, 서비스, 이용권
        const pool = [...gxProducts, ...gxProducts, ...serviceProducts, ...membershipProducts];
        return pool[Math.floor(pr(seed) * pool.length)];
      }
    };

    let saleId = 102;
    let extSaleCount = 0;

    // 2025년 1월 ~ 2026년 4월 = 16개월
    const months: { year: number; month: number }[] = [];
    for (let y = 2025; y <= 2026; y++) {
      const mStart = y === 2025 ? 1 : 1;
      const mEnd = y === 2025 ? 12 : 4;
      for (let m = mStart; m <= mEnd; m++) {
        months.push({ year: y, month: m });
      }
    }

    for (const { year, month } of months) {
      const mult = seasonMultiplier[month] ?? 1.0;
      const daysInMonth = new Date(year, month, 0).getDate();

      for (const bc of branchConfigs) {
        const targetCount = Math.round(bc.perMonth * mult);

        for (let i = 0; i < targetCount; i++) {
          const seed = saleId * 31 + bc.branchId * 7 + month * 13 + year;
          const member = bc.members[Math.floor(pr(seed + 1) * bc.members.length)];
          const staff = bc.staffs[Math.floor(pr(seed + 2) * bc.staffs.length)];

          // 날짜: 균등 분포 (1~daysInMonth)
          const day = 1 + Math.floor(pr(seed + 3) * daysInMonth);
          const saleDate = new Date(year, month - 1, day);

          const prod = pickProductForDay(day, seed + 4);
          const payMethod = payMethods[Math.floor(pr(seed + 5) * 3)];
          const round = rounds[Math.floor(pr(seed + 6) * rounds.length)];

          // 미수금/환불 소량 (약 5%)
          let status: SaleStatus = 'COMPLETED';
          let card = 0, cash = 0, unpaid = 0;
          const r7 = pr(seed + 7);
          if (r7 < 0.03) {
            status = 'UNPAID';
            unpaid = prod.amount;
          } else if (r7 < 0.05) {
            status = 'REFUNDED';
          }

          if (status !== 'UNPAID') {
            if (payMethod === 'CARD') card = prod.amount;
            else if (payMethod === 'CASH') cash = prod.amount;
            else card = prod.amount; // TRANSFER → card로 기록
          }

          const amount = status === 'REFUNDED' ? -prod.amount : prod.amount;

          await prisma.$executeRawUnsafe(
            `INSERT INTO sales (id, "memberId", "memberName", "productId", "productName", "saleDate", type, round,
              "originalPrice", "salePrice", amount, "paymentMethod", cash, card, unpaid, status, "staffId", "staffName", "branchId")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
             ON CONFLICT (id) DO NOTHING`,
            saleId,
            member.id, member.name,
            prod.productId, prod.productName,
            saleDate,
            prod.type, round,
            prod.amount,
            amount,
            payMethod,
            cash, card, unpaid,
            status,
            staff.id, staff.name,
            bc.branchId
          );

          saleId++;
          extSaleCount++;
        }
      }
    }
    console.log(`  ✅ 확장 매출 ${extSaleCount}건 생성 (id 102~${saleId - 1}, 2025-01~2026-04, 3개 지점)`);
  }

  // ============================================================
  // 서초점/송파점 수업 (다음 14일)
  // ============================================================
  {
    const classDefs2 = [
      // 서초점
      { title: '필라테스', type: 'GX', staffId: 8, staffName: '신민아', room: '필라테스룸', capacity: 12, days: [1,2,3,4,5], hour: 10, branchId: 2 },
      { title: '요가',     type: 'GX', staffId: 8, staffName: '신민아', room: 'GX룸',      capacity: 16, days: [1,3,5],     hour: 18, branchId: 2 },
      // 송파점
      { title: '그룹PT',   type: 'GX', staffId: 11, staffName: '원빈',  room: 'PT존',      capacity: 8,  days: [2,4,6],     hour: 7,  branchId: 3 },
      { title: '스트레칭', type: 'GX', staffId: 11, staffName: '원빈',  room: 'GX룸',      capacity: 20, days: [1,3,5],     hour: 19, branchId: 3 },
    ];
    const todayRef = new Date('2026-04-26');
    let classCount2 = 0;
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(todayRef);
      date.setDate(todayRef.getDate() + dayOffset);
      const dow = date.getDay();
      for (const cls of classDefs2) {
        if (!cls.days.includes(dow)) continue;
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), cls.hour, 0);
        const end = new Date(start.getTime() + 60 * 60000);
        const booked = 2 + (dayOffset + dow) % (cls.capacity - 2);
        await prisma.$executeRawUnsafe(
          `INSERT INTO classes (title, type, "staffId", "staffName", room, "startTime", "endTime", capacity, booked, "isRecurring", "branchId")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)`,
          cls.title, cls.type, cls.staffId, cls.staffName, cls.room, start, end, cls.capacity, booked, cls.branchId
        );
        classCount2++;
      }
    }
    console.log(`  ✅ 서초/송파 수업 ${classCount2}개 생성 (다음 14일)`);
  }

  // ============================================================
  // sales 메타 컬럼 UPDATE (durationMonths, saleCategory, receiptIssued, penaltyAmount)
  // ============================================================
  await prisma.$executeRawUnsafe(`
    UPDATE "sales" SET "durationMonths" = CASE
      WHEN "productName" LIKE '%1개월%' THEN 1
      WHEN "productName" LIKE '%3개월%' THEN 3
      WHEN "productName" LIKE '%6개월%' THEN 6
      WHEN "productName" LIKE '%12개월%' OR "productName" LIKE '%연간%' THEN 12
      WHEN type = 'PT' THEN NULL
      ELSE 1
    END
    WHERE "durationMonths" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "sales" SET "saleCategory" = CASE
      WHEN type LIKE '%법인%' THEN '법인권'
      WHEN round = '재등록' THEN '재등록'
      ELSE '일반'
    END
    WHERE "saleCategory" IS NULL OR "saleCategory" = '일반'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "sales" SET "receiptIssued" = false
    WHERE "paymentMethod" IN ('CASH', 'TRANSFER') AND id % 5 = 0
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "sales" SET "penaltyAmount" = amount * -0.1
    WHERE status = 'REFUNDED' AND "penaltyAmount" = 0
  `);

  console.log('  ✅ sales 메타 컬럼(durationMonths/saleCategory/receiptIssued/penaltyAmount) 업데이트');

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
