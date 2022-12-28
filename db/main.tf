terraform {
  required_providers {
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "1.18.0"
    }
  }
}

variable "pg_host" {
  type    = string
  default = "localhost"
}
variable "pg_port" {
  type    = number
  default = 5432
}
variable "pg_username" {
  type    = string
  default = "postgres"
}
variable "pg_password" {
  type      = string
  sensitive = true
}
variable "pg_database" {
  type    = string
  default = "postgres"
}

variable "pg_cookbook_prod_admin_password" {
  type      = string
  sensitive = true
}
variable "pg_cookbook_prod_webserver_password" {
  type      = string
  sensitive = true
}
variable "pg_cookbook_staging_admin_password" {
  type      = string
  sensitive = true
}
variable "pg_cookbook_staging_webserver_password" {
  type      = string
  sensitive = true
}

provider "postgresql" {
  host             = var.pg_host
  port             = var.pg_port
  database         = var.pg_database
  username         = var.pg_username
  password         = var.pg_password
  sslmode          = "disable"
  connect_timeout  = 15
  expected_version = 14
}

resource "postgresql_role" "cookbook_prod_admin" {
  name     = "cookbook_prod_admin"
  login    = true
  password = var.pg_cookbook_prod_admin_password
}
resource "postgresql_role" "cookbook_prod_webserver" {
  name     = "cookbook_prod_webserver"
  login    = true
  password = var.pg_cookbook_prod_webserver_password
}

resource "postgresql_database" "cookbook_prod" {
  name       = "cookbook_prod"
  owner      = "cookbook_prod_admin"
  template   = "template0"
  encoding   = "UTF8"
  lc_collate = "en_US.utf8"
  lc_ctype   = "en_US.utf8"
}

resource "postgresql_role" "cookbook_staging_admin" {
  name     = "cookbook_staging_admin"
  login    = true
  password = var.pg_cookbook_staging_admin_password
}
resource "postgresql_role" "cookbook_staging_webserver" {
  name     = "cookbook_staging_webserver"
  login    = true
  password = var.pg_cookbook_staging_webserver_password
}

resource "postgresql_database" "cookbook_staging" {
  name       = "cookbook_staging"
  owner      = "cookbook_staging_admin"
  template   = "template0"
  encoding   = "UTF8"
  lc_collate = "en_US.utf8"
  lc_ctype   = "en_US.utf8"
}

// Grant privileges to the webserver. The server needs to read and update tables and "use"
// sequences, both for existing tables and new ones.
locals {
  privileges = [{
    object_type = "table"
    privileges  = ["SELECT", "INSERT", "UPDATE", "DELETE"]
    }, {
    object_type = "sequence"
    privileges  = ["USAGE"]
  }]

  environments = ["staging", "prod"]

  environment_privileges = { for pair in setproduct(local.environments, local.privileges) :
    "${pair[0]}.${pair[1].object_type}" => { environment : pair[0], privilege : pair[1] }
  }
}

resource "postgresql_default_privileges" "cookbook_webserver" {
  for_each = local.environment_privileges

  database    = "cookbook_${each.value.environment}"
  role        = "cookbook_${each.value.environment}_webserver"
  schema      = "public"
  owner       = "cookbook_${each.value.environment}_admin"
  object_type = each.value.privilege.object_type
  privileges  = each.value.privilege.privileges
}
resource "postgresql_grant" "cookbook_webserver" {
  for_each = local.environment_privileges

  database    = "cookbook_${each.value.environment}"
  role        = "cookbook_${each.value.environment}_webserver"
  schema      = "public"
  object_type = each.value.privilege.object_type
  objects     = [] # All objects of this type.
  privileges  = each.value.privilege.privileges
}
