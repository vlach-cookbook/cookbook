import { execSync } from 'node:child_process';
import { replaceDbWithBackup } from './replaceDbWithBackup.mjs';

// Turn on swap to avoid out-of-memory errors during `prisma migrate deploy`
console.log(execSync('fallocate -l 256M /swapfile', {encoding: 'utf-8'}));
console.log(execSync('chmod 0600 /swapfile', {encoding: 'utf-8'}));
console.log(execSync('mkswap /swapfile', {encoding: 'utf-8'}));
console.log(execSync('echo 10 > /proc/sys/vm/swappiness', {encoding: 'utf-8'}));
console.log(execSync('swapon /swapfile', {encoding: 'utf-8'}));

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
console.log(execSync('node prisma/migrations/20240916002444_cooking_history/migrate-history-categories.mjs'), {encoding: 'utf-8'});
