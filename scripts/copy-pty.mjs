/**
 * Copies prebuilt node-pty binaries into the plugin dist directory.
 * Run after `npm run build` before packaging the plugin zip.
 *
 * Usage: node scripts/copy-pty.mjs [destDir]
 * Default destDir: ./dist
 */

import { cpSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');
const dest = resolve(root, process.argv[2] ?? 'dist');

const ptyModuleDir    = resolve(root, 'node_modules', '@lydell', 'node-pty');
const ptyWin32Dir     = resolve(root, 'node_modules', '@lydell', 'node-pty-win32-x64');

mkdirSync(resolve(dest, 'node_modules', '@lydell', 'node-pty'), { recursive: true });
mkdirSync(resolve(dest, 'node_modules', '@lydell', 'node-pty-win32-x64'), { recursive: true });

cpSync(ptyModuleDir, resolve(dest, 'node_modules', '@lydell', 'node-pty'), { recursive: true });
cpSync(ptyWin32Dir,  resolve(dest, 'node_modules', '@lydell', 'node-pty-win32-x64'), { recursive: true });

console.log(`@lydell/node-pty copied to ${dest}/node_modules/@lydell`);
