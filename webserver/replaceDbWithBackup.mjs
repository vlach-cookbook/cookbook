import { Storage } from "@google-cloud/storage";
import * as age from "age-encryption";
import { execSync } from "node:child_process";
import zlib from "node:zlib";

/**
 * Fetches the newest backup of the production database from gs://vlach-cookbook-backup, and
 * replaces the database at {@link DATABASE_URL} with it.
 *
 * @param {Object} options
 * @param {string} options.DATABASE_URL A postgres:// URL with credentials.
 * @param {string} options.dbName The name of the database to write into. This should match the end
 * of DATABASE_URL.
 * @param {string} options.GOOGLE_CREDENTIALS The JSON-serialized contents of the file expected by
 * https://cloud.google.com/docs/authentication/application-default-credentials#GAC. Usually a
 * service account key.
 * @param {string} options.AGE_IDENTITY The https://age-encryption.org/ identity file to decrypt the
 * backup.
 */
export async function replaceStagingDbWithBackup({
  DATABASE_URL,
  dbName,
  GOOGLE_CREDENTIALS,
  AGE_IDENTITY,
}) {
  const dump = await fetchLatestBackup({ GOOGLE_CREDENTIALS, AGE_IDENTITY });
  replaceDbWithBackupContents({
    dump,
    dbName,
    DATABASE_URL,
    webserverRole: "cookbook_staging_webserver",
  });
}

/**
 * Fetches, decrypts, and returns the newest backup of the production database from
 * gs://vlach-cookbook-backup.
 *
 * @param {Object} options
 * @param {string} options.GOOGLE_CREDENTIALS The JSON-serialized contents of the file expected by
 * https://cloud.google.com/docs/authentication/application-default-credentials#GAC. Usually a
 * service account key.
 * @param {string} options.AGE_IDENTITY The https://age-encryption.org/ identity file to decrypt the
 * backup.
 *
 * @returns {Promise<string>}
 */
async function fetchLatestBackup({ GOOGLE_CREDENTIALS, AGE_IDENTITY }) {
  const storage = new Storage({
    projectId: "vlach-cookbook",
    credentials: JSON.parse(GOOGLE_CREDENTIALS),
  });

  const bucket = storage.bucket("vlach-cookbook-backup");
  // Look for backups starting a month ago.
  let earliestBackupTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentBackups] = await bucket.getFiles({
    startOffset: `backup-${earliestBackupTime.toISOString()}`,
  });
  if (recentBackups.length === 0) {
    throw new Error(`Couldn't find a backup since ${earliestBackupTime}.`);
  }
  const [contents] = await recentBackups[recentBackups.length - 1].download();

  const d = new age.Decrypter();
  d.addIdentity(AGE_IDENTITY);
  const decrypted = await d.decrypt(contents);

  const dump = zlib.brotliDecompressSync(decrypted).toString("utf-8");
  return dump;
}

/**
 * Replaces the database at {@link DATABASE_URL} with the SQL {@link dump}.
 *
 * @param {Object} options
 * @param {string} options.dump Decrypted contents of a backup.
 * @param {string} options.DATABASE_URL A postgres:// URL with credentials.
 * @param {string} options.dbName The name of the database to write into. This should match the end
 * of DATABASE_URL.
 * @param {string} options.webserverRole The database role name that the webserver uses.
 */
export function replaceDbWithBackupContents({
  dump,
  dbName,
  DATABASE_URL,
  webserverRole,
}) {
  // Clear the whole database without actually deleting it. Otherwise, when we
  // add new tables that aren't in Prod yet, the *second* deployment to Staging
  // will fail because the above `pg_dump` won't know to remove those tables.
  const restore = `DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT USAGE ON SCHEMA public TO ${webserverRole};
  ${dump.replaceAll(/cookbook_prod/g, dbName)}`;

  try {
    console.log(
      execSync(`psql -d "${DATABASE_URL}"`, {
        input: restore,
        encoding: "utf-8",
      })
    );
  } catch (e) {
    console.error(`Restoring failed with\n>>>>>\n${restore}\n<<<<<`);
    throw e;
  }
}
