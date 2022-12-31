#! /bin/bash

# Use `fly proxy 5432 &` to let the below commands connect to the database.

# We expect .env to set $COOKBOOK_PROD_WEBSERVER_PASSWORD and $COOKBOOK_STAGING_ADMIN_PASSWORD.
. .env

PROD_DATABASE_URL="postgres://cookbook_prod_webserver:${COOKBOOK_PROD_WEBSERVER_PASSWORD}@localhost:5432/cookbook_prod?sslmode=disable"
STAGING_DATABASE_URL="postgres://cookbook_staging_admin:${COOKBOOK_STAGING_ADMIN_PASSWORD}@localhost:5432/cookbook_staging?sslmode=disable"

pg_dump --clean --if-exists -O -d "$PROD_DATABASE_URL" | \
  sed 's/cookbook_prod/cookbook_staging/g' | \
  pg_restore -d "$STAGING_DATABASE_URL" --single-transaction
