# Weather Station Firmware

## Hardware

| Component | Model | Interface |
|-----------|-------|-----------|
| MCU | Heltec WiFi LoRa 32 V2 (ESP32) | — |
| Env. sensor | BME280 | I²C (SDA=4, SCL=15) |
| Light sensor | TSL2591 | I²C (shared bus) |
| LoRa | SX1276 (on-board) | SPI (internal) |
| Display | SSD1306 OLED 0.96" (on-board) | I²C (internal) |

## Arduino Libraries Required

Install via the Arduino Library Manager or `arduino-cli lib install`:

```
Heltec ESP32 Dev-Boards   >= 1.1.0
MCCI LoRaWAN LMIC library >= 4.1.1
Adafruit BME280 Library   >= 2.2.2
Adafruit TSL2591 Library  >= 1.4.3
Adafruit Unified Sensor   >= 1.1.9
```

Board package: **Heltec ESP32** (add `https://resource.heltec.cn/download/package_heltec_esp32_index.json`
to Additional Boards Manager URLs in Arduino IDE preferences).

## Configuration

Before flashing, edit `weather_station.ino` and update:

1. **APPEUI / DEVEUI / APPKEY** – copy from your TTN application device credentials (OTAA).
2. **SITE_ID** – set to `1` (Mougins), `2` (Grasse), or `3` (Nice).

## Payload Format

12-byte uplink on LoRaWAN port 1:

| Bytes | Field | Type | Scale | Example |
|-------|-------|------|-------|---------|
| 0–1 | temperature | int16 | °C × 100 | 2150 → 21.50 °C |
| 2–3 | humidity | uint16 | % × 100 | 6520 → 65.20 % |
| 4–5 | pressure | uint16 | hPa × 10 | 10132 → 1013.2 hPa |
| 6–7 | lux | uint16 | lux | 5000 |
| 8 | battery | uint8 | % (0–100) | 87 |
| 9 | site_id | uint8 | 1/2/3 | 1=Mougins |
| 10 | flags | uint8 | bitmask | bit0=cam, bit1=bme, bit2=tsl |
| 11 | reserved | uint8 | — | 0 |

## Transmission Schedule

- Sensor data: every **5 minutes** (configurable via `TX_INTERVAL_S`)
- Sky image capture: every **30 minutes** (configurable via `CAMERA_INTERVAL_S`)
