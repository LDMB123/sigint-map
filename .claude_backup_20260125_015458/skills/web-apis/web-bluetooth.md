---
title: Web Bluetooth API
category: Web APIs
tags: [bluetooth, hardware, iot, chromium143+]
description: Communicate with Bluetooth devices from web pages
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Web Bluetooth API

Enables web applications to discover and communicate with Bluetooth devices using GATT (Generic Attribute Profile) protocol.

## When to Use

- **IoT device control** — Smart lights, thermostats, sensors
- **Fitness trackers** — Heart rate, activity data
- **Health devices** — Blood pressure monitors, scales
- **Audio devices** — Headphones, speakers
- **Game controllers** — Wireless gamepads
- **Personal devices** — Smartwatches, fitness bands
- **Proximity interactions** — Beacon-based experiences

## Core Concepts

```typescript
interface BluetoothDevice {
  id: string;
  name: string;
  gatt?: BluetoothRemoteGATTServer;
  forget(): Promise<void>;
  watchAdvertisements(): Promise<void>;
  unwatchAdvertisements(): void;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  device: BluetoothDevice;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  device: BluetoothDevice;
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  service: BluetoothRemoteGATTService;
  properties: BluetoothCharacteristicProperties;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: 'characteristicvaluechanged', listener: EventListener): void;
}
```

## Device Discovery

### Request Device

```typescript
async function requestBluetoothDevice(): Promise<BluetoothDevice> {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['generic_access'] }]
    });

    console.log('Selected device:', device.name);
    return device;
  } catch (error) {
    console.error('Device selection error:', error);
    throw error;
  }
}

// Usage
const device = await requestBluetoothDevice();
```

### Filter by Service

```typescript
async function requestHeartRateDevice(): Promise<BluetoothDevice> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ['heart_rate'] }
    ]
  });

  return device;
}

// Filter by name pattern
async function requestDeviceByName(namePrefix: string): Promise<BluetoothDevice> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { namePrefix }
    ]
  });

  return device;
}

// Multiple filter options (OR logic)
async function requestDeviceWithMultipleFilters(): Promise<BluetoothDevice> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ['heart_rate'] },
      { services: ['battery_service'] },
      { namePrefix: 'MyDevice' }
    ]
  });

  return device;
}
```

### Discover All Devices

```typescript
async function discoverAllDevices(): Promise<BluetoothDevice> {
  // Request any Bluetooth device (user chooses from all paired devices)
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true
  });

  return device;
}

// Limit to specific services
async function discoverByServices(): Promise<BluetoothDevice> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['generic_access'] }]
  });

  return device;
}
```

## GATT Operations

### Connect to Device

```typescript
async function connectToDevice(device: BluetoothDevice): Promise<void> {
  if (!device.gatt) {
    throw new Error('Device does not support GATT');
  }

  try {
    const server = await device.gatt.connect();
    console.log('Connected to GATT server:', server.connected);
  } catch (error) {
    console.error('Connection failed:', error);
    throw error;
  }
}

// Usage
const device = await requestBluetoothDevice();
await connectToDevice(device);
```

### Read Characteristic

```typescript
async function readCharacteristic(
  device: BluetoothDevice,
  serviceUUID: string,
  characteristicUUID: string
): Promise<DataView> {
  if (!device.gatt) throw new Error('No GATT server');

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(serviceUUID);
  const characteristic = await service.getCharacteristic(characteristicUUID);

  const value = await characteristic.readValue();
  console.log('Read value:', value);

  return value;
}

// Usage
const device = await requestBluetoothDevice();
const value = await readCharacteristic(
  device,
  'battery_service',
  'battery_level'
);

const batteryLevel = value.getUint8(0);
console.log('Battery level:', batteryLevel + '%');
```

### Write Characteristic

```typescript
async function writeCharacteristic(
  device: BluetoothDevice,
  serviceUUID: string,
  characteristicUUID: string,
  value: Uint8Array
): Promise<void> {
  if (!device.gatt) throw new Error('No GATT server');

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(serviceUUID);
  const characteristic = await service.getCharacteristic(characteristicUUID);

  await characteristic.writeValue(value);
  console.log('Wrote value:', value);
}

// Usage
const device = await requestBluetoothDevice();
await writeCharacteristic(
  device,
  'custom_service_uuid',
  'control_characteristic_uuid',
  new Uint8Array([0x01, 0x02, 0x03])
);
```

### Enable Notifications

```typescript
async function enableNotifications(
  device: BluetoothDevice,
  serviceUUID: string,
  characteristicUUID: string,
  onUpdate: (value: DataView) => void
): Promise<void> {
  if (!device.gatt) throw new Error('No GATT server');

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(serviceUUID);
  const characteristic = await service.getCharacteristic(characteristicUUID);

  // Start notifications
  await characteristic.startNotifications();

  // Listen for updates
  characteristic.addEventListener('characteristicvaluechanged', (event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    onUpdate(characteristic.value!);
  });

  console.log('Notifications enabled');
}

// Usage
const device = await requestBluetoothDevice();
await enableNotifications(
  device,
  'heart_rate',
  'heart_rate_measurement',
  (value) => {
    const heartRate = value.getUint8(1);
    console.log('Heart rate:', heartRate, 'bpm');
  }
);
```

## Real-World Examples

### Heart Rate Monitor

```typescript
class HeartRateMonitor {
  private device: BluetoothDevice | null = null;
  private listeners: Set<(rate: number) => void> = new Set();

  async connect(): Promise<void> {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }]
    });

    const server = await this.device.gatt!.connect();
    const service = await server.getPrimaryService('heart_rate');
    const characteristic = await service.getCharacteristic('heart_rate_measurement');

    // Enable notifications
    await characteristic.startNotifications();

    // Listen for heart rate updates
    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const char = event.target as BluetoothRemoteGATTCharacteristic;
      const heartRate = this.parseHeartRate(char.value!);

      this.listeners.forEach(listener => listener(heartRate));
    });

    console.log('Heart rate monitor connected');
  }

  private parseHeartRate(value: DataView): number {
    const flags = value.getUint8(0);
    const is16bit = flags & 0x01;

    if (is16bit) {
      return value.getUint16(1, true);
    } else {
      return value.getUint8(1);
    }
  }

  onChange(callback: (rate: number) => void): void {
    this.listeners.add(callback);
  }

  async disconnect(): Promise<void> {
    this.device?.gatt?.disconnect();
    console.log('Disconnected');
  }
}

// Usage
const monitor = new HeartRateMonitor();
await monitor.connect();

monitor.onChange((rate) => {
  console.log('Heart rate:', rate, 'bpm');
  document.querySelector('.heart-rate')!.textContent = rate.toString();
});
```

### Battery Level Monitor

```typescript
class BatteryMonitor {
  private device: BluetoothDevice | null = null;

  async connect(): Promise<void> {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['battery_service'] }]
    });

    await this.checkBattery();
  }

  private async checkBattery(): Promise<void> {
    const server = await this.device!.gatt!.connect();
    const service = await server.getPrimaryService('battery_service');
    const characteristic = await service.getCharacteristic('battery_level');

    const value = await characteristic.readValue();
    const level = value.getUint8(0);

    console.log('Battery level:', level + '%');
    this.updateUI(level);

    // Poll battery level every 5 minutes
    setInterval(async () => {
      const newValue = await characteristic.readValue();
      const newLevel = newValue.getUint8(0);
      this.updateUI(newLevel);
    }, 5 * 60 * 1000);
  }

  private updateUI(level: number): void {
    document.querySelector('.battery-level')!.textContent = level + '%';
    document.querySelector('.battery-bar')!.style.width = level + '%';
  }
}

// Usage
const battery = new BatteryMonitor();
await battery.connect();
```

### Smart Light Control

```typescript
class SmartLight {
  private device: BluetoothDevice | null = null;
  private colorCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private brightnessCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(): Promise<void> {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'SmartLight' }]
    });

    const server = await this.device.gatt!.connect();
    const service = await server.getPrimaryService('light_service_uuid');

    this.colorCharacteristic = await service.getCharacteristic('light_color_uuid');
    this.brightnessCharacteristic = await service.getCharacteristic('light_brightness_uuid');

    console.log('Smart light connected');
  }

  async setColor(red: number, green: number, blue: number): Promise<void> {
    const data = new Uint8Array([red, green, blue]);
    await this.colorCharacteristic!.writeValueWithoutResponse(data);
  }

  async setBrightness(level: number): Promise<void> {
    const data = new Uint8Array([level]);
    await this.brightnessCharacteristic!.writeValueWithoutResponse(data);
  }

  async turnOn(): Promise<void> {
    await this.setBrightness(255);
  }

  async turnOff(): Promise<void> {
    await this.setBrightness(0);
  }

  async disconnect(): Promise<void> {
    this.device?.gatt?.disconnect();
  }
}

// Usage
const light = new SmartLight();
await light.connect();

await light.setColor(255, 0, 0);    // Red
await light.setBrightness(200);    // 78% brightness
await light.turnOff();             // Off
```

## Device Management

### Forget Device

```typescript
async function forgetDevice(device: BluetoothDevice): Promise<void> {
  try {
    await device.forget();
    console.log('Device forgotten');
  } catch (error) {
    console.error('Failed to forget device:', error);
  }
}
```

### Watch Advertisements

```typescript
async function watchAdvertisements(device: BluetoothDevice): Promise<void> {
  try {
    await device.watchAdvertisements();
    console.log('Watching advertisements');

    device.addEventListener('advertisementreceived', (event: any) => {
      console.log('Ad received:', {
        rssi: event.rssi,
        txPower: event.txPower,
        manufacturerData: event.manufacturerData,
        serviceData: event.serviceData
      });
    });
  } catch (error) {
    console.error('Failed to watch advertisements:', error);
  }
}
```

## Error Handling

```typescript
async function robustBluetoothOperation(): Promise<void> {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }]
    });

    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService('heart_rate');
    const characteristic = await service.getCharacteristic('heart_rate_measurement');

    const value = await characteristic.readValue();
    console.log('Read value:', value);
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          console.log('Device not found or service unavailable');
          break;
        case 'NotSupportedError':
          console.log('Bluetooth not supported');
          break;
        case 'SecurityError':
          console.log('Permission denied');
          break;
        default:
          console.error('Bluetooth error:', error.message);
      }
    }
  }
}
```

## Browser Support

**Chromium 143+ baseline** — Web Bluetooth API is fully supported on ChromeOS, Android, macOS, and Windows.

**Platform support:**
- Android: Full support
- macOS: Full support with Chromium 56+
- Windows 10+: Full support
- ChromeOS: Full support
- iOS: Not supported (Safari limitation)

## Related APIs

- **Permissions API** — Request Bluetooth permissions
- **Web Serial API** — Serial device communication
- **WebHID API** — Human Interface Devices
- **Notifications API** — Alert on device events
