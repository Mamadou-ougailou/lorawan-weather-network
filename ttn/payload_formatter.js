/**
 * TTN Payload Formatter – Uplink Decoder
 *
 * Paste this JavaScript function into:
 *   TTN Console → Applications → <your-app> → Payload Formatters → Uplink
 *
 * Decodes the 12-byte weather station payload into a structured JSON object
 * that is then forwarded to MQTT and webhooks.
 */
function decodeUplink(input) {
  var bytes = input.bytes;

  if (bytes.length < 12) {
    return {
      errors: ["Payload too short: expected 12 bytes, got " + bytes.length]
    };
  }

  // Temperature: int16, big-endian, °C × 100
  var tempRaw = (bytes[0] << 8) | bytes[1];
  if (tempRaw & 0x8000) tempRaw -= 0x10000;   // sign-extend
  var temperature = tempRaw / 100.0;

  // Humidity: uint16, big-endian, % × 100
  var humRaw = (bytes[2] << 8) | bytes[3];
  var humidity = humRaw / 100.0;

  // Pressure: uint16, big-endian, hPa × 10
  var presRaw = (bytes[4] << 8) | bytes[5];
  var pressure = presRaw / 10.0;

  // Lux: uint16, big-endian
  var lux = (bytes[6] << 8) | bytes[7];

  // Battery percentage
  var battery = bytes[8];

  // Site identifier
  var siteId = bytes[9];
  var siteNames = { 1: "Mougins", 2: "Grasse", 3: "Nice" };
  var siteName = siteNames[siteId] || ("Unknown(" + siteId + ")");

  // Flags bitmask
  var flags = bytes[10];
  var cameraOk = !!(flags & 0x01);
  var bmeOk    = !!(flags & 0x02);
  var tslOk    = !!(flags & 0x04);

  return {
    data: {
      temperature: temperature,
      humidity:    humidity,
      pressure:    pressure,
      lux:         lux,
      battery:     battery,
      site_id:     siteId,
      site_name:   siteName,
      sensors: {
        bme280:  bmeOk,
        tsl2591: tslOk,
        camera:  cameraOk
      }
    },
    warnings: [
      ...(humidity < 0 || humidity > 100 ? ["Humidity out of range"] : []),
      ...(temperature < -40 || temperature > 85 ? ["Temperature out of range"] : []),
      ...(pressure < 870 || pressure > 1085 ? ["Pressure out of range"] : [])
    ]
  };
}

/**
 * TTN Payload Formatter – Downlink Encoder
 *
 * Encodes a configuration command sent down to the device.
 * Supported commands:
 *   { "reboot": true }
 *   { "tx_interval": <seconds> }
 */
function encodeDownlink(input) {
  if (input.data.reboot === true) {
    return { bytes: [0x01], fPort: 2 };
  }
  if (typeof input.data.tx_interval === "number") {
    var interval = Math.min(Math.max(input.data.tx_interval, 60), 86400);
    return {
      bytes: [0x02, (interval >> 8) & 0xFF, interval & 0xFF],
      fPort: 2
    };
  }
  return { errors: ["Unknown command"] };
}
