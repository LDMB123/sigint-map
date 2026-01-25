---
description: Authentication provider integrations including OAuth 2.0, OIDC, social sign-in (Google, Apple), Passkeys/WebAuthn, and session management
tags: [auth, oauth, oidc, google-signin, apple-signin, passkeys, webauthn, jwt, session]
globs: ["**/auth/**/*.ts", "**/authentication/**/*.ts"]
---

# Authentication Providers Integration

## OAuth 2.0 / OIDC Base Implementation

```typescript
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint?: string;
  scopes: string[];
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

interface UserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  [key: string]: any;
}

class OAuth2Client {
  constructor(private config: OAuthConfig) {}

  generateAuthUrl(state?: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: state || this.generateState(),
    });

    // PKCE support
    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string
  ): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    if (!this.config.userInfoEndpoint) {
      throw new Error('UserInfo endpoint not configured');
    }

    const response = await fetch(this.config.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  private generateState(): string {
    return crypto.randomUUID();
  }

  // PKCE helpers
  async generatePKCEChallenge(): Promise<{ verifier: string; challenge: string }> {
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);

    return { verifier, challenge };
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  private base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}
```

## Google Sign-In

```typescript
interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

class GoogleSignInClient extends OAuth2Client {
  constructor(config: GoogleOAuthConfig) {
    super({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: config.scopes || [
        'openid',
        'email',
        'profile',
      ],
    });
  }

  generateAuthUrl(options?: {
    state?: string;
    prompt?: 'none' | 'consent' | 'select_account';
    accessType?: 'online' | 'offline';
  }): string {
    const baseUrl = super.generateAuthUrl(options?.state);
    const url = new URL(baseUrl);

    if (options?.prompt) {
      url.searchParams.set('prompt', options.prompt);
    }

    if (options?.accessType) {
      url.searchParams.set('access_type', options.accessType);
    }

    return url.toString();
  }

  async verifyIdToken(idToken: string): Promise<any> {
    // Verify Google ID token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) {
      throw new Error('Invalid ID token');
    }

    const payload = await response.json();

    // Verify audience matches your client ID
    if (payload.aud !== this.config.clientId) {
      throw new Error('Invalid token audience');
    }

    return payload;
  }
}

// Express.js integration
import express from 'express';

const app = express();
const googleClient = new GoogleSignInClient({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.BASE_URL}/auth/google/callback`,
  scopes: ['openid', 'email', 'profile'],
});

app.get('/auth/google', (req, res) => {
  const state = crypto.randomUUID();

  // Store state in session for CSRF protection
  req.session.oauthState = state;

  const authUrl = googleClient.generateAuthUrl({
    state,
    prompt: 'select_account',
    accessType: 'offline', // Get refresh token
  });

  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  // Verify state to prevent CSRF
  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state parameter');
  }

  try {
    const tokens = await googleClient.exchangeCodeForTokens(code as string);
    const userInfo = await googleClient.getUserInfo(tokens.access_token);

    // Create or update user in database
    const user = await findOrCreateUser({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      googleId: userInfo.sub,
    });

    // Store tokens securely (encrypted)
    if (tokens.refresh_token) {
      await storeRefreshToken(user.id, tokens.refresh_token);
    }

    // Create session
    req.session.userId = user.id;

    res.redirect('/dashboard');
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.redirect('/auth/error');
  }
});

// Helper functions (implement based on your database)
async function findOrCreateUser(data: any) {
  // Find or create user
  return { id: '123' };
}

async function storeRefreshToken(userId: string, refreshToken: string) {
  // Store encrypted refresh token
}
```

## Apple Sign-In

```typescript
interface AppleOAuthConfig {
  clientId: string; // Service ID
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUri: string;
}

class AppleSignInClient {
  constructor(private config: AppleOAuthConfig) {}

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      response_mode: 'form_post',
      scope: 'name email',
      state: state || crypto.randomUUID(),
    });

    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const clientSecret = await this.generateClientSecret();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    });

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Apple token exchange failed: ${error.error}`);
    }

    return response.json();
  }

  async verifyIdToken(idToken: string): Promise<any> {
    // Decode JWT without verification to get header
    const [headerB64] = idToken.split('.');
    const header = JSON.parse(atob(headerB64));

    // Get Apple's public keys
    const keysResponse = await fetch('https://appleid.apple.com/auth/keys');
    const { keys } = await keysResponse.json();

    // Find matching key
    const key = keys.find((k: any) => k.kid === header.kid);
    if (!key) {
      throw new Error('No matching key found');
    }

    // Verify signature using Web Crypto API or jose library
    // For production, use a JWT library like 'jose'
    const payload = this.decodeJWT(idToken);

    // Verify claims
    if (payload.iss !== 'https://appleid.apple.com') {
      throw new Error('Invalid issuer');
    }

    if (payload.aud !== this.config.clientId) {
      throw new Error('Invalid audience');
    }

    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload;
  }

  private async generateClientSecret(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'ES256',
      kid: this.config.keyId,
    };

    const payload = {
      iss: this.config.teamId,
      iat: now,
      exp: now + 86400 * 180, // 6 months
      aud: 'https://appleid.apple.com',
      sub: this.config.clientId,
    };

    // Sign JWT using ES256 algorithm
    // In production, use a library like 'jose' or 'jsonwebtoken'
    return this.signJWT(header, payload, this.config.privateKey);
  }

  private async signJWT(header: any, payload: any, privateKey: string): Promise<string> {
    const encoder = new TextEncoder();

    // Import private key
    const key = await crypto.subtle.importKey(
      'pkcs8',
      this.pemToArrayBuffer(privateKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const headerB64 = this.base64URLEncode(JSON.stringify(header));
    const payloadB64 = this.base64URLEncode(JSON.stringify(payload));
    const message = `${headerB64}.${payloadB64}`;

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      encoder.encode(message)
    );

    const signatureB64 = this.base64URLEncode(new Uint8Array(signature));

    return `${message}.${signatureB64}`;
  }

  private decodeJWT(token: string): any {
    const [, payloadB64] = token.split('.');
    return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  }

  private base64URLEncode(data: string | Uint8Array): string {
    const base64 = typeof data === 'string'
      ? btoa(data)
      : btoa(String.fromCharCode(...data));

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  }
}

// Express.js integration
const appleClient = new AppleSignInClient({
  clientId: process.env.APPLE_CLIENT_ID!,
  teamId: process.env.APPLE_TEAM_ID!,
  keyId: process.env.APPLE_KEY_ID!,
  privateKey: process.env.APPLE_PRIVATE_KEY!,
  redirectUri: `${process.env.BASE_URL}/auth/apple/callback`,
});

app.get('/auth/apple', (req, res) => {
  const state = crypto.randomUUID();
  req.session.oauthState = state;

  const authUrl = appleClient.generateAuthUrl(state);
  res.redirect(authUrl);
});

app.post('/auth/apple/callback', async (req, res) => {
  const { code, state, user } = req.body;

  if (state !== req.session.oauthState) {
    return res.status(400).send('Invalid state parameter');
  }

  try {
    const tokens = await appleClient.exchangeCodeForTokens(code);
    const idTokenPayload = await appleClient.verifyIdToken(tokens.id_token!);

    // Parse user data (only sent on first authorization)
    let userData = null;
    if (user) {
      userData = JSON.parse(user);
    }

    const userRecord = await findOrCreateUser({
      appleId: idTokenPayload.sub,
      email: idTokenPayload.email,
      emailVerified: idTokenPayload.email_verified === 'true',
      name: userData?.name
        ? `${userData.name.firstName} ${userData.name.lastName}`
        : null,
    });

    req.session.userId = userRecord.id;
    res.redirect('/dashboard');
  } catch (error: any) {
    console.error('Apple auth error:', error);
    res.redirect('/auth/error');
  }
});
```

## Passkeys / WebAuthn

```typescript
interface RegistrationOptions {
  challenge: Uint8Array;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: Uint8Array;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    residentKey?: 'required' | 'preferred' | 'discouraged';
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
  timeout?: number;
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
}

interface AuthenticationOptions {
  challenge: Uint8Array;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    type: 'public-key';
    id: Uint8Array;
    transports?: Array<'usb' | 'nfc' | 'ble' | 'internal'>;
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

class PasskeyManager {
  constructor(
    private rpName: string,
    private rpId: string
  ) {}

  // Backend: Generate registration options
  generateRegistrationOptions(user: {
    id: string;
    email: string;
    name: string;
  }): RegistrationOptions {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    return {
      challenge,
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: new TextEncoder().encode(user.id),
        name: user.email,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID)
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    };
  }

  // Frontend: Register passkey
  async registerPasskey(options: RegistrationOptions): Promise<any> {
    const credential = await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: options.challenge,
        user: {
          ...options.user,
          id: options.user.id,
        },
      },
    });

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    return credential;
  }

  // Backend: Generate authentication options
  generateAuthenticationOptions(
    allowedCredentials?: Array<{ id: string; transports?: string[] }>
  ): AuthenticationOptions {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    return {
      challenge,
      rpId: this.rpId,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: allowedCredentials?.map(cred => ({
        type: 'public-key' as const,
        id: new TextEncoder().encode(cred.id),
        transports: cred.transports as any,
      })),
    };
  }

  // Frontend: Authenticate with passkey
  async authenticateWithPasskey(options: AuthenticationOptions): Promise<any> {
    const credential = await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: options.challenge,
      },
    });

    if (!credential) {
      throw new Error('Authentication failed');
    }

    return credential;
  }

  // Backend: Verify registration
  async verifyRegistration(
    credential: any,
    expectedChallenge: Uint8Array
  ): Promise<{ credentialId: string; publicKey: string; counter: number }> {
    // In production, use @simplewebauthn/server or similar library
    // This is a simplified example

    const response = credential.response;
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(response.clientDataJSON)
    );

    // Verify challenge
    const receivedChallenge = new Uint8Array(
      Buffer.from(clientDataJSON.challenge, 'base64')
    );

    if (!this.arrayEquals(receivedChallenge, expectedChallenge)) {
      throw new Error('Challenge mismatch');
    }

    // Verify origin
    const expectedOrigin = `https://${this.rpId}`;
    if (clientDataJSON.origin !== expectedOrigin) {
      throw new Error('Origin mismatch');
    }

    // Extract public key and credential ID
    const credentialId = Buffer.from(credential.rawId).toString('base64');
    const publicKey = this.extractPublicKey(response.attestationObject);

    return {
      credentialId,
      publicKey,
      counter: 0,
    };
  }

  // Backend: Verify authentication
  async verifyAuthentication(
    credential: any,
    expectedChallenge: Uint8Array,
    storedPublicKey: string
  ): Promise<{ verified: boolean; counter: number }> {
    // In production, use @simplewebauthn/server
    // This is a simplified example

    const response = credential.response;
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(response.clientDataJSON)
    );

    // Verify challenge
    const receivedChallenge = new Uint8Array(
      Buffer.from(clientDataJSON.challenge, 'base64')
    );

    if (!this.arrayEquals(receivedChallenge, expectedChallenge)) {
      throw new Error('Challenge mismatch');
    }

    // Verify signature (simplified - use proper library in production)
    const verified = true; // Implement actual signature verification

    return {
      verified,
      counter: 0,
    };
  }

  private extractPublicKey(attestationObject: ArrayBuffer): string {
    // Implement CBOR decoding and public key extraction
    // Use a library like 'cbor' in production
    return 'base64-encoded-public-key';
  }

  private arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

// Express.js integration
const passkeyManager = new PasskeyManager('My App', 'example.com');

app.post('/auth/passkey/register/options', async (req, res) => {
  const user = await getCurrentUser(req);

  const options = passkeyManager.generateRegistrationOptions(user);

  // Store challenge in session
  req.session.challenge = Buffer.from(options.challenge).toString('base64');

  // Convert Uint8Arrays to base64 for JSON serialization
  res.json({
    ...options,
    challenge: Buffer.from(options.challenge).toString('base64'),
    user: {
      ...options.user,
      id: Buffer.from(options.user.id).toString('base64'),
    },
  });
});

app.post('/auth/passkey/register/verify', async (req, res) => {
  const { credential } = req.body;
  const expectedChallenge = new Uint8Array(
    Buffer.from(req.session.challenge, 'base64')
  );

  try {
    const verification = await passkeyManager.verifyRegistration(
      credential,
      expectedChallenge
    );

    // Store credential in database
    await storePasskey({
      userId: req.session.userId,
      credentialId: verification.credentialId,
      publicKey: verification.publicKey,
      counter: verification.counter,
    });

    res.json({ verified: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

async function getCurrentUser(req: any) {
  return { id: '123', email: 'user@example.com', name: 'User' };
}

async function storePasskey(data: any) {
  // Store in database
}
```

## Session Management

```typescript
interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  createdAt: number;
  lastActiveAt: number;
  userAgent?: string;
  ipAddress?: string;
}

class SessionManager {
  private sessions = new Map<string, Session>();

  async createSession(params: {
    userId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    const session: Session = {
      id: crypto.randomUUID(),
      userId: params.userId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: Date.now() + params.expiresIn * 1000,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    };

    this.sessions.set(session.id, session);

    // Store in database
    await this.persistSession(session);

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      // Try loading from database
      return this.loadSession(sessionId);
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      await this.deleteSession(sessionId);
      return null;
    }

    // Update last active
    session.lastActiveAt = Date.now();
    await this.persistSession(session);

    return session;
  }

  async refreshSession(sessionId: string, newAccessToken: string, expiresIn: number): Promise<Session | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    session.accessToken = newAccessToken;
    session.expiresAt = Date.now() + expiresIn * 1000;
    session.lastActiveAt = Date.now();

    await this.persistSession(session);

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await this.removeSession(sessionId);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const userSessions = Array.from(this.sessions.values()).filter(
      s => s.userId === userId
    );

    for (const session of userSessions) {
      await this.deleteSession(session.id);
    }
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      s => s.userId === userId && s.expiresAt > Date.now()
    );
  }

  private async persistSession(session: Session): Promise<void> {
    // Store in database (Redis, PostgreSQL, etc.)
  }

  private async loadSession(sessionId: string): Promise<Session | null> {
    // Load from database
    return null;
  }

  private async removeSession(sessionId: string): Promise<void> {
    // Remove from database
  }
}

// Express.js middleware
const sessionManager = new SessionManager();

app.use(async (req, res, next) => {
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    const session = await sessionManager.getSession(sessionId);

    if (session) {
      req.session = session;
      req.userId = session.userId;
    } else {
      // Clear invalid session cookie
      res.clearCookie('sessionId');
    }
  }

  next();
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Verify credentials
  const user = await verifyCredentials(email, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session
  const session = await sessionManager.createSession({
    userId: user.id,
    accessToken: await generateAccessToken(user),
    expiresIn: 86400, // 24 hours
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  // Set secure cookie
  res.cookie('sessionId', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000, // 24 hours
  });

  res.json({ success: true, user });
});

// Logout endpoint
app.post('/auth/logout', async (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    await sessionManager.deleteSession(sessionId);
    res.clearCookie('sessionId');
  }

  res.json({ success: true });
});

// Get active sessions
app.get('/auth/sessions', async (req, res) => {
  const sessions = await sessionManager.getUserSessions(req.userId);

  res.json({
    sessions: sessions.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
    })),
  });
});

// Revoke session
app.delete('/auth/sessions/:sessionId', async (req, res) => {
  await sessionManager.deleteSession(req.params.sessionId);
  res.json({ success: true });
});

async function verifyCredentials(email: string, password: string) {
  // Verify credentials
  return { id: '123', email, name: 'User' };
}

async function generateAccessToken(user: any): Promise<string> {
  // Generate JWT or session token
  return 'access-token';
}
```

## Token Refresh Pattern

```typescript
class TokenRefreshManager {
  private refreshPromises = new Map<string, Promise<TokenResponse>>();

  async refreshIfNeeded(
    client: OAuth2Client,
    currentToken: string,
    refreshToken: string,
    expiresAt: number
  ): Promise<{ token: string; expiresAt: number }> {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes before expiry

    // Token still valid
    if (expiresAt > now + bufferTime) {
      return { token: currentToken, expiresAt };
    }

    // Prevent multiple simultaneous refresh requests
    const existingPromise = this.refreshPromises.get(refreshToken);
    if (existingPromise) {
      const result = await existingPromise;
      return {
        token: result.access_token,
        expiresAt: now + result.expires_in * 1000,
      };
    }

    // Refresh token
    const refreshPromise = client.refreshAccessToken(refreshToken);
    this.refreshPromises.set(refreshToken, refreshPromise);

    try {
      const result = await refreshPromise;

      return {
        token: result.access_token,
        expiresAt: now + result.expires_in * 1000,
      };
    } finally {
      this.refreshPromises.delete(refreshToken);
    }
  }
}

// Usage with API requests
const tokenManager = new TokenRefreshManager();

async function makeAuthenticatedRequest(url: string) {
  const session = await sessionManager.getSession(req.cookies.sessionId);

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { token } = await tokenManager.refreshIfNeeded(
    oauthClient,
    session.accessToken,
    session.refreshToken!,
    session.expiresAt
  );

  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}
```

## Best Practices

1. **OAuth 2.0 / OIDC**
   - Always use HTTPS
   - Implement state parameter for CSRF protection
   - Use PKCE for mobile/SPA applications
   - Validate redirect URIs strictly
   - Store tokens encrypted in database

2. **Social Sign-In**
   - Request minimal scopes needed
   - Handle token refresh automatically
   - Provide clear privacy policy
   - Allow account unlinking
   - Handle provider errors gracefully

3. **Passkeys / WebAuthn**
   - Prefer platform authenticators
   - Require user verification
   - Store credentials securely
   - Implement fallback authentication
   - Test across browsers

4. **Session Management**
   - Use secure, httpOnly cookies
   - Implement session expiration
   - Allow users to view/revoke sessions
   - Track suspicious activity
   - Implement rate limiting

5. **Security**
   - Never log sensitive tokens
   - Rotate secrets regularly
   - Implement multi-factor authentication
   - Monitor for unusual activity
   - Have incident response plan
