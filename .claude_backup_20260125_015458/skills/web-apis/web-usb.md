---
title: WebUSB API
category: Web APIs
tags: [usb, hardware, devices, chromium143+]
description: Direct USB device communication from web pages
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# WebUSB API

Enables web applications to access USB devices directly, enabling support for specialized hardware like dongles, programmers, and scientific instruments.

## When to Use

- **Device programming** — Firmware updates for USB devices
- **Hardware control** — Scientific instruments, industrial equipment
- **Data acquisition** — Sensors, measurement devices
- **Device setup** — Configuration tools for USB peripherals
- **Custom peripherals** — Application-specific hardware
- **Prototyping tools** — Arduino, microcontroller programming

## Core Concepts

```typescript
interface USBDevice {
  usbVersionMajor: number;
  usbVersionMinor: number;
  usbVersionSubminor: number;
  deviceClass: number;
  deviceSubclass: number;
  deviceProtocol: number;
  vendorId: number;
  productId: number;
  deviceVersionMajor: number;
  deviceVersionMinor: number;
  deviceVersionSubminor: number;
  manufacturerName: string;
  productName: string;
  serialNumber: string;
  configurations: USBConfiguration[];
  opened: boolean;

  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  selectAlternateInterface(interfaceNumber: number, alternateInterface: number): Promise<void>;
  clearHalt(endpointNumber: number): Promise<void>;
  controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
  controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  isochronousTransferIn(endpointNumber: number, lengths: number[]): Promise<USBIsochronousInTransferResult>;
  isochronousTransferOut(endpointNumber: number, data: BufferSource, lengths: number[]): Promise<USBIsochronousOutTransferResult>;
  reset(): Promise<void>;
}

interface USB {
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
}
```

## Device Discovery and Connection

### Request Device

```typescript
async function requestUSBDevice(): Promise<USBDevice> {
  try {
    const device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: 0x2341 }  // Arduino
      ]
    });

    console.log('Selected device:', device.productName);
    return device;
  } catch (error) {
    console.error('Device selection error:', error);
    throw error;
  }
}

// Usage
const device = await requestUSBDevice();
```

### Request Multiple Devices

```typescript
async function requestMultipleDevices(): Promise<USBDevice[]> {
  const devices = await navigator.usb.requestDevice({
    filters: [
      { vendorId: 0x2341 },  // Arduino
      { vendorId: 0x10C4 }   // Silicon Labs
    ]
  });

  return Array.isArray(devices) ? devices : [devices];
}
```

### List Already Granted Devices

```typescript
async function getGrantedDevices(): Promise<USBDevice[]> {
  return navigator.usb.getDevices();
}

// Usage
const devices = await getGrantedDevices();
devices.forEach(device => {
  console.log(`${device.manufacturerName}: ${device.productName}`);
});
```

### Monitor Connection Changes

```typescript
async function monitorUSBDevices(): Promise<void> {
  navigator.usb.addEventListener('connect', (event: any) => {
    console.log('Device connected:', event.device.productName);
    handleDeviceConnect(event.device);
  });

  navigator.usb.addEventListener('disconnect', (event: any) => {
    console.log('Device disconnected:', event.device.productName);
    handleDeviceDisconnect(event.device);
  });
}

function handleDeviceConnect(device: USBDevice): void {
  console.log('New device available:', device);
}

function handleDeviceDisconnect(device: USBDevice): void {
  console.log('Device removed:', device);
}
```

## Device Communication

### Open and Close Device

```typescript
async function openDevice(device: USBDevice): Promise<void> {
  try {
    await device.open();
    console.log('Device opened');
  } catch (error) {
    console.error('Failed to open device:', error);
    throw error;
  }
}

async function closeDevice(device: USBDevice): Promise<void> {
  try {
    await device.close();
    console.log('Device closed');
  } catch (error) {
    console.error('Failed to close device:', error);
  }
}

// Usage
const device = await requestUSBDevice();
await openDevice(device);
// ... use device ...
await closeDevice(device);
```

### Select Configuration and Claim Interface

```typescript
async function initializeDevice(device: USBDevice): Promise<void> {
  await device.open();

  // Select first configuration
  await device.selectConfiguration(1);
  console.log('Configuration selected');

  // Claim interface 0
  await device.claimInterface(0);
  console.log('Interface claimed');
}
```

### Control Transfers

```typescript
async function sendControlCommand(
  device: USBDevice,
  command: number
): Promise<void> {
  const setupPacket = {
    requestType: 'vendor' as const,
    recipient: 'device' as const,
    request: command,
    value: 0,
    index: 0
  };

  await device.controlTransferOut(setupPacket);
  console.log('Control command sent');
}

async function readControlData(
  device: USBDevice,
  command: number,
  length: number
): Promise<DataView> {
  const setupPacket = {
    requestType: 'vendor' as const,
    recipient: 'device' as const,
    request: command,
    value: 0,
    index: 0
  };

  const result = await device.controlTransferIn(setupPacket, length);

  if (result.status !== 'ok') {
    throw new Error('Control transfer failed: ' + result.status);
  }

  return result.data!;
}
```

### Bulk Transfers

```typescript
async function sendBulkData(
  device: USBDevice,
  endpointNumber: number,
  data: Uint8Array
): Promise<void> {
  const result = await device.transferOut(endpointNumber, data);

  if (result.status !== 'ok') {
    throw new Error('Transfer failed: ' + result.status);
  }

  console.log('Sent', result.bytesWritten, 'bytes');
}

async function receiveBulkData(
  device: USBDevice,
  endpointNumber: number,
  length: number
): Promise<Uint8Array> {
  const result = await device.transferIn(endpointNumber, length);

  if (result.status !== 'ok') {
    throw new Error('Transfer failed: ' + result.status);
  }

  const data = new Uint8Array(result.data!.buffer);
  console.log('Received', data.length, 'bytes');

  return data;
}
```

## Real-World Examples

### Arduino Communication

```typescript
class ArduinoDevice {
  private device: USBDevice | null = null;

  async connect(): Promise<void> {
    this.device = await navigator.usb.requestDevice({
      filters: [{ vendorId: 0x2341 }]  // Arduino
    });

    await this.device.open();
    await this.device.selectConfiguration(1);
    await this.device.claimInterface(0);

    console.log('Connected to', this.device.productName);
  }

  async digitalWrite(pin: number, value: boolean): Promise<void> {
    if (!this.device) throw new Error('Device not connected');

    const data = new Uint8Array([pin, value ? 1 : 0]);
    await this.device.transferOut(1, data);  // Endpoint 1
  }

  async digitalRead(pin: number): Promise<boolean> {
    if (!this.device) throw new Error('Device not connected');

    const data = new Uint8Array([pin]);
    await this.device.transferOut(1, data);

    const result = await this.device.transferIn(2, 1);  // Endpoint 2
    return result.data!.getUint8(0) !== 0;
  }

  async analogWrite(pin: number, value: number): Promise<void> {
    if (!this.device) throw new Error('Device not connected');

    const data = new Uint8Array([pin, value]);
    await this.device.transferOut(1, data);
  }

  async analogRead(pin: number): Promise<number> {
    if (!this.device) throw new Error('Device not connected');

    const data = new Uint8Array([pin]);
    await this.device.transferOut(1, data);

    const result = await this.device.transferIn(2, 2);
    return result.data!.getUint16(0, true);
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;

    await this.device.releaseInterface(0);
    await this.device.close();
    console.log('Disconnected');
  }
}

// Usage
const arduino = new ArduinoDevice();
await arduino.connect();

await arduino.digitalWrite(13, true);   // LED on
const buttonPressed = await arduino.digitalRead(2);
await arduino.analogWrite(3, 128);
const sensorValue = await arduino.analogRead(0);
```

### Firmware Update

```typescript
class DeviceFirmwareUpdater {
  private device: USBDevice | null = null;

  async connect(vendorId: number): Promise<void> {
    this.device = await navigator.usb.requestDevice({
      filters: [{ vendorId }]
    });

    await this.device.open();
    await this.device.selectConfiguration(1);
  }

  async updateFirmware(firmwareData: Uint8Array): Promise<void> {
    if (!this.device) throw new Error('Device not connected');

    console.log('Starting firmware update...');

    // Enter bootloader mode
    await this.sendCommand(0xFF, 0x01);

    // Wait for bootloader
    await new Promise(r => setTimeout(r, 2000));

    // Erase device
    await this.sendCommand(0xFF, 0x02);
    console.log('Device erased');

    // Write firmware in chunks
    const chunkSize = 256;
    for (let i = 0; i < firmwareData.length; i += chunkSize) {
      const chunk = firmwareData.slice(i, i + chunkSize);

      const addressBytes = new Uint8Array([
        (i >> 0) & 0xFF,
        (i >> 8) & 0xFF,
        (i >> 16) & 0xFF
      ]);

      await this.writeMemory(addressBytes, chunk);

      const progress = Math.round((i / firmwareData.length) * 100);
      console.log(`Progress: ${progress}%`);
    }

    // Verify firmware
    await this.sendCommand(0xFF, 0x03);
    console.log('Firmware verified');

    // Exit bootloader
    await this.sendCommand(0xFF, 0x04);
    console.log('Firmware update complete');

    await this.device.close();
  }

  private async sendCommand(cmd: number, subcmd: number): Promise<void> {
    const data = new Uint8Array([cmd, subcmd]);
    await this.device!.transferOut(1, data);
  }

  private async writeMemory(address: Uint8Array, data: Uint8Array): Promise<void> {
    const packet = new Uint8Array(1 + 3 + 1 + data.length);
    packet[0] = 0xAA;  // Start byte
    packet.set(address, 1);
    packet[4] = data.length;
    packet.set(data, 5);

    await this.device!.transferOut(1, packet);
  }
}

// Usage
const updater = new DeviceFirmwareUpdater();
await updater.connect(0x1234);

const firmware = await fetch('/firmware.bin').then(r => r.arrayBuffer());
await updater.updateFirmware(new Uint8Array(firmware));
```

### Data Logger

```typescript
class DataLogger {
  private device: USBDevice | null = null;
  private data: number[] = [];

  async connect(vendorId: number): Promise<void> {
    this.device = await navigator.usb.requestDevice({
      filters: [{ vendorId }]
    });

    await this.device.open();
    await this.device.selectConfiguration(1);
    await this.device.claimInterface(0);
  }

  async startLogging(): Promise<void> {
    if (!this.device) throw new Error('Device not connected');

    const logLoop = async () => {
      while (this.device?.opened) {
        try {
          const result = await this.device.transferIn(1, 4);  // Read 4 bytes

          if (result.status === 'ok' && result.data) {
            const value = result.data.getFloat32(0, true);
            this.data.push(value);

            console.log('Logged value:', value);
          }

          await new Promise(r => setTimeout(r, 100));  // 10Hz sampling
        } catch (error) {
          console.error('Logging error:', error);
          break;
        }
      }
    };

    logLoop();
  }

  getData(): number[] {
    return [...this.data];
  }

  exportCSV(): string {
    return this.data.map((v, i) => `${i},${v}`).join('\n');
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;

    await this.device.releaseInterface(0);
    await this.device.close();
  }
}

// Usage
const logger = new DataLogger();
await logger.connect(0x5678);
await logger.startLogging();

// After 10 seconds
setTimeout(async () => {
  await logger.disconnect();
  const csv = logger.exportCSV();
  downloadFile(csv, 'data.csv');
}, 10000);
```

## Error Handling

```typescript
async function robustUSBOperation(): Promise<void> {
  try {
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: 0x2341 }]
    });

    await device.open();

    const result = await device.transferIn(1, 64);

    if (result.status === 'ok' && result.data) {
      const bytes = new Uint8Array(result.data.buffer);
      console.log('Received:', bytes);
    } else {
      console.error('Transfer failed:', result.status);
    }

    await device.close();
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          console.log('Device not found or disconnected');
          break;
        case 'SecurityError':
          console.log('Permission denied');
          break;
        case 'InvalidStateError':
          console.log('Device in invalid state');
          break;
        default:
          console.error('USB error:', error.message);
      }
    }
  }
}
```

## Browser Support

**Chromium 143+ baseline** — WebUSB API is fully supported on Linux, macOS, Windows, ChromeOS, and Android.

**Note:** Requires HTTPS context or localhost for security. Some platforms require additional permissions.

## Related APIs

- **Web Serial API** — Serial port communication
- **WebHID API** — Human Interface Devices
- **Permissions API** — Request USB permissions
- **Fetch API** — Download firmware
