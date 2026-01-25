---
title: Barcode Detection API
category: Web APIs
tags: [barcode, detection, vision, chromium143+]
description: Detect barcodes and QR codes in images
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Barcode Detection API

Enables web applications to detect and decode various barcode formats including QR codes, UPC, Code-128, and more from images or video streams.

## When to Use

- **QR code scanning** — Product information, URLs
- **Inventory management** — Barcode scanning
- **Document processing** — Receipt/invoice scanning
- **Payment processing** — Payment code scanning
- **Event check-in** — Ticket scanning
- **Accessibility** — Automatic barcode reading
- **Web monetization** — Ad code scanning

## Core Concepts

```typescript
interface BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  static getSupportedFormats(): Promise<BarcodeFormat[]>;
}

interface BarcodeDetectorOptions {
  formats?: BarcodeFormat[];
}

interface DetectedBarcode {
  cornerPoints: Point[];
  format: BarcodeFormat;
  rawValue: string;
  boundingBox: DOMRectReadOnly;
}

type BarcodeFormat =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'data_matrix'
  | 'ean_13'
  | 'ean_8'
  | 'itf'
  | 'pdf417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e';
```

## Basic Usage

### Detect Barcodes in Image

```typescript
async function detectBarcodesInImage(imageUrl: string): Promise<DetectedBarcode[]> {
  try {
    // Fetch image
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Create bitmap
    const imageBitmap = await createImageBitmap(blob);

    // Detect barcodes
    const barcodeDetector = new BarcodeDetector({
      formats: ['qr_code', 'ean_13', 'code_128']
    });

    const barcodes = await barcodeDetector.detect(imageBitmap);

    console.log('Detected barcodes:', barcodes.length);
    barcodes.forEach(barcode => {
      console.log(`Format: ${barcode.format}`);
      console.log(`Value: ${barcode.rawValue}`);
      console.log(`Bounding box:`, barcode.boundingBox);
    });

    return barcodes;
  } catch (error) {
    console.error('Barcode detection error:', error);
    throw error;
  }
}

// Usage
const barcodes = await detectBarcodesInImage('https://example.com/product.jpg');
```

### Detect from Canvas

```typescript
async function detectBarcodesInCanvas(canvas: HTMLCanvasElement): Promise<DetectedBarcode[]> {
  const barcodeDetector = new BarcodeDetector();
  return barcodeDetector.detect(canvas);
}

// Usage
const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const barcodes = await detectBarcodesInCanvas(canvas);
```

### Detect from File Input

```typescript
async function detectBarcodesFromFile(file: File): Promise<DetectedBarcode[]> {
  const imageBitmap = await createImageBitmap(file);
  const barcodeDetector = new BarcodeDetector();
  return barcodeDetector.detect(imageBitmap);
}

// Usage
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
if (fileInput?.files?.[0]) {
  const barcodes = await detectBarcodesFromFile(fileInput.files[0]);
}
```

## Real-Time Detection

### Video Stream Scanning

```typescript
class QRCodeScanner {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private detector: BarcodeDetector;
  private isScanning = false;
  private listeners: Set<(code: DetectedBarcode) => void> = new Set();

  constructor(videoSelector: string, canvasSelector: string) {
    this.video = document.querySelector(videoSelector) as HTMLVideoElement;
    this.canvas = document.querySelector(canvasSelector) as HTMLCanvasElement;
    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
  }

  async start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }  // Back camera
      });

      this.video.srcObject = stream;
      this.isScanning = true;

      // Wait for video to be ready
      await new Promise(resolve => {
        this.video.onloadedmetadata = resolve;
      });

      this.startScanning();
    } catch (error) {
      console.error('Failed to access camera:', error);
      throw error;
    }
  }

  private startScanning(): void {
    const scan = async () => {
      if (!this.isScanning) return;

      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame to canvas
      ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      try {
        const barcodes = await this.detector.detect(this.canvas);

        for (const barcode of barcodes) {
          // Draw bounding box
          this.drawBoundingBox(ctx, barcode);

          // Notify listeners
          this.notifyListeners(barcode);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }

      // Next frame
      requestAnimationFrame(scan);
    };

    scan();
  }

  private drawBoundingBox(ctx: CanvasRenderingContext2D, barcode: DetectedBarcode): void {
    const { boundingBox, cornerPoints } = barcode;

    // Draw rectangle
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height
    );

    // Draw corner points
    ctx.fillStyle = '#00ff00';
    for (const point of cornerPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw value
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.fillText(barcode.rawValue, boundingBox.x, boundingBox.y - 10);
  }

  private notifyListeners(barcode: DetectedBarcode): void {
    this.listeners.forEach(listener => listener(barcode));
  }

  onDetected(callback: (code: DetectedBarcode) => void): void {
    this.listeners.add(callback);
  }

  stop(): void {
    this.isScanning = false;

    const tracks = (this.video.srcObject as MediaStream)?.getTracks();
    tracks?.forEach(track => track.stop());
  }
}

// Usage
const scanner = new QRCodeScanner('video', 'canvas');
await scanner.start();

scanner.onDetected((barcode) => {
  console.log('QR Code detected:', barcode.rawValue);
  // Process the decoded value
  handleQRCode(barcode.rawValue);
});
```

## Format-Specific Detection

### QR Code Detection

```typescript
async function detectQRCodes(image: ImageBitmapSource): Promise<string[]> {
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  const barcodes = await detector.detect(image);

  return barcodes.map(barcode => barcode.rawValue);
}

// QR codes can encode:
// - URLs: https://example.com
// - Contact info: VCARD format
// - WiFi: WIFI:T:WPA;S:SSID;P:password;;
// - Email: mailto:user@example.com
// - Phone: tel:+1234567890
// - Text: Plain text
```

### EAN/UPC Detection (Product Barcodes)

```typescript
async function detectProductBarcodes(image: ImageBitmapSource): Promise<Array<{
  format: string;
  code: string;
}>> {
  const detector = new BarcodeDetector({
    formats: ['ean_8', 'ean_13', 'upc_a', 'upc_e']
  });

  const barcodes = await detector.detect(image);

  return barcodes.map(barcode => ({
    format: barcode.format,
    code: barcode.rawValue
  }));
}

// Lookup product info by EAN code
async function lookupProductByEAN(eanCode: string): Promise<object | null> {
  const response = await fetch(`https://api.ean-search.org/api?format=json&ean=${eanCode}`);

  if (!response.ok) return null;

  return response.json();
}
```

### Code128 Detection

```typescript
async function detectCode128(image: ImageBitmapSource): Promise<string[]> {
  const detector = new BarcodeDetector({ formats: ['code_128'] });
  const barcodes = await detector.detect(image);

  return barcodes.map(barcode => barcode.rawValue);
}
```

## Practical Applications

### Inventory Management System

```typescript
class InventoryScanner {
  private scanner: QRCodeScanner;
  private inventory: Map<string, { name: string; quantity: number }> = new Map();

  constructor(videoSelector: string, canvasSelector: string) {
    this.scanner = new QRCodeScanner(videoSelector, canvasSelector);

    this.scanner.onDetected((barcode) => {
      this.handleBarcodeScan(barcode.rawValue);
    });
  }

  async start(): Promise<void> {
    await this.scanner.start();
  }

  private handleBarcodeScan(sku: string): void {
    const item = this.inventory.get(sku);

    if (item) {
      item.quantity++;
      console.log(`Scanned ${item.name}: quantity now ${item.quantity}`);
    } else {
      console.log(`Unknown SKU: ${sku}`);
    }
  }

  addItem(sku: string, name: string): void {
    this.inventory.set(sku, { name, quantity: 0 });
  }

  getInventory(): object {
    return Object.fromEntries(this.inventory);
  }

  stop(): void {
    this.scanner.stop();
  }
}

// Usage
const inventory = new InventoryScanner('video', 'canvas');
inventory.addItem('SKU001', 'Widget A');
inventory.addItem('SKU002', 'Widget B');

await inventory.start();

// Scan barcodes...
setInterval(() => {
  console.log('Current inventory:', inventory.getInventory());
}, 5000);
```

### Event Check-In System

```typescript
class EventCheckInSystem {
  private scanner: QRCodeScanner;
  private attendees: Map<string, { name: string; checkedIn: boolean; time?: number }> = new Map();

  constructor(videoSelector: string, canvasSelector: string) {
    this.scanner = new QRCodeScanner(videoSelector, canvasSelector);

    this.scanner.onDetected((barcode) => {
      this.checkInAttendee(barcode.rawValue);
    });
  }

  async start(): Promise<void> {
    await this.scanner.start();
  }

  private checkInAttendee(ticketCode: string): void {
    const attendee = this.attendees.get(ticketCode);

    if (!attendee) {
      console.log('Invalid ticket code');
      return;
    }

    if (attendee.checkedIn) {
      console.log('Already checked in');
      return;
    }

    attendee.checkedIn = true;
    attendee.time = Date.now();

    console.log(`Checked in: ${attendee.name}`);
  }

  registerAttendee(ticketCode: string, name: string): void {
    this.attendees.set(ticketCode, { name, checkedIn: false });
  }

  getCheckInStatus(): object {
    return Object.fromEntries(
      Array.from(this.attendees.entries()).map(([code, data]) => [
        code,
        {
          name: data.name,
          checkedIn: data.checkedIn,
          time: data.time ? new Date(data.time).toISOString() : null
        }
      ])
    );
  }

  stop(): void {
    this.scanner.stop();
  }
}

// Usage
const checkIn = new EventCheckInSystem('video', 'canvas');
checkIn.registerAttendee('TICKET001', 'Alice');
checkIn.registerAttendee('TICKET002', 'Bob');

await checkIn.start();
```

## Feature Detection

```typescript
async function checkBarcodeSupport(): Promise<boolean> {
  return 'BarcodeDetector' in window;
}

async function getSupportedFormats(): Promise<BarcodeFormat[]> {
  if (!('BarcodeDetector' in window)) {
    return [];
  }

  return BarcodeDetector.getSupportedFormats();
}

// Usage
const supported = await checkBarcodeSupport();
console.log('Barcode detection supported:', supported);

const formats = await getSupportedFormats();
console.log('Supported formats:', formats);
```

## Error Handling

```typescript
async function robustBarcodeDetection(image: ImageBitmapSource): Promise<DetectedBarcode[]> {
  try {
    if (!('BarcodeDetector' in window)) {
      console.log('BarcodeDetector not supported');
      return [];
    }

    const detector = new BarcodeDetector();
    const barcodes = await detector.detect(image);

    return barcodes;
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotSupportedError':
          console.log('Barcode format not supported');
          break;
        case 'NotReadableError':
          console.log('Failed to read image');
          break;
        default:
          console.error('Barcode detection error:', error.message);
      }
    }
    return [];
  }
}
```

## Browser Support

**Chromium 143+ baseline** — Barcode Detection API is fully supported with various barcode formats.

**Supported formats vary by platform:**
- QR Code: All platforms
- EAN/UPC: Most platforms
- Code-128: Most platforms
- Code-39, Code-93, Codabar: Variable
- Data Matrix, PDF417, Aztec: Variable

Use `BarcodeDetector.getSupportedFormats()` to check at runtime.

## Related APIs

- **Shape Detection API** — Face and text detection
- **MediaStream API** — Access camera
- **Canvas API** — Image drawing and manipulation
- **Fetch API** — Download product info
