import { execSync } from 'node:child_process';

if (process.env.FLY_APP_NAME === 'vlach-cookbook-staging') {
  // Copy the prod database over the staging one before running the Prisma
  // migration, to make sure the migration will work when the app is released.
  const PROD_DATABASE_URL = process.env.PROD_WEBSERVER_DATABASE_URL
  const STAGING_DATABASE_URL = process.env.ADMIN_DATABASE_URL

  console.log(execSync(`pg_dump --clean --if-exists -O -d "${PROD_DATABASE_URL}" | \
    sed 's/cookbook_prod/cookbook_staging/g' | \
    psql -d "${STAGING_DATABASE_URL}"`));
}

process.env.DATABASE_URL = process.env.ADMIN_DATABASE_URL;
console.log(execSync('prisma migrate deploy'));
