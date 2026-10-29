import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(projectRoot, 'dist');
const legalFiles = ['LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'];

for (const file of legalFiles) {
  await copyFile(resolve(projectRoot, file), resolve(outputDirectory, file));
}
