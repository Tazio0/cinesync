variable "do_token" {
  type        = string
  description = "DigitalOcean API token (set via environment or tfvars)"
}

variable "region" {
  type    = string
  default = "nyc3"
}

variable "size" {
  type    = string
  default = "s-1vcpu-1gb"
}

variable "ssh_fingerprints" {
  type    = list(string)
  default = []
}
