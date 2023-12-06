import { execSync } from 'node:child_process';

if (process.env.FLY_APP_NAME === 'vlach-cookbook-staging') {
  // Copy the prod database over the staging one before running the Prisma
  // migration, to make sure the migration will work when the app is released.
  const PROD_DATABASE_URL = process.env.PROD_WEBSERVER_DATABASE_URL
  const STAGING_DATABASE_URL = process.env.ADMIN_DATABASE_URL

  const dump = execSync(`pg_dump --clean --if-exists -O -d "${PROD_DATABASE_URL}"`, { encoding: 'utf-8' });

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
