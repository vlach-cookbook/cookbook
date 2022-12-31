#! /bin/bash -x

. .env

flyctl postgres create --name vlach-cookbook-db --region sea --initial-cluster-size 2 --vm-size shared-cpu-1x --volume-size 1
terraform apply
