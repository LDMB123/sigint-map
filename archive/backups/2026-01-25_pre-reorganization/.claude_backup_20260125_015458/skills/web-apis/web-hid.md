---
title: WebHID API
category: Web APIs
tags: [hid, devices, input, chromium143+]
description: Human Interface Device communication (gamepads, keyboards, custom devices)
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# WebHID API

Enables web applications to communicate with Human Interface Devices like game controllers, input devices, and custom hardware.

## When to Use

- **Game controller support** — Advanced gamepad features
- **Custom input devices** — Specialized controllers
- **Keyboard/mouse control** — Keyboard customization software
- **Accessibility devices** — Custom input adaptations
- **Productivity tools** — Macro controllers, transport controls
- **3D input devices** — Space mice, 6DoF controllers

## Core Concepts

```typescript
interface HIDDevice {
  vendorId: number;
  productId: number;
  productName: string;
  collections: HIDCollectionInfo[];
  opened: boolean;

  open(): Promise<void>;
  close(): Promise<void>;
  forget(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
}

interface HID {
  requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
  getDevices(): Promise<HIDDevice[]>;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
}

interface HIDDeviceRequestOptions {
  filters: HIDDeviceFilter[];
}

interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}
```

## Device Discovery

### Request HID Device

```typescript
async function requestGamepad(): Promise<HIDDevice[]> {
  const devices = await navigator.hid.requestDevice({
    filters: [
      { usagePage: 0x01, usage: 0x05 }  // Gamepad
    ]
  });

  console.log('Selected devices:', devices.length);
  return devices;
}

// Request specific vendor
async function requestSpecificController(): Promise<HIDDevice[]> {
  const devices = await navigator.hid.requestDevice({
    filters: [
      {
        vendorId: 0x054C,  // Sony (PlayStation)
        productId: 0x05C4  // PS4 Controller
      }
    ]
  });

  return devices;
}

// Multiple filter options
async function requestMultipleDevices(): Promise<HIDDevice[]> {
  const devices = await navigator.hid.requestDevice({
    filters: [
      { vendorId: 0x054C },     // PlayStation
      { vendorId: 0x045E },     // Xbox (Microsoft)
      { usagePage: 0x01 }       // Generic input device
    ]
  });

  return devices;
}
```

### Get Previously Granted Devices

```typescript
async function getGrantedDevices(): Promise<HIDDevice[]> {
  return navigator.hid.getDevices();
}

// Usage
const devices = await getGrantedDevices();
devices.forEach(device => {
  console.log(`${device.productName} (${device.vendorId}:${device.productId})`);
});
```

### Monitor Connection Changes

```typescript
async function monitorHIDDevices(): Promise<void> {
  navigator.hid.addEventListener('connect', (event: any) => {
    console.log('HID device connected:', event.device.productName);
    handleDeviceConnect(event.device);
  });

  navigator.hid.addEventListener('disconnect', (event: any) => {
    console.log('HID device disconnected:', event.device.productName);
    handleDeviceDisconnect(event.device);
  });
}

function handleDeviceConnect(device: HIDDevice): void {
  console.log('Available:', device.productName);
}

function handleDeviceDisconnect(device: HIDDevice): void {
  console.log('Unavailable:', device.productName);
}
```

## Device Communication

### Open and Close Device

```typescript
async function openDevice(device: HIDDevice): Promise<void> {
  await device.open();
  console.log('HID device opened');
}

async function closeDevice(device: HIDDevice): Promise<void> {
  await device.close();
  console.log('HID device closed');
}
```

### Send Output Report

```typescript
async function sendReport(
  device: HIDDevice,
  reportId: number,
  data: Uint8Array
): Promise<void> {
  await device.sendReport(reportId, data);
  console.log('Report sent');
}

// Example: Set LED on game controller
async function setControllerLED(
  device: HIDDevice,
  red: number,
  green: number,
  blue: number
): Promise<void> {
  const report = new Uint8Array([
    0x00,     // Report ID (usually 0)
    0x72,     // Command for LED
    red,
    green,
    blue
  ]);

  await device.sendReport(0, report);
}
```

### Send Feature Report

```typescript
async function sendFeatureReport(
  device: HIDDevice,
  reportId: number,
  data: Uint8Array
): Promise<void> {
  await device.sendFeatureReport(reportId, data);
  console.log('Feature report sent');
}
```

### Receive Feature Report

```typescript
async function receiveFeatureReport(
  device: HIDDevice,
  reportId: number
): Promise<DataView> {
  const data = await device.receiveFeatureReport(reportId);
  console.log('Feature report received:', data);
  return data;
}
```

### Listen for Input Reports

```typescript
async function listenForInput(
  device: HIDDevice,
  onInput: (reportId: number, data: Uint8Array) => void
): Promise<void> {
  await device.open();

  device.addEventListener('inputreport', (event: any) => {
    const reportId = event.reportId;
    const data = new Uint8Array(event.data.buffer);

    onInput(reportId, data);
  });
}

// Usage
const devices = await requestGamepad();
const gamepad = devices[0];

await listenForInput(gamepad, (reportId, data) => {
  console.log('Input report:', {
    reportId,
    bytes: Array.from(data)
  });
});
```

## Real-World Examples

### Game Controller Handler

```typescript
class GameControllerManager {
  private device: HIDDevice | null = null;
  private listeners: Set<(state: GamepadState) => void> = new Set();

  interface GamepadState {
    buttons: boolean[];
    axes: number[];
    triggers: { left: number; right: number };
  }

  async connect(): Promise<void> {
    const devices = await navigator.hid.requestDevice({
      filters: [{ usagePage: 0x01, usage: 0x05 }]
    });

    if (!devices.length) throw new Error('No device selected');

    this.device = devices[0];
    await this.device.open();

    this.startListening();
  }

  private startListening(): void {
    if (!this.device) return;

    this.device.addEventListener('inputreport', (event: any) => {
      const state = this.parseGamepadInput(event.data);
      this.notifyListeners(state);
    });
  }

  private parseGamepadInput(data: DataView): GamepadState {
    // Example parsing for PS4 controller
    const bytes = new Uint8Array(data.buffer);

    return {
      buttons: [
        (bytes[5] & 0x10) !== 0,  // Square
        (bytes[5] & 0x20) !== 0,  // Triangle
        (bytes[5] & 0x40) !== 0,  // Circle
        (bytes[5] & 0x80) !== 0   // Cross
      ],
      axes: [
        (bytes[1] - 128) / 128,   // Left stick X
        (bytes[2] - 128) / 128,   // Left stick Y
        (bytes[3] - 128) / 128,   // Right stick X
        (bytes[4] - 128) / 128    // Right stick Y
      ],
      triggers: {
        left: bytes[8] / 255,
        right: bytes[9] / 255
      }
    };
  }

  private notifyListeners(state: GamepadState): void {
    this.listeners.forEach(listener => listener(state));
  }

  onChange(callback: (state: GamepadState) => void): void {
    this.listeners.add(callback);
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      await this.device.close();
    }
  }
}

// Usage
const controller = new GameControllerManager();
await controller.connect();

controller.onChange((state) => {
  console.log('Gamepad state:', state);
  console.log('Square pressed:', state.buttons[0]);
});
```

### Macro Controller

```typescript
class MacroController {
  private device: HIDDevice | null = null;
  private macros: Map<number, () => Promise<void>> = new Map();

  async connect(): Promise<void> {
    const devices = await navigator.hid.requestDevice({
      filters: [{ productId: 0x1234 }]  // Custom macro device ID
    });

    if (!devices.length) throw new Error('No macro controller found');

    this.device = devices[0];
    await this.device.open();

    this.startListening();
  }

  private startListening(): void {
    if (!this.device) return;

    this.device.addEventListener('inputreport', async (event: any) => {
      const buttonId = event.data.getUint8(0);
      const macro = this.macros.get(buttonId);

      if (macro) {
        await macro();
      }
    });
  }

  registerMacro(buttonId: number, callback: () => Promise<void>): void {
    this.macros.set(buttonId, callback);
  }

  async sendFeedback(ledId: number, brightness: number): Promise<void> {
    if (!this.device) return;

    const report = new Uint8Array([ledId, brightness]);
    await this.device.sendReport(0, report);
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      await this.device.close();
    }
  }
}

// Usage
const macro = new MacroController();
await macro.connect();

// Register macro: Button 1 -> Send Ctrl+C
macro.registerMacro(1, async () => {
  // Send keyboard event via postMessage to main app
  window.postMessage({ type: 'macro', key: 'ctrl+c' }, '*');
});

// Visual feedback
macro.registerMacro(1, async () => {
  await macro.sendFeedback(1, 255);  // Light up LED
  setTimeout(() => macro.sendFeedback(1, 0), 100);
});
```

### Custom Input Device

```typescript
class CustomInputDevice {
  private device: HIDDevice | null = null;

  async connect(vendorId: number, productId: number): Promise<void> {
    const devices = await navigator.hid.requestDevice({
      filters: [{ vendorId, productId }]
    });

    if (!devices.length) throw new Error('Device not found');

    this.device = devices[0];
    await this.device.open();
  }

  async getDeviceInfo(): Promise<object> {
    if (!this.device) throw new Error('Device not connected');

    const info = await this.device.receiveFeatureReport(0);

    return {
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      productName: this.device.productName,
      firmwareVersion: info.getUint16(0, true),
      serialNumber: info.getUint32(2, true)
    };
  }

  async calibrate(): Promise<void> {
    if (!this.device) throw new Error('Device not connected');

    // Send calibration command
    const cmd = new Uint8Array([0x01, 0xAA, 0x55]);
    await this.device.sendFeatureReport(0, cmd);

    // Wait for response
    await new Promise(r => setTimeout(r, 1000));

    const response = await this.device.receiveFeatureReport(0);
    console.log('Calibration response:', new Uint8Array(response.buffer));
  }

  async readSensor(): Promise<number> {
    if (!this.device) throw new Error('Device not connected');

    const data = await this.device.receiveFeatureReport(1);
    return data.getFloat32(0, true);
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      await this.device.close();
    }
  }
}

// Usage
const device = new CustomInputDevice();
await device.connect(0x1234, 0x5678);

const info = await device.getDeviceInfo();
console.log('Device info:', info);

await device.calibrate();
const reading = await device.readSensor();
console.log('Sensor reading:', reading);
```

## Error Handling

```typescript
async function robustHIDOperation(): Promise<void> {
  try {
    const devices = await navigator.hid.requestDevice({
      filters: [{ usagePage: 0x01, usage: 0x05 }]
    });

    if (!devices.length) {
      console.log('User cancelled device selection');
      return;
    }

    const device = devices[0];
    await device.open();

    console.log('Device opened successfully');

    await device.close();
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          console.log('Device not found');
          break;
        case 'InvalidStateError':
          console.log('Device in invalid state');
          break;
        case 'NotAllowedError':
          console.log('Permission denied');
          break;
        default:
          console.error('HID error:', error.message);
      }
    }
  }
}
```

## Browser Support

**Chromium 143+ baseline** — WebHID API is fully supported on Windows, macOS, Linux, ChromeOS, and Android.

**Note:** Requires HTTPS context or localhost. Some platforms require additional permissions for specific device classes.

**Supported HID usage pages:**
- 0x01: Generic Desktop (keyboards, mice, gamepads)
- 0x07: Keyboard/Keypad
- 0x09: Button
- 0x0C: Consumer (media controls)
- Custom vendor pages

## Related APIs

- **Gamepad API** — Standard gamepad access (comparison)
- **Web Serial API** — Serial device communication
- **WebUSB API** — USB device communication
- **Permissions API** — Request HID permissions
