import { execSync } from 'node:child_process';
import { replaceDbWithBackup } from './replaceDbWithBackup.mjs';

if (process.env.FLY_APP_NAME === 'vlach-cookbook-staging') {
  // Copy the latest backup over the staging database before running the Prisma
  // migration, to make sure the migration will work when the app is released.
  await replaceDbWithBackup({
    DATABASE_URL: process.env.ADMIN_DATABASE_URL,
    dbName: "cookbook_staging",
    GOOGLE_CREDENTIALS: process.env.MIGRATION_GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
    AGE_IDENTITY: process.env.MIGRATION_AGE_BACKUP_IDENTITY,
  });
}

process.env.DATABASE_URL = process.env.ADMIN_DATABASE_URL;
console.log(execSync('prisma migrate deploy', { encoding: 'utf-8' }));
