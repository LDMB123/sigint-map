---
description: Webhook handling patterns including signature verification, idempotency, retry mechanisms, event queuing, and testing
tags: [webhooks, signature-verification, idempotency, retry, event-queue, async]
globs: ["**/webhooks/**/*.ts", "**/events/**/*.ts"]
---

# Webhook Handling Patterns

## Signature Verification

```typescript
interface WebhookSignatureConfig {
  secret: string;
  algorithm?: 'sha256' | 'sha512';
  headerName?: string;
  timestampTolerance?: number; // seconds
}

class WebhookSignatureVerifier {
  constructor(private config: WebhookSignatureConfig) {}

  async verify(
    payload: string,
    signature: string,
    timestamp?: string
  ): Promise<boolean> {
    // Verify timestamp to prevent replay attacks
    if (timestamp) {
      const age = Date.now() / 1000 - parseInt(timestamp);
      const tolerance = this.config.timestampTolerance || 300; // 5 minutes

      if (age > tolerance) {
        throw new Error('Webhook timestamp too old');
      }
    }

    const expectedSignature = await this.generateSignature(payload, timestamp);

    return this.secureCompare(signature, expectedSignature);
  }

  async generateSignature(payload: string, timestamp?: string): Promise<string> {
    const message = timestamp ? `${timestamp}.${payload}` : payload;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.secret);
    const messageData = encoder.encode(message);

    const hashAlgo = this.config.algorithm === 'sha512' ? 'SHA-512' : 'SHA-256';

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlgo },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

// Stripe-style signature verification
class StripeWebhookVerifier extends WebhookSignatureVerifier {
  async verify(payload: string, signatureHeader: string): Promise<boolean> {
    // Parse Stripe signature header: t=timestamp,v1=signature
    const parts = signatureHeader.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts.t;
    const signature = parts.v1;

    if (!timestamp || !signature) {
      throw new Error('Invalid signature header format');
    }

    return super.verify(payload, signature, timestamp);
  }
}

// GitHub-style signature verification
class GitHubWebhookVerifier extends WebhookSignatureVerifier {
  async verify(payload: string, signatureHeader: string): Promise<boolean> {
    // GitHub sends: sha256=<signature>
    const signature = signatureHeader.replace('sha256=', '');
    return super.verify(payload, signature);
  }
}

// Shopify-style signature verification (base64 HMAC)
class ShopifyWebhookVerifier {
  constructor(private secret: string) {}

  async verify(payload: string, signatureHeader: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return this.secureCompare(signatureHeader, expectedSignature);
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

// Express.js middleware
import express from 'express';

function webhookVerificationMiddleware(verifier: WebhookSignatureVerifier) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    try {
      const payload = req.body.toString();
      const isValid = await verifier.verify(payload, signature, timestamp);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      next();
    } catch (error: any) {
      console.error('Signature verification error:', error);
      res.status(401).json({ error: error.message });
    }
  };
}

// Usage
const app = express();
const verifier = new WebhookSignatureVerifier({
  secret: process.env.WEBHOOK_SECRET!,
  algorithm: 'sha256',
  timestampTolerance: 300,
});

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookVerificationMiddleware(verifier),
  async (req, res) => {
    const event = JSON.parse(req.body.toString());
    // Process webhook
    res.json({ received: true });
  }
);
```

## Idempotency

```typescript
interface IdempotencyRecord {
  eventId: string;
  processedAt: number;
  status: 'processing' | 'completed' | 'failed';
  response?: any;
  error?: string;
}

class IdempotencyManager {
  private store = new Map<string, IdempotencyRecord>();
  private ttl = 86400000; // 24 hours

  async processOnce<T>(
    eventId: string,
    processor: () => Promise<T>
  ): Promise<{ result: T | null; wasProcessed: boolean }> {
    // Check if already processed
    const existing = await this.getRecord(eventId);

    if (existing) {
      if (existing.status === 'completed') {
        console.log(`Event ${eventId} already processed, returning cached result`);
        return { result: existing.response, wasProcessed: true };
      }

      if (existing.status === 'processing') {
        console.log(`Event ${eventId} is currently being processed`);
        // Wait for processing to complete (with timeout)
        return this.waitForCompletion(eventId);
      }

      if (existing.status === 'failed') {
        console.log(`Event ${eventId} previously failed, retrying`);
        // Retry failed events
      }
    }

    // Mark as processing
    await this.setRecord(eventId, {
      eventId,
      processedAt: Date.now(),
      status: 'processing',
    });

    try {
      const result = await processor();

      // Mark as completed
      await this.setRecord(eventId, {
        eventId,
        processedAt: Date.now(),
        status: 'completed',
        response: result,
      });

      return { result, wasProcessed: false };
    } catch (error: any) {
      // Mark as failed
      await this.setRecord(eventId, {
        eventId,
        processedAt: Date.now(),
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  private async getRecord(eventId: string): Promise<IdempotencyRecord | null> {
    const record = this.store.get(eventId);

    if (!record) {
      // Load from persistent storage (Redis, PostgreSQL, etc.)
      return this.loadFromStorage(eventId);
    }

    // Check TTL
    if (Date.now() - record.processedAt > this.ttl) {
      this.store.delete(eventId);
      return null;
    }

    return record;
  }

  private async setRecord(eventId: string, record: IdempotencyRecord): Promise<void> {
    this.store.set(eventId, record);
    // Persist to storage
    await this.saveToStorage(record);
  }

  private async waitForCompletion(
    eventId: string,
    timeout: number = 30000
  ): Promise<{ result: any; wasProcessed: boolean }> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const record = await this.getRecord(eventId);

      if (record?.status === 'completed') {
        return { result: record.response, wasProcessed: true };
      }

      if (record?.status === 'failed') {
        throw new Error(`Event processing failed: ${record.error}`);
      }

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timeout waiting for event processing');
  }

  private async loadFromStorage(eventId: string): Promise<IdempotencyRecord | null> {
    // Load from Redis, PostgreSQL, etc.
    return null;
  }

  private async saveToStorage(record: IdempotencyRecord): Promise<void> {
    // Save to Redis, PostgreSQL, etc.
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    for (const [eventId, record] of this.store.entries()) {
      if (now - record.processedAt > this.ttl) {
        expired.push(eventId);
      }
    }

    for (const eventId of expired) {
      this.store.delete(eventId);
    }
  }
}

// Usage
const idempotency = new IdempotencyManager();

app.post('/webhook', async (req, res) => {
  const event = req.body;
  const eventId = event.id || req.headers['x-webhook-id'] as string;

  try {
    const { result, wasProcessed } = await idempotency.processOnce(
      eventId,
      async () => {
        // Process webhook event
        return await processWebhookEvent(event);
      }
    );

    res.json({
      received: true,
      wasProcessed,
      result,
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function processWebhookEvent(event: any) {
  // Process event
  return { success: true };
}
```

## Retry Handling

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes?: number[];
}

class WebhookRetryManager {
  private defaultConfig: RetryConfig = {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  };

  async deliverWithRetry(
    url: string,
    payload: any,
    config?: Partial<RetryConfig>
  ): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    const retryConfig = { ...this.defaultConfig, ...config };
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < retryConfig.maxAttempts) {
      attempts++;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WebhookDelivery/1.0',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log(`Webhook delivered successfully on attempt ${attempts}`);
          return { success: true, attempts };
        }

        // Check if error is retryable
        if (!this.isRetryable(response.status, retryConfig)) {
          lastError = `Non-retryable status: ${response.status}`;
          break;
        }

        lastError = `HTTP ${response.status}: ${await response.text()}`;
      } catch (error: any) {
        lastError = error.message;

        // Network errors are retryable
        if (!error.message?.includes('fetch')) {
          break;
        }
      }

      // Don't sleep after last attempt
      if (attempts < retryConfig.maxAttempts) {
        const delay = this.calculateBackoff(attempts, retryConfig);
        console.log(`Attempt ${attempts} failed, retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    return { success: false, attempts, lastError };
  }

  private isRetryable(statusCode: number, config: RetryConfig): boolean {
    return config.retryableStatusCodes?.includes(statusCode) ?? false;
  }

  private calculateBackoff(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Queue-based retry system
interface WebhookQueueItem {
  id: string;
  url: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
  createdAt: number;
}

class WebhookRetryQueue {
  private queue: WebhookQueueItem[] = [];
  private processing = false;
  private retryManager = new WebhookRetryManager();

  async enqueue(url: string, payload: any, maxAttempts: number = 5): Promise<string> {
    const item: WebhookQueueItem = {
      id: crypto.randomUUID(),
      url,
      payload,
      attempts: 0,
      maxAttempts,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
    };

    this.queue.push(item);
    await this.persistQueueItem(item);

    if (!this.processing) {
      this.processQueue();
    }

    return item.id;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const readyItems = this.queue.filter(item => item.nextRetryAt <= now);

      if (readyItems.length === 0) {
        // Wait for next item to be ready
        const nextItem = this.queue.reduce((earliest, item) =>
          item.nextRetryAt < earliest.nextRetryAt ? item : earliest
        );

        const waitTime = nextItem.nextRetryAt - now;
        await this.sleep(Math.min(waitTime, 5000)); // Max 5 seconds
        continue;
      }

      // Process items in parallel (with concurrency limit)
      await Promise.all(
        readyItems.slice(0, 10).map(item => this.processItem(item))
      );
    }

    this.processing = false;
  }

  private async processItem(item: WebhookQueueItem): Promise<void> {
    item.attempts++;

    try {
      const response = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        console.log(`Webhook ${item.id} delivered successfully`);
        this.removeFromQueue(item.id);
        await this.deleteQueueItem(item.id);
        return;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error: any) {
      console.error(`Webhook ${item.id} delivery failed:`, error.message);

      if (item.attempts >= item.maxAttempts) {
        console.error(`Webhook ${item.id} exceeded max attempts`);
        this.removeFromQueue(item.id);
        await this.moveToDeadLetterQueue(item, error.message);
        return;
      }

      // Schedule retry with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, item.attempts), 60000);
      item.nextRetryAt = Date.now() + backoffMs;

      await this.persistQueueItem(item);
    }
  }

  private removeFromQueue(id: string): void {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  private async persistQueueItem(item: WebhookQueueItem): Promise<void> {
    // Persist to database/Redis
  }

  private async deleteQueueItem(id: string): Promise<void> {
    // Delete from database/Redis
  }

  private async moveToDeadLetterQueue(item: WebhookQueueItem, error: string): Promise<void> {
    // Move to dead letter queue for manual intervention
    console.log(`Moving webhook ${item.id} to dead letter queue`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retryQueue = new WebhookRetryQueue();

async function sendWebhook(url: string, payload: any) {
  const webhookId = await retryQueue.enqueue(url, payload, 5);
  console.log(`Webhook ${webhookId} enqueued for delivery`);
}
```

## Event Queuing

```typescript
interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

class WebhookEventQueue {
  private handlers = new Map<string, Array<(event: WebhookEvent) => Promise<void>>>();
  private queue: WebhookEvent[] = [];
  private processing = false;
  private concurrency = 5;

  on(eventType: string, handler: (event: WebhookEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: (event: WebhookEvent) => Promise<void>): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  async emit(event: WebhookEvent): Promise<void> {
    this.queue.push(event);

    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);

      await Promise.allSettled(
        batch.map(event => this.processEvent(event))
      );
    }

    this.processing = false;
  }

  private async processEvent(event: WebhookEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);

    if (!handlers || handlers.length === 0) {
      console.log(`No handlers registered for event type: ${event.type}`);
      return;
    }

    const results = await Promise.allSettled(
      handlers.map(handler => handler(event))
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Handler ${index} for event ${event.type} failed:`,
          result.reason
        );
      }
    });
  }
}

// Usage with database persistence
class PersistentWebhookQueue extends WebhookEventQueue {
  async emit(event: WebhookEvent): Promise<void> {
    // Save to database first
    await this.saveEventToDatabase(event);

    // Then process
    await super.emit(event);
  }

  private async saveEventToDatabase(event: WebhookEvent): Promise<void> {
    // Save to PostgreSQL, MongoDB, etc.
  }

  async replayFailedEvents(since: Date): Promise<void> {
    const events = await this.loadFailedEvents(since);

    for (const event of events) {
      await this.emit(event);
    }
  }

  private async loadFailedEvents(since: Date): Promise<WebhookEvent[]> {
    // Load from database
    return [];
  }
}

// Bull Queue integration (Redis-based)
import Bull from 'bull';

class BullWebhookQueue {
  private queue: Bull.Queue;
  private handlers = new Map<string, (event: WebhookEvent) => Promise<void>>();

  constructor(redisUrl: string) {
    this.queue = new Bull('webhook-events', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.queue.process(10, async (job) => {
      const event: WebhookEvent = job.data;
      const handler = this.handlers.get(event.type);

      if (!handler) {
        throw new Error(`No handler for event type: ${event.type}`);
      }

      await handler(event);
    });

    // Error handling
    this.queue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err);
    });

    this.queue.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });
  }

  on(eventType: string, handler: (event: WebhookEvent) => Promise<void>): void {
    this.handlers.set(eventType, handler);
  }

  async emit(event: WebhookEvent, options?: {
    priority?: number;
    delay?: number;
  }): Promise<void> {
    await this.queue.add(event, {
      priority: options?.priority,
      delay: options?.delay,
    });
  }

  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  async cleanup(): Promise<void> {
    await this.queue.clean(86400000); // Clean jobs older than 24h
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
```

## Error Responses

```typescript
interface WebhookError {
  code: string;
  message: string;
  details?: any;
}

class WebhookErrorHandler {
  static createErrorResponse(
    error: Error | WebhookError,
    statusCode: number = 500
  ): { status: number; body: any } {
    const errorResponse: WebhookError = {
      code: 'WEBHOOK_ERROR',
      message: error.message,
    };

    if ('code' in error && error.code) {
      errorResponse.code = error.code;
    }

    if ('details' in error) {
      errorResponse.details = error.details;
    }

    return {
      status: statusCode,
      body: errorResponse,
    };
  }

  static async handleWebhookError(
    error: Error,
    event: WebhookEvent,
    options?: {
      notifyAdmin?: boolean;
      logToMonitoring?: boolean;
    }
  ): Promise<void> {
    // Log error
    console.error('Webhook processing error:', {
      eventId: event.id,
      eventType: event.type,
      error: error.message,
      stack: error.stack,
    });

    // Send to monitoring service
    if (options?.logToMonitoring) {
      await this.logToMonitoring(error, event);
    }

    // Notify admin for critical errors
    if (options?.notifyAdmin) {
      await this.notifyAdmin(error, event);
    }
  }

  private static async logToMonitoring(error: Error, event: WebhookEvent): Promise<void> {
    // Send to Sentry, DataDog, etc.
  }

  private static async notifyAdmin(error: Error, event: WebhookEvent): Promise<void> {
    // Send email, Slack notification, etc.
  }
}

// Express.js error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { status, body } = WebhookErrorHandler.createErrorResponse(error);

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    delete body.details;
    delete body.stack;
  }

  res.status(status).json(body);
});
```

## Testing Webhooks

```typescript
class WebhookTester {
  async simulateWebhook(
    url: string,
    event: WebhookEvent,
    secret: string
  ): Promise<{ status: number; body: any }> {
    const payload = JSON.stringify(event);
    const verifier = new WebhookSignatureVerifier({ secret });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await verifier.generateSignature(payload, timestamp);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
      },
      body: payload,
    });

    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }

  async testWebhookEndpoint(
    url: string,
    secret: string
  ): Promise<{
    validSignature: boolean;
    invalidSignature: boolean;
    missingSignature: boolean;
    expiredTimestamp: boolean;
  }> {
    const testEvent: WebhookEvent = {
      id: crypto.randomUUID(),
      type: 'test.event',
      data: { message: 'test' },
      timestamp: Date.now(),
    };

    // Test 1: Valid signature
    const validResult = await this.simulateWebhook(url, testEvent, secret);
    const validSignature = validResult.status === 200;

    // Test 2: Invalid signature
    const invalidResult = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'invalid',
        'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
      },
      body: JSON.stringify(testEvent),
    });
    const invalidSignature = invalidResult.status === 401;

    // Test 3: Missing signature
    const missingResult = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent),
    });
    const missingSignature = missingResult.status === 401;

    // Test 4: Expired timestamp
    const verifier = new WebhookSignatureVerifier({ secret, timestampTolerance: 300 });
    const oldTimestamp = Math.floor(Date.now() / 1000 - 400).toString();
    const oldSignature = await verifier.generateSignature(
      JSON.stringify(testEvent),
      oldTimestamp
    );

    const expiredResult = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': oldSignature,
        'X-Webhook-Timestamp': oldTimestamp,
      },
      body: JSON.stringify(testEvent),
    });
    const expiredTimestamp = expiredResult.status === 401;

    return {
      validSignature,
      invalidSignature,
      missingSignature,
      expiredTimestamp,
    };
  }
}

// Local webhook testing server
class LocalWebhookServer {
  private server: any;
  private events: WebhookEvent[] = [];

  start(port: number = 3001): void {
    const app = express();

    app.use(express.json());

    app.post('/webhook', (req, res) => {
      const event: WebhookEvent = req.body;

      console.log('Received webhook:', event);
      this.events.push(event);

      res.json({ received: true });
    });

    app.get('/events', (req, res) => {
      res.json({ events: this.events });
    });

    app.delete('/events', (req, res) => {
      this.events = [];
      res.json({ cleared: true });
    });

    this.server = app.listen(port, () => {
      console.log(`Local webhook server listening on port ${port}`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }

  getEvents(): WebhookEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}

// ngrok integration for local testing
async function setupNgrokTunnel(port: number): Promise<string> {
  // Use ngrok package or API
  // This is a placeholder
  return `https://${crypto.randomUUID()}.ngrok.io`;
}

// Usage
const tester = new WebhookTester();

// Test webhook endpoint
const results = await tester.testWebhookEndpoint(
  'https://api.example.com/webhook',
  'webhook-secret'
);

console.log('Test results:', results);

// Local testing
const localServer = new LocalWebhookServer();
localServer.start(3001);

// Simulate webhook
await tester.simulateWebhook(
  'http://localhost:3001/webhook',
  {
    id: '123',
    type: 'user.created',
    data: { userId: '456' },
    timestamp: Date.now(),
  },
  'test-secret'
);

// Check received events
console.log('Received events:', localServer.getEvents());

localServer.stop();
```

## Best Practices

1. **Security**
   - Always verify webhook signatures
   - Use HTTPS endpoints only
   - Implement timestamp verification to prevent replay attacks
   - Use constant-time comparison for signatures
   - Rate limit webhook endpoints

2. **Reliability**
   - Respond quickly (< 5 seconds)
   - Process webhooks asynchronously
   - Implement idempotency to handle duplicates
   - Use retry with exponential backoff
   - Store events before processing

3. **Error Handling**
   - Log all webhook events and errors
   - Return appropriate HTTP status codes
   - Move failed webhooks to dead letter queue
   - Monitor webhook delivery success rates
   - Alert on persistent failures

4. **Testing**
   - Test signature verification
   - Test idempotency with duplicate events
   - Test retry behavior
   - Use local webhook servers for development
   - Verify webhook URLs before going live

5. **Monitoring**
   - Track delivery success rates
   - Monitor processing latency
   - Alert on queue buildup
   - Log webhook payload samples
   - Track retry attempts

6. **Performance**
   - Use message queues for high volume
   - Process webhooks in parallel
   - Implement backpressure handling
   - Clean up old events regularly
   - Use connection pooling
