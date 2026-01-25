---
name: mcp-security
description: MCP security patterns including authentication, authorization, input sanitization, and audit logging
version: 1.0.0
mcp-version: "1.0"
sdk: typescript, python
partner-ready: true
---

# MCP Security Patterns

## Overview

Security is critical for MCP servers handling sensitive operations. This skill covers authentication, authorization, input sanitization, secret management, audit logging, and sandboxing.

## Security Architecture

```
┌─────────────────────────────────────┐
│      Security Layers                │
│  ┌───────────────────────────────┐  │
│  │   1. Authentication           │  │
│  │      - Token validation       │  │
│  │      - Session management     │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   2. Authorization            │  │
│  │      - Permission checks      │  │
│  │      - Role-based access      │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   3. Input Sanitization       │  │
│  │      - Validation             │  │
│  │      - Injection prevention   │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   4. Audit Logging            │  │
│  │      - Operation tracking     │  │
│  │      - Security events        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Authentication

### Token-Based Authentication

```typescript
// src/auth/token-auth.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface TokenPayload {
  userId: string;
  username: string;
  roles: string[];
  exp?: number;
}

export class TokenAuthenticator {
  private secret: string;
  private expiresIn: string;

  constructor(secret?: string, expiresIn = "24h") {
    this.secret = secret || process.env.JWT_SECRET || this.generateSecret();
    this.expiresIn = expiresIn;
  }

  private generateSecret(): string {
    return crypto.randomBytes(64).toString("hex");
  }

  generateToken(payload: Omit<TokenPayload, "exp">): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    });
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError("Token expired");
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError("Invalid token");
      }
      throw new AuthenticationError("Authentication failed");
    }
  }

  refreshToken(token: string): string {
    const payload = this.verifyToken(token);

    // Create new token with same payload
    return this.generateToken({
      userId: payload.userId,
      username: payload.username,
      roles: payload.roles,
    });
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
```

### API Key Authentication

```typescript
// src/auth/apikey-auth.ts
import crypto from "crypto";

export interface APIKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

export class APIKeyAuthenticator {
  private keys = new Map<string, APIKey>();

  generateAPIKey(
    name: string,
    userId: string,
    permissions: string[],
    expiresIn?: number
  ): APIKey {
    const key = `mcp_${crypto.randomBytes(32).toString("hex")}`;
    const id = crypto.randomUUID();

    const apiKey: APIKey = {
      id,
      key: this.hashKey(key),
      name,
      userId,
      permissions,
      createdAt: new Date(),
      expiresAt: expiresIn
        ? new Date(Date.now() + expiresIn)
        : undefined,
    };

    this.keys.set(apiKey.key, apiKey);

    // Return the unhashed key only once
    return { ...apiKey, key };
  }

  validateAPIKey(key: string): APIKey {
    const hashedKey = this.hashKey(key);
    const apiKey = this.keys.get(hashedKey);

    if (!apiKey) {
      throw new AuthenticationError("Invalid API key");
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new AuthenticationError("API key expired");
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date();

    return apiKey;
  }

  revokeAPIKey(keyId: string): boolean {
    for (const [hash, key] of this.keys.entries()) {
      if (key.id === keyId) {
        this.keys.delete(hash);
        return true;
      }
    }
    return false;
  }

  private hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }
}
```

## Authorization

### Role-Based Access Control (RBAC)

```typescript
// src/auth/rbac.ts
export enum Permission {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  ADMIN = "admin",
}

export interface Role {
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  roles: string[];
}

export class RBACAuthorizer {
  private roles = new Map<string, Role>();

  defineRole(name: string, permissions: Permission[]) {
    this.roles.set(name, { name, permissions });
  }

  hasPermission(user: User, permission: Permission): boolean {
    for (const roleName of user.roles) {
      const role = this.roles.get(roleName);
      if (role?.permissions.includes(permission)) {
        return true;
      }
      // Admin role has all permissions
      if (role?.permissions.includes(Permission.ADMIN)) {
        return true;
      }
    }
    return false;
  }

  requirePermission(user: User, permission: Permission) {
    if (!this.hasPermission(user, permission)) {
      throw new AuthorizationError(
        `User ${user.username} lacks permission: ${permission}`
      );
    }
  }

  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(user, p));
  }

  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(user, p));
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

// Setup example roles
const rbac = new RBACAuthorizer();

rbac.defineRole("admin", [Permission.ADMIN]);
rbac.defineRole("editor", [Permission.READ, Permission.WRITE]);
rbac.defineRole("viewer", [Permission.READ]);
```

### Attribute-Based Access Control (ABAC)

```typescript
// src/auth/abac.ts
export interface Attributes {
  user: Record<string, any>;
  resource: Record<string, any>;
  environment: Record<string, any>;
}

export type Policy = (attributes: Attributes) => boolean;

export class ABACAuthorizer {
  private policies: Policy[] = [];

  addPolicy(policy: Policy) {
    this.policies.push(policy);
  }

  authorize(attributes: Attributes): boolean {
    return this.policies.every((policy) => policy(attributes));
  }

  requireAuthorization(attributes: Attributes) {
    if (!this.authorize(attributes)) {
      throw new AuthorizationError("Access denied by policy");
    }
  }
}

// Example policies
const abac = new ABACAuthorizer();

// Policy: Users can only edit their own resources
abac.addPolicy((attrs) => {
  if (attrs.resource.action === "edit") {
    return attrs.user.id === attrs.resource.ownerId;
  }
  return true;
});

// Policy: Admin users can access everything
abac.addPolicy((attrs) => {
  if (attrs.user.role === "admin") {
    return true;
  }
  return attrs.resource.visibility === "public";
});

// Policy: No access during maintenance window
abac.addPolicy((attrs) => {
  const maintenanceStart = attrs.environment.maintenanceStart;
  const maintenanceEnd = attrs.environment.maintenanceEnd;
  const now = new Date();

  if (maintenanceStart && maintenanceEnd) {
    return now < maintenanceStart || now > maintenanceEnd;
  }
  return true;
});
```

## Input Sanitization

### SQL Injection Prevention

```typescript
// src/security/sql-sanitizer.ts
export class SQLSanitizer {
  private static readonly DANGEROUS_PATTERNS = [
    /(\b(ALTER|CREATE|DELETE|DROP|EXEC|EXECUTE|INSERT|MERGE|SELECT|UPDATE|UNION)\b)/gi,
    /--/g, // SQL comments
    /\/\*/g, // Block comments
    /;/g, // Statement separator
    /'/g, // String delimiter
  ];

  static sanitize(input: string): string {
    let sanitized = input;

    // Remove dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, "");
    }

    return sanitized.trim();
  }

  static validateQuery(query: string): boolean {
    // Only allow SELECT queries
    const normalized = query.trim().toUpperCase();
    return normalized.startsWith("SELECT");
  }

  static escapeIdentifier(identifier: string): string {
    // Escape SQL identifiers (table/column names)
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  static escapeString(value: string): string {
    // Escape string values
    return `'${value.replace(/'/g, "''")}'`;
  }
}
```

### Command Injection Prevention

```typescript
// src/security/command-sanitizer.ts
export class CommandSanitizer {
  private static readonly SHELL_METACHARACTERS = [
    ";", "|", "&", "$", "`", "\n", "(", ")", "<", ">", "\\", "!", "*", "?",
    "[", "]", "{", "}", "~",
  ];

  static sanitize(input: string): string {
    let sanitized = input;

    // Remove shell metacharacters
    for (const char of this.SHELL_METACHARACTERS) {
      sanitized = sanitized.replace(new RegExp(`\\${char}`, "g"), "");
    }

    return sanitized.trim();
  }

  static validateCommand(command: string, allowedCommands: string[]): boolean {
    const cmd = command.split(" ")[0];
    return allowedCommands.includes(cmd);
  }

  static escapeShellArg(arg: string): string {
    // Escape argument for shell execution
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
}
```

### Path Traversal Prevention

```typescript
// src/security/path-sanitizer.ts
import path from "path";

export class PathSanitizer {
  static sanitize(inputPath: string, baseDir: string): string {
    // Resolve the path
    const resolved = path.resolve(baseDir, inputPath);

    // Ensure the resolved path is within baseDir
    if (!resolved.startsWith(path.resolve(baseDir))) {
      throw new Error("Path traversal detected");
    }

    return resolved;
  }

  static validatePath(inputPath: string): boolean {
    // Check for path traversal patterns
    const dangerous = ["../", "..\\", "%2e%2e"];
    return !dangerous.some((pattern) =>
      inputPath.toLowerCase().includes(pattern)
    );
  }

  static normalizeExtension(filename: string, allowed: string[]): boolean {
    const ext = path.extname(filename).toLowerCase();
    return allowed.includes(ext);
  }
}
```

### XSS Prevention

```typescript
// src/security/xss-sanitizer.ts
export class XSSSanitizer {
  static sanitize(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  static sanitizeHTML(html: string): string {
    // Remove script tags
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    // Remove event handlers
    clean = clean.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");

    // Remove javascript: protocol
    clean = clean.replace(/javascript:/gi, "");

    return clean;
  }
}
```

## Secret Management

```typescript
// src/security/secrets.ts
import crypto from "crypto";

export class SecretsManager {
  private static readonly ALGORITHM = "aes-256-gcm";
  private masterKey: Buffer;

  constructor(masterKey?: string) {
    this.masterKey = masterKey
      ? Buffer.from(masterKey, "hex")
      : crypto.randomBytes(32);
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      SecretsManager.ALGORITHM,
      this.masterKey,
      iv
    );

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(
      SecretsManager.ALGORITHM,
      this.masterKey,
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  hash(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  compare(plaintext: string, hash: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(this.hash(plaintext)),
      Buffer.from(hash)
    );
  }
}

// Environment-based secrets
export class EnvironmentSecrets {
  static get(key: string, required = true): string {
    const value = process.env[key];

    if (!value && required) {
      throw new Error(`Required environment variable ${key} not set`);
    }

    return value || "";
  }

  static getAll(prefix: string): Record<string, string> {
    const secrets: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        secrets[key] = value || "";
      }
    }

    return secrets;
  }
}
```

## Audit Logging

```typescript
// src/security/audit-log.ts
export enum AuditEventType {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  DATA_ACCESS = "data_access",
  DATA_MODIFICATION = "data_modification",
  SECURITY_EVENT = "security_event",
  ERROR = "error",
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  userId?: string;
  action: string;
  resource?: string;
  result: "success" | "failure";
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 10000;

  log(event: Omit<AuditEvent, "id" | "timestamp">): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.events.push(auditEvent);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("[AUDIT]", JSON.stringify(auditEvent));
    }

    // In production, send to logging service
    this.sendToLoggingService(auditEvent);
  }

  logAuthentication(
    userId: string,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    this.log({
      type: AuditEventType.AUTHENTICATION,
      userId,
      action: "login",
      result: success ? "success" : "failure",
      metadata,
    });
  }

  logAuthorization(
    userId: string,
    action: string,
    resource: string,
    granted: boolean
  ): void {
    this.log({
      type: AuditEventType.AUTHORIZATION,
      userId,
      action,
      resource,
      result: granted ? "success" : "failure",
    });
  }

  logDataAccess(
    userId: string,
    resource: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      type: AuditEventType.DATA_ACCESS,
      userId,
      action: "read",
      resource,
      result: "success",
      metadata,
    });
  }

  logSecurityEvent(
    event: string,
    severity: "low" | "medium" | "high" | "critical",
    metadata?: Record<string, any>
  ): void {
    this.log({
      type: AuditEventType.SECURITY_EVENT,
      action: event,
      result: "success",
      metadata: { ...metadata, severity },
    });
  }

  query(filter: Partial<AuditEvent>): AuditEvent[] {
    return this.events.filter((event) => {
      return Object.entries(filter).every(([key, value]) => {
        return (event as any)[key] === value;
      });
    });
  }

  private async sendToLoggingService(event: AuditEvent): Promise<void> {
    // Implement integration with logging service
    // e.g., Datadog, CloudWatch, Elasticsearch
  }
}
```

## Sandboxing

```typescript
// src/security/sandbox.ts
import { VM } from "vm2";

export class Sandbox {
  private vm: VM;

  constructor(timeout = 5000) {
    this.vm = new VM({
      timeout,
      sandbox: {
        console: {
          log: (...args: any[]) => console.log("[SANDBOX]", ...args),
        },
      },
      eval: false,
      wasm: false,
    });
  }

  execute(code: string): any {
    try {
      return this.vm.run(code);
    } catch (error) {
      throw new Error(`Sandbox execution error: ${error}`);
    }
  }

  executeFunction(fn: string, ...args: any[]): any {
    const code = `(${fn})(${args.map((a) => JSON.stringify(a)).join(", ")})`;
    return this.execute(code);
  }
}

// Resource limits
export class ResourceLimiter {
  private memoryLimit: number;
  private timeLimit: number;

  constructor(memoryLimitMB = 100, timeLimitMs = 5000) {
    this.memoryLimit = memoryLimitMB * 1024 * 1024;
    this.timeLimit = timeLimitMs;
  }

  checkMemory(): void {
    const usage = process.memoryUsage();

    if (usage.heapUsed > this.memoryLimit) {
      throw new Error("Memory limit exceeded");
    }
  }

  async withTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error("Time limit exceeded")),
          this.timeLimit
        )
      ),
    ]);
  }
}
```

## Rate Limiting

```typescript
// src/security/rate-limit.ts
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(private config: RateLimitConfig) {}

  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this identifier
    let userRequests = this.requests.get(identifier) || [];

    // Filter out old requests
    userRequests = userRequests.filter((time) => time > windowStart);

    // Check if limit exceeded
    if (userRequests.length >= this.config.maxRequests) {
      return false;
    }

    // Add current request
    userRequests.push(now);
    this.requests.set(identifier, userRequests);

    return true;
  }

  requireLimit(identifier: string): void {
    if (!this.checkLimit(identifier)) {
      throw new Error("Rate limit exceeded");
    }
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  getStats(identifier: string): {
    requests: number;
    remaining: number;
    resetAt: Date;
  } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const userRequests = (this.requests.get(identifier) || []).filter(
      (time) => time > windowStart
    );

    return {
      requests: userRequests.length,
      remaining: Math.max(0, this.config.maxRequests - userRequests.length),
      resetAt: new Date(now + this.config.windowMs),
    };
  }
}
```

## Secure MCP Server Example

```typescript
// src/secure-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const tokenAuth = new TokenAuthenticator();
const rbac = new RBACAuthorizer();
const auditLogger = new AuditLogger();
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });

// Define roles
rbac.defineRole("admin", [Permission.ADMIN]);
rbac.defineRole("user", [Permission.READ, Permission.WRITE]);

const server = new Server(
  {
    name: "secure-server",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // 1. Authentication
    const token = request.params._meta?.authToken;
    if (!token) {
      throw new AuthenticationError("No authentication token provided");
    }

    const user = tokenAuth.verifyToken(token);
    auditLogger.logAuthentication(user.userId, true);

    // 2. Rate limiting
    rateLimiter.requireLimit(user.userId);

    // 3. Authorization
    const requiredPermission = getRequiredPermission(request.params.name);
    rbac.requirePermission(
      { id: user.userId, username: user.username, roles: user.roles },
      requiredPermission
    );

    auditLogger.logAuthorization(
      user.userId,
      request.params.name,
      "",
      true
    );

    // 4. Input sanitization
    const sanitizedInput = sanitizeInput(request.params.arguments);

    // 5. Execute tool
    const result = await executeTool(request.params.name, sanitizedInput);

    // 6. Audit log
    auditLogger.logDataAccess(user.userId, request.params.name);

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    auditLogger.logSecurityEvent(
      "tool_execution_error",
      "medium",
      { error: (error as Error).message }
    );

    return {
      content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
});
```

## Best Practices

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal required permissions
3. **Input Validation**: Validate all inputs
4. **Output Encoding**: Encode all outputs
5. **Secret Management**: Never hardcode secrets
6. **Audit Logging**: Log all security events
7. **Rate Limiting**: Prevent abuse
8. **Secure Defaults**: Deny by default
9. **Regular Updates**: Keep dependencies updated
10. **Security Reviews**: Regular security audits

## Security Checklist

- [ ] Authentication implemented
- [ ] Authorization checks in place
- [ ] Input validation on all parameters
- [ ] SQL injection prevention
- [ ] Command injection prevention
- [ ] Path traversal prevention
- [ ] XSS prevention
- [ ] Secrets encrypted at rest
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] HTTPS/TLS enforced
- [ ] Error messages don't leak information
- [ ] Dependencies scanned for vulnerabilities
- [ ] Security headers configured
- [ ] CORS properly configured
