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
#define C_SHARP_PIN        D10
#define D_PIN              D12
#define E_FLAT_PIN         D7
#define E_PIN              D13
#define F_PIN              D14
#define F_SHARP_PIN        D6
#define G_PIN              D19
#define G_SHARP_PIN        D5
#define A_PIN              D18
#define B_FLAT_PIN         D4
#define B_PIN              D17
#define C_HIGH_PIN         D15

#define OCTAVE_DOWN_PIN    D8
#define OCTAVE_UP_PIN      D9
#define WAVEFORM_PIN       D0

#define SPEAKER_PIN        D16

#define ANALOG_MAX         4095

/* array enum */
enum PINOUT {
    C_LOW = 0,
    C_SHARP,
    D,
    E_FLAT,
    E,
    F,
    F_SHARP,
    G,
    G_SHARP,
    A,
    B_FLAT,
    B,
    C_HIGH,
    OCTAVE_DOWN,
    OCTAVE_UP,
    WAVEFORM
};

/* waveform enum */
enum WAVE {
    SIN = 0,
    TRIANGLE,
    SAW,
    SQUARE
};

/* globals */
uint8_t buttonPins[16] = {
    C_LOW_PIN,
    C_SHARP_PIN,
    D_PIN,
    E_FLAT_PIN,
    E_PIN,
    F_PIN,
    F_SHARP_PIN,
    G_PIN,
    G_SHARP_PIN,
    A_PIN,
    B_FLAT_PIN,
    B_PIN,
    C_HIGH_PIN,
    OCTAVE_DOWN_PIN,
    OCTAVE_UP_PIN,
    WAVEFORM_PIN
};
uint8_t buttonBuffers[16] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}; // for debouncing
uint8_t controlButtons[3] = {0, 0, 0};
uint8_t currentOctave = 4;
uint8_t oldOctave = 0;
uint8_t currentWave = SIN;
uint8_t currentNote = 0;
uint8_t mute = 1;
double theta = 0.0;
double frequency = 261.63;
double volume = 1;
double Ts = 5.0 / 1000000;
uint32_t microseconds = 0;

/* functions */
void incrementOctave() {
    if (currentOctave < 8) {
        currentOctave++;
    }
}

void decrementOctave() {
    if (currentOctave > 0) {
        currentOctave--;
    }
}

void incrementWaveform() {
    currentWave++;
    if (currentWave > SQUARE) {
        currentWave = SIN;
    }
}

void playNote(PINOUT note) {
    if (currentNote == note && oldOctave == currentOctave) {
        return;
    }
    currentNote = note;
    oldOctave = currentOctave;
    switch (note) {
        case C_LOW:
        frequency = 16.35 * pow(2, currentOctave);
        break;
        case C_SHARP:
        frequency = 17.32 * pow(2, currentOctave);
        break;
        case D:
        frequency = 18.35 * pow(2, currentOctave);
        break;
        case E_FLAT:
        frequency = 19.45 * pow(2, currentOctave);
        break;
        case E:
        frequency = 20.60 * pow(2, currentOctave);
        break;
        case F:
        frequency = 21.83 * pow(2, currentOctave);
        break;
        case F_SHARP:
        frequency = 23.12 * pow(2, currentOctave);
        break;
        case G:
        frequency = 24.50 * pow(2, currentOctave);
        break;
        case G_SHARP:
        frequency = 25.96 * pow(2, currentOctave);
        break;
        case A:
        frequency = 27.50 * pow(2, currentOctave);
        break;
        case B_FLAT:
        frequency = 29.14 * pow(2, currentOctave);
        break;
        case B:
        frequency = 30.87 * pow(2, currentOctave);
        break;
        case C_HIGH:
        frequency = 16.35 * pow(2, currentOctave + 1);
        break;
        default:
        break;
    }
    Serial.println(frequency);
}

void music() {
    if (mute) {
        return;
    }
    uint8_t timeMicros = micros() - microseconds;
    digitalWrite(SPEAKER_PIN, HIGH);
    delayMicroseconds(1000000 / frequency - timeMicros);
    digitalWrite(SPEAKER_PIN, LOW);
    delayMicroseconds(1000000 / frequency);
}

void setup() {
    /* button pins */
    for (int i = 0; i < 16; i++) {
        pinMode(buttonPins[i], INPUT_PULLUP);
    }
    /* PWM pin */
    pinMode(SPEAKER_PIN, OUTPUT);	
    // analogWriteResolution(SPEAKER_PIN, 12);
    /* debug */
    Serial.begin(9600);
}

void loop() {
    microseconds = micros();
    for (int i = 0; i < 16; i++) {
        if (digitalRead(buttonPins[i]) == LOW) {
            buttonBuffers[i] = 10;
        } else {
            if (buttonBuffers[i] > 0) {
                buttonBuffers[i]--;
            }
        }
    }
    /* switch note frequency */
    uint8_t lastNote = 0;
    uint8_t anythingOn = 0;
    for (int i = 0; i < 13; i++) {
        if (buttonBuffers[i]) {
            anythingOn++;
            lastNote = i;
        }
    }
    if (anythingOn) {
        mute = 0;
        playNote((PINOUT) lastNote);
    } else {
        /* no notes are being played */
        mute = 1;
    }
    /* handle extra buttons */
    if (buttonBuffers[OCTAVE_DOWN]) {
        if (controlButtons[0]) {
            incrementOctave();
        }
        controlButtons[0] = 0;
    } else {
        controlButtons[0] = 1;
    }
    if (buttonBuffers[OCTAVE_UP]) {
        if (controlButtons[1]) {
            decrementOctave();
        }
        controlButtons[1] = 0;
    } else {
        controlButtons[1] = 1;
    }
    if (buttonBuffers[WAVEFORM]) {
        if (controlButtons[2]) {
            incrementWaveform();
        }
        controlButtons[2] = 0;
    } else {
        controlButtons[2] = 1;
    }
    /* change note */
    music();
    // Serial.println(timeMicros);
    /* 150us delay */
    // if (timeMicros < 150) {
    //     delayMicroseconds(150 - (timeMicros));
    // }
    // delayMicroseconds(5 - (micros() - microseconds));
}