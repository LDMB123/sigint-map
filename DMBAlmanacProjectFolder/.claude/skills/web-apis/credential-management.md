---
title: Credential Management API
category: Web APIs
tags: [authentication, credentials, passkeys, chromium143+]
description: Store and retrieve credentials including WebAuthn/Passkeys
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Credential Management API

Provides secure credential storage and retrieval, integrating with the browser's native credential management system and supporting WebAuthn passkeys.

## When to Use

- **Passwordless authentication** — WebAuthn/Passkeys
- **Auto-fill passwords** — Stored credentials
- **Single sign-on** — Federated credentials
- **Biometric authentication** — Fingerprint/Face ID
- **Reduce login friction** — One-click sign-in
- **Seamless re-authentication** — Automatic credential retrieval

## Core Concepts

```typescript
interface Credential {
  id: string;
  type: string;
}

interface PasswordCredential extends Credential {
  type: 'password';
  name?: string;
  iconURL?: string;
  id: string;
  password: string;
}

interface FederatedCredential extends Credential {
  type: 'federated';
  name?: string;
  iconURL?: string;
  id: string;
  protocol: string;
  provider: string;
}

interface CredentialsContainer {
  create(options: CredentialCreationOptions): Promise<Credential | null>;
  get(options?: CredentialRequestOptions): Promise<Credential | null>;
  store(credential: Credential): Promise<Credential>;
  preventSilentAccess(): Promise<void>;
}

interface CredentialCreationOptions {
  password?: PasswordCredentialInit;
  federated?: FederatedCredentialInit;
  publicKey?: PublicKeyCredentialCreationOptions;
  signal?: AbortSignal;
}

interface CredentialRequestOptions {
  password?: boolean;
  federated?: FederatedCredentialRequestOptions;
  publicKey?: PublicKeyCredentialRequestOptions;
  mediation?: 'silent' | 'optional' | 'conditional' | 'required';
  signal?: AbortSignal;
}
```

## WebAuthn Passkeys

### Register New Passkey

```typescript
async function registerPasskey(username: string): Promise<void> {
  // First, get challenge from server
  const challengeResponse = await fetch('/api/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  const { challenge, userId } = await challengeResponse.json();

  try {
    // Create credential
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new TextEncoder().encode(challenge),
        rp: {
          name: 'My App',
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        timeout: 60000,
        attestation: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use platform authenticator (Face ID, Touch ID)
          residentKey: 'preferred', // Save credential on device
          userVerification: 'preferred'
        }
      }
    });

    if (!credential) {
      console.log('Passkey registration cancelled');
      return;
    }

    // Send credential to server for verification
    const registrationResponse = await fetch('/api/register-passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: credential.id,
        rawId: Array.from(new Uint8Array((credential as any).rawId)),
        response: {
          clientDataJSON: Array.from(
            new Uint8Array((credential.response as any).clientDataJSON)
          ),
          attestationObject: Array.from(
            new Uint8Array((credential.response as any).attestationObject)
          )
        },
        type: credential.type
      })
    });

    const result = await registrationResponse.json();

    if (result.success) {
      console.log('Passkey registered successfully');
    } else {
      console.log('Passkey registration failed:', result.error);
    }
  } catch (error) {
    console.error('Registration error:', error);
  }
}
```

### Authenticate with Passkey

```typescript
async function authenticateWithPasskey(username?: string): Promise<void> {
  // Get challenge from server
  const challengeResponse = await fetch('/api/auth-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  const { challenge, allowCredentials } = await challengeResponse.json();

  try {
    // Get credential (user's passkey)
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: new TextEncoder().encode(challenge),
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials: allowCredentials?.map((cred: any) => ({
          type: 'public-key',
          id: new Uint8Array(cred.id),
          transports: cred.transports
        })) || []
      },
      mediation: 'optional' // Optional for user selection
    });

    if (!assertion) {
      console.log('Authentication cancelled');
      return;
    }

    // Send assertion to server for verification
    const authResponse = await fetch('/api/authenticate-passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: assertion.id,
        rawId: Array.from(new Uint8Array((assertion as any).rawId)),
        response: {
          clientDataJSON: Array.from(
            new Uint8Array((assertion.response as any).clientDataJSON)
          ),
          authenticatorData: Array.from(
            new Uint8Array((assertion.response as any).authenticatorData)
          ),
          signature: Array.from(
            new Uint8Array((assertion.response as any).signature)
          ),
          userHandle: Array.from(
            new Uint8Array((assertion.response as any).userHandle || [])
          )
        },
        type: assertion.type
      })
    });

    const result = await authResponse.json();

    if (result.success) {
      console.log('Authentication successful');
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      console.log('Authentication failed:', result.error);
    }
  } catch (error) {
    console.error('Authentication error:', error);
  }
}
```

### Conditional UI (Autofill)

```typescript
async function setupConditionalUI(): Promise<void> {
  try {
    // Request credential with conditional UI (autofill)
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new TextEncoder().encode('challenge-string'),
        timeout: 60000,
        userVerification: 'preferred'
      },
      mediation: 'conditional' // Show in autofill UI
    });

    if (credential) {
      console.log('User selected passkey from autofill');
      // Process authentication
    }
  } catch (error) {
    console.error('Conditional UI error:', error);
  }
}

// Add autocomplete attribute to input for better UX
const usernameInput = document.querySelector<HTMLInputElement>(
  'input[name="username"]'
);
if (usernameInput) {
  usernameInput.autocomplete = 'username webauthn';
}
```

## Password Credentials

### Store Password

```typescript
async function storePassword(
  username: string,
  password: string
): Promise<void> {
  const credential = new PasswordCredential({
    id: username,
    password,
    name: username,
    iconURL: '/user-icon.png'
  });

  try {
    // Store in browser credential manager
    await navigator.credentials.store(credential);
    console.log('Password stored');
  } catch (error) {
    console.error('Failed to store password:', error);
  }
}

// Usage: After user creates account
// await storePassword(username, password);
```

### Retrieve Stored Password

```typescript
async function getStoredPassword(): Promise<PasswordCredential | null> {
  try {
    const credential = await navigator.credentials.get({
      password: true,
      mediation: 'optional'
    });

    if (credential instanceof PasswordCredential) {
      return credential;
    }

    return null;
  } catch (error) {
    console.error('Failed to retrieve password:', error);
    return null;
  }
}

// Usage: On login page load
const stored = await getStoredPassword();
if (stored) {
  const usernameInput = document.querySelector<HTMLInputElement>(
    'input[name="username"]'
  );
  const passwordInput = document.querySelector<HTMLInputElement>(
    'input[name="password"]'
  );

  if (usernameInput) usernameInput.value = stored.id;
  if (passwordInput) passwordInput.value = stored.password;
}
```

## Federated Credentials

### Store Federated Credential

```typescript
async function storeFederatedCredential(
  provider: string,
  email: string
): Promise<void> {
  const credential = new FederatedCredential({
    id: email,
    name: email,
    provider, // e.g., 'https://accounts.google.com'
    protocol: 'openidconnect',
    iconURL: '/google-icon.png'
  });

  try {
    await navigator.credentials.store(credential);
    console.log('Federated credential stored');
  } catch (error) {
    console.error('Failed to store federated credential:', error);
  }
}

// Usage: After OAuth login
// await storeFederatedCredential('https://accounts.google.com', user@example.com);
```

### Get Federated Credentials

```typescript
async function getFederatedCredentials(): Promise<FederatedCredential[]> {
  try {
    const credentials = await navigator.credentials.get({
      federated: {
        providers: [
          'https://accounts.google.com',
          'https://www.facebook.com'
        ]
      },
      mediation: 'optional'
    });

    if (credentials instanceof FederatedCredential) {
      return [credentials];
    }

    return [];
  } catch (error) {
    console.error('Failed to get federated credentials:', error);
    return [];
  }
}
```

## Advanced Patterns

### Seamless Authentication Flow

```typescript
class SeamlessAuth {
  async silentSignIn(): Promise<boolean> {
    try {
      // Try to get credential without user interaction
      const credential = await navigator.credentials.get({
        password: true,
        publicKey: {
          challenge: new TextEncoder().encode('challenge'),
          timeout: 30000
        },
        mediation: 'silent' // No UI shown
      });

      if (credential) {
        return this.authenticate(credential);
      }

      return false;
    } catch {
      return false;
    }
  }

  async interactiveSignIn(): Promise<boolean> {
    try {
      const credential = await navigator.credentials.get({
        password: true,
        publicKey: {
          challenge: new TextEncoder().encode('challenge'),
          timeout: 60000
        },
        mediation: 'optional' // Show UI if needed
      });

      if (credential) {
        return this.authenticate(credential);
      }

      return false;
    } catch {
      return false;
    }
  }

  private async authenticate(credential: Credential): Promise<boolean> {
    // Send credential to server
    const response = await fetch('/api/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: {
          id: credential.id,
          type: credential.type
        }
      })
    });

    return response.ok;
  }

  async preventSilentAccess(): Promise<void> {
    // Prevent automatic sign-in after logout
    await navigator.credentials.preventSilentAccess();
  }
}

const auth = new SeamlessAuth();

// On page load
if (!isUserLoggedIn()) {
  // Try silent sign-in first (no UI)
  const signedIn = await auth.silentSignIn();

  if (!signedIn) {
    // Show login form
    showLoginForm();
  }
}
```

### Login Form Integration

```typescript
class LoginForm {
  private usernameInput: HTMLInputElement;
  private passwordInput: HTMLInputElement;
  private form: HTMLFormElement;

  constructor(
    formSelector: string,
    usernameSelector: string,
    passwordSelector: string
  ) {
    this.form = document.querySelector(formSelector) as HTMLFormElement;
    this.usernameInput = this.form.querySelector(
      usernameSelector
    ) as HTMLInputElement;
    this.passwordInput = this.form.querySelector(
      passwordSelector
    ) as HTMLInputElement;

    this.setupAutocomplete();
    this.setupFormSubmit();
  }

  private setupAutocomplete(): void {
    this.usernameInput.autocomplete = 'username webauthn';
    this.passwordInput.autocomplete = 'current-password';
  }

  private setupFormSubmit(): void {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = this.usernameInput.value;
      const password = this.passwordInput.value;

      const success = await this.authenticate(username, password);

      if (success) {
        // Store credentials for future use
        await navigator.credentials.store(
          new PasswordCredential({
            id: username,
            password,
            name: username
          })
        );

        // Redirect
        window.location.href = '/dashboard';
      } else {
        alert('Login failed');
      }
    });
  }

  private async authenticate(username: string, password: string): Promise<boolean> {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    return response.ok;
  }
}

// Initialize
new LoginForm('form#login', 'input[name="username"]', 'input[name="password"]');
```

### Logout Cleanup

```typescript
async function secureLogout(): Promise<void> {
  // Clear cached credentials to prevent automatic sign-in
  await navigator.credentials.preventSilentAccess();

  // Clear session
  await fetch('/api/logout', { method: 'POST' });

  // Redirect to home
  window.location.href = '/';
}

// Usage
document.querySelector('.logout-button')?.addEventListener('click', secureLogout);
```

## Error Handling

```typescript
async function robustCredentialGet(): Promise<Credential | null> {
  try {
    const credential = await navigator.credentials.get({
      password: true,
      mediation: 'optional'
    });

    return credential;
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          console.log('User cancelled credential request');
          break;
        case 'InvalidStateError':
          console.log('Document not fully active');
          break;
        case 'AbortError':
          console.log('Credential request aborted');
          break;
        default:
          console.error('Credential error:', error.message);
      }
    }
    return null;
  }
}
```

## Browser Support

**Chromium 143+ baseline** — Credential Management API is fully supported including WebAuthn, password credentials, and federated credentials.

**Features:**
- WebAuthn (FIDO2): All modern browsers
- Password credentials: All modern browsers
- Federated credentials: Chrome, Edge
- Conditional UI: Chrome 108+

## Related APIs

- **Web Authentication API (WebAuthn)** — Detailed passkey operations
- **Fetch API** — Send credentials to server
- **Permissions API** — Request biometric permission
- **Storage API** — Persistent credential storage
