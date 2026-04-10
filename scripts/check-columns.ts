/**
 * users 테이블 컬럼명 확인용 임시 스크립트
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxmtactiuyhloyhgzsew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bXRhY3RpdXlobG95aGd6c2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjUzODgsImV4cCI6MjA4ODgwMTM4OH0.yKzLf9vSzxCF5l6lb0LEktxiRloWzXyz2Mj27E68QtQ'
);

async function main() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('에러:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('컬럼 목록:', Object.keys(data[0]));
    console.log('샘플 데이터:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('데이터 없음');
  }
}

main().catch(console.error);
