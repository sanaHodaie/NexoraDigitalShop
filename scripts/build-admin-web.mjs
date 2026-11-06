// Node orchestration works on Windows and Vercel; no Docker and no global Expo CLI.
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const app = fileURLToPath(new URL('../apps/admin-mobile/', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(args, cwd, env = process.env) {
  const result = spawnSync(npm, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(['ci', '--no-audit', '--no-fund'], app);
run(['run', 'export:web'], app, { ...process.env, APP_VARIANT: 'production', APP_WEB_BASE_PATH: '/business',
  EXPO_PUBLIC_API_URL: '', EXPO_PUBLIC_WEB_SAME_ORIGIN: '1', EXPO_OFFLINE: '1' });
await mkdir(root + 'dist/business', { recursive: true });
await cp(app + 'dist', root + 'dist/business', { recursive: true });
const html = await readFile(root + 'dist/business/index.html', 'utf8');
await writeFile(root + 'dist/business/index.html', html.replace('<html lang="en">', '<html lang="fa">')
  .replace('<head>', '<head><meta name="robots" content="noindex,nofollow"/>'));
console.log('Admin app exported to /business; API uses the same-origin /api proxy.');
