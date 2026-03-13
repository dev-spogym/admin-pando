/**
 * 멀티테넌트 전체 시딩 스크립트
 * 실행: npx tsx scripts/seed-full.ts
 *
 * 지점 3개 × 각 지점별 회원/직원/상품/매출/출석/급여/메시지/쿠폰/계약 데이터 생성
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxmtactiuyhloyhgzsew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bXRhY3RpdXlobG95aGd6c2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjUzODgsImV4cCI6MjA4ODgwMTM4OH0.yKzLf9vSzxCF5l6lb0LEktxiRloWzXyz2Mj27E68QtQ'
);

// 헬퍼
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const dateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};
const dateOnly = (daysAgo: number) => dateStr(daysAgo).slice(0, 10);

const NAMES = ['김민준','이서연','박지호','최수아','정현우','강지민','조예준','윤하은','임도윤','한소율','송시우','오채원','배준서','황다은','신지안','류하린','전서준','문지우','양이준','권나윤','홍승현','고유나','서태현','남지연','장민서','곽서윤','유준혁','안하율','노시연','허태윤'];
const PHONES = NAMES.map((_, i) => `010-${String(1000 + i).padStart(4, '0')}-${String(rand(1000, 9999))}`);
const MEMBER_TYPES = ['MEMBERSHIP', 'PT', 'GX'];
const GENDERS = ['M', 'F'];
const CATEGORIES = ['PT', 'MEMBERSHIP', 'GX', 'PRODUCT'];
const PAYMENT_METHODS = ['CARD', 'CASH', 'TRANSFER'];
const CHECK_IN_METHODS = ['KIOSK', 'APP', 'MANUAL'];

async function main() {
  console.log('🌱 멀티테넌트 전체 시딩 시작...\n');

  // ============================================================
  // 1. 테넌트
  // ============================================================
  const { data: existingTenant } = await supabase.from('tenants').select('id').eq('id', 1).single();
  if (!existingTenant) {
    await supabase.from('tenants').insert({
      id: 1,
      name: '스포짐',
      plan: 'PREMIUM',
      maxBranches: 10,
      isActive: true,
    });
    console.log('✅ 테넌트 생성');
  } else {
    console.log('⏭️  테넌트 이미 존재');
  }

  // 지점에 tenantId 연결
  await supabase.from('branches').update({ tenantId: 1 }).in('id', [1, 2, 3]);

  // ============================================================
  // 2. 추가 사용자 (지점별 계정)
  // ============================================================
  const newUsers = [
    // 슈퍼관리자
    { username: 'superadmin', password: 'password123', name: '본사관리자', email: 'super@spogym.com', role: 'ADMIN', branchId: 1, tenantId: 1, isSuperAdmin: true },
    // 서초점 계정
    { username: 'manager2', password: 'password123', name: '이매니저', email: 'manager2@spogym.com', role: 'MANAGER', branchId: 2, tenantId: 1, isSuperAdmin: false },
    { username: 'trainer2', password: 'password123', name: '박트레이너', email: 'trainer2@spogym.com', role: 'TRAINER', branchId: 2, tenantId: 1, isSuperAdmin: false },
    { username: 'staff2', password: 'password123', name: '최프론트', email: 'staff2@spogym.com', role: 'STAFF', branchId: 2, tenantId: 1, isSuperAdmin: false },
    // 송파점 계정
    { username: 'manager3', password: 'password123', name: '박지점장', email: 'manager3@spogym.com', role: 'MANAGER', branchId: 3, tenantId: 1, isSuperAdmin: false },
    { username: 'trainer3', password: 'password123', name: '정트레이너', email: 'trainer3@spogym.com', role: 'TRAINER', branchId: 3, tenantId: 1, isSuperAdmin: false },
    // 강남점 추가
    { username: 'staff1', password: 'password123', name: '한프론트', email: 'staff1@spogym.com', role: 'STAFF', branchId: 1, tenantId: 1, isSuperAdmin: false },
  ];

  for (const u of newUsers) {
    const { data: exists } = await supabase.from('users').select('id').eq('username', u.username).single();
    if (!exists) {
      await supabase.from('users').insert(u);
      console.log(`  ✅ 사용자 추가: ${u.username} (${u.role}, 지점 ${u.branchId})`);
    }
  }
  console.log('✅ 사용자 시딩 완료\n');

  // ============================================================
  // 3. 직원 추가 (지점별)
  // ============================================================
  const staffData = [
    // 서초점
    { name: '이매니저', phone: '010-2001-1001', email: 'lee@spogym.com', role: '지점장', position: '서초점 지점장', salary: 4500000, color: '#3B82F6', branchId: 2 },
    { name: '박트레이너', phone: '010-2001-1002', role: '트레이너', position: 'PT 전담', salary: 3200000, color: '#10B981', branchId: 2 },
    { name: '최프론트', phone: '010-2001-1003', role: '프론트', position: '프론트 데스크', salary: 2800000, color: '#F59E0B', branchId: 2 },
    { name: '강필라테스', phone: '010-2001-1004', role: '트레이너', position: 'GX 필라테스', salary: 3000000, color: '#EC4899', branchId: 2 },
    // 송파점
    { name: '박지점장', phone: '010-3001-1001', email: 'park@spogym.com', role: '지점장', position: '송파점 지점장', salary: 4500000, color: '#6366F1', branchId: 3 },
    { name: '정트레이너', phone: '010-3001-1002', role: '트레이너', position: 'PT 전담', salary: 3200000, color: '#14B8A6', branchId: 3 },
    { name: '윤프론트', phone: '010-3001-1003', role: '프론트', position: '프론트 데스크', salary: 2800000, color: '#F97316', branchId: 3 },
  ];

  const { data: existingStaff } = await supabase.from('staff').select('name, branchId');
  const existingStaffKeys = new Set((existingStaff ?? []).map(s => `${s.name}_${s.branchId}`));

  const newStaff = staffData.filter(s => !existingStaffKeys.has(`${s.name}_${s.branchId}`));
  if (newStaff.length > 0) {
    const staffInsert = newStaff.map(s => ({
      ...s,
      hireDate: dateStr(rand(90, 730)),
      isActive: true,
    }));
    await supabase.from('staff').insert(staffInsert);
    console.log(`✅ 직원 ${newStaff.length}명 추가`);
  }

  // 전체 직원 ID 조회 (이후 매출/급여에서 사용)
  const { data: allStaff } = await supabase.from('staff').select('id, name, branchId');
  console.log(`  총 직원: ${allStaff?.length}명\n`);

  // ============================================================
  // 4. 회원 추가 (지점별 10명씩)
  // ============================================================
  const { count: memberCount } = await supabase.from('members').select('*', { count: 'exact', head: true });

  if ((memberCount ?? 0) < 30) {
    const membersToInsert = [];
    for (const branchId of [1, 2, 3]) {
      for (let i = 0; i < 10; i++) {
        const idx = (branchId - 1) * 10 + i;
        const name = NAMES[idx % NAMES.length];
        const daysAgo = rand(10, 365);
        membersToInsert.push({
          name,
          phone: PHONES[idx % PHONES.length],
          email: `${name.toLowerCase().replace(/[^a-z]/g, '')}${idx}@example.com`,
          gender: pick(GENDERS),
          birthDate: `${rand(1985, 2003)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
          membershipType: pick(MEMBER_TYPES),
          membershipStart: dateOnly(daysAgo),
          membershipExpiry: dateOnly(daysAgo - rand(30, 365)),
          status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRED', 'HOLDING']),
          mileage: rand(0, 50000),
          branchId,
          staffId: allStaff?.find(s => s.branchId === branchId)?.id ?? null,
        });
      }
    }

    // 기존 회원과 중복 안 되게 이름+지점 체크
    const { data: existMembers } = await supabase.from('members').select('name, branchId');
    const existKeys = new Set((existMembers ?? []).map(m => `${m.name}_${m.branchId}`));
    const filtered = membersToInsert.filter(m => !existKeys.has(`${m.name}_${m.branchId}`));

    if (filtered.length > 0) {
      await supabase.from('members').insert(filtered);
      console.log(`✅ 회원 ${filtered.length}명 추가`);
    }
  } else {
    console.log('⏭️  회원 30명+ 이미 존재');
  }

  // 전체 회원 조회
  const { data: allMembers } = await supabase.from('members').select('id, name, branchId');
  console.log(`  총 회원: ${allMembers?.length}명\n`);

  // ============================================================
  // 5. 상품 (지점별)
  // ============================================================
  const productTemplates = [
    { name: '1개월 이용권', category: 'MEMBERSHIP', price: 99000, duration: 30 },
    { name: '3개월 이용권', category: 'MEMBERSHIP', price: 249000, duration: 90 },
    { name: '6개월 이용권', category: 'MEMBERSHIP', price: 449000, duration: 180 },
    { name: '12개월 이용권', category: 'MEMBERSHIP', price: 790000, duration: 365 },
    { name: 'PT 10회', category: 'PT', price: 600000, duration: 60, sessions: 10 },
    { name: 'PT 20회', category: 'PT', price: 1100000, duration: 90, sessions: 20 },
    { name: 'PT 30회', category: 'PT', price: 1500000, duration: 120, sessions: 30 },
    { name: 'GX 요가', category: 'GX', price: 150000, duration: 30 },
    { name: 'GX 필라테스', category: 'GX', price: 180000, duration: 30 },
    { name: '운동복 세트', category: 'PRODUCT', price: 45000 },
    { name: '프로틴 쉐이크', category: 'PRODUCT', price: 5000 },
    { name: '개인 락커 (1개월)', category: 'SERVICE', price: 30000, duration: 30 },
  ];

  for (const branchId of [2, 3]) {
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('branchId', branchId);
    if ((count ?? 0) === 0) {
      const products = productTemplates.map(p => ({
        ...p,
        sessions: p.sessions ?? null,
        duration: p.duration ?? null,
        branchId,
        isActive: true,
      }));
      await supabase.from('products').insert(products);
      console.log(`✅ 상품 ${products.length}개 추가 (지점 ${branchId})`);
    }
  }

  const { data: allProducts } = await supabase.from('products').select('id, name, category, price, branchId');
  console.log(`  총 상품: ${allProducts?.length}개\n`);

  // ============================================================
  // 6. 매출 (지점별 최근 90일)
  // ============================================================
  const { count: saleCount } = await supabase.from('sales').select('*', { count: 'exact', head: true });

  if ((saleCount ?? 0) < 30) {
    const salesToInsert = [];
    for (const branchId of [1, 2, 3]) {
      const branchMembers = allMembers?.filter(m => m.branchId === branchId) ?? [];
      const branchProducts = allProducts?.filter(p => p.branchId === branchId) ?? [];
      const branchStaff = allStaff?.filter(s => s.branchId === branchId) ?? [];

      for (let i = 0; i < 15; i++) {
        const member = pick(branchMembers);
        const product = pick(branchProducts);
        const staff = branchStaff.length > 0 ? pick(branchStaff) : null;
        const price = Number(product?.price ?? 100000);
        const discount = rand(0, 1) ? rand(5000, 30000) : 0;
        const amount = price - discount;
        const pm = pick(PAYMENT_METHODS);

        salesToInsert.push({
          memberId: member?.id,
          memberName: member?.name ?? '미지정',
          productId: product?.id,
          productName: product?.name ?? '상품',
          saleDate: dateStr(rand(0, 90)),
          type: product?.category === 'PRODUCT' ? '상품' : product?.category === 'PT' ? 'PT' : '이용권',
          round: pick(['신규', '재등록', '신규', '신규']),
          quantity: 1,
          originalPrice: price,
          salePrice: price,
          discountPrice: discount,
          amount,
          paymentMethod: pm,
          cash: pm === 'CASH' ? amount : 0,
          card: pm === 'CARD' ? amount : 0,
          status: pick(['COMPLETED', 'COMPLETED', 'COMPLETED', 'UNPAID']),
          staffId: staff?.id ?? null,
          staffName: staff?.name ?? null,
          branchId,
        });
      }
    }
    await supabase.from('sales').insert(salesToInsert);
    console.log(`✅ 매출 ${salesToInsert.length}건 추가\n`);
  } else {
    console.log('⏭️  매출 30건+ 이미 존재\n');
  }

  // ============================================================
  // 7. 출석 (지점별 최근 30일)
  // ============================================================
  const { count: attCount } = await supabase.from('attendance').select('*', { count: 'exact', head: true });

  if ((attCount ?? 0) < 50) {
    const attToInsert = [];
    for (const branchId of [1, 2, 3]) {
      const branchMembers = allMembers?.filter(m => m.branchId === branchId) ?? [];
      for (let day = 0; day < 14; day++) {
        // 하루 3~7명 출석
        const count = rand(3, 7);
        for (let i = 0; i < count; i++) {
          const member = pick(branchMembers);
          const hour = rand(6, 21);
          const checkIn = new Date();
          checkIn.setDate(checkIn.getDate() - day);
          checkIn.setHours(hour, rand(0, 59), 0, 0);
          const checkOut = new Date(checkIn);
          checkOut.setMinutes(checkOut.getMinutes() + rand(30, 120));

          attToInsert.push({
            memberId: member?.id,
            memberName: member?.name ?? '',
            checkInAt: checkIn.toISOString(),
            checkOutAt: rand(0, 3) > 0 ? checkOut.toISOString() : null,
            type: pick(['REGULAR', 'REGULAR', 'PT', 'GX']),
            checkInMethod: pick(CHECK_IN_METHODS),
            branchId,
          });
        }
      }
    }
    await supabase.from('attendance').insert(attToInsert);
    console.log(`✅ 출석 ${attToInsert.length}건 추가`);
  }

  // ============================================================
  // 8. 급여 (최근 3개월)
  // ============================================================
  const { count: payrollCount } = await supabase.from('payroll').select('*', { count: 'exact', head: true });

  if ((payrollCount ?? 0) === 0) {
    const payrollToInsert = [];
    const now = new Date();
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const year = now.getMonth() - monthOffset < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = ((now.getMonth() - monthOffset + 12) % 12) + 1;

      for (const s of (allStaff ?? [])) {
        const baseSalary = rand(2500000, 4500000);
        const bonus = rand(0, 500000);
        const deduction = rand(100000, 400000);
        payrollToInsert.push({
          staffId: s.id,
          staffName: s.name,
          year,
          month,
          baseSalary,
          bonus,
          deduction,
          netSalary: baseSalary + bonus - deduction,
          status: monthOffset > 0 ? 'PAID' : 'PENDING',
          paidAt: monthOffset > 0 ? dateStr(monthOffset * 30 - 25) : null,
        });
      }
    }
    await supabase.from('payroll').insert(payrollToInsert);
    console.log(`✅ 급여 ${payrollToInsert.length}건 추가`);
  }

  // ============================================================
  // 9. 수업/스케줄 (지점별)
  // ============================================================
  const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });

  if ((classCount ?? 0) < 10) {
    const classTemplates = [
      { title: '모닝 요가', type: 'GX', room: '스튜디오 A', capacity: 20 },
      { title: '파워 필라테스', type: 'GX', room: '스튜디오 B', capacity: 15 },
      { title: '스피닝', type: 'GX', room: '사이클룸', capacity: 25 },
      { title: 'PT 그룹', type: 'PT', room: '메인 트레이닝존', capacity: 6 },
    ];

    const classToInsert = [];
    for (const branchId of [1, 2, 3]) {
      const branchStaff = allStaff?.filter(s => s.branchId === branchId) ?? [];
      if (branchStaff.length === 0) continue;

      for (let day = 0; day < 7; day++) {
        for (const tmpl of classTemplates) {
          const staff = pick(branchStaff);
          const start = new Date();
          start.setDate(start.getDate() + day);
          start.setHours(rand(7, 19), 0, 0, 0);
          const end = new Date(start);
          end.setHours(end.getHours() + 1);

          classToInsert.push({
            title: tmpl.title,
            type: tmpl.type,
            staffId: staff.id,
            staffName: staff.name,
            room: tmpl.room,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            capacity: tmpl.capacity,
            booked: rand(0, tmpl.capacity),
            branchId,
          });
        }
      }
    }
    // 기존 classes 삭제 후 재삽입 (중복 방지)
    await supabase.from('classes').delete().neq('id', 0);
    await supabase.from('classes').insert(classToInsert);
    console.log(`✅ 수업 ${classToInsert.length}건 추가`);
  }

  // ============================================================
  // 10. 메시지 (지점별)
  // ============================================================
  const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });

  if ((msgCount ?? 0) === 0) {
    const msgToInsert = [];
    const msgTemplates = [
      { type: 'SMS', title: '이용권 만료 알림', content: '고객님의 이용권이 7일 후 만료됩니다. 재등록 시 10% 할인!' },
      { type: 'KAKAO', title: '생일 축하 메시지', content: '생일을 축하합니다! 🎂 특별 쿠폰을 선물합니다.' },
      { type: 'PUSH', title: '오늘의 수업 안내', content: '오늘 18:00 모닝 요가 수업이 있습니다.' },
      { type: 'SMS', title: '미수금 알림', content: '미납 금액이 있습니다. 확인 부탁드립니다.' },
      { type: 'KAKAO', title: '신규 프로모션', content: '3월 봄맞이 특가! PT 20회 등록 시 5회 무료 추가' },
    ];

    for (const branchId of [1, 2, 3]) {
      const branchMembers = allMembers?.filter(m => m.branchId === branchId) ?? [];
      for (const tmpl of msgTemplates) {
        const recipients = branchMembers.slice(0, rand(3, branchMembers.length)).map(m => ({ id: m.id, name: m.name }));
        msgToInsert.push({
          type: tmpl.type,
          title: tmpl.title,
          content: tmpl.content,
          recipients: JSON.stringify(recipients),
          sentAt: dateStr(rand(0, 30)),
          status: pick(['SENT', 'SENT', 'SENT', 'FAILED']),
          branchId,
        });
      }
    }
    await supabase.from('messages').insert(msgToInsert);
    console.log(`✅ 메시지 ${msgToInsert.length}건 추가`);
  }

  // ============================================================
  // 11. 쿠폰 (지점별)
  // ============================================================
  const { count: couponCount } = await supabase.from('coupons').select('*', { count: 'exact', head: true });

  if ((couponCount ?? 0) === 0) {
    const couponToInsert = [];
    const couponTemplates = [
      { name: '봄맞이 10% 할인', type: '할인율', value: 10, totalIssued: 100, totalUsed: 34 },
      { name: '신규 회원 5만원 할인', type: '정액할인', value: 50000, totalIssued: 50, totalUsed: 12 },
      { name: '친구 추천 무료 1일', type: '무료이용', value: 0, totalIssued: 30, totalUsed: 8 },
      { name: 'PT 체험 쿠폰', type: '무료이용', value: 0, totalIssued: 20, totalUsed: 5 },
    ];

    for (const branchId of [1, 2, 3]) {
      for (const tmpl of couponTemplates) {
        couponToInsert.push({
          name: tmpl.name,
          type: tmpl.type,
          value: tmpl.value,
          validFrom: dateOnly(60),
          validUntil: dateOnly(-90),
          totalIssued: tmpl.totalIssued,
          totalUsed: tmpl.totalUsed,
          isActive: true,
          branchId,
        });
      }
    }
    await supabase.from('coupons').insert(couponToInsert);
    console.log(`✅ 쿠폰 ${couponToInsert.length}건 추가`);
  }

  // ============================================================
  // 12. 전자계약 (지점별)
  // ============================================================
  const { count: contractCount } = await supabase.from('contracts').select('*', { count: 'exact', head: true });

  if ((contractCount ?? 0) === 0) {
    const contractToInsert = [];
    for (const branchId of [1, 2, 3]) {
      const branchMembers = allMembers?.filter(m => m.branchId === branchId) ?? [];
      const branchProducts = allProducts?.filter(p => p.branchId === branchId) ?? [];

      for (let i = 0; i < 5; i++) {
        const member = branchMembers[i % branchMembers.length];
        const product = branchProducts[i % branchProducts.length];
        const daysAgo = rand(5, 60);
        const status = pick(['서명완료', '서명완료', '대기', '만료']);

        contractToInsert.push({
          memberId: member?.id,
          memberName: member?.name ?? '',
          productName: product?.name ?? '',
          amount: product ? Number(product.price) : 100000,
          startDate: dateOnly(daysAgo),
          endDate: dateOnly(daysAgo - (product?.duration ?? 30)),
          status,
          signedAt: status === '서명완료' ? dateStr(daysAgo - 1) : null,
          branchId,
        });
      }
    }
    await supabase.from('contracts').insert(contractToInsert);
    console.log(`✅ 전자계약 ${contractToInsert.length}건 추가`);
  }

  // ============================================================
  // 13. 설정 (지점별)
  // ============================================================
  for (const branchId of [2, 3]) {
    const { data: existing } = await supabase.from('settings').select('id').eq('branchId', branchId).single();
    if (!existing) {
      await supabase.from('settings').insert({
        branchId,
        centerName: branchId === 2 ? '스포짐 서초점' : '스포짐 송파점',
        businessHoursOpen: '06:00',
        businessHoursClose: branchId === 2 ? '23:00' : '22:00',
        smsEnabled: true,
        kakaoEnabled: true,
        pushEnabled: true,
        autoExpireNotify: true,
        expireNoticeDays: 7,
      });
      console.log(`✅ 설정 추가 (지점 ${branchId})`);
    }
  }

  // ============================================================
  // 14. 체성분 기록 (회원별 1~3건)
  // ============================================================
  const { count: bodyCount } = await supabase.from('body_compositions').select('*', { count: 'exact', head: true });

  if ((bodyCount ?? 0) < 20) {
    const bodyToInsert = [];
    for (const member of (allMembers ?? []).slice(0, 20)) {
      const records = rand(1, 3);
      for (let r = 0; r < records; r++) {
        bodyToInsert.push({
          memberId: member.id,
          date: dateStr(r * 30 + rand(0, 10)),
          weight: +(rand(50, 95) + Math.random()).toFixed(1),
          muscle: +(rand(20, 40) + Math.random()).toFixed(1),
          fat: +(rand(8, 30) + Math.random()).toFixed(1),
          fatRate: +(rand(10, 35) + Math.random()).toFixed(1),
          bmi: +(rand(18, 32) + Math.random()).toFixed(1),
        });
      }
    }
    await supabase.from('body_compositions').insert(bodyToInsert);
    console.log(`✅ 체성분 ${bodyToInsert.length}건 추가`);
  }

  // ============================================================
  // 최종 현황
  // ============================================================
  console.log('\n📊 최종 데이터 현황:');
  const tables = ['tenants','branches','users','members','staff','products','sales','attendance','payroll','lockers','classes','messages','coupons','contracts','settings','body_compositions'];
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}건`);
  }

  console.log('\n🎉 시딩 완료!');
}

main().catch(console.error);
