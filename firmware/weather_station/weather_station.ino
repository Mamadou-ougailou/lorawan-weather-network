/**
 * LoRaWAN Weather Station Firmware
 * Hardware: Heltec WiFi LoRa 32 (ESP32-based)
 *
 * Sensors:
 *   - BME280: temperature, humidity, atmospheric pressure
 *   - TSL2591: ambient light (lux)
 *   - Camera (OV2640 via ESP32-CAM or dedicated module): sky image capture
 *
 * Network: The Things Network (TTN) via LoRaWAN OTAA
 *
 * Payload format (12 bytes):
 *   [0-1]  temperature   int16  (°C × 100)
 *   [2-3]  humidity      uint16 (% × 100)
 *   [4-5]  pressure      uint16 (hPa × 10)
 *   [6-7]  lux           uint16 (lux, max 65535)
 *   [8]    battery       uint8  (% 0-100)
 *   [9]    site_id       uint8  (1=Mougins, 2=Grasse, 3=Nice)
 *   [10]   flags         uint8  (bit0=camera_ok, bit1=bme_ok, bit2=tsl_ok)
 *   [11]   reserved      uint8
 */

#include <Arduino.h>
#include <heltec.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <Adafruit_TSL2591.h>

// ─── TTN / LoRaWAN credentials ──────────────────────────────────────────────
// Fill in the credentials from your TTN console (OTAA)
static const u1_t PROGMEM APPEUI[8]  = { 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00 };
static const u1_t PROGMEM DEVEUI[8]  = { 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00 };
static const u1_t PROGMEM APPKEY[16] = { 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
                                          0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00 };

void os_getArtEui(u1_t* buf) { memcpy_P(buf, APPEUI, 8); }
void os_getDevEui(u1_t* buf) { memcpy_P(buf, DEVEUI, 8); }
void os_getDevKey(u1_t* buf) { memcpy_P(buf, APPKEY, 16); }

// ─── Site configuration ──────────────────────────────────────────────────────
// Change this per device deployment
#define SITE_ID   1  // 1=Mougins, 2=Grasse, 3=Nice

// ─── Timing ──────────────────────────────────────────────────────────────────
#define TX_INTERVAL_S      300  // send every 5 minutes
#define CAMERA_INTERVAL_S 1800  // capture image every 30 minutes

// ─── Pin mapping (Heltec WiFi LoRa 32 V2) ────────────────────────────────────
#define BME280_SDA  4
#define BME280_SCL  15
#define VBAT_PIN    37   // ADC for battery voltage divider

// ─── Globals ─────────────────────────────────────────────────────────────────
static osjob_t sendjob;
static uint8_t payload[12];

Adafruit_BME280 bme;
Adafruit_TSL2591 tsl = Adafruit_TSL2591(2591);

bool bme_ok   = false;
bool tsl_ok   = false;
bool lora_joined = false;

// ─── Forward declarations ─────────────────────────────────────────────────────
static void do_send(osjob_t* j);
static void onEvent(ev_t ev);
uint8_t read_battery_pct(void);

// ─── LoRaWAN event handler ────────────────────────────────────────────────────
static void onEvent(ev_t ev) {
    switch (ev) {
        case EV_JOINED:
            lora_joined = true;
            Heltec.display->clear();
            Heltec.display->drawString(0, 0, "Joined TTN!");
            Heltec.display->display();
            // Disable link check validation for ADR
            LMIC_setLinkCheckMode(0);
            break;

        case EV_TXCOMPLETE:
            Heltec.display->clear();
            Heltec.display->drawString(0, 0, "TX complete");
            Heltec.display->display();
            if (LMIC.txrxFlags & TXRX_ACK) {
                Heltec.display->drawString(0, 10, "ACK received");
                Heltec.display->display();
            }
            // Schedule next transmission
            os_setTimedCallback(&sendjob,
                os_getTime() + sec2osticks(TX_INTERVAL_S),
                do_send);
            break;

        case EV_JOIN_FAILED:
            Heltec.display->clear();
            Heltec.display->drawString(0, 0, "Join failed");
            Heltec.display->display();
            break;

        case EV_REJOIN_FAILED:
            Heltec.display->clear();
            Heltec.display->drawString(0, 0, "Rejoin failed");
            Heltec.display->display();
            break;

        default:
            break;
    }
}

// ─── Build & send payload ─────────────────────────────────────────────────────
static void do_send(osjob_t* j) {
    if (LMIC.opmode & OP_TXRXPEND) {
        // Already pending, retry later
        os_setTimedCallback(&sendjob,
            os_getTime() + sec2osticks(10),
            do_send);
        return;
    }

    // Read BME280
    float temperature = 0.0f;
    float humidity    = 0.0f;
    float pressure    = 0.0f;
    uint8_t flags     = 0;

    if (bme_ok) {
        temperature = bme.readTemperature();
        humidity    = bme.readHumidity();
        pressure    = bme.readPressure() / 100.0f;  // Pa → hPa
        flags |= (1 << 1);
    }

    // Read TSL2591 lux
    uint16_t lux = 0;
    if (tsl_ok) {
        uint32_t lum = tsl.getFullLuminosity();
        uint16_t ir  = lum >> 16;
        uint16_t full = lum & 0xFFFF;
        float lux_f = tsl.calculateLux(full, ir);
        lux = (lux_f < 0 || lux_f > 65535) ? 0 : (uint16_t)lux_f;
        flags |= (1 << 2);
    }

    uint8_t battery = read_battery_pct();

    // Pack payload (big-endian)
    int16_t  temp_raw = (int16_t)(temperature * 100);
    uint16_t hum_raw  = (uint16_t)(humidity    * 100);
    uint16_t pres_raw = (uint16_t)(pressure    * 10);

    payload[0]  = (temp_raw >> 8) & 0xFF;
    payload[1]  = temp_raw & 0xFF;
    payload[2]  = (hum_raw >> 8) & 0xFF;
    payload[3]  = hum_raw & 0xFF;
    payload[4]  = (pres_raw >> 8) & 0xFF;
    payload[5]  = pres_raw & 0xFF;
    payload[6]  = (lux >> 8) & 0xFF;
    payload[7]  = lux & 0xFF;
    payload[8]  = battery;
    payload[9]  = SITE_ID;
    payload[10] = flags;
    payload[11] = 0;

    // Display on OLED
    Heltec.display->clear();
    Heltec.display->drawString(0, 0,  "Sending...");
    Heltec.display->drawString(0, 10, String("T:") + temperature + "C");
    Heltec.display->drawString(0, 20, String("H:") + humidity + "%");
    Heltec.display->drawString(0, 30, String("P:") + pressure + "hPa");
    Heltec.display->display();

    LMIC_setTxData2(1, payload, sizeof(payload), 0);
}

// ─── Battery ADC ─────────────────────────────────────────────────────────────
uint8_t read_battery_pct(void) {
    // Heltec V2: VBAT through voltage divider 100k/100k → pin 37
    // 3.7V LiPo: ~3.0V empty, ~4.2V full
    int raw = analogRead(VBAT_PIN);
    float vbat = (raw / 4095.0f) * 3.3f * 2.0f;  // ×2 for divider
    if (vbat >= 4.2f) return 100;
    if (vbat <= 3.0f) return 0;
    return (uint8_t)((vbat - 3.0f) / 1.2f * 100.0f);
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
    Heltec.begin(true /*DisplayEnable*/, true /*LoRaEnable*/, true /*SerialEnable*/,
                 true /*PABOOST*/, 868E6 /*band*/);

    Heltec.display->init();
    Heltec.display->flipScreenVertically();
    Heltec.display->setFont(ArialMT_Plain_10);

    Heltec.display->clear();
    Heltec.display->drawString(0, 0, "Weather Station");
    char site_buf[24];
    snprintf(site_buf, sizeof(site_buf), "Site: %s",
        SITE_ID == 1 ? "Mougins" :
        SITE_ID == 2 ? "Grasse"  : "Nice");
    Heltec.display->drawString(0, 10, site_buf);
    Heltec.display->display();

    // I2C for sensors
    Wire.begin(BME280_SDA, BME280_SCL);

    bme_ok = bme.begin(0x76, &Wire);
    if (!bme_ok) bme_ok = bme.begin(0x77, &Wire);
    if (bme_ok) {
        bme.setSampling(Adafruit_BME280::MODE_FORCED,
                        Adafruit_BME280::SAMPLING_X1,
                        Adafruit_BME280::SAMPLING_X1,
                        Adafruit_BME280::SAMPLING_X1,
                        Adafruit_BME280::FILTER_OFF);
    }

    tsl_ok = tsl.begin();
    if (tsl_ok) {
        tsl.setGain(TSL2591_GAIN_MED);
        tsl.setTiming(TSL2591_INTEGRATIONTIME_300MS);
    }

    // LMIC init
    os_init();
    LMIC_reset();
    LMIC_setClockError(MAX_CLOCK_ERROR * 1 / 100);

    // Start join + first send
    do_send(&sendjob);
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
    os_runloop_once();
}
