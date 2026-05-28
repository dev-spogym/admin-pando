import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const CLIENT_ROOT = path.join(ROOT, 'client2');
const MAPPING_FILE = path.join(CLIENT_ROOT, '_docs4_기획연계.md');
const REPORT_FILE = path.join(ROOT, 'docs4', 'reports', 'client2_docs4_alignment_report.md');

function walkMarkdown(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(full, acc);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) acc.push(full);
  }
  return acc.sort((a, b) => a.localeCompare(b, 'ko'));
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function expandMaTokens(text) {
  const ids = new Set();
  for (const match of text.matchAll(/MA-(\d{3})(?:\s*~\s*(\d{3}))?/g)) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (end < start || end - start > 99) {
      ids.add(`MA-${match[1]}`);
      continue;
    }
    for (let value = start; value <= end; value += 1) {
      ids.add(`MA-${String(value).padStart(3, '0')}`);
    }
  }
  return ids;
}

function extractCodes(text, pattern) {
  return new Set([...text.matchAll(pattern)].map((match) => match[0]));
}

function countStatuses(mappingText) {
  const counts = new Map();
  for (const line of mappingText.split(/\r?\n/)) {
    if (!line.startsWith('| MA-')) continue;
    const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
    const status = cells[cells.length - 1] ?? '';
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return counts;
}

function findDocs2Refs(files) {
  const refs = [];
  for (const file of files) {
    const lines = read(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes('docs2')) {
        refs.push(`${rel(file)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  return refs;
}

function findDuplicateScreenDefinitions(files) {
  const defs = new Map();
  for (const file of files) {
    const lines = read(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(/^#{2,3}\s+(MA-\d{3})\b/);
      if (!match) return;
      const locations = defs.get(match[1]) ?? [];
      locations.push(`${rel(file)}:${index + 1}`);
      defs.set(match[1], locations);
    });
  }
  return [...defs.entries()]
    .filter(([, locations]) => locations.length > 1)
    .map(([id, locations]) => `${id}: ${locations.join(', ')}`);
}

function findBrokenDocs4Links(mappingText) {
  const broken = [];
  const seen = new Set();
  for (const match of mappingText.matchAll(/`(docs4\/[^`|]+?\.md)(?::\d+)?`/g)) {
    const normalized = match[1].replaceAll('/', path.sep);
    const target = path.join(ROOT, normalized);
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    if (!fs.existsSync(target)) broken.push(match[1]);
  }
  return broken.sort((a, b) => a.localeCompare(b, 'ko'));
}

function formatList(items) {
  if (items.length === 0) return '- 없음';
  return items.map((item) => `- ${item}`).join('\n');
}

function main() {
  const files = walkMarkdown(CLIENT_ROOT);
  const mappingText = read(MAPPING_FILE);
  const clientText = files.map(read).join('\n');
  const clientMa = expandMaTokens(clientText);
  const mappingMa = expandMaTokens(mappingText);
  const clientMfn = extractCodes(clientText, /MFN-[0-9A-Z-]+/g);
  const mappingMfn = extractCodes(mappingText, /MFN-[0-9A-Z-]+/g);

  const missingMa = [...clientMa].filter((id) => !mappingMa.has(id)).sort();
  const missingMfn = [...clientMfn].filter((id) => !mappingMfn.has(id)).sort();
  const docs2Refs = findDocs2Refs(files);
  const duplicateDefinitions = findDuplicateScreenDefinitions(files);
  const brokenDocs4Links = findBrokenDocs4Links(mappingText);
  const statusCounts = countStatuses(mappingText);

  const errors = [
    ...docs2Refs.map((item) => `legacy docs2 reference: ${item}`),
    ...duplicateDefinitions.map((item) => `duplicate MA definition: ${item}`),
    ...missingMa.map((item) => `MA missing in mapping: ${item}`),
    ...missingMfn.map((item) => `MFN missing in mapping: ${item}`),
    ...brokenDocs4Links.map((item) => `broken docs4 link: ${item}`),
  ];

  const report = [
    '# client2-docs4 alignment report',
    '',
    `- generated_at: 2026-05-29`,
    `- client2 files: ${files.length}`,
    `- client2 MA ids: ${clientMa.size}`,
    `- mapped MA ids: ${mappingMa.size}`,
    `- client2 MFN ids: ${clientMfn.size}`,
    `- mapped MFN ids: ${mappingMfn.size}`,
    `- ERROR: ${errors.length}`,
    '',
    '## Status Counts',
    '',
    '| 판정 | 화면 수 |',
    '|---|---:|',
    ...[...statusCounts.entries()].map(([status, count]) => `| ${status} | ${count} |`),
    '',
    '## ERROR',
    '',
    formatList(errors),
    '',
    '## Checked Items',
    '',
    `- legacy docs2 refs: ${docs2Refs.length}`,
    `- duplicate MA definitions: ${duplicateDefinitions.length}`,
    `- unmapped MA ids: ${missingMa.length}`,
    `- unmapped MFN ids: ${missingMfn.length}`,
    `- broken docs4 links: ${brokenDocs4Links.length}`,
    '',
  ].join('\n');

  fs.writeFileSync(REPORT_FILE, report, 'utf8');

  console.log(report);
  if (errors.length > 0) process.exit(1);
}

main();
