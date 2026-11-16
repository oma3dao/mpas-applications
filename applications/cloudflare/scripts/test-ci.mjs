// Application-owned offline CI hook, discovered by the shared bridge matrix.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
for (const test of ['test-policy.mjs', 'test-transport.mjs', 'test-responses.mjs']) {
  execFileSync(process.execPath, [fileURLToPath(new URL(test, import.meta.url))], {cwd: root, stdio: 'inherit'});
}
execFileSync(process.execPath, ['scripts/probe-bridge-protocols.mjs', 'applications/cloudflare', 'applications/cloudflare/tool-selection.json'], {cwd: root, stdio: 'inherit'});
