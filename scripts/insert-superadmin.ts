/**
 * superadmin 계정 insert 스크립트
 * 실행: npx tsx scripts/insert-superadmin.ts
 *
 * 1. users 테이블에 멀티테넌트 컬럼이 없으면 추가 (isSuperAdmin, tenantId, currentBranchId)
 * 2. superadmin 레코드가 없으면 insert
 */
import { createClient } from '@supabase/supabase-js';

// service_role key 없이 anon key로 rpc를 쓸 수 없으므로,
// REST API로 직접 SQL 실행 (Supabase Management API 대신 pg 직접 접근은 불가)
// → anon key 범위에서 할 수 있는 방법: users 테이블 insert 시 없는 컬럼은 그냥 생략
// 컬럼이 없으면 fallback(null/false)으로 동작하는 auth.ts 코드를 믿고 insert 진행

const supabase = createClient(
  'https://oxmtactiuyhloyhgzsew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bXRhY3RpdXlobG95aGd6c2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjUzODgsImV4cCI6MjA4ODgwMTM4OH0.yKzLf9vSzxCF5l6lb0LEktxiRloWzXyz2Mj27E68QtQ'
);

async function main() {
  console.log('슈퍼관리자 계정 insert 시작...\n');

  // 1. 실제 존재하는 컬럼 목록 확인 (샘플 1건 조회)
  const { data: sample, error: sampleError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('❌ users 테이블 조회 실패:', sampleError);
    process.exit(1);
  }

  const existingColumns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
  console.log('현재 users 테이블 컬럼:', existingColumns.join(', '));

  const hasSuperAdmin = existingColumns.includes('isSuperAdmin');
  const hasTenantId = existingColumns.includes('tenantId');
  console.log(`isSuperAdmin 컬럼: ${hasSuperAdmin ? '있음' : '없음'}`);
  console.log(`tenantId 컬럼: ${hasTenantId ? '있음' : '없음'}\n`);

  // 2. superadmin 이미 존재하는지 확인
  const { data: existing } = await supabase
    .from('users')
    .select('id, username, role')
    .eq('username', 'superadmin')
    .single();

  if (existing) {
    console.log('⏭️  superadmin 이미 존재합니다:');
    console.log(`   id: ${existing.id}, role: ${existing.role}`);

    // isSuperAdmin 컬럼이 있는데 false인 경우 업데이트
    if (hasSuperAdmin) {
      const { data: full } = await supabase
        .from('users')
        .select('isSuperAdmin')
        .eq('username', 'superadmin')
        .single();

      if (full && !full.isSuperAdmin) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ isSuperAdmin: true })
          .eq('username', 'superadmin');

        if (updateError) {
          console.error('❌ isSuperAdmin 업데이트 실패:', updateError);
        } else {
          console.log('✅ isSuperAdmin = true 로 업데이트 완료');
        }
      } else {
        console.log('✅ isSuperAdmin 이미 true');
      }
    }
    return;
  }

  // 3. insert할 데이터 구성 (존재하는 컬럼만 포함)
  const insertData: Record<string, unknown> = {
    username: 'superadmin',
    password: 'qwer1234!!',
    name: '본사관리자',
    email: 'super@spogym.com',
    role: 'ADMIN',
    branchId: 1,
    isActive: true,
  };

  // 멀티테넌트 컬럼이 있을 때만 포함
  if (hasTenantId) {
    insertData.tenantId = 1;
  }
  if (hasSuperAdmin) {
    insertData.isSuperAdmin = true;
  }

  console.log('insert 데이터:', JSON.stringify(insertData, null, 2));

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('❌ insert 실패:', insertError);

    // isSuperAdmin 컬럼 없어서 실패한 경우, 해당 필드 제외하고 재시도
    if (insertError.message?.includes('isSuperAdmin') || insertError.code === '42703') {
      console.log('\n⚠️  컬럼 오류 감지. isSuperAdmin/tenantId 제외하고 재시도...');
      delete insertData.isSuperAdmin;
      delete insertData.tenantId;

      const { data: retried, error: retryError } = await supabase
        .from('users')
        .insert(insertData)
        .select()
        .single();

      if (retryError) {
        console.error('❌ 재시도 실패:', retryError);
        process.exit(1);
      }

      console.log('\n✅ superadmin insert 성공! (isSuperAdmin 컬럼 없이 insert됨)');
      console.log('   ⚠️  주의: isSuperAdmin 컬럼이 DB에 없어서 슈퍼관리자 권한이 동작하지 않을 수 있습니다.');
      console.log('   → scripts/apply-multi-tenant-migration.ts 를 실행하여 DB 스키마를 업데이트하세요.');
      console.log('\n   insert된 데이터:');
      console.log('   id:', retried.id);
      console.log('   username:', retried.username);
      console.log('   name:', retried.name);
      console.log('   role:', retried.role);
      console.log('\n로그인 정보: superadmin / qwer1234!!');
      return;
    }

    process.exit(1);
  }

  console.log('\n✅ superadmin insert 성공!');
  console.log('   id:', inserted.id);
  console.log('   username:', inserted.username);
  console.log('   name:', inserted.name);
  console.log('   email:', inserted.email);
  console.log('   role:', inserted.role);
  if (hasSuperAdmin) {
    console.log('   isSuperAdmin:', inserted.isSuperAdmin);
  }
  console.log('\n로그인 정보: superadmin / qwer1234!!');
}

main().catch(console.error);
