/**
 * 기존 users 테이블 사용자들을 Supabase Auth에 등록하는 시드 스크립트
 *
 * 실행 방법:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJxx... \
 *   npx tsx scripts/seed-auth-users.ts
 *
 * 주의:
 *   - SUPABASE_SERVICE_ROLE_KEY는 admin API 사용을 위해 반드시 필요합니다.
 *   - 이미 등록된 이메일은 건너뜁니다.
 *   - 이 스크립트는 마이그레이션 기간 1회 실행용입니다.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수를 설정하세요:');
  console.error('   SUPABASE_URL=https://xxx.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJxx...');
  process.exit(1);
}

// Service Role 클라이언트 (admin API 사용)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface DbUser {
  id: number;
  username: string;
  password: string;
  name: string;
  role: string;
  branchId: number;
  isActive: boolean;
}

async function main() {
  console.log('users 테이블에서 사용자 목록 조회 중...');

  // 활성 사용자 전체 조회
  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, password, name, role, branchId, isActive')
    .eq('isActive', true);

  if (error || !users) {
    console.error('❌ users 테이블 조회 실패:', error?.message);
    process.exit(1);
  }

  console.log(`총 ${users.length}명 발견\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const user of users as DbUser[]) {
    const email = `${user.username}@spogym.local`;

    try {
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: user.password,
        email_confirm: true, // 이메일 인증 생략 (내부 계정)
        user_metadata: {
          username: user.username,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
        },
      });

      if (createError) {
        // 이미 등록된 이메일은 경고만 출력하고 건너뜀
        if (createError.message.includes('already been registered') ||
            createError.message.includes('already exists')) {
          console.log(`  ⚠️  건너뜀 (이미 등록됨): ${email}`);
          skipCount++;
        } else {
          console.error(`  ❌ 실패: ${email} — ${createError.message}`);
          failCount++;
        }
        continue;
      }

      console.log(`  ✅ 등록 완료: ${email} (auth uid: ${data.user?.id})`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ 예외 발생: ${email} —`, err);
      failCount++;
    }
  }

  console.log('\n--- 결과 ---');
  console.log(`  성공: ${successCount}명`);
  console.log(`  건너뜀: ${skipCount}명`);
  console.log(`  실패: ${failCount}명`);

  if (failCount > 0) {
    console.warn('\n일부 사용자 등록에 실패했습니다. 로그를 확인하세요.');
    process.exit(1);
  }

  console.log('\nSupabase Auth 등록 완료! 이제 실제 JWT 로그인을 사용할 수 있습니다.');
}

main();
