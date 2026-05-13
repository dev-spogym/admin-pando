import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'docs/admin/testcases/admin-docs-tc');
const OUTPUT_DIR = path.join(SOURCE_DIR, '_generated');
const PROFILE = process.argv.find((arg) => arg.startsWith('--profile='))?.split('=')[1] || 'standard';
const IS_MASSIVE = PROFILE === 'massive';
const BASE_NAME = IS_MASSIVE ? 'full_massive_tc' : 'full_expanded_tc';
const SUMMARY_PATH = path.join(SOURCE_DIR, IS_MASSIVE ? '25_full_massive_tc.md' : '24_full_expanded_tc.md');
const CSV_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.csv`);
const JSON_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.json`);
const CHUNK_DIR = path.join(OUTPUT_DIR, `${BASE_NAME}_chunks`);
const CHUNK_MANIFEST_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}_chunks.json`);
const CHUNK_SIZE =
  Number(process.argv.find((arg) => arg.startsWith('--chunk-size='))?.split('=')[1]) ||
  (IS_MASSIVE ? 4000 : 1000);

const SKIP_FILES = new Set(['README.md', '99_gap_notes.md']);
const STANDARD_TYPES = new Set(['FLW', 'UI', 'LINK', 'DATA', 'STA', 'RBAC', 'ERR']);

const DETAIL_TEMPLATES = {
  FLW: [
    ['HAPPY', '최소 필수 입력과 기본 진입 동선으로 대표 happy path를 완료한다.', '대표 동선이 중단 없이 완료되고 후속 화면 또는 상태까지 정상 반영된다.'],
    ['CHAIN', '이전 화면에서 진입한 컨텍스트를 유지한 상태로 다음 액션까지 연속 수행한다.', '이전 컨텍스트, 선택값, 후속 이동 결과가 끊기지 않고 유지된다.'],
    ['REENTRY', '완료 후 동일 화면으로 재진입하거나 새로고침한 뒤 상태를 다시 확인한다.', '완료 결과가 재진입 후에도 일관되게 유지된다.'],
    ['STALE', '처리 도중 대상 데이터가 선행 변경된 상황을 가정하고 동일 흐름을 다시 실행한다.', 'stale context 또는 선행 변경을 감지하고 안전한 분기 또는 재조회로 복구된다.'],
    ['AUDIT', '완료 직후 관련 목록, 상세, 로그, 알림 등 후속 반영 경로를 순차 확인한다.', '주요 후속 반영 경로에 처리 결과가 누락 없이 남는다.'],
  ],
  UI: [
    ['DEFAULT', '기본 데이터 길이와 기본 해상도에서 레이아웃, 문구, 버튼, 배지가 설계와 일치하는지 확인한다.', '기본 레이아웃과 시각 요소가 설계와 동일하게 렌더링된다.'],
    ['LONGTEXT', '긴 이름, 긴 메모, 긴 라벨, 큰 숫자 등 긴 데이터로 화면을 다시 확인한다.', '줄바꿈, 말줄임, 정렬, 오버플로 처리 방식이 깨지지 않는다.'],
    ['RESPONSIVE', '좁은 폭 또는 분할 화면 환경에서 동일 화면을 확인한다.', '주요 컨트롤과 정보 블록이 겹치지 않고 반응형으로 재배치된다.'],
    ['DISABLED', '비활성, 읽기전용, 잠금 상태에서 버튼과 입력 요소 노출 상태를 확인한다.', '허용되지 않은 컨트롤은 비활성 또는 숨김 처리된다.'],
    ['FEEDBACK', '저장, 삭제, 발송, 확정 등 주요 액션 직후 토스트와 인라인 피드백 문구를 확인한다.', '사용자 피드백 문구와 표시 위치가 일관되게 노출된다.'],
  ],
  LINK: [
    ['PRIMARY', '대표 CTA를 눌러 연결 대상 화면 또는 다이얼로그로 이동한다.', '연결 대상이 정확히 열리고 대상 컨텍스트가 맞는다.'],
    ['SECONDARY', '보조 CTA, 더보기, 우측 액션, 행 액션으로 보조 동선을 실행한다.', '보조 동선이 대표 동선과 충돌 없이 정상 동작한다.'],
    ['BACK', '연결 대상 진입 후 닫기, 뒤로가기, 취소로 원 화면으로 돌아온다.', '이전 필터, 스크롤, 선택 컨텍스트가 안정적으로 복원된다.'],
    ['EXPIRED', '연결 대상이 삭제되었거나 만료된 상황을 가정하고 동일 링크를 다시 연다.', '만료 컨텍스트를 감지하고 오류 또는 대체 안내를 제공한다.'],
    ['MULTI', '동일 링크를 연속 클릭하거나 다중 탭/다중 모달 상황에서 다시 실행한다.', '중복 오픈, 이중 실행, 포커스 충돌 없이 제어된다.'],
  ],
  DATA: [
    ['VALID', '대표 정상값으로 입력, 저장, 조회를 한 사이클 실행한다.', '정상값이 저장되고 재조회 결과가 일치한다.'],
    ['BOUNDARY', '최소값, 최대값, 경계 날짜, 허용 길이 끝값 등 경계값으로 저장을 시도한다.', '경계값 허용 또는 차단 정책이 명세와 동일하게 적용된다.'],
    ['DUPLICATE', '중복 값, 충돌 값, 선점된 값으로 저장 또는 확정을 시도한다.', '중복/충돌을 감지하고 사용자에게 원인을 명확히 알려준다.'],
    ['PERSIST', '저장 후 새로고침, 재로그인, 목록 복귀 후 동일 데이터를 다시 조회한다.', '저장값이 영속 저장되어 다른 조회 경로에서도 동일하다.'],
    ['DOWNSTREAM', '저장 완료 후 관련 목록, 상세, 집계, 로그, 후속 화면에 데이터가 전파되는지 확인한다.', '후속 반영 대상에 동일 데이터가 누락 없이 전파된다.'],
  ],
  STA: [
    ['LOADING', '조회 시작 직후 로딩 상태 UI와 조작 가능 범위를 확인한다.', '로딩 상태의 skeleton/spinner/버튼 제어가 일관된다.'],
    ['EMPTY', '조회 결과가 없는 상태 또는 초기 데이터가 없는 상태를 확인한다.', '빈 상태 문구와 대체 액션이 명확히 노출된다.'],
    ['ACTIVE', '정상 활성 상태 또는 완료 상태에서 핵심 액션 가능 여부를 확인한다.', '활성 상태에서 필요한 액션만 허용된다.'],
    ['INACTIVE', '비활성, 만료, 잠금, 취소, 삭제 이후 상태를 확인한다.', '상태 배지, 액션 제한, 안내 문구가 상태값과 일치한다.'],
    ['TRANSITION', '한 상태에서 다른 상태로 전이시키는 액션을 실행한 뒤 상태 변화를 확인한다.', '전이 후 화면, 배지, 버튼, 데이터 반영이 즉시 일치한다.'],
  ],
  RBAC: [
    ['ALLOW', '허용 역할 계정으로 동일 기능을 실행한다.', '허용 역할은 필요한 조회/수정/확정 액션을 수행할 수 있다.'],
    ['READONLY', '하위 권한 또는 제한 권한 계정으로 같은 화면을 확인한다.', '읽기전용 또는 제한된 액션만 노출된다.'],
    ['DENY', '비허용 역할 계정으로 진입 또는 실행을 시도한다.', '접근 차단, 권한 없음, 숨김 처리 중 정책에 맞는 분기가 동작한다.'],
    ['SCOPE', '본사/지점/담당자 범위가 다른 역할로 같은 데이터를 조회한다.', '역할 범위에 맞는 데이터만 조회/수정 가능하다.'],
    ['TRACE', '권한 거절 또는 권한 기반 확정 후 로그와 이력에 주체 정보가 남는지 확인한다.', '권한 관련 실행 주체와 결과가 추적 가능하게 남는다.'],
  ],
  ERR: [
    ['VALIDATION', '필수값 누락, 형식 오류, 허용 범위 위반 상태로 저장 또는 확정을 시도한다.', '인라인 에러 또는 차단 메시지가 즉시 표시된다.'],
    ['API', '조회 실패 또는 저장 실패 응답을 가정하고 재시도 동선을 확인한다.', '실패 사유와 재시도 또는 복귀 경로가 제공된다.'],
    ['TIMEOUT', '지연, timeout, 중간 끊김 상황을 가정하고 동일 요청을 다시 수행한다.', '중복 처리 없이 재시도 또는 안전한 실패 상태로 복구된다.'],
    ['CONFLICT', '동시 수정 또는 선행 상태 변경과 충돌하는 상황을 가정한다.', '충돌을 감지하고 재조회 또는 수동 정정 분기를 제공한다.'],
    ['RECOVERY', '오류 이후 다시 정상값으로 복구 입력하거나 재실행한다.', '오류 상태에서 정상 흐름으로 무리 없이 복구된다.'],
  ],
  CUST: [
    ['BASE', '대표 정상 조건으로 해당 검증 항목을 실행한다.', '핵심 요구사항이 운영 기준대로 충족된다.'],
    ['REQUIRED', '필수 입력값 또는 필수 전제 조건 일부를 제거한 상태로 다시 실행한다.', '필수 조건 누락 시 차단 또는 안내 정책이 명확히 동작한다.'],
    ['BRANCH', '권한, 지점, 상품 정책, 결제 수단 등 대표 분기 조건을 바꿔 동일 검증을 다시 실행한다.', '분기 조건별 결과 차이가 정책대로 반영된다.'],
    ['PROPAGATION', '완료 후 관련 상세, 목록, 통계, 정산, 급여, 로그까지 후속 반영을 확인한다.', '후속 반영 경로에 동일 결과가 누락 없이 전파된다.'],
    ['AUDIT', '처리자, 일시, 사유, 변경 전후 값 등 추적 정보가 남는지 확인한다.', '감사 로그와 이력 추적 정보가 확인 가능하다.'],
  ],
};

const MASSIVE_CONTEXTS = [
  ['DESK_STD', '데스크톱 브라우저, 표준 운영시간, 단일 지점 기준 데이터가 준비된 상태', '데스크톱 표준 운영시간 기준으로 실행한다.', '데스크톱 표준 운영환경에서도 동일 결과가 유지된다.'],
  ['DESK_PEAK', '데스크톱 브라우저, 피크타임, 대량 목록과 동시 처리 데이터가 준비된 상태', '피크타임 동시 처리와 많은 데이터가 존재하는 상황에서 실행한다.', '피크타임 부하와 대량 데이터에서도 지연이나 누락 없이 처리된다.'],
  ['DESK_RETRY', '데스크톱 브라우저, 직전 실패 이력 또는 재시도 대상 데이터가 준비된 상태', '같은 대상을 재시도하거나 반복 실행하는 상황에서 수행한다.', '반복 실행에도 중복 처리 없이 멱등하게 동작한다.'],
  ['DESK_MONTHEND', '데스크톱 브라우저, 월말 정산 또는 마감 직전 데이터가 준비된 상태', '마감 직전 집계/정산 영향 데이터와 함께 실행한다.', '월말 집계와 정산 영향값이 깨지지 않고 동일 기준으로 유지된다.'],
  ['DESK_CROSS', '데스크톱 브라우저, 타지점 또는 다지점 혼합 데이터가 준비된 상태', '다지점/교차 귀속 데이터가 섞인 상태에서 수행한다.', '지점/귀속 분리 정책이 교차 데이터에서도 일관되게 유지된다.'],
  ['TABLET_STD', '태블릿 브라우저, 프런트 데스크 운영자가 사용하는 기본 환경이 준비된 상태', '태블릿 또는 좁은 작업영역에서 동일 시나리오를 수행한다.', '좁은 작업영역에서도 핵심 흐름과 결과가 동일하게 유지된다.'],
  ['TABLET_PEAK', '태블릿 브라우저, 피크타임, 접수/출석/결제 집중 상황 데이터가 준비된 상태', '태블릿 환경에서 피크타임 동시 작업을 가정하고 수행한다.', '태블릿 피크타임 환경에서도 실무 동선이 끊기지 않는다.'],
  ['TABLET_RETRY', '태블릿 브라우저, 반복 저장 또는 취소/재입력 이력이 있는 데이터가 준비된 상태', '같은 항목을 재열람, 재입력, 재확정하는 상황에서 수행한다.', '반복 조작 후에도 상태와 결과가 안정적으로 유지된다.'],
  ['TABLET_MONTHEND', '태블릿 브라우저, 월말 마감 데이터와 집계 영향 대상이 준비된 상태', '태블릿 환경에서 마감 직전 데이터와 함께 실행한다.', '태블릿 환경에서도 마감 영향 수치와 로그가 동일하게 남는다.'],
  ['TABLET_CROSS', '태블릿 브라우저, 다지점/다부서 혼합 데이터가 준비된 상태', '다지점 또는 교차 부서 데이터를 태블릿에서 처리한다.', '교차 데이터 처리 결과가 화면과 후속 반영에 모두 일치한다.'],
  ['MOBILE_STD', '모바일 웹 또는 아주 좁은 폭, 표준 데이터셋이 준비된 상태', '모바일 폭 또는 최소 해상도에 가까운 환경에서 수행한다.', '좁은 폭 환경에서도 입력/조회/확정 결과가 왜곡되지 않는다.'],
  ['MOBILE_PEAK', '모바일 웹, 피크타임, 리스트 길이와 알림 수가 많은 상태', '모바일 환경에서 피크타임 조작을 가정하고 수행한다.', '모바일 피크타임에서도 핵심 흐름과 상태 반영이 유지된다.'],
  ['MOBILE_RETRY', '모바일 웹, 새로고침/뒤로가기/재진입이 잦은 상태', '모바일에서 재진입, 새로고침, 브라우저 복귀를 반복하며 수행한다.', '모바일 재진입 이후에도 동일 결과와 컨텍스트가 유지된다.'],
  ['MOBILE_MONTHEND', '모바일 웹, 월말 집계/마감 영향 데이터가 존재하는 상태', '모바일 환경에서 마감 영향 작업을 함께 수행한다.', '마감 영향 데이터가 모바일 환경에서도 동일 기준으로 반영된다.'],
  ['HQ_SCOPE', '본사 계정, 다지점 통합 조회 권한, 전 지점 데이터가 준비된 상태', '본사 사용자가 여러 지점을 넘나드는 범위로 동일 검증을 수행한다.', '본사 권한 범위와 지점 통합 결과가 일관되게 유지된다.'],
  ['BRANCH_SCOPE', '지점장 계정, 단일 지점 또는 소속 지점 범위 데이터가 준비된 상태', '지점 권한 범위에서 동일 검증을 수행한다.', '지점 범위를 넘는 데이터 노출 없이 결과가 정확히 제한된다.'],
  ['LIMITED_ROLE', '제한 권한 또는 읽기전용에 가까운 계정이 준비된 상태', '권한이 제한된 사용자가 같은 기능을 시도하는 상황을 포함해 수행한다.', '권한 제한, 읽기전용, 차단, 로그 기록이 정책대로 유지된다.'],
  ['INTEGRATION_DELAY', '외부 연동 응답 지연, 후행 동기화, 재시도 가능 상태가 준비된 상태', '외부 연동 또는 비동기 후속처리가 늦게 들어오는 상황을 가정하고 수행한다.', '후행 동기화, 재시도, 로그 반영까지 최종 결과가 안정적으로 수렴한다.'],
];

function clean(value = '') {
  return String(value).replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function parseMarkdownTable(text, file) {
  const lines = text.split(/\r?\n/);
  let h2 = '';
  let h3 = '';
  let headers = null;
  const rows = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      h2 = clean(line.slice(3));
      headers = null;
      continue;
    }
    if (line.startsWith('### ')) {
      h3 = clean(line.slice(4));
      headers = null;
      continue;
    }
    if (!line.startsWith('|')) continue;

    const cols = line.split('|').slice(1, -1).map(clean);
    if (cols.every((col) => /^-+$/.test(col.replace(/ /g, '')))) continue;

    if (cols.includes('TC ID')) {
      headers = cols;
      continue;
    }

    if (!headers) continue;

    const tcIdx = headers.indexOf('TC ID');
    if (tcIdx < 0) continue;
    const tcId = cols[tcIdx];
    if (!tcId.startsWith('ADM-')) continue;

    const base = {
      file,
      h2,
      h3,
      tcId,
      title: h3,
      category: '',
      precondition: '',
      action: '',
      expected: '',
      status: '',
      evidence: '',
    };

    if (headers.includes('분류') && headers.includes('조건 / 행동') && headers.includes('기대 결과')) {
      base.category = cols[headers.indexOf('분류')];
      base.action = cols[headers.indexOf('조건 / 행동')];
      base.expected = cols[headers.indexOf('기대 결과')];
      base.status = cols[headers.indexOf('상태')] || '';
      base.evidence = cols[headers.indexOf('근거')] || '';
    } else if (
      headers.includes('체크 항목') &&
      headers.includes('분류') &&
      headers.includes('사전 조건') &&
      headers.includes('검증 절차')
    ) {
      base.title = cols[headers.indexOf('체크 항목')] || h3;
      base.category = cols[headers.indexOf('분류')] || 'CUST';
      base.precondition = cols[headers.indexOf('사전 조건')] || '';
      base.action = cols[headers.indexOf('검증 절차')] || '';
      base.expected = cols[headers.indexOf('기대 결과')] || '';
      base.status = cols[headers.indexOf('상태')] || '';
      base.evidence = cols[headers.indexOf('근거 문서')] || '';
    } else {
      continue;
    }

    rows.push(base);
  }

  return rows;
}

function normalizeType(category) {
  if (STANDARD_TYPES.has(category)) return category;
  if (category === 'SCOPE' || category === 'TRACE' || category === 'SUMMARY') return 'CUST';
  return 'CUST';
}

function buildExpandedRows(baseRows) {
  const expanded = [];
  for (const row of baseRows) {
    const type = normalizeType(row.category);
    const templates = DETAIL_TEMPLATES[type] || DETAIL_TEMPLATES.CUST;
    if (IS_MASSIVE) {
      MASSIVE_CONTEXTS.forEach(([contextCode, contextPrecondition, contextAction, contextExpected], contextIndex) => {
        templates.forEach(([detailType, extraAction, extraExpected], detailIndex) => {
          expanded.push({
            sourceFile: row.file,
            section: row.h2,
            subsection: row.h3,
            baseTcId: row.tcId,
            expandedTcId: `${row.tcId}-M${String(contextIndex + 1).padStart(2, '0')}${String(detailIndex + 1).padStart(2, '0')}`,
            baseCategory: row.category || type,
            detailType: `${detailType}_${contextCode}`,
            title: row.title || row.h3 || row.tcId,
            precondition: `${row.precondition || '기본 운영 데이터와 권한이 준비된 상태'} / ${contextPrecondition}`,
            action: `${row.action} ${extraAction} ${contextAction}`.trim(),
            expected: `${row.expected} ${extraExpected} ${contextExpected}`.trim(),
            status: row.status || 'Ready',
            evidence: row.evidence,
            generationRule: `${type}+${contextCode}`,
          });
        });
      });
      continue;
    }

    templates.forEach(([detailType, extraAction, extraExpected], index) => {
      expanded.push({
        sourceFile: row.file,
        section: row.h2,
        subsection: row.h3,
        baseTcId: row.tcId,
        expandedTcId: `${row.tcId}-D${String(index + 1).padStart(2, '0')}`,
        baseCategory: row.category || type,
        detailType,
        title: row.title || row.h3 || row.tcId,
        precondition: row.precondition || '기본 운영 데이터와 권한이 준비된 상태',
        action: `${row.action} ${extraAction}`.trim(),
        expected: `${row.expected} ${extraExpected}`.trim(),
        status: row.status || 'Ready',
        evidence: row.evidence,
        generationRule: type,
      });
    });
  }
  return expanded;
}

function writeChunks(csvRows) {
  fs.mkdirSync(CHUNK_DIR, { recursive: true });
  const dataRows = csvRows.slice(1);
  const chunks = [];
  for (let index = 0; index * CHUNK_SIZE < dataRows.length; index += 1) {
    const start = index * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const chunkRows = dataRows.slice(start, end);
    const filename = `${BASE_NAME}_part_${String(index + 1).padStart(3, '0')}.csv`;
    const rows = index === 0 ? [csvRows[0], ...chunkRows] : chunkRows;
    fs.writeFileSync(path.join(CHUNK_DIR, filename), toCsv(rows), 'utf8');
    chunks.push({
      part: index + 1,
      filename,
      rowCount: rows.length,
      dataRowStart: start + 1,
      dataRowEnd: start + chunkRows.length,
      startCellA1: index === 0 ? 'A1' : `A${CHUNK_SIZE * index + 2}`,
    });
  }
  fs.writeFileSync(CHUNK_MANIFEST_PATH, JSON.stringify({ profile: PROFILE, chunkSize: CHUNK_SIZE, chunks }, null, 2), 'utf8');
  return chunks;
}

function toCsv(rows) {
  const escape = (value = '') => {
    const text = String(value).replace(/"/g, '""');
    return /[",\n\t]/.test(text) ? `"${text}"` : text;
  };
  return rows.map((row) => row.map(escape).join(',')).join('\n');
}

function countBy(items, key) {
  const map = new Map();
  for (const item of items) {
    map.set(item[key], (map.get(item[key]) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const files = fs.readdirSync(SOURCE_DIR).filter((file) => file.endsWith('.md')).sort();
const baseRows = files.flatMap((file) => {
  if (SKIP_FILES.has(file)) return [];
  const fullPath = path.join(SOURCE_DIR, file);
  return parseMarkdownTable(fs.readFileSync(fullPath, 'utf8'), file);
});

const expandedRows = buildExpandedRows(baseRows);
const header = [
  '순번',
  '소스 문서',
  '대분류',
  '세부 섹션',
  '부모 TC ID',
  '확장 TC ID',
  '기본 분류',
  '세부 분류',
  '체크 제목',
  '사전 조건',
  '실행 단계',
  '기대 결과',
  '상태',
  '근거',
  '생성 규칙',
];

const csvRows = [
  header,
  ...expandedRows.map((row, index) => [
    String(index + 1),
    row.sourceFile,
    row.section,
    row.subsection,
    row.baseTcId,
    row.expandedTcId,
    row.baseCategory,
    row.detailType,
    row.title,
    row.precondition,
    row.action,
    row.expected,
    row.status,
    row.evidence,
    row.generationRule,
  ]),
];

fs.writeFileSync(CSV_PATH, toCsv(csvRows), 'utf8');
const chunks = writeChunks(csvRows);
fs.writeFileSync(
  JSON_PATH,
  JSON.stringify(
    {
      profile: PROFILE,
      generatedAt: new Date().toISOString(),
      baseCount: baseRows.length,
      expandedCount: expandedRows.length,
      chunkSize: CHUNK_SIZE,
      chunkCount: chunks.length,
      chunkManifest: path.relative(ROOT, CHUNK_MANIFEST_PATH),
      files: files.filter((file) => !SKIP_FILES.has(file)),
      countsByFile: countBy(baseRows.map((row) => ({ file: row.file })), 'file'),
      countsByCategory: countBy(expandedRows.map((row) => ({ baseCategory: row.baseCategory })), 'baseCategory'),
      rows: expandedRows,
    },
    null,
    2,
  ),
  'utf8',
);

const topFiles = countBy(baseRows.map((row) => ({ file: row.file })), 'file')
  .slice(0, 10)
  .map(([file, count]) => `- \`${file}\`: ${count} base TC`)
  .join('\n');

const summaryTitle = IS_MASSIVE ? '# 전체 초고밀도 TC 요약' : '# 전체 확장 TC 요약';
const summary = `${summaryTitle}

## 목적
- docs/admin/testcases/admin-docs-tc 기준 기본 TC를 실제 실행 단위까지 ${IS_MASSIVE ? '90배 수준' : '5배'}로 확장한 상세 TC 세트를 생성한다.
- 클라이언트 인수검수, SQA, 운영 시뮬레이션, 권한/예외/후속 반영 검증에 바로 사용할 수 있는 대량 TC를 산출한다.

## 생성 결과
- 기본 TC 행 수: ${baseRows.length}
- 확장 TC 행 수: ${expandedRows.length}
- 생성 규칙: 기본 TC 1건당 상세 실행 TC ${IS_MASSIVE ? '90건(세부 검증 5종 x 운영 컨텍스트 18종)' : '5건(D01~D05)'} 확장
- 산출 파일:
  - ${path.relative(ROOT, CSV_PATH)}
  - ${path.relative(ROOT, JSON_PATH)}
  - ${path.relative(ROOT, CHUNK_MANIFEST_PATH)}
  - chunk 수: ${chunks.length}
  - chunk 크기: 최대 ${CHUNK_SIZE} data row

## 확장 규칙
- FLW: happy path, 연속 처리, 재진입, stale context, 후속 반영
- UI: 기본 렌더, 긴 데이터, 반응형, 비활성, 피드백
- LINK: 대표 CTA, 보조 동선, 복귀, 만료 컨텍스트, 다중 실행
- DATA: 정상값, 경계값, 중복/충돌, 영속성, downstream 반영
- STA: loading, empty, active, inactive, transition
- RBAC: 허용, 읽기전용, 거절, 범위 차이, 추적성
- ERR: validation, API 실패, timeout, 동시성 충돌, recovery
- CUST: 정상, 필수값, 분기, 후속 반영, 감사 로그
${IS_MASSIVE ? `- 운영 컨텍스트 18종: 데스크톱 표준/피크/재시도/월말/다지점, 태블릿 표준/피크/재시도/월말/다지점, 모바일 표준/피크/재시도/월말, 본사 범위, 지점 범위, 제한 권한, 연동 지연` : ''}

## 문서별 기본 TC 상위 현황
${topFiles}
`;

fs.writeFileSync(SUMMARY_PATH, summary, 'utf8');

console.log(
  JSON.stringify(
    {
      baseCount: baseRows.length,
      expandedCount: expandedRows.length,
      csvPath: path.relative(ROOT, CSV_PATH),
      jsonPath: path.relative(ROOT, JSON_PATH),
      summaryPath: path.relative(ROOT, SUMMARY_PATH),
      chunkManifestPath: path.relative(ROOT, CHUNK_MANIFEST_PATH),
      chunkCount: chunks.length,
      profile: PROFILE,
    },
    null,
    2,
  ),
);
