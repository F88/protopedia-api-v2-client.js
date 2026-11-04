// Analyze a raw `GET /prototype/list` response and report where the data
// differs from the type definitions (#44).
//
// Usage:
//   node ./scripts/survey-prototypes.mjs <response.json>
//
// The type definitions are read directly from
// src/types/protopedia-api-v2/response.ts with the TypeScript compiler API,
// so no separate attribute list needs to be maintained. The input file is
// only read; this script never calls the API.
//
// Output: a Markdown report, printed on stdout and saved next to the input
// file (e.g. prototypes-20261104-2209.json -> prototypes-20261104-2209.report.md).
// An existing report for the same input is overwritten.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

const TYPES_FILE = join(projectRoot, 'src/types/protopedia-api-v2/response.ts');
const RESPONSE_INTERFACE_NAME = 'ListPrototypesApiResponse';
const INTERFACE_NAME = 'ResultOfListPrototypesApiResponse';
const SAMPLE_IDS = 5;

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node ./scripts/survey-prototypes.mjs <response.json>');
  process.exit(1);
}
const inputPath = resolve(inputArg);
const reportPath = inputPath.replace(/(\.json)?$/, '.report.md');

// Refuse to write into the repository unless the report would be gitignored.
if (isInsideRepo(reportPath) && !isGitIgnored(reportPath)) {
  console.error(
    `Error: ${displayPath(reportPath)} is inside the repository but not gitignored.`,
  );
  process.exit(1);
}

const sourceFile = ts.createSourceFile(
  TYPES_FILE,
  readFileSync(TYPES_FILE, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const definitions = readDefinitions(sourceFile, INTERFACE_NAME);
const responseShape = readShape(
  findInterface(sourceFile, RESPONSE_INTERFACE_NAME).members,
  sourceFile,
);
const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (!Array.isArray(payload.results)) {
  console.error(
    'Error: input has no "results" array. Pass a raw response of GET /prototype/list.',
  );
  process.exit(1);
}
const prototypes = payload.results;
const stats = collectStats(prototypes);
const envelopeFindings = [];
// `results` items are analyzed separately in detail.
compareShape(responseShape, payload, '', envelopeFindings, ['results']);

const report = renderReport({
  inputPath,
  inputBytes: statSync(inputPath).size,
  payload,
  prototypes,
  definitions,
  stats,
  envelopeFindings,
});
writeFileSync(reportPath, `${report}\n`, 'utf8');
console.log(report);
// Use stderr so that redirecting stdout still yields only the report.
console.error(`Saved ${displayPath(reportPath)}`);

function isInsideRepo(path) {
  const rel = relative(projectRoot, path);
  return !rel.startsWith('..') && !isAbsolute(rel);
}

function isGitIgnored(path) {
  try {
    execFileSync('git', ['check-ignore', '-q', path], { cwd: projectRoot });
    return true;
  } catch {
    return false;
  }
}

/** Relative path inside the repository, absolute path outside of it. */
function displayPath(path) {
  return isInsideRepo(path) ? relative(projectRoot, path) : path;
}

function findInterface(sourceFile, interfaceName) {
  let target;
  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      target = node;
    }
  });
  if (!target) {
    throw new Error(
      `Interface ${interfaceName} not found in ${sourceFile.fileName}`,
    );
  }
  return target;
}

/**
 * Read the members of an interface or type literal, following nested type
 * literals such as `metadata: { ... }`.
 */
function readShape(members, sourceFile) {
  const result = new Map();
  for (const member of members) {
    if (!ts.isPropertySignature(member) || !member.type) continue;
    const typeText = member.type.getText(sourceFile);
    let kind = expectedKind(typeText);
    let children;
    if (ts.isTypeLiteralNode(member.type)) {
      kind = 'object';
      children = readShape(member.type.members, sourceFile);
    } else if (ts.isArrayTypeNode(member.type)) {
      kind = 'array';
    }
    result.set(member.name.getText(sourceFile), {
      optional: Boolean(member.questionToken),
      type: typeText.replace(/\s+/g, ' '),
      kind,
      children,
    });
  }
  return result;
}

/** Compare one object against a shape and push differences with their paths. */
function compareShape(shape, value, path, findings, skip = []) {
  const at = (key) => (path ? `${path}.${key}` : key);
  for (const key of Object.keys(value)) {
    if (!shape.has(key)) {
      findings.push(
        `\`${at(key)}\`: in data but not in type definitions (${valueKind(value[key])})`,
      );
    }
  }
  for (const [key, def] of shape) {
    if (!(key in value)) {
      if (!def.optional) {
        findings.push(`\`${at(key)}\`: required but missing`);
      }
      continue;
    }
    const kind = valueKind(value[key]);
    if (def.kind && kind !== def.kind) {
      findings.push(`\`${at(key)}\`: declared \`${def.type}\`, found ${kind}`);
      continue;
    }
    if (def.children && !skip.includes(key)) {
      compareShape(def.children, value[key], at(key), findings);
    }
  }
}

/**
 * Read each property of the interface: name, optional or required, declared
 * type, and the **Confidence** line of its JSDoc.
 */
function readDefinitions(sourceFile, interfaceName) {
  const target = findInterface(sourceFile, interfaceName);
  const result = new Map();
  for (const member of target.members) {
    if (!ts.isPropertySignature(member) || !member.type) continue;
    const doc = ts
      .getJSDocCommentsAndTags(member)
      .filter(ts.isJSDoc)
      .map((d) => ts.getTextOfJSDocComment(d.comment) ?? '')
      .join('\n');
    const confidence = doc.match(/\*\*Confidence\*\*:\s*(.+)/)?.[1].trim();
    result.set(member.name.getText(sourceFile), {
      optional: Boolean(member.questionToken),
      type: member.type.getText(sourceFile),
      confidence: confidence ?? '',
    });
  }
  return result;
}

/** Count presence and value kinds of every attribute found in the data. */
function collectStats(items) {
  const result = new Map();
  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      let s = result.get(key);
      if (!s) {
        s = { present: 0, empty: 0, nulls: 0, kinds: new Map(), samples: {} };
        result.set(key, s);
      }
      s.present++;
      const kind = valueKind(value);
      s.kinds.set(kind, (s.kinds.get(kind) ?? 0) + 1);
      if (value === null) s.nulls++;
      if (value === '') s.empty++;
      const samples = (s.samples[kind] ??= []);
      if (samples.length < SAMPLE_IDS) samples.push(item.id);
    }
  }
  return result;
}

function valueKind(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** Map a declared TypeScript type to the expected JSON value kind. */
function expectedKind(typeText) {
  if (typeText === 'number') return 'number';
  if (typeText === 'string') return 'string';
  if (typeText === 'boolean') return 'boolean';
  return undefined;
}

function idsMissing(items, key) {
  const ids = [];
  let count = 0;
  for (const item of items) {
    if (!(key in item)) {
      count++;
      if (ids.length < SAMPLE_IDS) ids.push(item.id);
    }
  }
  return { count, ids };
}

function renderReport({
  inputPath,
  inputBytes,
  payload,
  prototypes,
  definitions,
  stats,
  envelopeFindings,
}) {
  const total = prototypes.length;
  const fmt = (n) => n.toLocaleString('en-US');
  const pct = (n) => `${((n / total) * 100).toFixed(2)}%`;
  const ids = (list) => list.join(', ');

  const added = [...stats.keys()].filter((k) => !definitions.has(k));
  const removed = [...definitions.keys()].filter((k) => !stats.has(k));
  const requiredMissing = [];
  const optionalAlways = [];
  const typeMismatches = [];
  const nullValues = [];

  for (const [key, def] of definitions) {
    const s = stats.get(key);
    if (!s) continue;
    if (!def.optional && s.present < total) {
      requiredMissing.push({ key, ...idsMissing(prototypes, key) });
    }
    if (def.optional && s.present === total) optionalAlways.push(key);
    const expected = expectedKind(def.type);
    for (const [kind, count] of s.kinds) {
      if (kind === 'null') continue;
      if (expected && kind !== expected) {
        typeMismatches.push({
          key,
          declared: def.type,
          kind,
          count,
          ids: s.samples[kind],
        });
      }
    }
    if (s.nulls > 0) {
      nullValues.push({ key, count: s.nulls, ids: s.samples.null });
    }
  }

  const lines = [];
  lines.push('# ProtoPedia API v2 survey report', '');
  lines.push(`- Input: \`${displayPath(inputPath)}\``);
  lines.push(`- Input size: ${fmt(inputBytes)} bytes`);
  lines.push(
    `- Prototypes: ${fmt(total)} (response \`count\`: ${payload.count})`,
  );
  lines.push(
    `- Type definitions: \`${relative(projectRoot, TYPES_FILE)}\` (\`${INTERFACE_NAME}\`, ${definitions.size} attributes)`,
  );
  lines.push(`- Generated at: ${new Date().toISOString()}`, '');

  lines.push(`## Response envelope (\`${RESPONSE_INTERFACE_NAME}\`)`, '');
  lines.push(
    ...(envelopeFindings.length
      ? envelopeFindings.map((f) => `- ${f}`)
      : ['No differences']),
    '',
  );

  lines.push(`## Findings for each prototype (\`${INTERFACE_NAME}\`)`, '');
  lines.push('### Attributes in data but not in type definitions', '');
  lines.push(
    ...(added.length
      ? added.map((k) => {
          const s = stats.get(k);
          return `- \`${k}\`: present in ${fmt(s.present)} (${pct(s.present)}), kinds: ${[...s.kinds.keys()].join(', ')}`;
        })
      : ['None']),
    '',
  );
  lines.push('### Attributes in type definitions but never in data', '');
  lines.push(
    ...(removed.length
      ? removed.map((k) => `- \`${k}\` (${definitions.get(k).type})`)
      : ['None']),
    '',
  );
  lines.push('### Required attributes missing in some prototypes', '');
  lines.push(
    ...(requiredMissing.length
      ? requiredMissing.map(
          (r) =>
            `- \`${r.key}\`: missing in ${fmt(r.count)} (${pct(r.count)}), e.g. id ${ids(r.ids)}`,
        )
      : ['None']),
    '',
  );
  lines.push('### Optional attributes present in all prototypes', '');
  lines.push(
    ...(optionalAlways.length
      ? optionalAlways.map((k) => `- \`${k}\``)
      : ['None']),
    '',
  );
  lines.push('### Value type mismatches', '');
  lines.push(
    ...(typeMismatches.length
      ? typeMismatches.map(
          (m) =>
            `- \`${m.key}\`: declared \`${m.declared}\`, found ${m.kind} in ${fmt(m.count)}, e.g. id ${ids(m.ids)}`,
        )
      : ['None']),
    '',
  );
  lines.push('### `null` values (not allowed by the type definitions)', '');
  lines.push(
    ...(nullValues.length
      ? nullValues.map(
          (n) => `- \`${n.key}\`: ${fmt(n.count)}, e.g. id ${ids(n.ids)}`,
        )
      : ['None']),
    '',
  );

  lines.push('## All attributes', '');
  lines.push(
    '| Attribute | Type | Required | Confidence | Present | Missing | Empty string | Value kinds |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | --- |',
  );
  const keys = [
    ...definitions.keys(),
    ...[...stats.keys()].filter((k) => !definitions.has(k)),
  ];
  for (const key of keys) {
    const def = definitions.get(key);
    const s = stats.get(key);
    const present = s?.present ?? 0;
    const kinds = s
      ? [...s.kinds].map(([k, c]) => `${k}: ${fmt(c)}`).join(', ')
      : '-';
    lines.push(
      `| \`${key}\` | ${def ? `\`${def.type}\`` : '(not defined)'} | ${def ? (def.optional ? 'optional' : 'required') : '-'} | ${def?.confidence || '-'} | ${fmt(present)} (${pct(present)}) | ${fmt(total - present)} | ${fmt(s?.empty ?? 0)} | ${kinds} |`,
    );
  }
  return lines.join('\n');
}
