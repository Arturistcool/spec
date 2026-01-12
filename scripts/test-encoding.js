#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { parseJsonFile } from './lib/parseJsonFile.js';

function assertThrows(fn, contains) {
  try {
    fn();
  } catch (e) {
    const message = e?.message ?? String(e);
    if (!message.includes(contains)) {
      throw new Error(
        `Expected error containing ${JSON.stringify(contains)} but got ${JSON.stringify(message)}`
      );
    }
    return;
  }
  throw new Error('Expected function to throw.');
}

console.log('Running encoding tests...\n');

const dir = mkdtempSync(join(os.tmpdir(), 'promptg-spec-encoding-'));

try {
  const bomUtf8JsonPath = join(dir, 'utf8-bom.json');
  writeFileSync(bomUtf8JsonPath, Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]));

  assertThrows(() => parseJsonFile(bomUtf8JsonPath), 'UTF-8 BOM not allowed');

  console.log('OK utf8-bom rejection');

  const utf8NoBomJsonPath = join(dir, 'utf8-no-bom.json');
  writeFileSync(utf8NoBomJsonPath, Buffer.from([0x7b, 0x7d]));
  parseJsonFile(utf8NoBomJsonPath);

  console.log('OK utf8-no-bom acceptance');
  console.log('\nOK All encoding tests passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
