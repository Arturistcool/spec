import { readFileSync } from 'fs';

export function parseJsonFile(path) {
  const buf = readFileSync(path);

  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    throw new Error('Encoding error: UTF-8 BOM not allowed; re-save as UTF-8 (no BOM).');
  }

  if (buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xfe && buf[3] === 0xff) {
    throw new Error('Encoding error: UTF-32 BE is not allowed; re-save as UTF-8 (no BOM).');
  }

  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xfe && buf[2] === 0x00 && buf[3] === 0x00) {
    throw new Error('Encoding error: UTF-32 LE is not allowed; re-save as UTF-8 (no BOM).');
  }

  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    throw new Error('Encoding error: UTF-16 BE is not allowed; re-save as UTF-8 (no BOM).');
  }

  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    throw new Error('Encoding error: UTF-16 LE is not allowed; re-save as UTF-8 (no BOM).');
  }

  return JSON.parse(buf.toString('utf8'));
}
