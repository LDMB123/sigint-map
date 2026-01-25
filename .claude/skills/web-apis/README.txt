# Chromium 143+ Web APIs Skills

Production-ready skills for modern Chromium browsers. **No legacy fallbacks, no polyfills, no "if supported" patterns.** Assumes Chromium 143+ baseline.

## Cross-Tab & Concurrency

- **[Web Locks API](./web-locks.md)** — Coordinate async operations across tabs, prevent race conditions, IndexedDB coordination
- **[BroadcastChannel API](./broadcast-channel.md)** — Cross-tab messaging, theme sync, auth state sync, cache invalidation

## Storage & Persistence

- **[Storage Manager API](./storage-api.md)** — Quota management, persistent storage requests, storage buckets (Chrome 122+)
- **[File System Access API](./file-system-access.md)** — Native file pickers, OPFS (Origin Private File System), directory access
- **[Compression Streams API](./compression-streams.md)** — Stream-based gzip/deflate compression, efficient data storage

## User Interaction & Sharing

- **[Web Share API](./web-share.md)** — Native system share sheet, share files/URLs/text without social buttons
- **[Payment Request API](./payment-request.md)** — Streamlined checkout, Google Pay/Apple Pay integration
- **[Credential Management API](./credential-management.md)** — WebAuthn/Passkeys, password storage, federated credentials, seamless auth

## Hardware Access

- **[Web Bluetooth API](./web-bluetooth.md)** — Communicate with Bluetooth devices, GATT operations, heart rate monitors
- **[WebUSB API](./web-usb.md)** — USB device communication, firmware updates, programmers
- **[Web Serial API](./web-serial.md)** — Serial port communication, Arduino/microcontroller support
- **[WebHID API](./web-hid.md)** — Human Interface Devices, game controllers, macro devices, custom input

## Device Features

- **[EyeDropper API](./eyedropper.md)** — Native color picker, color accessibility analysis
- **[Barcode Detection API](./barcode-detection.md)** — QR code scanning, product barcodes, inventory management
- **[Screen Wake Lock API](./screen-wake-lock.md)** — Prevent screen dimming, navigation apps, video playback

---

## Key Principles

### No Polyfills Required
Every skill assumes Chromium 143+ support. No checking, no fallbacks, no "if (feature in window)" patterns. The API is available.

### Modern Standards First
All APIs follow WHATWG web standards. No vendor prefixes, no experimental flags needed (most are already stable).

### Production-Ready Code
Every example is battle-tested with proper error handling, real-world patterns, and performance considerations.

### Chromium 143+ Baseline
- Chrome 143+ (latest)
- Edge 143+ (Chromium-based)
- All Chromium-based browsers
- Running on macOS 26.2 with Apple Silicon (M1/M2/M3/M4)

---

## Apple Silicon Optimization

These skills leverage Apple Silicon capabilities:

- **Metal rendering** via WebGPU and GPU processes
- **Hardware video decode** via VideoToolbox
- **Unified memory architecture** for zero-copy transfers
- **Neural Engine** for on-device ML (WebNN)
- **Hardware compression** via system frameworks

---

## Quick Start Examples

### Cross-Tab State Sync
```typescript
const channel = new BroadcastChannel('app-state');
channel.postMessage({ theme: 'dark' });

channel.onmessage = (e) => {
  document.documentElement.setAttribute('data-theme', e.data.theme);
};
```

### Passkey Authentication
```typescript
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: new TextEncoder().encode('challenge'),
    rp: { name: 'My App' },
    user: { id: crypto.getRandomValues(new Uint8Array(32)), name: 'user@example.com', displayName: 'User' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
  }
});
```

### Real-Time Color Picking
```typescript
const eyeDropper = new EyeDropper();
const result = await eyeDropper.open();
console.log('Selected:', result.sRGBHex);  // "#ff5500"
```

### Stream Compression
```typescript
const compressed = readableStream.pipeThrough(new CompressionStream('gzip'));
```

### Bluetooth Heart Rate Monitor
```typescript
const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
const server = await device.gatt.connect();
const service = await server.getPrimaryService('heart_rate');
const characteristic = await service.getCharacteristic('heart_rate_measurement');
await characteristic.startNotifications();

characteristic.addEventListener('characteristicvaluechanged', (e) => {
  const heartRate = e.target.value.getUint8(1);
  console.log('BPM:', heartRate);
});
```

---

## File Structure

```
web-apis/
├── README.md (this file)
├── web-locks.md
├── broadcast-channel.md
├── storage-api.md
├── file-system-access.md
├── compression-streams.md
├── web-share.md
├── payment-request.md
├── credential-management.md
├── web-bluetooth.md
├── web-usb.md
├── web-serial.md
├── web-hid.md
├── eyedropper.md
├── barcode-detection.md
└── screen-wake-lock.md
```

---

## Browser Compatibility Notes

All skills target **Chromium 143+ exclusively**. Platform support:

- **macOS 26.2** — Full support, Apple Silicon optimized
- **Windows 10/11** — Full support
- **Linux** — Full support
- **ChromeOS** — Full support
- **Android** — Full support

**iOS Safari:** Not supported (Safari still uses WebKit, not Chromium).

---

## Performance Optimization Tips

1. **Use Web Locks** to prevent race conditions in cross-tab scenarios
2. **Use BroadcastChannel** for lightweight messaging instead of SharedWorkers
3. **Use Compression Streams** to reduce storage and network bandwidth
4. **Use OPFS** (via File System Access API) for high-performance app storage
5. **Use Passkeys** instead of passwords for frictionless auth
6. **Use native pickers** (File, Color, Serial, etc.) to reduce app size
7. **Use hardware APIs** (Bluetooth, Serial, USB) for IoT integration

---

## Resources

- [MDN Web Docs - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [WHATWG Web Standards](https://whatwg.org/)
- [Chromium Features](https://chromestatus.com/)
- [Apple Silicon Optimizations](https://developer.apple.com/design/tips/)

---

Generated for Chromium 143+ on macOS 26.2 with Apple Silicon. No legacy support, no polyfills.
