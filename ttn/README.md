# TTN Application Configuration

## Application Overview

| Setting | Value |
|---------|-------|
| Application ID | `weather-network-unice` |
| LoRaWAN version | 1.0.3 |
| Regional parameters | RP001 Regional Parameters 1.0.3 Rev A |
| Frequency plan | EU_863_870_TTN (EU868) |

## Devices

Register one device per site using OTAA activation:

| Device EUI | Site | Location |
|------------|------|----------|
| (from device) | Mougins | Collège de Mougins |
| (from device) | Grasse | Lycée de Grasse |
| (from device) | Nice | IUT Nice Côte d'Azur |

## Payload Formatter

Upload `payload_formatter.js` as the **Uplink** formatter (JavaScript formatter type).

## MQTT Integration

TTN automatically exposes an MQTT broker. Messages are published to:

```
v3/<app-id>@<tenant-id>/devices/<device-id>/up
```

### Connection details

| Setting | Value |
|---------|-------|
| Host | `eu1.cloud.thethings.network` |
| Port | 8883 (TLS) |
| Username | `<app-id>@ttn` |
| Password | TTN API key (generate in TTN console → API keys) |

## Webhook to University MQTT

Configure a TTN Webhook to forward decoded payloads to the university MQTT bridge:

- **Webhook ID**: `univ-mqtt-bridge`
- **Base URL**: `http://<vpn-gateway-ip>:8080/ttn-webhook`
- **Format**: JSON
- **Enabled messages**: Uplink messages

Alternatively, use the TTN MQTT broker directly and subscribe in the
Raspberry Pi data center (see `../datacenter/`).
