terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      version = ">=2.0.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "peer_turn" {
  image  = "ubuntu-22-04-x64"
  name   = "cinesync-peer-turn"
  region = var.region
  size   = var.size

  ssh_keys = var.ssh_fingerprints

  user_data = file("${path.module}/user_data.sh")
  tags = ["cinesync", "peer-turn"]
}

output "droplet_ip" {
  value = digitalocean_droplet.peer_turn.ipv4_address
}
