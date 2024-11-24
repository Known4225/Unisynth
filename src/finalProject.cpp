/* 
 * Project EE1301 Final Project
 * Author: Ryan Srichai
 * Date: 24.11.24
 * For comprehensive documentation and examples, please visit:
 * https://docs.particle.io/firmware/best-practices/firmware-template/
 * 
 * Photon 2, deviceOS@5.8.0
 * https://console.particle.io/ryans-proton-photon-32604/devices
 */

// Include Particle Device OS APIs
#include "Particle.h"

// Let Device OS manage the connection to the Particle Cloud
SYSTEM_MODE(AUTOMATIC);

// Run the application and system concurrently in separate threads
SYSTEM_THREAD(ENABLED);

// Show system, cloud connectivity, and application logs over USB
// View logs with CLI using 'particle serial monitor --follow'
SerialLogHandler logHandler(LOG_LEVEL_INFO);

/* pin defines */
#define C_LOW_PIN          D11
#define C_SHARP_PIN        D11
#define D_PIN              D11
#define E_FLAT_PIN         D11
#define E_PIN              D11
#define F_PIN              D11
#define F_SHARP_PIN        D11
#define G_PIN              D11
#define G_SHARP_PIN        D11
#define A_PIN              D11
#define B_FLAT_PIN         D11
#define B_PIN              D11
#define C_HIGH_PIN         D11

/* globals */
uint8_t buttonBuffers[15];

void setup() {
    
}

void loop() {

    delay(1);
}
