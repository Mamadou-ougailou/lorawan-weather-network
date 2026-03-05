# WireGuard VPN – Weather Network

## Topology

```
Internet
    │
    ▼
┌─────────────────────────────┐
│  University VPN Gateway     │  (public IP)
│  wg0: 10.200.0.1/24        │
└─────────────┬───────────────┘
              │  WireGuard tunnel
    ┌─────────┴──────────┐
    │  Raspberry Pi       │
    │  wg0: 10.200.0.2   │
    │  (data center)      │
    └────────────────────┘
```

The Raspberry Pi data center sits behind the university VPN.
All MQTT and HTTP traffic between the university infrastructure and the
Raspberry Pi flows through the encrypted WireGuard tunnel.

## Server side (university gateway)

```bash
# Install WireGuard
apt install wireguard

# Generate key pair
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key

# Create /etc/wireguard/wg0.conf  (see wg0-server.conf)
systemctl enable --now wg-quick@wg0
```

## Client side (Raspberry Pi)

```bash
apt install wireguard

wg genkey | tee /etc/wireguard/client_private.key | wg pubkey > /etc/wireguard/client_public.key

# Copy wg0-client.conf to /etc/wireguard/wg0.conf
# Fill in the private key and server's public key
systemctl enable --now wg-quick@wg0
```

## Firewall rules (server)

Allow WireGuard UDP port and forward MQTT / API traffic to the Pi:

```bash
ufw allow 51820/udp
# MQTT from TTN forwarder → Pi
ufw allow in on wg0 to 10.200.0.2 port 1883 proto tcp
# API server (internal)
ufw allow in on wg0 to 10.200.0.2 port 5000 proto tcp
```
