# Homebridge Relays

Control multi-channel relay boards with a Raspberry Pi using HomeKit.

This fork adds the ability to "require" additional relays to be set,
for example to control the main valve in a watering system. It also adds
a new "Timer" accessory which can be used to control a sequence of relays,
for example to turn watering values on and off in a sequence.

## Hardware

The hardware is quite simple to construct.

1. Raspberry Pi 3 Model B
2. 4- (or more) relay module pins, connected to the GPIO pins.

The raspberry pi can then control the state of the relays.

## Required State

The "requires" property of the relay configuration specifies another pin that must be
activated when the relay is activated. The raised pin must also be configured. See the example
below.

When one or more relays "requires" another pin, that pin is turned on. When no more relays 
require the pin, it is turned off. The required pin is otherwise identical to other pins and can be
turned on and off manually as needed.

## Timer Accessory

The new "Timer" accessory lets you configure a set of relays to be operated in sequence.
The example configuration makes this obvious:

        {
            "accessory": "Timer",
            "name": "Garden Watering",
            "sequence": [
                { "pin": 11, "seconds": 300 },
                { "pin": 13, "seconds": 600 }
            ]
        }

In this example, pin 11 is turned onl after 300 seconds it is turned off, and
pin 13 is turned on. After 600 seconds, pin 13 is turned off and the timer ends.
Only one pin in the timer sequence is active at any time, but the "requires" property
is honoured (if set).

The timer is presented as a simple switch (like the other relays). Turning the timer switch
ON starts the sequence. Turning it off stops the sequence. The timer turns itself off when
it's finished.

## Installation

1. Install homebridge using: `sudo npm install --unsafe-perm -g homebridge`
2. Install this plugin using: `sudo npm install -g --unsafe-perm homebridge-relays`
3. Update your configuration file. See `config-sample.json` in this repository for a sample.

## Sample Configuration

```json
{
  "bridge": {
    "name": "RelayServer",
    "username": "CC:22:3D:E3:CE:FA",
    "port": 51826,
    "pin": "031-45-155"
  },
  "description": "4 Channel Relay",
  "accessories": [
    {
      "accessory": "Relay",
      "name": "Front Garden Sprinkler",
      "pin": 11,
      "requires": 15,
      "invert": true,
      "intial_state": 0,
      "timeout_ms": 5000
    },
    {
      "accessory": "Relay",
      "name": "Side Garden Sprinkler",
      "pin": 13,
      "requires": 15,
      "invert": true,
      "initial_state": 0,
      "timeout_ms": 10000
    },
    {
      "accessory": "Relay",
      "name": "Main tap valve",
      "pin": 15
    },
    {
      "accessory": "Relay",
      "name": "Garage Door",
      "pin": 29
    },
    {
      "accessory": "Timer",
      "name": "Garden Watering",
      "sequence": [
        { "pin": 11, "seconds": 300 },
        { "pin": 13, "seconds": 600 }
      ]
    }
  ],
  "platforms": []
}
```

## Accessory Configuration Options

| Name            | Optional | Description                                                                     |
|-----------------|----------|---------------------------------------------------------------------------------|
| `accessory`     | No       | Accessory type                                                                  |
| `name`          | No       | Default name of an accessory                                                    |
| `pin`           | No       | Raspberry Pi pin number                                                         |
| `invert`        | Yes      | If `true`, output on pin is `LOW` for `ON`, `HIGH` for `OFF` (default: `false`) |
| `initial_state` | Yes      | Initial pin state. `1` for `ON`, `0` for `OFF` (default: `0`)                   |
| `timeout_ms`    | Yes      | Relay will stay `ON` for a given period of time then `OFF` (default: `0`)       |
| `requires`      | Yes      | ID of a relay that must be turned `ON` if this relay is `ON`.                   |