import type { FullConfig } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

async function globalSetup(_config: FullConfig) {
  if (process.env.CI) {
    // The CI has already reset the database by the time we get here.
    return;
  }
  // Reset the database so that tests work even if we're re-using a webserver instance.
  const { stdout, stderr } = await execFileP('pnpm',
    ['prisma', 'db', 'push', '--skip-generate', '--force-reset']);
  if (stderr) console.error(stderr);
  if (stdout) console.log(stdout);
}

export default globalSetup;
