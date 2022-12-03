#! /bin/bash -ex
#
# Initializes a locally-running PostgreSQL database for development.

# Assumes that the cluster's pg_hba.conf has been configured with "local all all trust" or a similarly open
# configuration to let the current user connect as any DB role.

sudo pg_ctlcluster 14 main start
psql -d postgres://postgres@/postgres <<EOF
CREATE ROLE cookbook_admin LOGIN CREATEDB;
CREATE DATABASE cookbook OWNER cookbook_admin;
\q
EOF
