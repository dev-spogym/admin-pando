import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const FEATURE_ROOT = path.join(ROOT, 'docs', 'admin', '기능명세서');

const CONTRACT_CODES = new Set([
  'INF-01',
  'INF-02',
  'INF-03',
  'INF-04',
  'INF-05',
  'INF-06',
  'INF-07',
  'INF-08',
  'DB-01',
  'DB-02',
  'DB-03',
  'DB-04',
  'DB-05',
  'DB-06',
  'AUTH-01',
  'AUTH-02',
  'AUTH-03',
  'AUTH-04',
  'AUTH-05',
  'SET-01',
  'SET-02',
  'SET-03',
  'SET-04',
  'SET-EXT-03',
  'DASH-01',
  'DASH-02',
  'DASH-03',
  'DASH-04',
  'HQ-01',
  'HQ-02',
  'HQ-03',
  'HQ-04',
  'MBR-01',
  'MBR-02',
  'MBR-03',
  'MBR-04',
  'MBR-ADV-01',
  'MBR-ADV-02',
  'MBR-ADV-03',
  'MBR-ADV-04',
  'MBR-ADV-05',
  'MBR-ADV-06',
  'MBR-ADV-07',
  'MBR-EXT-01',
  'MBR-EXT-02',
  'MBR-EXT-03',
  'MBR-EXT-04',
  'CRM-01',
  'CRM-02',
  'CRM-03',
  'CRM-04',
  'PRD-01',
  'PRD-02',
  'PRD-03',
  'RSV-01',
  'RSV-02',
  'RSV-03',
  'RSV-04',
  'RSV-05',
  'CLS-01',
  'CLS-02',
  'CLS-03',
  'CLS-04',
  'CLS-05',
  'CLS-06',
  'CLS-07',
  'CLS-08',
  'CLS-09',
  'CLS-EXT-02',
  'SAL-01',
  'SAL-02',
  'SAL-03',
  'SAL-04',
  'SAL-05',
  'SAL-EXT-01',
  'SAL-EXT-02',
  'SAL-EXT-04',
  'STF-01',
  'STF-02',
  'STF-03',
  'STF-04',
  'PAY-STF-01',
  'PAY-STF-02',
  'PAY-STF-03',
  'PAY-STF-04',
  'PAY-STF-05',
  'STF-EXT-04',
  'CTR-01',
  'CTR-02',
  'CTR-03',
  'CTR-04',
  'CTR-05',
  'HQ-05',
  'HQ-06',
  'HQ-07',
  'HQ-EXT-03',
  'PAY-01',
  'PAY-02',
  'PAY-03',
  'PAY-04',
  'PAY-05',
  'RPT-01',
  'RPT-02',
  'RPT-03',
  'RPT-04',
  'RPT-05',
  'RPT-06',
  'COM-01',
  'COM-02',
  'COM-03',
  'COM-04',
  'COM-05',
  'COM-06',
  'NFR-02',
  'NFR-05',
  'NFR-06',
  'MKT-01',
  'MKT-02',
  'MKT-03',
  'MKT-04',
  'MKT-05',
  'MKT-06',
  'MKT-EXT-03',
  'DQ-01',
  'DQ-02',
  'DQ-03',
  'DQ-04',
  'DQ-05',
  'DQ-07',
  'DOC-01',
  'DOC-02',
  'DOC-03',
  'DOC-04',
  'DOC-05',
  'DOC-06',
  'DOC-07',
]);

const CONTRACT_STATUSES = new Set(['신규기획', '비계약', '파생기획']);

const LEGACY_UNCLASSIFIED_IDS = new Set([
  'CLS-11',
  'CLS-12',
  'CLS-14',
  'CLS-15',
  'FAC-01',
  'FAC-02',
  'FAC-03',
  'FAC-04',
  'FAC-05',
  'FAC-06',
  'FAC-EXT-01',
  'FAC-EXT-02',
  'FAC-EXT-03',
  'FAC-EXT-04',
  'FAC-EXT-05',
  'HQ-10',
  'HQ-11',
  'HQ-13',
  'IoT-01',
  'IoT-02',
  'IoT-03',
  'IoT-04',
  'IoT-05',
  'IoT-06',
  'IoT-08',
  'MKT-07',
  'MKT-09',
  'PAY-06',
  'PRD-04',
  'PRD-05',
  'PRD-06',
  'PRD-07',
  'PRD-08',
  'PRD-EXT-01',
  'PRD-EXT-02',
  'SAL-07',
  'SAL-EXT-05',
  'SET-05',
  'SET-EXT-04',
]);

interface Finding {
  level: 'error' | 'warn';
  file: string;
  message: string;
}

interface FeatureRecord {
  id: string;
  rel: string;
  contractCodes: string[];
  contractStatus: string;
}

const findings: Finding[] = [];

function addError(file: string, message: string) {
  findings.push({ level: 'error', file, message });
}

function addWarn(file: string, message: string) {
  findings.push({ level: 'warn', file, message });
}

function walkNamedFiles(dir: string, targetName: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkNamedFiles(full, targetName, acc);
      continue;
    }
    if (entry.name === targetName) acc.push(full);
  }

  return acc.sort((a, b) => a.localeCompare(b, 'ko'));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function main() {
  console.log('─'.repeat(60));
  console.log('📑 계약코드 정합성 검증');
  console.log('─'.repeat(60));

  const files = walkNamedFiles(FEATURE_ROOT, '00-기본기능.md');
  const features: FeatureRecord[] = files.map((file) => {
    const rel = path.relative(ROOT, file);
    const data = matter(fs.readFileSync(file, 'utf8')).data as Record<string, unknown>;
    const contractCodesRaw = data.contract_codes;
    const contractStatus = typeof data.contract_status === 'string' ? data.contract_status : '';

    if (contractCodesRaw !== undefined && !Array.isArray(contractCodesRaw)) {
      addError(rel, 'contract_codes 는 배열이어야 함');
    }

    if (contractStatus && !CONTRACT_STATUSES.has(contractStatus)) {
      addError(rel, `contract_status 값이 허용 목록에 없음: ${contractStatus}`);
    }

    return {
      id: typeof data.id === 'string' ? data.id : '',
      rel,
      contractCodes: normalizeStringArray(contractCodesRaw),
      contractStatus,
    };
  });

  const contractUsage = new Map<string, FeatureRecord[]>();

  for (const feature of features) {
    if (!feature.id) continue;

    if (CONTRACT_CODES.has(feature.id) && !feature.contractCodes.includes(feature.id)) {
      addError(feature.rel, `id가 최초 계약코드이므로 contract_codes에 자기 자신을 포함해야 함: ${feature.id}`);
    }

    if (
      !CONTRACT_CODES.has(feature.id) &&
      feature.contractCodes.length === 0 &&
      !feature.contractStatus &&
      !LEGACY_UNCLASSIFIED_IDS.has(feature.id)
    ) {
      addWarn(feature.rel, `계약코드 미연결: ${feature.id} (contract_status 필요)`);
    }

    for (const code of feature.contractCodes) {
      if (!CONTRACT_CODES.has(code)) {
        addError(feature.rel, `최초 계약 목록에 없는 contract_codes 항목: ${code}`);
        continue;
      }
      const bucket = contractUsage.get(code) ?? [];
      bucket.push(feature);
      contractUsage.set(code, bucket);
    }
  }

  for (const [code, records] of contractUsage) {
    if (records.length <= 1) continue;
    addWarn(
      records[0].rel,
      `계약코드가 여러 기능명세서에 연결됨: ${code} (${records.map((item) => item.id).join(', ')})`,
    );
  }

  const errors = findings.filter((finding) => finding.level === 'error');
  const warns = findings.filter((finding) => finding.level === 'warn');

  console.log(`최초 계약코드: ${CONTRACT_CODES.size}`);
  console.log(`기능명세서: ${features.length}`);
  console.log(`contract_codes 작성: ${features.filter((feature) => feature.contractCodes.length > 0).length}`);
  console.log(`contract_status 작성: ${features.filter((feature) => feature.contractStatus).length}`);
  console.log(`현재 미분류 허용: ${features.filter((feature) => LEGACY_UNCLASSIFIED_IDS.has(feature.id)).length}`);
  console.log(`오류: ${errors.length}`);
  console.log(`경고: ${warns.length}`);
  console.log('');

  if (errors.length > 0) {
    console.log('❌ 오류 목록');
    for (const finding of errors) {
      console.log(`  [ERR] ${finding.file}: ${finding.message}`);
    }
    console.log('');
  }

  if (warns.length > 0) {
    console.log('⚠️ 경고 목록');
    for (const finding of warns) {
      console.log(`  [WRN] ${finding.file}: ${finding.message}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log('✗ 검증 실패');
    process.exit(1);
  }

  console.log('✓ 검증 통과');
}

main();
