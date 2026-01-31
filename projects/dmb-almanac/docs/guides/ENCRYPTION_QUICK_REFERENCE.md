# DMB Almanac Encryption - Quick Reference Card

## 30-Second Overview

Transparent encryption for IndexedDB using AES-256-GCM. Encrypt sensitive user data automatically with zero changes to existing code.

## Installation

```bash
npm install uuid
```

## Quick Start

### 1. Initialize (Call Once)
```typescript
import { initializeEncryption } from '$lib/security/crypto';
await initializeEncryption();
```

### 2. Setup Hooks
```typescript
import { setupEncryptionHooks } from '$lib/db/dexie/encryption';

const setup = setupEncryptionHooks(db);
setup.configure([
  { tableName: 'userAttendedShows', sensitiveFields: ['notes'] },
  { tableName: 'offlineMutationQueue', sensitiveFields: ['body'] }
]);
```

### 3. Use Normally (Auto-Encrypted)
```typescript
// Automatic encryption on write
await db.userAttendedShows.add({
  showId: 123,
  notes: 'Secret notes here' // Auto-encrypted
});

// Automatic decryption on read
const show = await db.userAttendedShows.get(1);
console.log(show.notes); // "Secret notes here" - auto-decrypted
```

## API Cheat Sheet

### Core Encryption
```typescript
// Initialize
await initializeEncryption()

// Encrypt/decrypt
const enc = await encryptValue(data)
const dec = await decryptValue<T>(enc)

// Check status
isEncryptionEnabled()
getEncryptionStats()
await checkEncryptionHealth()
```

### Dexie Integration
```typescript
// Setup
setupEncryptionHooks(db, { debug: true })
encryptionSetup.configure([...])

// Field encryption
await encryptSensitiveFields(obj, ['field1', 'field2'])
await decryptSensitiveFields(obj, ['field1', 'field2'])

// Bulk operations
bulkEncryptFields(items, ['field'])
bulkDecryptFields(items, ['field'])

// Verification
await verifyAllEncryption(db)
await verifySensitiveFieldsEncrypted(db, 'tableName')
```

## Common Tasks

### Encrypt a Field
```typescript
const encrypted = await encryptValue('secret');
// Result: "__ENCRYPTED__{...}#{...}#{...}"
```

### Decrypt a Value
```typescript
const decrypted = await decryptValue<string>(encrypted);
// Result: "secret"
```

### Check if Value is Encrypted
```typescript
if (isEncryptedValue(value)) {
  const plain = await decryptValue(value);
}
```

### Add New Encrypted Field
```typescript
// 1. Update schema
SENSITIVE_FIELDS_SCHEMA = {
  myTable: ['secretField']
}

// 2. Configure
setup.configure([
  { tableName: 'myTable', sensitiveFields: ['secretField'] }
])

// 3. Use normally - encryption automatic
```

### Monitor Encryption
```typescript
const stats = getEncryptionStats();
console.log({
  enabled: stats.enabled,
  fields: stats.encryptedFieldsCount,
  encryptMs: stats.encryptionTime.toFixed(2),
  decryptMs: stats.decryptionTime.toFixed(2)
});
```

### Verify Encryption Working
```typescript
const results = await verifyAllEncryption(db);
if (results.every(r => r.passed)) {
  console.log('✓ All encryption passed');
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "not initialized" error | Call `initializeEncryption()` on startup |
| Decryption fails | Check `isEncryptedValue()` first |
| Performance slow | Encrypt fewer fields, smaller objects |
| sessionStorage cleared | Reload page, re-initialize |

## Security Quick Facts

- **Algorithm:** AES-256-GCM (NIST approved)
- **Key:** 256-bit, generated via PBKDF2
- **IV:** 12 bytes, random per encryption
- **Storage:** sessionStorage only (cleared on close)
- **Protection:** Detects tampering with GCM tag
- **Performance:** <1ms per 1KB, negligible overhead

## File Locations

| File | Purpose |
|------|---------|
| `crypto.ts` | Core encryption |
| `encryption.ts` | Dexie hooks |
| `ENCRYPTION_GUIDE.md` | Detailed guide |
| `encryption-example.ts` | Code examples |
| `encryption.test.ts` | Test suite |

## Currently Encrypted Fields

```
userAttendedShows.notes
offlineMutationQueue.body
telemetryQueue.payload
curatedLists.description
curatedListItems.notes
curatedListItems.metadata
```

## Performance

| Operation | Time |
|-----------|------|
| Encrypt 1KB | <1ms |
| Decrypt 1KB | <1ms |
| Encrypt 100KB | 50-100ms |
| Key generation | 10-50ms |
| Database overhead | 2-3% |

## Key Functions Reference

```typescript
// === Initialization ===
initializeEncryption(): Promise<void>
disableEncryption(): void
isEncryptionEnabled(): boolean

// === Core Encryption ===
encryptValue(value: unknown): Promise<string>
decryptValue<T>(encrypted: string): Promise<T>
encryptSensitiveFields<T>(obj: T, fields: string[]): Promise<T>
decryptSensitiveFields<T>(obj: T, fields: string[]): Promise<T>

// === Dexie Integration ===
setupEncryptionHooks(db: Dexie, options?: EncryptionHookOptions)
verifyAllEncryption(db: Dexie): Promise<VerificationResult[]>
verifySensitiveFieldsEncrypted(db: Dexie, table: string): Promise<VerificationResult>

// === Status & Monitoring ===
isEncryptedValue(value: unknown): boolean
getEncryptionStats(): EncryptionStats
resetEncryptionStats(): void
checkEncryptionHealth(): Promise<HealthCheck>

// === Field Management ===
registerSensitiveFields(schema: Record<string, string[]>): void
isFieldSensitive(table: string, field: string): boolean
getSensitiveFields(): string[]

// === Bulk Operations ===
bulkEncryptFields(items: Record[], fields: string[]): Promise<Record[]>
bulkDecryptFields(items: Record[], fields: string[]): Promise<Record[]>
```

## Configuration Template

```typescript
// In your database setup
import { setupEncryptionHooks } from '$lib/db/dexie/encryption';

const encryptionSetup = setupEncryptionHooks(db, {
  debug: process.env.NODE_ENV === 'development',
  onError: (error, context) => {
    console.error(`Encryption error: ${context.operation}`, error);
    // Send to error tracking
  }
});

encryptionSetup.configure([
  {
    tableName: 'userAttendedShows',
    sensitiveFields: ['notes'],
    debug: true
  },
  {
    tableName: 'offlineMutationQueue',
    sensitiveFields: ['body']
  },
  {
    tableName: 'telemetryQueue',
    sensitiveFields: ['payload']
  },
  {
    tableName: 'curatedLists',
    sensitiveFields: ['description']
  },
  {
    tableName: 'curatedListItems',
    sensitiveFields: ['notes', 'metadata']
  }
]);
```

## Testing Template

```typescript
import { initializeEncryption, encryptValue, decryptValue } from '$lib/security/crypto';

describe('Encryption', () => {
  beforeEach(async () => {
    await initializeEncryption();
  });

  it('encrypts and decrypts', async () => {
    const data = { secret: 'test' };
    const encrypted = await encryptValue(data);
    const decrypted = await decryptValue(encrypted);
    expect(decrypted).toEqual(data);
  });
});
```

## Deployment Checklist

- [ ] UUID package installed
- [ ] Encryption initialized on startup
- [ ] Hooks configured for tables
- [ ] Tests passing
- [ ] Verification tools working
- [ ] Health check passing
- [ ] Debug logging disabled
- [ ] HTTPS enabled in production
- [ ] CSP headers configured
- [ ] Error tracking integrated

## Production Tips

1. **Initialize Early:** Call `initializeEncryption()` before any DB access
2. **Setup Hooks:** Configure encryption during app initialization
3. **Monitor:** Use `checkEncryptionHealth()` on startup
4. **Log Errors:** Setup `onError` callback for error tracking
5. **Audit:** Run `verifyAllEncryption()` periodically in admin panel
6. **Update:** Keep Web Crypto API info current for latest browsers

## Resources

| Resource | Link |
|----------|------|
| Implementation Guide | `ENCRYPTION_IMPLEMENTATION_README.md` |
| Detailed Guide | `/app/src/lib/db/dexie/ENCRYPTION_GUIDE.md` |
| Security Policy | `ENCRYPTION_SECURITY_POLICY.md` |
| Code Examples | `/app/src/lib/db/dexie/encryption-example.ts` |
| Test Suite | `/app/src/lib/db/dexie/encryption.test.ts` |

## Browser Support

✓ Chrome 143+
✓ Edge 143+
✓ Firefox 119+
✓ Safari 15.2+

All modern browsers supported. No polyfills needed.

## Support

**Questions?** See `ENCRYPTION_GUIDE.md` or `encryption-example.ts`
**Issues?** Check troubleshooting section above
**Security?** Review `ENCRYPTION_SECURITY_POLICY.md`

---

**Quick Links:**
- [Implementation Guide](ENCRYPTION_IMPLEMENTATION_README.md)
- [Detailed Guide](/app/src/lib/db/dexie/ENCRYPTION_GUIDE.md)
- [Security Policy](ENCRYPTION_SECURITY_POLICY.md)
- [Summary](ENCRYPTION_SUMMARY.md)
