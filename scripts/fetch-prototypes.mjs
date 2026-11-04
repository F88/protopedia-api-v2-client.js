// Fetch the raw response of `GET /prototype/list` for all prototypes and save
// it as-is for surveying the API behavior (#44).
//
// Usage:
//   node ./scripts/fetch-prototypes.mjs [--limit 10000] [--out-dir api-survey]
//
// Environment variables (loaded from .env if present):
//   VITE_PROTOPEDIA_API_V2_TOKEN    (required)
//   VITE_PROTOPEDIA_API_V2_BASE_URL (optional, default: official API)
//
// The API client is intentionally not used, so that the saved file is exactly
// what the API returned. Run this sparingly: it sends one large request to the
// production API.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

const DEFAULT_BASE_URL = 'https://protopedia.net/v2/api';
const DEFAULT_LIMIT = 10_000;
const DEFAULT_OUT_DIR = join(projectRoot, 'api-survey');
const USER_AGENT = 'protopedia-api-v2-client.js scripts/fetch-prototypes.mjs';

const { values } = parseArgs({
  options: {
    limit: { type: 'string', default: String(DEFAULT_LIMIT) },
    'out-dir': { type: 'string', default: DEFAULT_OUT_DIR },
  },
});

const limit = Number(values.limit);
if (!Number.isInteger(limit) || limit <= 0) {
  console.error(`Error: --limit must be a positive integer: ${values.limit}`);
  process.exit(1);
}
const outDir = resolve(values['out-dir']);

const envPath = join(projectRoot, '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
const token = process.env.VITE_PROTOPEDIA_API_V2_TOKEN;
const baseUrl = (
  process.env.VITE_PROTOPEDIA_API_V2_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, '');
if (!token) {
  console.error('Error: VITE_PROTOPEDIA_API_V2_TOKEN is not set.');
  process.exit(1);
}

// Refuse to write into the repository unless the directory is gitignored,
// because the response exceeds 20 MB and must not be committed.
const relToRoot = relative(projectRoot, outDir);
const insideRepo = !relToRoot.startsWith('..') && !isAbsolute(relToRoot);
if (insideRepo && !isGitIgnored(outDir)) {
  console.error(
    `Error: ${relToRoot || '.'} is inside the repository but not gitignored.`,
  );
  process.exit(1);
}

const url = `${baseUrl}/prototype/list?offset=0&limit=${limit}`;
console.log(`Fetching ${url}`);

const startedAt = new Date();
const response = await fetch(url, {
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Client-User-Agent': USER_AGENT,
  },
});
const body = await response.text();
const durationMs = Date.now() - startedAt.getTime();

if (!response.ok) {
  console.error(
    `Error: ${response.status} ${response.statusText}\n${body.slice(0, 500)}`,
  );
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(body);
} catch (error) {
  console.error(`Error: response is not valid JSON: ${error.message}`);
  process.exit(1);
}
const results = Array.isArray(payload.results) ? payload.results : [];

mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `prototypes-${formatTimestamp(startedAt)}.json`);
// Save the body exactly as received; 'wx' avoids overwriting earlier snapshots.
writeFileSync(outFile, body, { encoding: 'utf8', flag: 'wx' });

console.log(`Saved ${outFile}`);
console.log(
  `  status=${response.status} count=${payload.count} results=${results.length} ` +
    `bytes=${Buffer.byteLength(body, 'utf8')} duration=${durationMs}ms`,
);
if (results.length >= limit) {
  console.warn(
    `Warning: results (${results.length}) reached --limit (${limit}). ` +
      'Some prototypes may be missing; rerun with a larger --limit.',
  );
}

function isGitIgnored(dir) {
  // Check a file path inside the directory: a directory-only pattern such as
  // `/api-survey/` does not match the directory itself before it exists.
  const probe = join(dir, 'prototypes.json');
  try {
    execFileSync('git', ['check-ignore', '-q', probe], { cwd: projectRoot });
    return true;
  } catch {
    return false;
  }
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}
