terraform {
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "0.0.20"
    }
  }

  cloud {
    organization = "jyasskin"

    workspaces {
      name = "cookbook"
    }
  }
}

provider "fly" {
  useinternaltunnel    = true
  internaltunnelorg    = "personal"
  internaltunnelregion = "sea"
}

resource "fly_app" "cookbook_staging" {
  name = "vlach-cookbook-staging"
  org  = "personal"
}

// Don't touch the shared ipv4 address until
// https://github.com/fly-apps/terraform-provider-fly/issues/141 is fixed.

resource "fly_ip" "ipv6" {
  app  = fly_app.cookbook_staging.name
  type = "v6"
}

variable "staging_image_label" {
  type        = string
  description = "The `flyctl deploy --image-label` argument."
}

resource "fly_machine" "cookbook_staging_server" {
  app      = fly_app.cookbook_staging.name
  region   = "sea"
  cputype  = "shared"
  cpus     = 1
  memorymb = 256
  image    = "registry.fly.io/vlach-cookbook-staging:${var.staging_image_label}"
  env = {
    PORT             = 8080
    HOST             = "::"
    MAX_IDLE_SECONDS = 10 * 60
  }
  services = [
    {
      ports = [
        {
          port     = 443
          handlers = ["tls", "http"]
        }
      ]
      "protocol" : "tcp",
      "internal_port" : 8080
    }
  ]
}
