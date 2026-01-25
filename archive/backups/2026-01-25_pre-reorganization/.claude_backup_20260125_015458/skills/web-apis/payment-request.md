---
title: Payment Request API
category: Web APIs
tags: [payments, ecommerce, checkout, chromium143+]
description: Standardized payment handling with system payment methods
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# Payment Request API

Provides a standardized interface for requesting payment information from users using native platform payment methods.

## When to Use

- **eCommerce checkout** — Streamlined payment flow
- **Digital goods** — App purchases, subscriptions
- **In-app payments** — Micropayments, premium features
- **Donation platforms** — Simple payment collection
- **Reduce friction** — Faster checkout completion
- **Multi-method payments** — Credit cards, digital wallets, bank transfers

## Core Concepts

```typescript
interface PaymentRequest {
  canMakePayment(): Promise<boolean>;
  show(): Promise<PaymentResponse>;
  abort(): Promise<void>;
  retry(errorFields: PaymentValidationErrors): Promise<void>;
}

interface PaymentResponse {
  requestId: string;
  methodName: string;
  details: Record<string, any>;
  shippingOption: string | null;
  shippingAddress: PaymentAddress | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  complete(result: 'success' | 'fail' | 'unknown'): Promise<void>;
}

interface PaymentMethodData {
  supportedMethods: string | string[];
  data?: Record<string, any>;
}

interface PaymentDetailsBase {
  total: PaymentItem;
  displayItems?: PaymentItem[];
  shippingOptions?: PaymentShippingOption[];
  modifiers?: PaymentDetailsModifier[];
}

interface PaymentDetailsInit extends PaymentDetailsBase {
  id?: string;
}

interface PaymentDetailsUpdate extends PaymentDetailsBase {
  error?: string;
  shippingAddressErrors?: AddressErrors;
  shippingOptionErrors?: Record<string, string>;
  payerErrors?: PayerErrors;
}
```

## Basic Payment Request

```typescript
async function requestPayment(): Promise<void> {
  const methods: PaymentMethodData[] = [
    {
      supportedMethods: 'basic-card',
      data: {
        supportedNetworks: ['visa', 'mastercard'],
        supportedTypes: ['credit', 'debit']
      }
    }
  ];

  const details = {
    total: {
      label: 'Total amount',
      amount: { currency: 'USD', value: '99.99' }
    },
    displayItems: [
      {
        label: 'Product',
        amount: { currency: 'USD', value: '75.00' }
      },
      {
        label: 'Tax',
        amount: { currency: 'USD', value: '6.00' }
      },
      {
        label: 'Shipping',
        amount: { currency: 'USD', value: '18.99' }
      }
    ]
  };

  try {
    const request = new PaymentRequest(methods, details);

    if (await request.canMakePayment()) {
      const response = await request.show();

      // Process payment
      await processPayment(response);

      // Mark complete
      await response.complete('success');
    } else {
      console.log('Payment method not available');
    }
  } catch (error) {
    console.error('Payment failed:', error);
  }
}

async function processPayment(response: PaymentResponse): Promise<void> {
  console.log('Payment method:', response.methodName);
  console.log('Card details:', response.details);
  console.log('Payer email:', response.payerEmail);
  console.log('Payer phone:', response.payerPhone);

  // Send payment details to server
  const serverResponse = await fetch('/api/process-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      methodName: response.methodName,
      details: response.details,
      payerEmail: response.payerEmail,
      payerPhone: response.payerPhone
    })
  });

  if (!serverResponse.ok) {
    throw new Error('Payment processing failed');
  }
}
```

## Payment Methods

### Credit Card Payment

```typescript
const creditCardMethod: PaymentMethodData = {
  supportedMethods: 'basic-card',
  data: {
    supportedNetworks: ['visa', 'mastercard', 'amex'],
    supportedTypes: ['credit', 'debit'],
    billingAddressRequired: true
  }
};

const request = new PaymentRequest([creditCardMethod], details);
```

### Digital Wallets (Google Pay, Apple Pay)

```typescript
async function requestDigitalWallet(): Promise<void> {
  const methods: PaymentMethodData[] = [
    {
      supportedMethods: 'https://google.com/pay',
      data: {
        environment: 'PRODUCTION', // or 'TEST'
        apiVersion: 2,
        apiVersionMinor: 0,
        merchantInfo: {
          merchantId: 'YOUR_MERCHANT_ID',
          merchantName: 'Your Company'
        },
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedCardNetworks: ['VISA', 'MASTERCARD'],
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS']
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'stripe',
                gatewayMerchantId: 'YOUR_GATEWAY_ID'
              }
            }
          }
        ],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: '99.99',
          currencyCode: 'USD'
        }
      }
    },
    {
      supportedMethods: 'https://apple.com/apple-pay',
      data: {
        version: 3,
        merchantIdentifier: 'merchant.com.example',
        countryCode: 'US',
        currencyCode: 'USD',
        supportedNetworks: ['visa', 'mastercard'],
        merchantCapabilities: ['supports3DS', 'supportsDebit', 'supportsCredit']
      }
    }
  ];

  const details = {
    total: {
      label: 'Purchase',
      amount: { currency: 'USD', value: '99.99' }
    }
  };

  try {
    const request = new PaymentRequest(methods, details);

    if (await request.canMakePayment()) {
      const response = await request.show();
      await processPayment(response);
      await response.complete('success');
    } else {
      console.log('Digital wallet not available');
    }
  } catch (error) {
    console.error('Payment error:', error);
  }
}
```

## Shipping and Address

### Request Shipping Information

```typescript
async function requestWithShipping(): Promise<void> {
  const methods: PaymentMethodData[] = [
    {
      supportedMethods: 'basic-card',
      data: {
        supportedNetworks: ['visa', 'mastercard']
      }
    }
  ];

  const details = {
    total: {
      label: 'Total',
      amount: { currency: 'USD', value: '99.99' }
    },
    shippingOptions: [
      {
        id: 'standard',
        label: 'Standard Shipping (5-7 business days)',
        amount: { currency: 'USD', value: '10.00' },
        selected: true
      },
      {
        id: 'express',
        label: 'Express Shipping (2-3 business days)',
        amount: { currency: 'USD', value: '25.00' },
        selected: false
      },
      {
        id: 'overnight',
        label: 'Overnight Shipping',
        amount: { currency: 'USD', value: '50.00' },
        selected: false
      }
    ]
  };

  const options = {
    requestShipping: true,
    requestPayerEmail: true,
    requestPayerPhone: true,
    requestPayerName: true,
    shippingType: 'shipping' as const
  };

  const request = new PaymentRequest(methods, details, options);

  // Handle shipping address changes
  request.addEventListener('shippingaddresschange', async (event) => {
    const response = event as PaymentRequestUpdateEvent;
    const address = request.shippingAddress;

    console.log('Shipping address:', address);

    // Calculate new shipping cost based on address
    const newCost = await calculateShipping(address);

    response.updateWith({
      total: {
        label: 'Total',
        amount: { currency: 'USD', value: newCost.toString() }
      }
    });
  });

  // Handle shipping option changes
  request.addEventListener('shippingoptionchange', (event) => {
    const response = event as PaymentRequestUpdateEvent;
    const selectedOption = details.shippingOptions?.find(
      opt => opt.id === request.shippingOption
    );

    console.log('Selected shipping:', selectedOption?.label);

    response.updateWith({
      total: {
        label: 'Total',
        amount: {
          currency: 'USD',
          value: (99.99 + parseFloat(selectedOption?.amount.value || '0')).toString()
        }
      }
    });
  });

  try {
    const response = await request.show();

    console.log('Shipping address:', response.shippingAddress);
    console.log('Shipping option:', response.shippingOption);
    console.log('Payer:', {
      name: response.payerName,
      email: response.payerEmail,
      phone: response.payerPhone
    });

    await response.complete('success');
  } catch (error) {
    console.error('Payment error:', error);
  }
}

async function calculateShipping(address: PaymentAddress | null): Promise<number> {
  // Calculate based on country, state, etc.
  const country = address?.country;

  if (country === 'US') return 10;
  if (country === 'CA') return 20;
  return 50; // International
}
```

## Payment Validation

### Retry with Errors

```typescript
async function requestWithValidation(): Promise<void> {
  const methods: PaymentMethodData[] = [
    {
      supportedMethods: 'basic-card',
      data: {
        supportedNetworks: ['visa', 'mastercard']
      }
    }
  ];

  const details = {
    total: {
      label: 'Total',
      amount: { currency: 'USD', value: '99.99' }
    }
  };

  const options = {
    requestShipping: true,
    requestPayerEmail: true
  };

  const request = new PaymentRequest(methods, details, options);

  try {
    const response = await request.show();

    // Validate payment on server
    const validation = await fetch('/api/validate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        methodName: response.methodName,
        details: response.details,
        shippingAddress: response.shippingAddress,
        email: response.payerEmail
      })
    }).then(r => r.json());

    if (!validation.valid) {
      // Retry with error messages
      await response.retry({
        payer: validation.payerErrors,
        shippingAddress: validation.shippingErrors
      });

      // Re-request after user correction
      const retryResponse = await request.show();
      await retryResponse.complete('success');
    } else {
      await response.complete('success');
    }
  } catch (error) {
    console.error('Payment error:', error);
  }
}
```

## Advanced Patterns

### Checkout Component

```typescript
class CheckoutComponent {
  private request: PaymentRequest | null = null;

  async initialize(cartTotal: number): Promise<void> {
    const methods: PaymentMethodData[] = [
      {
        supportedMethods: 'basic-card',
        data: {
          supportedNetworks: ['visa', 'mastercard', 'amex']
        }
      }
    ];

    const details = {
      total: {
        label: 'Total amount',
        amount: { currency: 'USD', value: cartTotal.toFixed(2) }
      }
    };

    this.request = new PaymentRequest(methods, details);

    // Show button if payment is available
    const canPay = await this.request.canMakePayment();
    this.updateUI(canPay);
  }

  async checkout(): Promise<void> {
    if (!this.request) {
      console.log('Payment request not initialized');
      return;
    }

    try {
      const response = await this.request.show();

      // Process payment
      const result = await this.processPayment(response);

      if (result.success) {
        await response.complete('success');
        this.onSuccess(result.orderId);
      } else {
        await response.complete('fail');
        this.onError(result.error);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Payment cancelled by user');
      } else {
        console.error('Payment error:', error);
        this.onError('Payment request failed');
      }
    }
  }

  private async processPayment(
    response: PaymentResponse
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const serverResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment: response.details,
          method: response.methodName,
          email: response.payerEmail
        })
      });

      const result = await serverResponse.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private updateUI(canPay: boolean): void {
    const button = document.querySelector('.payment-button');
    if (button) {
      button.style.display = canPay ? 'block' : 'none';
    }
  }

  private onSuccess(orderId: string): void {
    console.log('Order placed:', orderId);
    // Redirect to order confirmation
  }

  private onError(error: string): void {
    console.error('Payment error:', error);
    // Show error message to user
  }
}

// Usage
const checkout = new CheckoutComponent();
await checkout.initialize(99.99);

document.querySelector('.payment-button')?.addEventListener('click', () => {
  checkout.checkout();
});
```

### Subscription Payment

```typescript
async function requestSubscription(plan: 'monthly' | 'annual'): Promise<void> {
  const amounts = {
    monthly: '9.99',
    annual: '99.99'
  };

  const methods: PaymentMethodData[] = [
    {
      supportedMethods: 'basic-card',
      data: {
        supportedNetworks: ['visa', 'mastercard']
      }
    }
  ];

  const details = {
    total: {
      label: `${plan === 'monthly' ? 'Monthly' : 'Annual'} Subscription`,
      amount: { currency: 'USD', value: amounts[plan] }
    }
  };

  const request = new PaymentRequest(methods, details);

  try {
    const response = await request.show();

    // Create subscription on server
    const result = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        cardDetails: response.details,
        email: response.payerEmail
      })
    }).then(r => r.json());

    if (result.subscriptionId) {
      await response.complete('success');
      console.log('Subscription created:', result.subscriptionId);
    } else {
      await response.complete('fail');
    }
  } catch (error) {
    console.error('Subscription error:', error);
  }
}
```

## Browser Support

**Chromium 143+ baseline** — Payment Request API is fully supported with multiple payment methods including credit cards and digital wallets.

**Browser support:**
- Basic card payments: All modern browsers
- Google Pay: Chrome, Edge, Samsung Internet
- Apple Pay: Safari, Chrome on iOS
- Other payment methods: Variable by platform

## Related APIs

- **Fetch API** — Send payment data to server
- **Credentials Management API** — Store payment credentials
- **Web Crypto API** — Encrypt sensitive payment data
- **Permissions API** — Request payment permissions
