#!/usr/bin/env node
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { parseJsonFile } from './lib/parseJsonFile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a)) {
    if (!isPlainObject(b)) return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (!deepEqual(aKeys, bKeys)) return false;
    for (const key of aKeys) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

function normalizeStringSet(arr) {
  if (!Array.isArray(arr)) return null;
  const out = [];
  for (const item of arr) {
    if (typeof item !== 'string') return null;
    out.push(item);
  }
  return [...new Set(out)].sort();
}

function extractVariables(content) {
  const regex = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
  return normalizeStringSet([...content.matchAll(regex)].map((m) => m[1])) ?? [];
}

function renderContent(content, vars, defaults) {
  const escaped = [];

  const protectedContent = content.replace(/\{\{!([a-zA-Z0-9_-]+)\}\}/g, (_, name) => {
    const idx = escaped.push(name) - 1;
    return `\u0000PROMPTG_ESC_${idx}\u0000`;
  });

  const substituted = protectedContent.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const value = vars[key];
      if (value === null || value === undefined) return match;
      return String(value);
    }
    if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      const value = defaults[key];
      if (value === null || value === undefined) return match;
      return String(value);
    }
    return match;
  });

  return substituted.replace(/\u0000PROMPTG_ESC_(\d+)\u0000/g, (_, rawIdx) => {
    const name = escaped[Number(rawIdx)];
    return typeof name === 'string' ? `{{${name}}}` : '';
  });
}

function computeMissing(extracted, vars, defaults) {
  const present = new Set();
  for (const [k, v] of Object.entries(vars)) {
    if (v !== null && v !== undefined) present.add(k);
  }
  for (const [k, v] of Object.entries(defaults)) {
    if (v !== null && v !== undefined) present.add(k);
  }
  return normalizeStringSet(extracted.filter((v) => !present.has(v))) ?? [];
}

function validateKebabCaseName(name) {
  return (
    typeof name === 'string' &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) &&
    name.length >= 1 &&
    name.length <= 100
  );
}

function instantiateTemplate(templateDoc) {
  return JSON.parse(JSON.stringify(templateDoc.prompt));
}

console.log('Running semantics conformance tests...\n');

const ajv = new Ajv({ strict: true, validateFormats: true });
addFormats(ajv);

const promptSchema = parseJsonFile(join(rootDir, 'schemas/v1/prompt.schema.json'));
const templateSchema = parseJsonFile(join(rootDir, 'schemas/v1/template.schema.json'));

const { $schema: _ps, ...promptSchemaClean } = promptSchema;
const { $schema: _ts, ...templateSchemaClean } = templateSchema;

ajv.addSchema(promptSchemaClean, 'prompt.schema.json');
ajv.addSchema(templateSchemaClean, 'template.schema.json');

const validatePrompt = ajv.compile(promptSchemaClean);
const validateTemplate = ajv.compile(templateSchemaClean);

const files = await glob('conformance/semantics/*.json', { cwd: rootDir });
files.sort();

let total = 0;
let passed = 0;
let failed = 0;

for (const file of files) {
  total++;
  const path = join(rootDir, file);
  const name = file.split('/').pop();

  try {
    const test = parseJsonFile(path);
    if (!isPlainObject(test) || typeof test.op !== 'string') {
      throw new Error('Invalid semantics test: expected object with string op.');
    }

    if (test.op === 'extract') {
      if (typeof test.content !== 'string')
        throw new Error('extract test requires string content.');
      const expected = normalizeStringSet(test.expected);
      if (expected === null) throw new Error('extract test requires expected string array.');

      const extracted = extractVariables(test.content);
      if (!deepEqual(extracted, expected)) {
        throw new Error(
          `extract mismatch: expected ${JSON.stringify(expected)} got ${JSON.stringify(extracted)}`
        );
      }
      console.log(`OK ${name}`);
      passed++;
      continue;
    }

    if (test.op === 'render') {
      if (typeof test.content !== 'string') throw new Error('render test requires string content.');
      if (!isPlainObject(test.vars)) throw new Error('render test requires vars object.');
      if (!isPlainObject(test.defaults)) throw new Error('render test requires defaults object.');
      if (typeof test.expected !== 'string')
        throw new Error('render test requires expected string.');

      const expectedExtracted = normalizeStringSet(test.expectedExtracted);
      const expectedMissing = normalizeStringSet(test.expectedMissing);
      if (expectedExtracted === null)
        throw new Error('render test requires expectedExtracted string array.');
      if (expectedMissing === null)
        throw new Error('render test requires expectedMissing string array.');

      const extracted = extractVariables(test.content);
      const missing = computeMissing(extracted, test.vars, test.defaults);
      const rendered = renderContent(test.content, test.vars, test.defaults);

      if (!deepEqual(normalizeStringSet(extracted) ?? [], expectedExtracted)) {
        throw new Error(
          `extracted mismatch: expected ${JSON.stringify(expectedExtracted)} got ${JSON.stringify(extracted)}`
        );
      }
      if (!deepEqual(missing, expectedMissing)) {
        throw new Error(
          `missing mismatch: expected ${JSON.stringify(expectedMissing)} got ${JSON.stringify(missing)}`
        );
      }
      if (rendered !== test.expected) {
        throw new Error(
          `render mismatch: expected ${JSON.stringify(test.expected)} got ${JSON.stringify(rendered)}`
        );
      }
      console.log(`OK ${name}`);
      passed++;
      continue;
    }

    if (test.op === 'instantiate') {
      if (!isPlainObject(test.template))
        throw new Error('instantiate test requires template object.');
      if (!isPlainObject(test.expected))
        throw new Error('instantiate test requires expected object.');

      if (!validateTemplate(test.template)) {
        throw new Error(`template does not validate: ${JSON.stringify(validateTemplate.errors)}`);
      }

      const actual = instantiateTemplate(test.template);

      if (!validatePrompt(actual)) {
        throw new Error(
          `instantiated prompt does not validate: ${JSON.stringify(validatePrompt.errors)}`
        );
      }
      if (!validatePrompt(test.expected)) {
        throw new Error(
          `expected prompt does not validate: ${JSON.stringify(validatePrompt.errors)}`
        );
      }
      if (!deepEqual(actual, test.expected)) {
        throw new Error(
          `instantiate mismatch:\nexpected=${JSON.stringify(test.expected, null, 2)}\nactual=${JSON.stringify(actual, null, 2)}`
        );
      }

      console.log(`OK ${name}`);
      passed++;
      continue;
    }

    throw new Error(`Unknown op: ${test.op}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}`);
    console.error(`  Error: ${err?.message ?? String(err)}`);
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nOK All semantics conformance tests passed');
}
