# Homebridge Relays

Controls 4 channel relays with a Raspberry Pi using HomeKit.

This fork adds the ability to "require" additional relays to be set,
for example to control the main valve in a watering system.

## Hardware

The hardware is quite simple to construct.

1. Raspberry Pi 3 Model B
2. 4-relay (or more) module pins are connected to the GPIO pins.

The raspberry pi can then control the state of the relays.

## Required State

The "requires" property of the relay configuration specifies another pin that must be
activated when the relay is activated. The raised pin must also be configured. See the example
below.

When one or more relays "requires" another pin, that pin is turned on. When no more relays 
require the pin, it is turned off. The required pin is otherwise identical to other pins and can be
turned on and off manually as needed.

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