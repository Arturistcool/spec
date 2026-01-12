#!/usr/bin/env node
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { parseJsonFile } from './lib/parseJsonFile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const ajv = new Ajv({ strict: true });
addFormats(ajv);

// Load schemas (remove $schema field to avoid meta-schema resolution issues)
const promptSchema = parseJsonFile(join(rootDir, 'schemas/v1/prompt.schema.json'));
const templateSchema = parseJsonFile(join(rootDir, 'schemas/v1/template.schema.json'));
const packSchema = parseJsonFile(join(rootDir, 'schemas/v1/pack.schema.json'));

// Remove $schema field and add schemas to registry for cross-references
const { $schema: _ps, ...promptSchemaClean } = promptSchema;
const { $schema: _ts, ...templateSchemaClean } = templateSchema;
const { $schema: _pks, ...packSchemaClean } = packSchema;

ajv.addSchema(promptSchemaClean, 'prompt.schema.json');
ajv.addSchema(templateSchemaClean, 'template.schema.json');

const validatePrompt = ajv.compile(promptSchemaClean);
const validateTemplate = ajv.compile(templateSchemaClean);
const validatePack = ajv.compile(packSchemaClean);

let totalTests = 0;
let passed = 0;
let failed = 0;

console.log('Running conformance tests...\n');

async function testValid(pattern, validator, label) {
  console.log(`\n${label} (valid - should pass):`);
  const files = await glob(pattern, { cwd: rootDir });

  for (const file of files) {
    const path = join(rootDir, file);
    totalTests++;

    try {
      const data = parseJsonFile(path);

      if (validator(data)) {
        console.log(`  OK ${file.split('/').pop()}`);
        passed++;
      } else {
        console.error(`  FAIL ${file.split('/').pop()} - FAILED (should be valid)`);
        console.error('    Errors:', validator.errors);
        failed++;
      }
    } catch (error) {
      console.error(`  FAIL ${file.split('/').pop()} - ERROR: ${error.message}`);
      failed++;
    }
  }
}

async function testInvalid(pattern, validator, label) {
  console.log(`\n${label} (invalid - should fail):`);
  const files = await glob(pattern, { cwd: rootDir });

  for (const file of files) {
    const path = join(rootDir, file);
    totalTests++;

    try {
      const data = parseJsonFile(path);

      if (!validator(data)) {
        console.log(`  OK ${file.split('/').pop()} - correctly rejected`);
        passed++;
      } else {
        console.error(`  FAIL ${file.split('/').pop()} - UNEXPECTED PASS (should be invalid)`);
        failed++;
      }
    } catch (error) {
      // JSON parse error is acceptable for invalid tests
      console.log(`  OK ${file.split('/').pop()} - correctly rejected (parse error)`);
      passed++;
    }
  }
}

// Run tests
await testValid('conformance/valid/prompts/*.json', validatePrompt, 'Prompts');
await testValid('conformance/valid/templates/*.json', validateTemplate, 'Templates');
await testValid('conformance/valid/packs/*.json', validatePack, 'Packs');

await testInvalid('conformance/invalid/prompts/*.json', validatePrompt, 'Prompts');
await testInvalid('conformance/invalid/templates/*.json', validateTemplate, 'Templates');
await testInvalid('conformance/invalid/packs/*.json', validatePack, 'Packs');

console.log(`\n${'='.repeat(50)}`);
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.error(`\nERROR ${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log(`\nOK All conformance tests passed`);
}
