# Encryption Security Policy (Condensed)

Status: Implemented for current Chromium-targeted runtime.

## Security Objective

Protect sensitive user-originated local data at rest while preserving application functionality and offline behavior.

## Crypto Profile

- Algorithm: AES-256-GCM (Web Crypto API)
- IV: random per operation (96-bit)
- Authenticated encryption: enabled (GCM tag validation)
- Key derivation: PBKDF2 (SHA-256, high iteration count)

## Data Classification

Encrypted:
- User notes/preferences and mutation/telemetry payload-like sensitive fields.

Not encrypted:
- Public reference content and index-critical fields needed for query performance.

## Key Management (Current)

- Session-scoped key lifecycle.
- No plaintext key persistence to long-lived storage.
- Key loss/session reset implies local encrypted data may become unreadable without re-initialization flow.

## Threat Coverage

Mitigates:
- Casual local data inspection and at-rest extraction of plaintext values.

Does not fully mitigate:
- Active in-session script compromise (XSS-class runtime compromise).
- Transport/server compromise classes (handled by separate controls).

## Operational Controls

- Fail-closed behavior on crypto errors.
- Health/verification checks for encrypted-field consistency.
- Production logging must avoid plaintext sensitive payloads.

## Compliance Mapping (High-Level)

- OWASP encryption guidance alignment (strong algorithm, random IV, authenticated mode).
- NIST-aligned primitives for GCM and KDF usage.

## Developer Usage

- Initialize encryption once at app startup.
- Keep encryption hooks/table field mappings explicit.
- Verify health after schema or hook changes.

## Incident Response (Short)

- Suspected key/session compromise: clear session state, rotate session context, re-authenticate where applicable.
- Suspected corruption: isolate affected records, rehydrate/rebuild from trusted source when possible.

## Future Hardening

- Password-backed key derivation/rotation UX.
- Safer recovery flows for session key loss.
- Optional encrypted backup/sync patterns with explicit trust boundaries.

## Canonical References

- Current operational state: `STATUS.md`
- Security-related runbooks and audits: `docs/reports/README.md`

## Note

This condensed policy replaces a longer writeup to reduce token overhead while retaining implementation-level security intent.
