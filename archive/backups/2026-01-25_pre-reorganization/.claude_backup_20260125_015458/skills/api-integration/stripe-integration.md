---
description: Payment processing integration with Stripe including checkout, subscriptions, webhooks, and PCI compliance
tags: [stripe, payments, subscriptions, webhooks, checkout, pci]
globs: ["**/stripe/**/*.ts", "**/payments/**/*.ts", "**/billing/**/*.ts"]
---

# Stripe API Integration

## Initial Setup

```typescript
interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  apiVersion?: string;
}

class StripeClient {
  private secretKey: string;
  private baseUrl = 'https://api.stripe.com/v1';
  private apiVersion = '2023-10-16';

  constructor(config: StripeConfig) {
    this.secretKey = config.secretKey;
    if (config.apiVersion) {
      this.apiVersion = config.apiVersion;
    }
  }

  private async request<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'DELETE';
      params?: Record<string, any>;
      idempotencyKey?: string;
    }
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Stripe-Version': this.apiVersion,
    };

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);

    let body: string | undefined;

    if (options.method === 'GET' && options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    } else if (options.params) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(this.flattenParams(options.params)).toString();
    }

    const response = await fetch(url.toString(), {
      method: options.method,
      headers,
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Stripe API error: ${data.error?.message || response.statusText}`);
    }

    return data;
  }

  private flattenParams(
    params: Record<string, any>,
    prefix: string = ''
  ): Record<string, string> {
    const flattened: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}[${key}]` : key;

      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            Object.assign(flattened, this.flattenParams(item, `${fullKey}[${index}]`));
          } else {
            flattened[`${fullKey}[${index}]`] = String(item);
          }
        });
      } else if (typeof value === 'object') {
        Object.assign(flattened, this.flattenParams(value, fullKey));
      } else {
        flattened[fullKey] = String(value);
      }
    });

    return flattened;
  }
}
```

## Checkout Sessions

```typescript
interface CheckoutSessionParams {
  mode: 'payment' | 'subscription' | 'setup';
  line_items: Array<{
    price?: string;
    price_data?: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
      };
      unit_amount: number;
      recurring?: {
        interval: 'day' | 'week' | 'month' | 'year';
        interval_count?: number;
      };
    };
    quantity: number;
  }>;
  success_url: string;
  cancel_url: string;
  customer?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
  payment_intent_data?: {
    metadata?: Record<string, string>;
  };
  subscription_data?: {
    metadata?: Record<string, string>;
    trial_period_days?: number;
  };
}

interface CheckoutSession {
  id: string;
  object: 'checkout.session';
  url: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  customer: string | null;
  subscription: string | null;
  metadata: Record<string, string>;
}

class StripeCheckoutClient extends StripeClient {
  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession> {
    return this.request<CheckoutSession>('/checkout/sessions', {
      method: 'POST',
      params,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    return this.request<CheckoutSession>(`/checkout/sessions/${sessionId}`, {
      method: 'GET',
    });
  }

  async expireCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    return this.request<CheckoutSession>(`/checkout/sessions/${sessionId}/expire`, {
      method: 'POST',
    });
  }
}

// Usage: One-time payment
const checkoutClient = new StripeCheckoutClient({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

const session = await checkoutClient.createCheckoutSession({
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Premium Plan',
          description: 'One-time payment for premium features',
        },
        unit_amount: 4999, // $49.99
      },
      quantity: 1,
    },
  ],
  success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.BASE_URL}/cancel`,
  customer_email: 'user@example.com',
  metadata: {
    userId: '12345',
    planType: 'premium',
  },
});

console.log('Checkout URL:', session.url);

// Usage: Subscription checkout
const subscriptionSession = await checkoutClient.createCheckoutSession({
  mode: 'subscription',
  line_items: [
    {
      price: 'price_1234567890', // Price ID from Stripe dashboard
      quantity: 1,
    },
  ],
  success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.BASE_URL}/cancel`,
  customer_email: 'user@example.com',
  subscription_data: {
    trial_period_days: 14,
    metadata: {
      userId: '12345',
    },
  },
});
```

## Subscriptions Management

```typescript
interface Subscription {
  id: string;
  object: 'subscription';
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  customer: string;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount: number;
        currency: string;
      };
      quantity: number;
    }>;
  };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  metadata: Record<string, string>;
}

class StripeSubscriptionClient extends StripeClient {
  async createSubscription(params: {
    customer: string;
    items: Array<{ price: string; quantity?: number }>;
    trial_period_days?: number;
    metadata?: Record<string, string>;
  }): Promise<Subscription> {
    return this.request<Subscription>('/subscriptions', {
      method: 'POST',
      params,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${subscriptionId}`, {
      method: 'GET',
    });
  }

  async updateSubscription(
    subscriptionId: string,
    params: {
      items?: Array<{ id?: string; price: string; quantity?: number }>;
      cancel_at_period_end?: boolean;
      metadata?: Record<string, string>;
      proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
    }
  ): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${subscriptionId}`, {
      method: 'POST',
      params,
    });
  }

  async cancelSubscription(
    subscriptionId: string,
    options?: {
      immediately?: boolean;
      invoice_now?: boolean;
      prorate?: boolean;
    }
  ): Promise<Subscription> {
    if (options?.immediately) {
      return this.request<Subscription>(`/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        params: {
          invoice_now: options.invoice_now,
          prorate: options.prorate,
        },
      });
    }

    return this.updateSubscription(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async listCustomerSubscriptions(customerId: string): Promise<Subscription[]> {
    const response = await this.request<{ data: Subscription[] }>('/subscriptions', {
      method: 'GET',
      params: { customer: customerId },
    });

    return response.data;
  }

  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${subscriptionId}`, {
      method: 'POST',
      params: {
        pause_collection: {
          behavior: 'mark_uncollectible',
        },
      },
    });
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${subscriptionId}`, {
      method: 'POST',
      params: {
        pause_collection: '',
      },
    });
  }
}

// Usage: Create subscription
const subscriptionClient = new StripeSubscriptionClient({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

const subscription = await subscriptionClient.createSubscription({
  customer: 'cus_1234567890',
  items: [{ price: 'price_1234567890', quantity: 1 }],
  trial_period_days: 14,
  metadata: { userId: '12345' },
});

// Usage: Upgrade subscription
const upgraded = await subscriptionClient.updateSubscription(subscription.id, {
  items: [
    {
      id: subscription.items.data[0].id,
      price: 'price_premium_plan',
    },
  ],
  proration_behavior: 'create_prorations',
});

// Usage: Cancel at period end
await subscriptionClient.cancelSubscription(subscription.id);

// Usage: Cancel immediately
await subscriptionClient.cancelSubscription(subscription.id, {
  immediately: true,
  prorate: true,
});
```

## Webhooks

```typescript
interface WebhookEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
}

class StripeWebhookHandler {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  async constructEvent(payload: string, signature: string): Promise<WebhookEvent> {
    // Verify webhook signature
    const signedPayload = `${Date.now()}.${payload}`;
    const expectedSignature = await this.generateSignature(signedPayload);

    if (!this.secureCompare(signature, expectedSignature)) {
      throw new Error('Invalid webhook signature');
    }

    return JSON.parse(payload);
  }

  private async generateSignature(payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

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

class StripeWebhookProcessor {
  private handlers = new Map<
    string,
    (event: WebhookEvent) => Promise<void>
  >();

  on(eventType: string, handler: (event: WebhookEvent) => Promise<void>) {
    this.handlers.set(eventType, handler);
  }

  async process(event: WebhookEvent): Promise<void> {
    const handler = this.handlers.get(event.type);

    if (!handler) {
      console.log(`No handler for event type: ${event.type}`);
      return;
    }

    try {
      await handler(event);
      console.log(`Successfully processed event: ${event.type} ${event.id}`);
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
      throw error;
    }
  }
}

// Express.js webhook endpoint
import express from 'express';

const app = express();
const webhookHandler = new StripeWebhookHandler(process.env.STRIPE_WEBHOOK_SECRET!);
const webhookProcessor = new StripeWebhookProcessor();

// Register event handlers
webhookProcessor.on('checkout.session.completed', async (event) => {
  const session = event.data.object as any;

  console.log('Checkout completed:', session.id);

  // Update database
  await updateUserSubscription({
    userId: session.metadata.userId,
    customerId: session.customer,
    subscriptionId: session.subscription,
    status: 'active',
  });

  // Send confirmation email
  await sendEmail({
    to: session.customer_email,
    subject: 'Payment Successful',
    template: 'payment-success',
  });
});

webhookProcessor.on('customer.subscription.updated', async (event) => {
  const subscription = event.data.object as Subscription;

  await updateUserSubscription({
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
  });
});

webhookProcessor.on('customer.subscription.deleted', async (event) => {
  const subscription = event.data.object as Subscription;

  await updateUserSubscription({
    subscriptionId: subscription.id,
    status: 'canceled',
  });

  // Send cancellation email
  await sendEmail({
    to: subscription.metadata.userEmail,
    subject: 'Subscription Canceled',
    template: 'subscription-canceled',
  });
});

webhookProcessor.on('invoice.payment_failed', async (event) => {
  const invoice = event.data.object as any;

  // Notify user of failed payment
  await sendEmail({
    to: invoice.customer_email,
    subject: 'Payment Failed',
    template: 'payment-failed',
    data: {
      amountDue: invoice.amount_due / 100,
      nextRetry: invoice.next_payment_attempt,
    },
  });
});

// Webhook endpoint - MUST use raw body
app.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    try {
      const event = await webhookHandler.constructEvent(
        req.body.toString(),
        signature
      );

      // Process in background to respond quickly
      webhookProcessor.process(event).catch(error => {
        console.error('Webhook processing error:', error);
      });

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
);

// Helper functions (implement based on your database)
async function updateUserSubscription(data: any) {
  // Update database
}

async function sendEmail(data: any) {
  // Send email
}
```

## Customer Portal

```typescript
class StripeCustomerPortalClient extends StripeClient {
  async createPortalSession(params: {
    customer: string;
    return_url: string;
  }): Promise<{ url: string }> {
    return this.request('/billing_portal/sessions', {
      method: 'POST',
      params,
    });
  }

  async createPortalConfiguration(params: {
    business_profile: {
      headline?: string;
      privacy_policy_url: string;
      terms_of_service_url: string;
    };
    features: {
      customer_update?: {
        enabled: boolean;
        allowed_updates?: Array<'email' | 'address' | 'shipping' | 'phone' | 'tax_id'>;
      };
      invoice_history?: {
        enabled: boolean;
      };
      payment_method_update?: {
        enabled: boolean;
      };
      subscription_cancel?: {
        enabled: boolean;
        mode?: 'at_period_end' | 'immediately';
        cancellation_reason?: {
          enabled: boolean;
          options?: Array<'too_expensive' | 'missing_features' | 'switched_service' | 'unused' | 'customer_service' | 'too_complex' | 'low_quality' | 'other'>;
        };
      };
      subscription_pause?: {
        enabled: boolean;
      };
      subscription_update?: {
        enabled: boolean;
        default_allowed_updates?: Array<'price' | 'quantity' | 'promotion_code'>;
        proration_behavior?: 'none' | 'create_prorations' | 'always_invoice';
      };
    };
  }) {
    return this.request('/billing_portal/configurations', {
      method: 'POST',
      params,
    });
  }
}

// Usage: Create customer portal session
const portalClient = new StripeCustomerPortalClient({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

app.get('/api/customer-portal', async (req, res) => {
  const { customerId } = req.session; // Get from authenticated session

  try {
    const session = await portalClient.createPortalSession({
      customer: customerId,
      return_url: `${process.env.BASE_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Stripe Elements (Frontend)

```typescript
// Frontend TypeScript for payment form
interface StripeElementsConfig {
  publishableKey: string;
  clientSecret: string;
}

class StripePaymentForm {
  private stripe: any;
  private elements: any;
  private cardElement: any;

  async initialize(config: StripeElementsConfig) {
    // Load Stripe.js (add to HTML: <script src="https://js.stripe.com/v3/"></script>)
    this.stripe = (window as any).Stripe(config.publishableKey);

    const appearance = {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    };

    this.elements = this.stripe.elements({
      clientSecret: config.clientSecret,
      appearance,
    });

    // Create card element
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#32325d',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a',
        },
      },
    });

    this.cardElement.mount('#card-element');

    // Handle real-time validation errors
    this.cardElement.on('change', (event: any) => {
      const displayError = document.getElementById('card-errors');
      if (event.error) {
        displayError!.textContent = event.error.message;
      } else {
        displayError!.textContent = '';
      }
    });
  }

  async submitPayment(billingDetails: {
    name: string;
    email: string;
    address?: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  }): Promise<{ success: boolean; error?: string }> {
    const { error, paymentIntent } = await this.stripe.confirmCardPayment(
      this.elements.clientSecret,
      {
        payment_method: {
          card: this.cardElement,
          billing_details: billingDetails,
        },
      }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    if (paymentIntent.status === 'succeeded') {
      return { success: true };
    }

    return { success: false, error: 'Payment failed' };
  }

  destroy() {
    this.cardElement?.destroy();
  }
}

// HTML structure
/*
<form id="payment-form">
  <div id="card-element"></div>
  <div id="card-errors" role="alert"></div>
  <button type="submit">Pay</button>
</form>
*/

// Usage
const paymentForm = new StripePaymentForm();

// Get client secret from backend
const { clientSecret } = await fetch('/api/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 4999 }),
}).then(r => r.json());

await paymentForm.initialize({
  publishableKey: 'pk_test_...',
  clientSecret,
});

document.getElementById('payment-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const result = await paymentForm.submitPayment({
    name: 'John Doe',
    email: 'john@example.com',
  });

  if (result.success) {
    window.location.href = '/success';
  } else {
    alert(result.error);
  }
});
```

## PCI Compliance

```typescript
/**
 * PCI Compliance Best Practices
 *
 * 1. NEVER store card details on your servers
 * 2. Use Stripe Elements or Checkout for card collection
 * 3. Use HTTPS for all payment-related pages
 * 4. Implement proper access controls
 * 5. Log and monitor all payment operations
 * 6. Keep Stripe.js up to date
 */

class PCICompliantPaymentHandler {
  // ✅ CORRECT: Use Stripe Checkout (PCI compliant)
  async createCheckoutSession(amount: number, userId: string) {
    const client = new StripeCheckoutClient({
      secretKey: process.env.STRIPE_SECRET_KEY!,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    });

    return client.createCheckoutSession({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Product' },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.BASE_URL}/success`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
      metadata: { userId },
    });
  }

  // ✅ CORRECT: Use Payment Intents with Stripe Elements
  async createPaymentIntent(amount: number, customerId: string) {
    return fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amount),
        currency: 'usd',
        customer: customerId,
        'automatic_payment_methods[enabled]': 'true',
      }),
    }).then(r => r.json());
  }

  // ❌ WRONG: Never accept or store card details directly
  async NEVER_DO_THIS(cardDetails: {
    number: string;
    exp_month: string;
    exp_year: string;
    cvc: string;
  }) {
    // This violates PCI compliance!
    // Never handle raw card data on your server
    throw new Error('PCI Compliance Violation: Do not handle raw card data');
  }

  // ✅ CORRECT: Use Stripe's tokenization
  async tokenizeCard() {
    // This happens on the frontend with Stripe.js
    // stripe.createToken(cardElement)
  }
}

// Security checklist
const PCI_COMPLIANCE_CHECKLIST = {
  network_security: [
    'Use HTTPS for all payment pages',
    'Implement firewall rules',
    'Secure server configuration',
  ],
  data_protection: [
    'Never store card numbers',
    'Never log card details',
    'Use Stripe Elements or Checkout',
    'Tokenize all card data',
  ],
  access_control: [
    'Restrict access to payment systems',
    'Use strong authentication',
    'Monitor and log access',
  ],
  monitoring: [
    'Monitor webhook events',
    'Set up fraud detection',
    'Regular security audits',
  ],
};
```

## Error Handling and Idempotency

```typescript
class RobustStripeClient extends StripeClient {
  private idempotencyKeys = new Map<string, string>();

  async createPaymentWithIdempotency<T>(
    operation: string,
    params: any,
    endpoint: string
  ): Promise<T> {
    // Generate or retrieve idempotency key for this operation
    const idempotencyKey = this.getIdempotencyKey(operation);

    try {
      return await this.request<T>(endpoint, {
        method: 'POST',
        params,
        idempotencyKey,
      });
    } catch (error: any) {
      // Handle specific Stripe errors
      if (error.message?.includes('card_declined')) {
        throw new Error('Your card was declined. Please try a different card.');
      }

      if (error.message?.includes('insufficient_funds')) {
        throw new Error('Insufficient funds. Please try a different card.');
      }

      if (error.message?.includes('expired_card')) {
        throw new Error('Your card has expired. Please use a different card.');
      }

      throw error;
    }
  }

  private getIdempotencyKey(operation: string): string {
    if (!this.idempotencyKeys.has(operation)) {
      this.idempotencyKeys.set(operation, crypto.randomUUID());
    }

    return this.idempotencyKeys.get(operation)!;
  }

  clearIdempotencyKey(operation: string) {
    this.idempotencyKeys.delete(operation);
  }
}
```

## Best Practices

1. **Security**
   - Never store card details
   - Use Stripe Elements or Checkout
   - Always use HTTPS
   - Implement webhook signature verification
   - Use idempotency keys for payments

2. **Webhooks**
   - Verify webhook signatures
   - Respond quickly (< 5 seconds)
   - Process events asynchronously
   - Handle duplicate events
   - Log all webhook events

3. **Subscriptions**
   - Use proration for upgrades/downgrades
   - Handle failed payments gracefully
   - Send email notifications
   - Allow trial periods
   - Implement grace periods

4. **Error Handling**
   - Provide user-friendly error messages
   - Log errors with context
   - Retry failed webhook events
   - Handle network failures

5. **Testing**
   - Use test mode keys in development
   - Test webhook events locally (Stripe CLI)
   - Test card numbers: 4242424242424242 (success)
   - Test failed payments and edge cases

6. **Customer Experience**
   - Use Customer Portal for self-service
   - Send confirmation emails
   - Provide clear billing information
   - Handle cancellations gracefully
