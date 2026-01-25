/**
 * Real User Monitoring (RUM) for Core Web Vitals
 *
 * Implements comprehensive performance tracking using web-vitals library
 * Optimized for Chromium 143+ on Apple Silicon (macOS 26.2)
 *
 * Features:
 * - LCP, INP, CLS, FCP, TTFB tracking with attribution data
 * - Batching strategy to minimize network overhead
 * - Respects prerendering state (no metrics for unseen pages)
 * - Device/connection info collection
 * - Long Animation Frame correlation for INP debugging
 * - Structured console logging with swap-ready endpoint design
 *
 * @see https://web.dev/vitals/
 * @see https://github.com/GoogleChrome/web-vitals
 */

// Lazy-loaded web-vitals for bundle optimization (~12-15KB savings)
// Types are imported statically (zero runtime cost), functions loaded on-demand
import type {
  CLSMetricWithAttribution,
  INPMetricWithAttribution,
  LCPMetricWithAttribution,
  FCPMetricWithAttribution,
  TTFBMetricWithAttribution,
} from 'web-vitals/attribution';

// Cached module reference for lazy loading
type WebVitalsModule = {
  onCLS: typeof import('web-vitals/attribution').onCLS;
  onINP: typeof import('web-vitals/attribution').onINP;
  onLCP: typeof import('web-vitals/attribution').onLCP;
  onFCP: typeof import('web-vitals/attribution').onFCP;
  onTTFB: typeof import('web-vitals/attribution').onTTFB;
};
let webVitalsModule: WebVitalsModule | null = null;

/**
 * Lazy load web-vitals module on first use
 * This saves ~12-15KB gzipped from initial bundle
 */
async function getWebVitals(): Promise<WebVitalsModule> {
  if (webVitalsModule) return webVitalsModule;
  webVitalsModule = await import('web-vitals/attribution');
  return webVitalsModule;
}

/**
 * Device and environment information
 */
export interface DeviceInfo {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  connection?: {
    effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  hardware?: {
    hardwareConcurrency: number;
    deviceMemory?: number;
  };
  gpu?: {
    renderer: string;
    isAppleSilicon: boolean;
  };
}

/**
 * Web Vital metric with full attribution data
 */
export interface WebVitalMetric {
  name: 'CLS' | 'INP' | 'LCP' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore';

  // Attribution data for debugging
  attribution: Record<string, any>;

  // Enhanced context
  url: string;
  timestamp: number;
  wasPrerendered: boolean;
}

/**
 * Performance telemetry payload
 */
export interface PerformanceTelemetry {
  sessionId: string;
  metrics: WebVitalMetric[];
  device: DeviceInfo;
  timestamp: number;
  pageLoadId: string;
}

/**
 * RUM Configuration
 */
export interface RUMConfig {
  /** Batch interval in milliseconds (default: 10000 = 10s) */
  batchInterval?: number;

  /** Maximum metrics per batch (default: 10) */
  maxBatchSize?: number;

  /** API endpoint for telemetry (default: '/api/telemetry/performance') */
  endpoint?: string;

  /** Enable console logging (default: true in dev, false in prod) */
  enableLogging?: boolean;

  /** Send metrics immediately (no batching, for debugging) */
  sendImmediately?: boolean;

  /** Custom callback for metrics (for external analytics providers) */
  onMetric?: (metric: WebVitalMetric) => void;
}

/**
 * RUM Manager - Singleton for performance tracking
 */
class RUMManager {
  private config: Required<RUMConfig>;
  private metrics: WebVitalMetric[] = [];
  private sessionId: string;
  private pageLoadId: string;
  private device: DeviceInfo | null = null;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private wasPrerendered = false;
  private isVisible = true;

  constructor() {
    this.sessionId = this.generateId();
    this.pageLoadId = this.generateId();

    // Default config
    this.config = {
      batchInterval: 10000,
      maxBatchSize: 10,
      endpoint: '/api/telemetry/performance',
      enableLogging: import.meta.env.DEV,
      sendImmediately: false,
      onMetric: () => { } // No-op default callback
    };
  }

  /**
   * Initialize RUM tracking
   * MUST be called after page becomes visible (not during loading screen)
   */
  initialize(config: RUMConfig = {}): void {
    if (this.initialized) {
      if (this.config.enableLogging) {
        console.debug('[RUM] Already initialized');
      }
      return;
    }

    // Check if we're in a browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Merge config
    this.config = { ...this.config, ...config };

    // Check if page was prerendered
    const doc = document as Document & { prerendering?: boolean };
    this.wasPrerendered = doc.prerendering === true;

    if (this.wasPrerendered) {
      // Wait for page to become visible before tracking
      this.log('Page is prerendered, waiting for visibility...');

      document.addEventListener('prerenderingchange', () => {
        this.log('Page became visible from prerender');
        this.wasPrerendered = false;
        this.isVisible = true;
        this.startTracking();
      }, { once: true });
    } else {
      // Start tracking immediately
      this.isVisible = true;
      this.startTracking();
    }

    // Setup visibility change listener for tab switches
    document.addEventListener('visibilitychange', () => {
      this.isVisible = document.visibilityState === 'visible';
    });

    // Flush metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Flush on page hide (more reliable for mobile)
    window.addEventListener('pagehide', () => {
      this.flush(true);
    });

    this.initialized = true;
  }

  /**
   * Start tracking web vitals
   * Uses lazy-loaded web-vitals module for bundle optimization
   */
  private async startTracking(): Promise<void> {
    // Collect device info once
    this.device = this.collectDeviceInfo();

    this.log('Starting Web Vitals tracking', {
      sessionId: this.sessionId,
      pageLoadId: this.pageLoadId,
      wasPrerendered: this.wasPrerendered,
      device: this.device
    });

    // Lazy-load web-vitals module (~12-15KB savings from initial bundle)
    try {
      const vitals = await getWebVitals();

      // Track Core Web Vitals with attribution
      vitals.onLCP(this.handleLCP, { reportAllChanges: false });
      vitals.onINP(this.handleINP, { reportAllChanges: false });
      vitals.onCLS(this.handleCLS, { reportAllChanges: false });
      vitals.onFCP(this.handleFCP, { reportAllChanges: false });
      vitals.onTTFB(this.handleTTFB, { reportAllChanges: false });

      this.log('Web Vitals module loaded and tracking started');
    } catch (error) {
      this.log('Failed to load web-vitals module', { error });
      // Graceful degradation - RUM will not track metrics but app continues
    }

    // Start batch timer
    this.scheduleBatch();
  }

  /**
   * Handle LCP metric
   */
  private handleLCP = (metric: LCPMetricWithAttribution): void => {
    const webVital: WebVitalMetric = {
      name: 'LCP',
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      attribution: {
        // Element that was LCP
        element: metric.attribution.element,
        elementSelector: metric.attribution.element ? this.getElementSelector(metric.attribution.element) : 'unknown',

        // Resource details
        url: metric.attribution.url,

        // Timing breakdown
        timeToFirstByte: metric.attribution.timeToFirstByte,
        resourceLoadDelay: metric.attribution.resourceLoadDelay,
        resourceLoadDuration: metric.attribution.resourceLoadDuration,
        elementRenderDelay: metric.attribution.elementRenderDelay,

        // LCP sub-parts for optimization
        lcpResourceEntry: metric.attribution.lcpResourceEntry ? {
          name: metric.attribution.lcpResourceEntry.name,
          startTime: metric.attribution.lcpResourceEntry.startTime,
          duration: metric.attribution.lcpResourceEntry.duration,
        } : null
      },
      url: window.location.href,
      timestamp: Date.now(),
      wasPrerendered: this.wasPrerendered
    };

    this.recordMetric(webVital);
  };

  /**
   * Handle INP metric
   */
  private handleINP = (metric: INPMetricWithAttribution): void => {
    const webVital: WebVitalMetric = {
      name: 'INP',
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      attribution: {
        // Interaction details
        interactionTarget: metric.attribution.interactionTarget ? this.getElementSelector(metric.attribution.interactionTarget) : 'unknown',
        interactionTargetElement: metric.attribution.interactionTarget,
        interactionType: metric.attribution.interactionType,
        interactionTime: metric.attribution.interactionTime,

        // Timing breakdown (total = input + processing + presentation)
        inputDelay: metric.attribution.inputDelay,
        processingDuration: metric.attribution.processingDuration,
        presentationDelay: metric.attribution.presentationDelay,

        // Long Animation Frames that contributed to INP
        longAnimationFrameEntries: metric.attribution.longAnimationFrameEntries?.map((entry: any) => ({
          duration: entry.duration,
          blockingDuration: entry.blockingDuration,
          startTime: entry.startTime,
          scripts: entry.scripts?.map((s: any) => ({
            sourceURL: s.sourceURL,
            sourceFunctionName: s.sourceFunctionName,
            duration: s.duration
          }))
        })) || []
      },
      url: window.location.href,
      timestamp: Date.now(),
      wasPrerendered: this.wasPrerendered
    };

    this.recordMetric(webVital);
  };

  /**
   * Handle CLS metric
   */
  private handleCLS = (metric: CLSMetricWithAttribution): void => {
    const webVital: WebVitalMetric = {
      name: 'CLS',
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      attribution: {
        // Largest shift details
        largestShiftTarget: metric.attribution.largestShiftTarget ? this.getElementSelector(metric.attribution.largestShiftTarget) : 'unknown',
        largestShiftValue: metric.attribution.largestShiftValue,
        largestShiftTime: metric.attribution.largestShiftTime,
        largestShiftEntry: metric.attribution.largestShiftEntry,

        // Load shift (shifts during initial load)
        loadState: metric.attribution.loadState
      },
      url: window.location.href,
      timestamp: Date.now(),
      wasPrerendered: this.wasPrerendered
    };

    this.recordMetric(webVital);
  };

  /**
   * Handle FCP metric
   */
  private handleFCP = (metric: FCPMetricWithAttribution): void => {
    const webVital: WebVitalMetric = {
      name: 'FCP',
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      attribution: {
        timeToFirstByte: metric.attribution.timeToFirstByte,
        firstByteToFCP: metric.attribution.firstByteToFCP,
        loadState: metric.attribution.loadState,
        navigationEntry: metric.attribution.navigationEntry ? {
          type: metric.attribution.navigationEntry.type,
          startTime: metric.attribution.navigationEntry.startTime
        } : null
      },
      url: window.location.href,
      timestamp: Date.now(),
      wasPrerendered: this.wasPrerendered
    };

    this.recordMetric(webVital);
  };

  /**
   * Handle TTFB metric
   */
  private handleTTFB = (metric: TTFBMetricWithAttribution): void => {
    const webVital: WebVitalMetric = {
      name: 'TTFB',
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      attribution: {
        waitingDuration: metric.attribution.waitingDuration,
        cacheDuration: metric.attribution.cacheDuration,
        dnsDuration: metric.attribution.dnsDuration,
        connectionDuration: metric.attribution.connectionDuration,
        requestDuration: metric.attribution.requestDuration,
        navigationEntry: metric.attribution.navigationEntry ? {
          type: metric.attribution.navigationEntry.type,
          startTime: metric.attribution.navigationEntry.startTime
        } : null
      },
      url: window.location.href,
      timestamp: Date.now(),
      wasPrerendered: this.wasPrerendered
    };

    this.recordMetric(webVital);
  };

  /**
   * Record a metric
   */
  private recordMetric(metric: WebVitalMetric): void {
    // Skip if page was prerendered and never became visible
    if (this.wasPrerendered && !this.isVisible) {
      return;
    }

    this.log(`${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`, {
      metric,
      attribution: metric.attribution
    });

    // Add to batch
    this.metrics.push(metric);

    // Call custom handler if provided
    if (this.config.onMetric) {
      this.config.onMetric(metric);
    }

    // Send immediately if configured
    if (this.config.sendImmediately) {
      this.flush(false);
    }
    // Or flush if batch is full
    else if (this.metrics.length >= this.config.maxBatchSize) {
      this.flush(false);
    }
  }

  /**
   * Schedule next batch flush
   */
  private scheduleBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flush(false);
      this.scheduleBatch();
    }, this.config.batchInterval);
  }

  /**
   * Flush metrics to endpoint
   */
  private async flush(isFinal: boolean): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }

    if (!this.device) {
      this.device = this.collectDeviceInfo();
    }

    const payload: PerformanceTelemetry = {
      sessionId: this.sessionId,
      metrics: [...this.metrics],
      device: this.device,
      timestamp: Date.now(),
      pageLoadId: this.pageLoadId
    };

    // Clear metrics array
    this.metrics = [];

    this.log('Flushing metrics batch', {
      count: payload.metrics.length,
      isFinal
    });

    // Try to send to endpoint with retry queue fallback
    try {
      // Check if endpoint exists
      const endpointExists = await this.checkEndpoint();

      if (endpointExists) {
        // Use sendBeacon for final flush (more reliable)
        if (isFinal && 'sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          const success = navigator.sendBeacon(this.config.endpoint, blob);

          if (!success) {
            // sendBeacon failed (likely queue full), fall back to queueing
            await this.queueTelemetry(payload);
          } else {
            this.log('Metrics sent via sendBeacon successfully');
          }
        } else {
          // Regular fetch with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await fetch(this.config.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.getCSRFToken() || ''
              },
              body: JSON.stringify(payload),
              keepalive: isFinal,
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              // Non-2xx response, queue for retry
              this.log('Metrics submission failed, queueing for retry', {
                status: response.status,
                statusText: response.statusText
              });
              await this.queueTelemetry(payload);
            } else {
              this.log('Metrics sent to endpoint successfully');
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            // Network error or timeout, queue for retry
            this.log('Metrics fetch failed, queueing for retry', { error: fetchError });
            await this.queueTelemetry(payload);
          }
        }
      } else {
        // Endpoint doesn't exist - log to console
        this.logMetricsBatch(payload);
      }
    } catch (error) {
      // Fallback to console logging
      this.log('Failed to send metrics, logging to console', { error });
      this.logMetricsBatch(payload);
    }
  }

  /**
   * Queue telemetry for retry using telemetry queue service
   */
  private async queueTelemetry(payload: PerformanceTelemetry): Promise<void> {
    try {
      // Dynamically import to avoid circular dependencies
      const { queueTelemetry } = await import('$lib/services/telemetryQueue');
      await queueTelemetry(payload, this.config.endpoint);
      this.log('Telemetry queued for retry', {
        sessionId: payload.sessionId,
        metricsCount: payload.metrics.length
      });
    } catch (error) {
      // If queuing fails, just log to console as last resort
      this.log('Failed to queue telemetry', { error });
      this.logMetricsBatch(payload);
    }
  }

  /**
   * Get CSRF token from meta tag
   */
  private getCSRFToken(): string | null {
    if (typeof document === 'undefined') return null;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    return meta?.content || null;
  }

  /**
   * Check if telemetry endpoint exists
   */
  private async checkEndpoint(): Promise<boolean> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok || response.status === 405; // 405 = OPTIONS not allowed but endpoint exists
    } catch {
      return false;
    }
  }

  /**
   * Log metrics batch to console with structured format
   */
  private logMetricsBatch(payload: PerformanceTelemetry): void {
    console.group('[RUM] Performance Metrics Batch');

    console.log('Session:', {
      sessionId: payload.sessionId,
      pageLoadId: payload.pageLoadId,
      timestamp: new Date(payload.timestamp).toISOString()
    });

    console.table(payload.metrics.map(m => ({
      Metric: m.name,
      Value: `${m.value.toFixed(2)}ms`,
      Rating: m.rating,
      URL: m.url,
      Prerendered: m.wasPrerendered
    })));

    console.log('Device Info:', payload.device);

    // Detailed attribution for each metric
    payload.metrics.forEach(metric => {
      console.groupCollapsed(`${metric.name} Attribution`);
      console.log(metric.attribution);
      console.groupEnd();
    });

    console.groupEnd();

    // Also log in format easy to copy for analytics
    console.log('[RUM] JSON Payload:', JSON.stringify(payload, null, 2));
  }

  /**
   * Collect device and environment information
   */
  private collectDeviceInfo(): DeviceInfo {
    const info: DeviceInfo = {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      },
      hardware: {
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: (navigator as any).deviceMemory
      }
    };

    // Network Information API (Chrome 61+)
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        info.connection = {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData
        };
      }
    }

    // Memory API (Chrome 7+)
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      if (mem) {
        info.memory = {
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
          totalJSHeapSize: mem.totalJSHeapSize,
          usedJSHeapSize: mem.usedJSHeapSize
        };
      }
    }

    // GPU detection (Apple Silicon detection)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          info.gpu = {
            renderer,
            isAppleSilicon: renderer.includes('Apple') && !renderer.includes('Intel')
          };
        }
      }
    } catch {
      // WebGL not supported
    }

    return info;
  }

  /**
   * Get CSS selector for an element
   * Accepts any type and safely converts to string
   */
  private getElementSelector(element: any): string {
    if (!element || !(element instanceof Element)) {
      return 'unknown';
    }

    try {
      // Try id first
      if (element.id) {
        return `#${element.id}`;
      }

      // Then class names
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) {
          return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
        }
      }

      // Fall back to tag name with nth-of-type
      // PERF: Use direct sibling traversal instead of Array.from().filter()
      // This avoids creating intermediate arrays for every element
      const parent = element.parentElement;
      if (parent) {
        const tagName = element.tagName;
        let index = 1;
        let sibling = element.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === tagName) {
            index++;
          }
          sibling = sibling.previousElementSibling;
        }
        return `${tagName.toLowerCase()}:nth-of-type(${index})`;
      }

      return element.tagName.toLowerCase();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log with prefix
   */
  private log(message: string, data?: any): void {
    if (!this.config.enableLogging) {
      return;
    }

    if (data) {
      console.log(`[RUM] ${message}`, data);
    } else {
      console.log(`[RUM] ${message}`);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Force flush metrics immediately
   */
  forceFlush(): Promise<void> {
    return this.flush(false);
  }
}

// Singleton instance
const rumManager = new RUMManager();

/**
 * Initialize RUM tracking
 *
 * @example
 * ```typescript
 * // Basic usage
 * initRUM();
 *
 * // With custom config
 * initRUM({
 *   batchInterval: 5000,
 *   endpoint: '/api/metrics',
 *   enableLogging: true
 * });
 *
 * // With custom handler for external analytics
 * initRUM({
 *   onMetric: (metric) => {
 *     // Send to Google Analytics
 *     gtag('event', metric.name, {
 *       value: Math.round(metric.value),
 *       metric_rating: metric.rating
 *     });
 *   }
 * });
 * ```
 */
export function initRUM(config?: RUMConfig): void {
  rumManager.initialize(config);
}

/**
 * Get current session ID
 */
export function getRUMSessionId(): string {
  return rumManager.getSessionId();
}

/**
 * Force flush metrics immediately
 */
export function flushRUMMetrics(): Promise<void> {
  return rumManager.forceFlush();
}

/**
 * Export types
 */
export type {
  CLSMetricWithAttribution,
  INPMetricWithAttribution,
  LCPMetricWithAttribution,
  FCPMetricWithAttribution,
  TTFBMetricWithAttribution,
};
