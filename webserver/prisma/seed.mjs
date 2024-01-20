import { replaceDbWithBackup } from '../replaceDbWithBackup.mjs';

// Load the production database into the local database.

const DATABASE_URL = new URL(process.env.DATABASE_URL);
// Remove a parameter that psql doesn't understand.
DATABASE_URL.searchParams.delete('statement_cache_size');

await replaceDbWithBackup({
    DATABASE_URL: DATABASE_URL.href,
    dbName: "cookbook",
    GOOGLE_CREDENTIALS: process.env.COOKBOOK_GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
    AGE_IDENTITY: process.env.COOKBOOK_BACKUP_AGE_IDENTITY,
  });
