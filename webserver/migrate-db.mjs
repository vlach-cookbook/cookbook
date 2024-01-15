import { Storage } from '@google-cloud/storage';
import age from "age-encryption";
import { execSync } from 'node:child_process';
import zlib from 'node:zlib';

if (process.env.FLY_APP_NAME === 'vlach-cookbook-staging') {
  // Copy the latest backup over the staging database before running the Prisma
  // migration, to make sure the migration will work when the app is released.
  const STAGING_DATABASE_URL = process.env.ADMIN_DATABASE_URL

  const storage = new Storage({
    projectId: 'vlach-cookbook',
    credentials: JSON.parse(process.env.MIGRATION_GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
  });

  const bucket = storage.bucket('vlach-cookbook-backup');
  // Look for backups starting a month ago.
  let earliestBackupTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentBackups] = await bucket.getFiles({ startOffset: `backup-${earliestBackupTime.toISOString()}` });
  if (recentBackups.length === 0) {
    throw new Error(`Couldn't find a backup since ${earliestBackupTime}.`);
  }
  const [contents] = await recentBackups[recentBackups.length - 1].download();

  const { Decrypter } = await age();
  const d = new Decrypter();
  d.addIdentity(process.env.MIGRATION_AGE_BACKUP_IDENTITY);
  const decrypted = d.decrypt(contents);

  const dump = zlib.brotliDecompressSync(decrypted).toString('utf-8');

  // Clear the whole database without actually deleting it. Otherwise, when we
  // add new tables that aren't in Prod yet, the *second* deployment to Staging
  // will fail because the above `pg_dump` won't know to remove those tables.
  const restore = `DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT USAGE ON SCHEMA public TO cookbook_staging_webserver;
  ${dump.replaceAll(/cookbook_prod/g, "cookbook_staging")}`;

  try {
    console.log(execSync(`psql -d "${STAGING_DATABASE_URL}"`, { input: restore, encoding: 'utf-8' }));
  } catch (e) {
    console.error(`Restoring failed with\n>>>>>\n${restore}\n<<<<<`);
    throw e;
  }
}

process.env.DATABASE_URL = process.env.ADMIN_DATABASE_URL;
console.log(execSync('prisma migrate deploy', { encoding: 'utf-8' }));
