/**
 * Script file: index.js
 * Created on: Feb 28, 2018
 * Last modified on: Mar 31, 2021
 * 
 * Comments:
 *  Raspberry Pi relay controller homebridge plugin
 */

var rpio = require('rpio');
let Service, Characteristic;

// Map of pin-to-relay-accessory
/** @type { Map<number, RelayAccessory> }} */
let allRelays = new Map()

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-relays", "Relay", RelayAccessory);
    homebridge.registerAccessory("homebridge-relays", "Timer", TimerAccessory);
}

function setRelayState(pin, value) {
    const relay = allRelays.get(pin)
    if (relay !== undefined) {
        relay.log.info(`set relay ${relay.name} (pin ${pin}) to ${value}`)
        relay.setRelayState(value)
        relay.relayService
            .getCharacteristic(Characteristic.On)
            .setValue(value)
    }
}

class RelayAccessory {
    constructor(log, config) {
        /* log instance */
        this.log = log;

        /* read configuration */
        this.name = config.name;
        this.pin = config.pin;
        this.invert = config.invert || false;
        this.initialState = config.initial_state || 0;
        this.timeout = config.timeout_ms || 0;
        this.requires = config.requires;

        /* initialize variables */
        this.timerId = -1;

        /* GPIO initialization */
        rpio.open(this.pin, rpio.OUTPUT, this.gpioValue(this.initialState));

        /* run service */
        this.relayService = new Service.Switch(this.name);

        // Keep track of the relays we know about
        allRelays.set(this.pin, this)
    }

    identify(callback) {
        this.log.info("Accessory identified");
        callback(null);
    }

    gpioValue(val) {
        if (this.invert) {
            val = !val;
        }
        return val ? rpio.HIGH : rpio.LOW;
    }

    getRelayState() {
        /* get relay state (ON, OFF) */
        var val = this.gpioValue(rpio.read(this.pin) > 0);
        return val === rpio.HIGH;
    }

    setRelayState(value) {
        /* clear timeout if already exists */
        if (this.timerId !== -1) {
            clearTimeout(this.timerId);
            this.timerId = -1;
        }

        /* GPIO write operation */
        this.log.info("Pin %d (%s) status: %s", this.pin, this.name, value);
        rpio.write(this.pin, this.gpioValue(value));

        /* turn off the relay if timeout is expired */
        if (value && this.timeout > 0) {
            this.timerId = setTimeout(() => {
                this.log.info("Pin %d timed out. Turned off", this.pin);
                rpio.write(this.pin, this.gpioValue(false));
                this.timerId = -1;

                /* update relay status */
                this.relayService
                    .getCharacteristic(Characteristic.On)
                    .updateValue(false);
            }, this.timeout);
        }
    }

    // setRequiredState determines which set of relays are required to satisfy
    // the current relay state. Call this AFTER setting the new relay state.
    // The required state is based on the state of ALL pins. If two pins
    // require a third pin then the third pin needs to be active if either
    // other pin is active.
    setRequiredState() {

        // Generate a list of "required" relay states, based on the accessory config
        // This is a map of pin-number-to-state.
        /** @type { Map<number, boolean> } */
        const requiredState = new Map()

        // Work out which relays are required. If a relay is required by any active relay,
        // it must be turned on. Otherwise, if all relays requiring another relay are inactive,
        // then we turn it off.
        for (const relay of allRelays.values()) {
            if (relay.requires !== undefined) {
                requiredState.set(relay.requires, requiredState.get(relay.requires) || relay.getRelayState())
            }
        }

        // Finally, set the state of each required relay.
        for (const [pin, state] of requiredState) {
            const accessory = allRelays.get(pin);
            if (accessory === undefined) {
                console.warn(`required pin ${pin} is not defined`)
            } else {
                accessory.setRelayState(state)
                accessory.relayService
                    .getCharacteristic(Characteristic.On)
                    .updateValue(state);
            }
        }
    }

    getServices() {
        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Smart Technology')
            .setCharacteristic(Characteristic.Model, 'Multi-Relay Controller');

        /* relay control */
        this.relayService
            .getCharacteristic(Characteristic.On)
            .on('get', callback => {
                this.state = this.getRelayState();
                this.log.info("Status:", this.state ? "ON" : "OFF");
                callback(null, this.state);
            })
            .on('set', (value, callback) => {
                this.setRelayState(value);
                this.setRequiredState()
                callback(null);
            });

        return [this.informationService, this.relayService];
    }
}

class TimerAccessory {
    constructor(log, config) {
        /* log instance */
        this.log = log;

        /* read configuration */
        this.name = config.name;

        // timer is not-null if the service is operating.
        this.timerId = null

        // index of the sequence currently running
        this.currentSequence = null

        // the next index of the relay sequence to be started.
        this.nextSequence = null

        // array of { pin, seconds }
        this.sequence = config.sequence

        /* run service */
        this.timerService = new Service.Switch(this.name);
    }

    identify(callback) {
        callback(null);
    }

    stopTimer() {
        this.log.info("stopping timer")

        if (this.timerId != null) {
            clearTimeout(this.timerId)
            this.timerId = null
        }

        if (this.currentSequence != null) {
            setRelayState(this.sequence[this.currentSequence].pin, false)
        }

        this.currentSequence = null
        this.nextSequence = null

        this.timerService
            .getCharacteristic(Characteristic.On)
            .updateValue(false);
    }

    startTimer() {
        // TODO: this just clears the timeout after 5 seconds
        this.log.info("starting timer")
        if (this.timerId != null) {
            clearTimeout(this.timerId)
        }

        this.timerService
            .getCharacteristic(Characteristic.On)
            .updateValue(true);

        this.nextSequence = 0
        this.startNextRelay()
    }

    // Start the next timer. Overwrites any existing timer.
    // May end up calling "stopTimer" if there are no more relays to start.
    startNextRelay() {
        // Stop the current relay, if there is one.
        if (this.currentSequence != null) {
            setRelayState(this.sequence[this.currentSequence].pin, false)
        }

        // Are we done yet?
        if (this.nextSequence >= this.sequence.length) {
            this.stopTimer()
            return
        }

        this.currentSequence = this.nextSequence++
        const seq = this.sequence[this.currentSequence]

        setRelayState(seq.pin, true)
        this.timerId = setTimeout(() => this.startNextRelay(), seq.seconds * 1000)
    }

    getTimerState() {
        // TODO: return boolean
        return this.timerId != null
    }

    setTimerState(value) {

        const currentState = (this.timerId != null)
        // If we're not changing anything
        if (Boolean(value) === currentState) {
            return
        }

        // Otherwise the requested value is different from the state.
        if (this.timerId != null) {
            this.stopTimer()
        } else {
            this.startTimer()
        }
    }

    getServices() {
        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Smart Technology')
            .setCharacteristic(Characteristic.Model, 'Multi-Relay Timer');

        /* timer control */
        this.timerService
            .getCharacteristic(Characteristic.On)
            .on('get', callback => {
                this.state = this.getTimerState();
                callback(null, this.state);
            })
            .on('set', (value, callback) => {
                this.setTimerState(value);
                callback(null);
            });

        return [this.informationService, this.timerService];
    }
}