#! /bin/bash -x

. .env

flyctl postgres create --name vlach-cookbook-db --region sea --initial-cluster-size 2 --vm-size shared-cpu-1x --volume-size 1
flyctl postgres connect <<EOF
CREATE ROLE cookbook_admin LOGIN PASSWORD '$COOKBOOK_ADMIN_PASSWORD';
CREATE DATABASE cookbook OWNER cookbook_admin;
CREATE DATABASE cookbook_shadow OWNER cookbook_admin;
quit;
EOF
