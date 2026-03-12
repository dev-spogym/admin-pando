/**
 * Supabase Auth 사용자 마이그레이션 스크립트
 *
 * 기존 users 테이블의 평문 비밀번호 계정을 Supabase Auth로 마이그레이션합니다.
 * 실행: npx tsx prisma/seed-auth-users.ts
 *
 * 사전 요구사항:
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경 변수 설정
 *   - Supabase 프로젝트의 service_role 키 필요 (anon 키로는 createUser 불가)
 */
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정하세요.');
  console.error('   SUPABASE_SERVICE_ROLE_KEY는 Supabase 대시보드 > Settings > API에서 확인할 수 있습니다.');
  process.exit(1);
}

// service_role 키로 Admin API 접근
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔐 Supabase Auth 사용자 마이그레이션 시작...\n');

  // 1. users 테이블에서 모든 활성 사용자 조회
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, username: true, password: true, name: true, email: true },
  });

  console.log(`📋 마이그레이션 대상: ${users.length}명\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const user of users) {
    const email = `${user.username}@spogym.local`;

    try {
      // 이미 Supabase Auth에 등록된 사용자인지 확인
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const exists = existingUsers?.users?.find((u) => u.email === email);

      if (exists) {
        console.log(`  ⏭️  ${user.username} (${user.name}) — 이미 등록됨, 건너뜀`);
        skipCount++;
        continue;
      }

      // Supabase Auth 사용자 생성
      const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: user.password, // 기존 평문 비밀번호 그대로 사용
        email_confirm: true, // 이메일 확인 건너뜀
        user_metadata: {
          username: user.username,
          name: user.name,
          original_user_id: user.id,
        },
      });

      if (error) {
        console.error(`  ❌ ${user.username} (${user.name}) — 실패: ${error.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ ${user.username} (${user.name}) — Auth UID: ${authUser.user.id}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ ${user.username} (${user.name}) — 예외:`, err);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 마이그레이션 완료!`);
  console.log(`   ✅ 성공: ${successCount}명`);
  console.log(`   ⏭️  건너뜀: ${skipCount}명`);
  console.log(`   ❌ 실패: ${errorCount}명`);
  console.log('='.repeat(50));

  if (successCount > 0) {
    console.log('\n📌 다음 단계:');
    console.log('   1. 로그인 테스트: 기존 아이디/비밀번호로 로그인 확인');
    console.log('   2. 정상 작동 확인 후 평문 비밀번호 fallback 코드 제거 (auth.ts)');
    console.log('   3. users 테이블의 password 컬럼 삭제 (선택)');
  }
}

main()
  .catch((e) => {
    console.error('❌ 마이그레이션 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
