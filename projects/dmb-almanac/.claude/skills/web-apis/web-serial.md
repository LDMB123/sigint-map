---
title: Web Serial API
category: Web APIs
tags: [serial, hardware, communication, chromium143+]
description: Serial port communication from web pages
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Web Serial API

Enables web applications to read from and write to serial devices like microcontrollers, industrial equipment, and legacy devices.

## When to Use

- **Microcontroller programming** — Arduino, ESP32
- **Industrial equipment** — Programmable Logic Controllers (PLCs)
- **Legacy device control** — Older hardware with serial interfaces
- **UART debugging** — Serial debugging interfaces
- **Sensor data collection** — Serial sensor readings
- **Equipment monitoring** — Device telemetry and status

## Core Concepts

```typescript
interface SerialPort {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  getInfo(): SerialPortInfo;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  forget(): Promise<void>;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
  rtscts?: boolean;
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListener): void;
}
```

## Port Discovery and Connection

### Request Serial Port

```typescript
async function requestSerialPort(): Promise<SerialPort> {
  try {
    const port = await navigator.serial.requestPort();
    console.log('Port selected:', port.getInfo());
    return port;
  } catch (error) {
    console.error('Port selection error:', error);
    throw error;
  }
}

// Usage
const port = await requestSerialPort();
```

### Request Specific Port

```typescript
async function requestArduinoPort(): Promise<SerialPort> {
  const port = await navigator.serial.requestPort({
    filters: [
      { usbVendorId: 0x2341, usbProductId: 0x0001 }  // Arduino Uno
    ]
  });

  return port;
}

// Multiple filter options
async function requestMultipleDevices(): Promise<SerialPort> {
  const port = await navigator.serial.requestPort({
    filters: [
      { usbVendorId: 0x2341 },        // Arduino
      { usbVendorId: 0x10C4 },        // Silicon Labs
      { usbVendorId: 0x0403 }         // FTDI
    ]
  });

  return port;
}
```

### List Granted Ports

```typescript
async function getGrantedPorts(): Promise<SerialPort[]> {
  return navigator.serial.getPorts();
}

// Usage
const ports = await getGrantedPorts();
ports.forEach(port => {
  const info = port.getInfo();
  console.log(`Port: ${info.path}`);
});
```

### Monitor Connection Changes

```typescript
async function monitorSerialPorts(): Promise<void> {
  navigator.serial.addEventListener('connect', (event: any) => {
    console.log('Port connected');
    handlePortConnect(event.port);
  });

  navigator.serial.addEventListener('disconnect', (event: any) => {
    console.log('Port disconnected');
    handlePortDisconnect(event.port);
  });
}

function handlePortConnect(port: SerialPort): void {
  console.log('New port available:', port.getInfo());
}

function handlePortDisconnect(port: SerialPort): void {
  console.log('Port removed:', port.getInfo());
}
```

## Reading and Writing Data

### Open Port

```typescript
async function openSerialPort(port: SerialPort): Promise<void> {
  await port.open({
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none'
  });

  console.log('Port opened');
}

// Common baud rates
async function openAtBaudRate(port: SerialPort, baudRate: number): Promise<void> {
  await port.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: 'none'
  });

  console.log(`Port opened at ${baudRate} baud`);
}

// Usage
const port = await requestSerialPort();
await openSerialPort(port);
```

### Write Data

```typescript
async function writeToPort(port: SerialPort, data: string): Promise<void> {
  const writer = port.writable.getWriter();

  try {
    const encoded = new TextEncoder().encode(data);
    await writer.write(encoded);
    console.log('Sent:', data);
  } finally {
    writer.releaseLock();
  }
}

// Write bytes
async function writeBytes(port: SerialPort, data: Uint8Array): Promise<void> {
  const writer = port.writable.getWriter();

  try {
    await writer.write(data);
    console.log('Sent', data.length, 'bytes');
  } finally {
    writer.releaseLock();
  }
}

// Usage
await writeToPort(port, 'Hello, Arduino!\\n');
await writeBytes(port, new Uint8Array([0x01, 0x02, 0x03]));
```

### Read Data

```typescript
async function readLine(port: SerialPort): Promise<string> {
  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  let line = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      line += decoder.decode(value, { stream: true });

      if (line.includes('\\n')) {
        return line;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return line;
}

// Continuous reading
async function readContinuously(
  port: SerialPort,
  onData: (line: string) => void
): Promise<void> {
  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line) onData(line);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage
readContinuously(port, (line) => {
  console.log('Received:', line);
});
```

### Close Port

```typescript
async function closeSerialPort(port: SerialPort): Promise<void> {
  await port.close();
  console.log('Port closed');
}

async function forgetPort(port: SerialPort): Promise<void> {
  await port.forget();
  console.log('Port forgotten (will require permission again)');
}
```

## Real-World Examples

### Arduino Communication

```typescript
class ArduinoSerial {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  async connect(): Promise<void> {
    this.port = await navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x2341 }]  // Arduino
    });

    await this.port.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });

    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();

    console.log('Connected to Arduino');
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.writer) throw new Error('Not connected');

    const data = new TextEncoder().encode(command + '\\n');
    await this.writer.write(data);
  }

  async readResponse(): Promise<string> {
    if (!this.reader) throw new Error('Not connected');

    const decoder = new TextDecoder();
    let response = '';

    while (!response.includes('\\n')) {
      const { done, value } = await this.reader.read();
      if (done) break;

      response += decoder.decode(value, { stream: true });
    }

    return response.trim();
  }

  async getTemperature(): Promise<number> {
    await this.sendCommand('GET_TEMP');
    const response = await this.readResponse();
    return parseFloat(response);
  }

  async setLED(state: boolean): Promise<void> {
    await this.sendCommand(state ? 'LED_ON' : 'LED_OFF');
  }

  async disconnect(): Promise<void> {
    if (this.reader) this.reader.releaseLock();
    if (this.writer) this.writer.releaseLock();
    if (this.port) await this.port.close();
  }
}

// Usage
const arduino = new ArduinoSerial();
await arduino.connect();

const temp = await arduino.getTemperature();
console.log('Temperature:', temp, '°C');

await arduino.setLED(true);
await arduino.disconnect();
```

### Serial Terminal

```typescript
class SerialTerminal {
  private port: SerialPort | null = null;
  private outputElement: HTMLTextAreaElement;
  private inputElement: HTMLInputElement;
  private isConnected = false;

  constructor(outputSelector: string, inputSelector: string) {
    this.outputElement = document.querySelector(outputSelector) as HTMLTextAreaElement;
    this.inputElement = document.querySelector(inputSelector) as HTMLInputElement;

    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.sendInput();
      }
    });
  }

  async connect(): Promise<void> {
    this.port = await navigator.serial.requestPort();

    await this.port.open({
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });

    this.isConnected = true;
    this.log('Connected');

    this.startReading();
  }

  private async startReading(): Promise<void> {
    if (!this.port) return;

    const reader = this.port.readable.getReader();
    const decoder = new TextDecoder();

    try {
      while (this.isConnected) {
        const { done, value } = await reader.read();

        if (done) break;

        const text = decoder.decode(value, { stream: true });
        this.log(text);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async sendInput(): Promise<void> {
    if (!this.port || !this.isConnected) return;

    const input = this.inputElement.value;
    this.inputElement.value = '';

    const writer = this.port.writable.getWriter();

    try {
      await writer.write(new TextEncoder().encode(input + '\\n'));
      this.log('> ' + input);
    } finally {
      writer.releaseLock();
    }
  }

  private log(text: string): void {
    this.outputElement.value += text;
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.port) {
      await this.port.close();
      this.log('Disconnected');
    }
  }
}

// Usage
const terminal = new SerialTerminal('textarea#output', 'input#input');
document.querySelector('button#connect')?.addEventListener('click', () => terminal.connect());
document.querySelector('button#disconnect')?.addEventListener('click', () => terminal.disconnect());
```

### Data Logger with Timestamp

```typescript
class SerialDataLogger {
  private port: SerialPort | null = null;
  private isLogging = false;
  private data: Array<{ timestamp: number; value: string }> = [];

  async connect(): Promise<void> {
    this.port = await navigator.serial.requestPort();

    await this.port.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });

    console.log('Connected');
  }

  async startLogging(): Promise<void> {
    if (!this.port) throw new Error('Not connected');

    this.isLogging = true;
    const reader = this.port.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (this.isLogging) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line) {
            this.data.push({
              timestamp: Date.now(),
              value: line
            });

            console.log('Logged:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  stopLogging(): void {
    this.isLogging = false;
  }

  exportCSV(): string {
    const lines = ['Timestamp,Value'];

    for (const entry of this.data) {
      const date = new Date(entry.timestamp).toISOString();
      lines.push(`${date},${entry.value}`);
    }

    return lines.join('\\n');
  }

  async disconnect(): Promise<void> {
    this.stopLogging();
    if (this.port) {
      await this.port.close();
    }
  }
}

// Usage
const logger = new SerialDataLogger();
await logger.connect();
await logger.startLogging();

setTimeout(async () => {
  logger.stopLogging();
  const csv = logger.exportCSV();
  downloadFile(csv, 'data.csv');
  await logger.disconnect();
}, 60000);
```

## Error Handling

```typescript
async function robustSerialOperation(): Promise<void> {
  let port: SerialPort | null = null;

  try {
    port = await navigator.serial.requestPort();
    await port.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });

    const reader = port.readable.getReader();
    const { value } = await reader.read();

    if (value) {
      console.log('Received:', new TextDecoder().decode(value));
    }

    reader.releaseLock();
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          console.log('Port not found');
          break;
        case 'InvalidStateError':
          console.log('Port in invalid state');
          break;
        case 'NetworkError':
          console.log('Port disconnected');
          break;
        default:
          console.error('Serial error:', error.message);
      }
    }
  } finally {
    if (port) {
      await port.close();
    }
  }
}
```

## Platform-Specific Baud Rates

```typescript
async function openWithPlatformBaudRate(port: SerialPort): Promise<void> {
  const baudRate = navigator.platform?.includes('Win')
    ? 115200  // Windows: faster
    : 9600;   // macOS/Linux: standard

  await port.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: 'none'
  });

  console.log(`Opened at ${baudRate} baud`);
}
```

## Browser Support

**Chromium 143+ baseline** — Web Serial API is fully supported on Windows, macOS, Linux, ChromeOS, and Android.

**Note:** Requires HTTPS context or localhost. Some platforms require additional permissions.

## Related APIs

- **WebUSB API** — USB device communication
- **WebHID API** — Human Interface Devices
- **Fetch API** — Download firmware
- **Streams API** — Efficient data streaming
