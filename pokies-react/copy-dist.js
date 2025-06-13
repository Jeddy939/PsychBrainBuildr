import { cp } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = resolve(__dirname, 'dist');
const dest = resolve(__dirname, '..', 'Universal Psychology', 'pokies-react');

cp(source, dest, { recursive: true })
  .catch(err => {
    console.error('Copy failed:', err);
    process.exit(1);
  });
