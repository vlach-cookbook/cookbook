import type { FullConfig } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prisma } from '../src/lib/prisma.js';

const execFileP = promisify(execFile);

async function globalSetup(config: FullConfig) {
  // Reset the database so that tests work even if we're re-using a webserver instance.
  const { stdout, stderr } = await execFileP('pnpm',
    ['prisma', 'db', 'push', '--skip-generate', '--force-reset']);
  if (stderr) console.error(stderr);
  if (stdout) console.log(stdout);

  const sessionId = `Login for Test`
  await prisma.session.create({
    data: {
      id: sessionId,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      user: {
        create: {
          name: "Test User's Name",
          username: `testuser`,
        }
      }
    }
  });
}

export default globalSetup;
