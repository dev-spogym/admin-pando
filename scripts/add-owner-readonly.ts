/**
 * OWNER, READONLY 역할 추가 스크립트
 * 실행: npx tsx scripts/add-owner-readonly.ts
 *
 * 1. DB enum "Role"에 OWNER, READONLY 추가
 * 2. owner1, readonly1 계정 insert
 */
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

// Supabase client (계정 insert용)
const supabase = createClient(
  'https://oxmtactiuyhloyhgzsew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bXRhY3RpdXlobG95aGd6c2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjUzODgsImV4cCI6MjA4ODgwMTM4OH0.yKzLf9vSzxCF5l6lb0LEktxiRloWzXyz2Mj27E68QtQ'
);

// Direct DB 연결 (DDL용 - pgbouncer 아닌 직접 연결)
const DIRECT_URL = process.env.DIRECT_URL ||
  'postgresql://postgres.oxmtactiuyhloyhgzsew:Vmffjr3648!!@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function addEnumValues() {
  console.log('1. DB enum "Role"에 OWNER, READONLY 추가...\n');

  const client = new Client({ connectionString: DIRECT_URL });
  await client.connect();

  try {
    // OWNER 추가
    try {
      await client.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER'`);
      console.log('   ✅ OWNER 추가 완료');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('   ⏭️  OWNER 이미 존재');
      } else {
        throw e;
      }
    }

    // READONLY 추가
    try {
      await client.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'READONLY'`);
      console.log('   ✅ READONLY 추가 완료');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('   ⏭️  READONLY 이미 존재');
      } else {
        throw e;
      }
    }

    // 확인
    const result = await client.query(`SELECT unnest(enum_range(NULL::"Role")) AS role`);
    console.log('\n   현재 Role enum 값:', result.rows.map(r => r.role).join(', '));
  } finally {
    await client.end();
  }
}

async function insertAccounts() {
  console.log('\n2. owner1, readonly1 계정 추가...\n');

  // 기존 컬럼 확인
  const { data: sample } = await supabase.from('users').select('*').limit(1);
  const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
  const hasTenantId = columns.includes('tenantId');
  const hasSuperAdmin = columns.includes('isSuperAdmin');

  const accounts = [
    {
      username: 'owner1',
      password: 'qwer1234!!',
      name: '박센터장',
      email: 'owner1@spogym.com',
      role: 'OWNER',
      branchId: 1,
      isActive: true,
    },
    {
      username: 'readonly1',
      password: 'qwer1234!!',
      name: '김조회',
      email: 'readonly1@spogym.com',
      role: 'READONLY',
      branchId: 1,
      isActive: true,
    },
  ];

  for (const account of accounts) {
    // 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('username', account.username)
      .single();

    if (existing) {
      console.log(`   ⏭️  ${account.username} 이미 존재 (id: ${existing.id}, role: ${existing.role})`);
      continue;
    }

    const insertData: Record<string, unknown> = { ...account };
    if (hasTenantId) insertData.tenantId = 1;
    if (hasSuperAdmin) insertData.isSuperAdmin = false;

    const { data: inserted, error } = await supabase
      .from('users')
      .insert(insertData)
      .select('id, username, name, role')
      .single();

    if (error) {
      console.error(`   ❌ ${account.username} insert 실패:`, error.message);
    } else {
      console.log(`   ✅ ${inserted.username} 추가 완료 (id: ${inserted.id}, role: ${inserted.role})`);
    }
  }
}

async function main() {
  console.log('=== OWNER/READONLY 역할 및 계정 추가 ===\n');

  await addEnumValues();
  await insertAccounts();

  console.log('\n=== 완료 ===');
  console.log('로그인 정보:');
  console.log('  owner1 / qwer1234!!   (센터장)');
  console.log('  readonly1 / qwer1234!! (조회전용)');
}

main().catch(console.error);
