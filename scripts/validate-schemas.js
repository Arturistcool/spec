#!/usr/bin/env node
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseJsonFile } from './lib/parseJsonFile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(__dirname, '..', 'schemas', 'v1');

const ajv = new Ajv({
  strict: true,
  validateFormats: true,
});
addFormats(ajv);

let errors = 0;

console.log('Validating JSON Schemas...\n');

const schemaFiles = readdirSync(schemasDir).filter((f) => f.endsWith('.json'));

// First pass: Load all schemas into AJV so cross-references work
for (const file of schemaFiles) {
  const path = join(schemasDir, file);
  try {
    const schema = parseJsonFile(path);
    const { $schema, ...schemaWithoutMeta } = schema;

    // Add schema with filename as key for relative $ref resolution
    ajv.addSchema(schemaWithoutMeta, file);
  } catch (error) {
    console.error(`FAIL ${file} (load error)`);
    console.error(`  Error: ${error.message}\n`);
    errors++;
  }
}

// Second pass: Compile each schema to validate it
for (const file of schemaFiles) {
  try {
    // Retrieve and compile the schema we added in first pass
    const validator = ajv.getSchema(file);
    if (!validator) {
      throw new Error('Schema not found in registry');
    }
    console.log(`OK ${file}`);
  } catch (error) {
    console.error(`FAIL ${file}`);
    console.error(`  Error: ${error.message}\n`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\nERROR ${errors} schema(s) failed validation`);
  process.exit(1);
} else {
  console.log(`\nOK All schemas are valid`);
}
