import assert from "node:assert";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { replaceDbWithBackupContents } from "./replaceDbWithBackup.mjs";

assert.equal(process.env.FLY_APP_NAME, "vlach-cookbook");

// Turn on swap to avoid out-of-memory errors during `prisma migrate deploy`
console.log(execSync("fallocate -l 256M /swapfile", { encoding: "utf-8" }));
console.log(execSync("chmod 0600 /swapfile", { encoding: "utf-8" }));
console.log(execSync("mkswap /swapfile", { encoding: "utf-8" }));
console.log(
  execSync("echo 10 > /proc/sys/vm/swappiness", { encoding: "utf-8" })
);
console.log(execSync("swapon /swapfile", { encoding: "utf-8" }));

// Expect the admin to have manually downloaded and decrypted a backup.
const dump = readFileSync(process.env.BACKUP_FILE, { encoding: "utf8" });

// Replace the production database with the loaded backup.
replaceDbWithBackupContents({
  DATABASE_URL: process.env.ADMIN_DATABASE_URL,
  dbName: "cookbook_prod",
  dump,
  webserverRole: "cookbook_prod_webserver",
});

// Run the Prisma migration, in case the backup is older than the latest release.
process.env.DATABASE_URL = process.env.ADMIN_DATABASE_URL;
console.log(execSync("prisma migrate deploy", { encoding: "utf-8" }));
console.log(
  execSync(
    "node prisma/migrations/20240916002444_cooking_history/migrate-history-categories.mjs"
  ),
  { encoding: "utf-8" }
);
