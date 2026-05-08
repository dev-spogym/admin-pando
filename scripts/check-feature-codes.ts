import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SCREEN_ROOT = path.join(ROOT, 'docs', 'admin', '화면설계서');
const FEATURE_ROOT = path.join(ROOT, 'docs', 'admin', '기능명세서');

interface Finding {
  level: 'error' | 'warn';
  file: string;
  message: string;
}

interface DocRecord {
  id: string;
  kind: string;
  file: string;
  rel: string;
  featureCodes: string[];
}

interface FeatureRecord {
  id: string;
  file: string;
  rel: string;
  content: string;
  linkedScreen: unknown;
  linkedDialogs: unknown;
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

function readFrontmatter(file: string): Record<string, unknown> {
  return matter(fs.readFileSync(file, 'utf8')).data as Record<string, unknown>;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function parseLinkedIds(value: unknown): string[] {
  const text = Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
  return Array.from(text.matchAll(/\b(?:SCR|DLG)-[^\s,()/~]+/g)).map((match) => match[0]);
}

function parseBodyDocRefs(content: string): string[] {
  return Array.from(content.matchAll(/\b(?:SCR|DLG)-[^\s,()/~]+/g))
    .map((match) => match[0].replace(/[.,:;!?]+$/g, ''))
    .filter(Boolean);
}

function groupById<T extends { id: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!item.id) continue;
    const bucket = map.get(item.id) ?? [];
    bucket.push(item);
    map.set(item.id, bucket);
  }
  return map;
}

function resolveDocRefs(docById: Map<string, DocRecord[]>, id: string): DocRecord[] {
  const exact = docById.get(id);
  if (exact) return exact;

  const prefixMatches: DocRecord[] = [];
  for (const [docId, records] of docById) {
    if (
      docId.startsWith(`${id}-`) ||
      docId.startsWith(`${id}_`) ||
      id.startsWith(`${docId}-`) ||
      id.startsWith(`${docId}_`)
    ) {
      prefixMatches.push(...records);
    }
  }
  return prefixMatches;
}

function main() {
  console.log('─'.repeat(60));
  console.log('🔗 기능코드/화면 연결 검증');
  console.log('─'.repeat(60));

  const docFiles = walkNamedFiles(SCREEN_ROOT, '00-기본화면.md');
  const featureFiles = walkNamedFiles(FEATURE_ROOT, '00-기본기능.md');

  const docs: DocRecord[] = docFiles.map((file) => {
    const data = readFrontmatter(file);
    const rel = path.relative(ROOT, file);
    const featureCodesRaw = data.feature_codes;

    if (featureCodesRaw !== undefined && !Array.isArray(featureCodesRaw)) {
      addError(rel, 'feature_codes 는 배열이어야 함');
    }

    return {
      id: typeof data.id === 'string' ? data.id : '',
      kind: typeof data.kind === 'string' ? data.kind : '',
      file,
      rel,
      featureCodes: normalizeStringArray(featureCodesRaw),
    };
  });

  const features: FeatureRecord[] = featureFiles.map((file) => {
    const parsed = matter(fs.readFileSync(file, 'utf8'));
    const data = parsed.data as Record<string, unknown>;
    return {
      id: typeof data.id === 'string' ? data.id : '',
      file,
      rel: path.relative(ROOT, file),
      content: parsed.content,
      linkedScreen: data.linked_screen,
      linkedDialogs: data.linked_dialogs,
    };
  });

  const docById = groupById(docs);
  const featureById = groupById(features);

  for (const [id, records] of docById) {
    if (records.length > 1) {
      addError(records[0].rel, `화면/다이얼로그 id 중복: ${id} (${records.map((item) => item.rel).join(' | ')})`);
    }
  }

  for (const [id, records] of featureById) {
    if (records.length > 1) {
      addError(records[0].rel, `기능명세서 id 중복: ${id} (${records.map((item) => item.rel).join(' | ')})`);
    }
  }

  for (const doc of docs) {
    if (doc.featureCodes.length === 0) {
      addWarn(doc.rel, 'feature_codes 없음');
      continue;
    }

    for (const code of doc.featureCodes) {
      if (!featureById.has(code)) {
        addError(doc.rel, `존재하지 않는 기능코드 참조: ${code}`);
      }
    }
  }

  for (const feature of features) {
    if (!feature.id) {
      addError(feature.rel, '기능명세서 id 누락');
      continue;
    }

    const linkedIds = [...parseLinkedIds(feature.linkedScreen), ...parseLinkedIds(feature.linkedDialogs)];
    if (linkedIds.length === 0) {
      addWarn(feature.rel, 'linked_screen 또는 linked_dialogs 없음');
      continue;
    }

    for (const linkedId of linkedIds) {
      const linkedDocs = resolveDocRefs(docById, linkedId);

      if (linkedDocs.length === 0) {
        addError(feature.rel, `linked 화면/다이얼로그가 존재하지 않음: ${linkedId}`);
        continue;
      }

      if (linkedDocs.length > 1) {
        addWarn(feature.rel, `linked id가 여러 문서에 매칭됨: ${linkedId} (${linkedDocs.map((item) => item.id).join(', ')})`);
      }

      for (const linkedDoc of linkedDocs) {
        if (!linkedDoc.featureCodes.includes(feature.id)) {
          addError(
            feature.rel,
            `linked 문서의 feature_codes가 역참조하지 않음: ${feature.id} -> ${linkedDoc.id}`,
          );
        }
      }
    }

    const bodyRefs = new Set(parseBodyDocRefs(feature.content));
    for (const bodyRef of bodyRefs) {
      if (docById.has(bodyRef)) continue;

      const linkedDocs = resolveDocRefs(docById, bodyRef);
      if (linkedDocs.length > 1) {
        addWarn(
          feature.rel,
          `본문 SCR/DLG 짧은 ID가 여러 문서에 매칭됨: ${bodyRef} (${linkedDocs.map((item) => item.id).join(', ')})`,
        );
      }
    }
  }

  const errors = findings.filter((finding) => finding.level === 'error');
  const warns = findings.filter((finding) => finding.level === 'warn');

  console.log(`화면/다이얼로그 마스터: ${docs.length}`);
  console.log(`기능명세서: ${features.length}`);
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
