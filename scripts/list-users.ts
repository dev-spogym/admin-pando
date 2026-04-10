/**
 * users 테이블 전체 목록 확인용 임시 스크립트
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxmtactiuyhloyhgzsew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bXRhY3RpdXlobG95aGd6c2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjUzODgsImV4cCI6MjA4ODgwMTM4OH0.yKzLf9vSzxCF5l6lb0LEktxiRloWzXyz2Mj27E68QtQ'
);

async function main() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, name, role, branchId, isActive')
    .order('id');

  if (error) { console.error('에러:', error); return; }
  console.log('users 테이블 전체 목록:');
  console.table(data);
}

main().catch(console.error);
