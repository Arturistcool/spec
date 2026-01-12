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

let errors = 0;

console.log('Validating examples...\n');

async function validateFiles(pattern, validator, label) {
  const files = await glob(pattern, { cwd: rootDir });

  for (const file of files) {
    const path = join(rootDir, file);
    try {
      const data = parseJsonFile(path);

      if (validator(data)) {
        console.log(`OK ${file}`);
      } else {
        console.error(`FAIL ${file}`);
        console.error('  Errors:', validator.errors);
        errors++;
      }
    } catch (error) {
      console.error(`FAIL ${file}`);
      console.error(`  Error: ${error.message}`);
      errors++;
    }
  }
}

await validateFiles('examples/prompts/*.json', validatePrompt, 'Prompts');
await validateFiles('examples/templates/*.json', validateTemplate, 'Templates');
await validateFiles('examples/packs/*.json', validatePack, 'Packs');

if (errors > 0) {
  console.error(`\nERROR ${errors} example(s) failed validation`);
  process.exit(1);
} else {
  console.log(`\nOK All examples are valid`);
}
