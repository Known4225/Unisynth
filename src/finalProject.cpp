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
#include <SPI.h>

// Let Device OS manage the connection to the Particle Cloud
SYSTEM_MODE(AUTOMATIC);

// Run the application and system concurrently in separate threads
SYSTEM_THREAD(ENABLED);

// Show system, cloud connectivity, and application logs over USB
// View logs with CLI using 'particle serial monitor --follow'
SerialLogHandler logHandler(LOG_LEVEL_INFO);

/* pin defines */
#define C_LOW_PIN          D10
#define C_SHARP_PIN        D11
#define D_PIN              D7
#define E_FLAT_PIN         D12
#define E_PIN              D6
#define F_PIN              D5
#define F_SHARP_PIN        D13
#define G_PIN              D4
#define G_SHARP_PIN        D14
#define A_PIN              D3
#define B_FLAT_PIN         D19
#define B_PIN              D2
#define C_HIGH_PIN         D1

#define OCTAVE_DOWN_PIN    D8
#define OCTAVE_UP_PIN      D9
#define WAVEFORM_PIN       D0

#define SPEAKER_PIN        D16

#define ANALOG_MAX         4095


#define SPI_CS_PIN         D18
#define SPI_CLK_PIN        D17
#define SPI_MOSI_PIN       D15

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
uint8_t currentOctave = 5;
uint8_t oldOctave = 0;
uint8_t currentWave = SIN;
uint8_t currentNote = 0;
uint8_t mute = 1;
double theta = 0.0;
double frequency = 523.25;
double volume = 1;
double Ts = 5.0 / 1000000;
uint32_t microseconds = 0;

/* functions */
void spi_transfer(uint8_t byte) {
    uint8_t mask = 0b10000000;
    for (int i = 0; i < 8; i++) {
        if (byte & mask) {
            digitalWrite(SPI_MOSI_PIN, HIGH);
        } else {
            digitalWrite(SPI_MOSI_PIN, LOW);
        }
        digitalWrite(SPI_CLK_PIN, HIGH);
        delayMicroseconds(1);
        digitalWrite(SPI_CLK_PIN, LOW);
        delayMicroseconds(1);
        mask >>= 1;
    }
}

void incrementOctave() {
    if (currentOctave < 7) {
        currentOctave++;
    }
    digitalWrite(SPI_CS_PIN, LOW);
    spi_transfer(1 << (currentOctave - 1));
    digitalWrite(SPI_CS_PIN, HIGH);
}

void decrementOctave() {
    if (currentOctave > 2) {
        currentOctave--;
    }
    digitalWrite(SPI_CS_PIN, LOW);
    spi_transfer(1 << (currentOctave - 1));
    digitalWrite(SPI_CS_PIN, HIGH);
}

void incrementWaveform() {
    currentWave++;
    if (currentWave > SQUARE) {
        currentWave = SIN;
    }
    switch (currentWave) {
        case SIN:
        Serial.println("SIN");
        break;
        case TRIANGLE:
        Serial.println("TRIANGLE");
        break;
        case SAW:
        Serial.println("SAW");
        break;
        case SQUARE:
        Serial.println("SQUARE");
        break;
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
        frequency = 523.25 * pow(2, currentOctave - 5);
        break;
        case C_SHARP:
        frequency = 554.37 * pow(2, currentOctave - 5);
        break;
        case D:
        frequency = 587.33 * pow(2, currentOctave - 5);
        break;
        case E_FLAT:
        frequency = 622.25 * pow(2, currentOctave - 5);
        break;
        case E:
        frequency = 659.26 * pow(2, currentOctave - 5);
        break;
        case F:
        frequency = 698.46 * pow(2, currentOctave - 5);
        break;
        case F_SHARP:
        frequency = 739.99 * pow(2, currentOctave - 5);
        break;
        case G:
        frequency = 783.99 * pow(2, currentOctave - 5);
        break;
        case G_SHARP:
        frequency = 830.61 * pow(2, currentOctave - 5);
        break;
        case A:
        frequency = 880.00 * pow(2, currentOctave - 5);
        break;
        case B_FLAT:
        frequency = 932.33 * pow(2, currentOctave - 5);
        break;
        case B:
        frequency = 987.77 * pow(2, currentOctave - 5);
        break;
        case C_HIGH:
        frequency = 523.25 * pow(2, currentOctave - 4);
        break;
        default:
        break;
    }
    Serial.println(frequency);
}

void music() {
    /* analogWrite takes on average 77us - https://forum.arduino.cc/t/how-long-does-analogwrite-take/64268/8*/
    if (mute) {
        return;
    }
    digitalWrite(SPEAKER_PIN, HIGH);
    uint32_t timeMicros = micros() - microseconds;
    delayMicroseconds(1000000.0 / frequency - timeMicros);
    digitalWrite(SPEAKER_PIN, LOW);
    delayMicroseconds(1000000.0 / frequency - 4); // https://roboticsbackend.com/arduino-fast-digitalwrite/#:~:text=We%20have%20the%20answer%3A%20a,have%20a%20much%20better%20precision.
    // switch (currentWave) {
    //     case SIN: {
    //         /* divide half-time into units of 77us */
    //         microseconds = micros();
    //         double timeAllotted = (1000000 / frequency - timeMicros);
    //         double analogIncrement = 255 / (timeAllotted / 77.0);
    //         double analogValue = 0;
    //         while (micros() - microseconds < timeAllotted) {
    //             analogWrite(SPEAKER_PIN, analogValue);
    //             analogValue += analogIncrement;
    //         }
    //         microseconds = micros();
    //         analogValue = 255;
    //         while (micros() - microseconds < timeAllotted) {
    //             analogWrite(SPEAKER_PIN, analogValue);
    //             analogValue -= analogIncrement;
    //         }
    //     }
    //     return;
    //     case TRIANGLE: {
    //         /* divide half-time into units of 77us */
    //         microseconds = micros();
    //         double timeAllotted = (1000000 / frequency - timeMicros);
    //         double analogIncrement = 255 / (timeAllotted / 77.0);
    //         double analogValue = 0;
    //         while (micros() - microseconds < timeAllotted) {
    //             analogWrite(SPEAKER_PIN, analogValue);
    //             analogValue += analogIncrement;
    //         }
    //         microseconds = micros();
    //         analogValue = 255;
    //         while (micros() - microseconds < timeAllotted) {
    //             analogWrite(SPEAKER_PIN, analogValue);
    //             analogValue -= analogIncrement;
    //         }
    //     }
    //     return;
    //     case SAW: {
    //         /* divide time into units of 77us */
    //         double timeAllotted = (2000000 / frequency - timeMicros);
    //         double analogIncrement = 255 / (timeAllotted / 77.0);
    //         double analogValue = 255;
    //         microseconds = micros();
    //         while (micros() - microseconds < timeAllotted) {
    //             analogWrite(SPEAKER_PIN, analogValue);
    //             analogValue -= analogIncrement;
    //         }
    //     }
    //     return;
    //     case SQUARE: {
    //         digitalWrite(SPEAKER_PIN, HIGH);
    //         delayMicroseconds(1000000 / frequency);
    //         digitalWrite(SPEAKER_PIN, LOW);
    //         uint16_t timeMicros = micros() - microseconds;
    //         delayMicroseconds(1000000 / frequency - timeMicros);
    //     }
    //     return;
    // }
}

void setup() {
    /* button pins */
    for (int i = 0; i < 16; i++) {
        pinMode(buttonPins[i], INPUT_PULLUP);
    }
    /* SPI pins */
    pinMode(SPI_CS_PIN, OUTPUT);
    pinMode(SPI_CLK_PIN, OUTPUT);
    pinMode(SPI_MOSI_PIN, OUTPUT);
    digitalWrite(SPI_CS_PIN, HIGH);
    delay(10);
    digitalWrite(SPI_CS_PIN, LOW);
    spi_transfer(0b00010000);
    digitalWrite(SPI_CS_PIN, HIGH);
    /* PWM pin */
    pinMode(SPEAKER_PIN, OUTPUT);
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
    /* play note */
    music();
}