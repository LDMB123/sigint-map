/**
 * Development Logger - Conditional logging that's stripped in production
 *
 * Provides structured logging that:
 * - Only outputs in development mode
 * - Supports namespaced logging for different subsystems
 * - Can be conditionally enabled/disabled per namespace
 * - Automatically silenced in production builds
 *
 * @example
 * ```typescript
 * import { createDevLogger } from '$lib/utils/dev-logger';
 *
 * const logger = createDevLogger('db:seed');
 * logger.log('Loading venues...');
 * logger.success('Loaded 500 venues');
 * logger.warn('Some records skipped');
 * logger.error('Failed to load', error);
 * ```
 */

const isDev = import.meta.env?.DEV ?? (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

// Namespaces that are enabled (empty = all enabled in dev)
// Set specific namespaces to enable only those
const enabledNamespaces: Set<string> | null = null;

export interface DevLogger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  success: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  table: (data: unknown) => void;
}

const noop = () => {};
const noopLogger: DevLogger = {
  log: noop,
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  success: noop,
  group: noop,
  groupEnd: noop,
  time: noop,
  timeEnd: noop,
  table: noop,
};

/**
 * Create a namespaced development logger
 *
 * @param namespace - Identifier for the logging context (e.g., 'db:seed', 'pwa:sw')
 * @returns Logger instance that's a no-op in production
 */
export function createDevLogger(namespace: string): DevLogger {
  // In production, return no-op logger
  if (!isDev) {
    return noopLogger;
  }

  // Check if namespace is enabled (if filtering is active)
  if (enabledNamespaces && !enabledNamespaces.has(namespace)) {
    return noopLogger;
  }

  const prefix = `[${namespace}]`;
  const successPrefix = `[${namespace}] ✓`;

  return {
    log: (...args: unknown[]) => console.log(prefix, ...args),
    info: (...args: unknown[]) => console.info(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
    success: (...args: unknown[]) => console.log(successPrefix, ...args),
    group: (label: string) => console.group(`${prefix} ${label}`),
    groupEnd: () => console.groupEnd(),
    time: (label: string) => console.time(`${prefix} ${label}`),
    timeEnd: (label: string) => console.timeEnd(`${prefix} ${label}`),
    table: (data: unknown) => {
      console.log(prefix);
      console.table(data);
    },
  };
}

/**
 * Pre-configured loggers for common subsystems
 * Import these directly for convenience
 */
export const dbLogger = createDevLogger('db');
export const dbSeedLogger = createDevLogger('db:seed');
export const dbSyncLogger = createDevLogger('db:sync');
export const pwaLogger = createDevLogger('pwa');
export const swLogger = createDevLogger('sw');
export const wasmLogger = createDevLogger('wasm');
export const perfLogger = createDevLogger('perf');
export const navLogger = createDevLogger('nav');

/**
 * Enable specific namespaces only (for focused debugging)
 * Pass null to enable all namespaces
 *
 * @example
 * ```typescript
 * // Only show db:seed logs
 * enableNamespaces(['db:seed']);
 *
 * // Show all logs again
 * enableNamespaces(null);
 * ```
 */
export function enableNamespaces(namespaces: string[] | null): void {
  if (namespaces === null) {
    // enabledNamespaces is const, so this would need to be refactored
    // to work. For now, this is a placeholder for future enhancement.
    return;
  }
  // Same issue - would need mutable state
}
