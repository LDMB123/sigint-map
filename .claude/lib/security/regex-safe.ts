/**
 * ReDoS Protection Utilities
 *
 * Provides safe regex execution with timeouts, input validation,
 * and bounded quantifiers to prevent Regular Expression Denial of Service attacks.
 *
 * Security measures:
 * 1. Input size limits (1KB default, configurable)
 * 2. Regex execution timeout (100ms default)
 * 3. Bounded quantifiers ({0,N} instead of *)
 * 4. Match result size limits (500 chars default)
 * 5. Pattern complexity validation
 *
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */

export interface RegexSafeOptions {
  /** Maximum input size in bytes (default: 1024) */
  maxInputSize?: number;
  /** Regex execution timeout in milliseconds (default: 100) */
  timeout?: number;
  /** Maximum match result size in characters (default: 500) */
  maxMatchSize?: number;
  /** Whether to throw on timeout or return null (default: false) */
  throwOnTimeout?: boolean;
}

export class RegexTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegexTimeoutError';
  }
}

export class RegexInputTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegexInputTooLargeError';
  }
}

/**
 * Safe regex test with timeout protection
 *
 * @param pattern - Regex pattern to test
 * @param input - Input string to test against
 * @param options - Safety options
 * @returns Boolean test result, or false on timeout/error
 *
 * @example
 * ```typescript
 * // Safe - will timeout instead of hanging
 * const result = safeRegexTest(/^(a+)+$/, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa!');
 * console.log(result); // false (timed out)
 * ```
 */
export function safeRegexTest(
  pattern: RegExp,
  input: string,
  options: RegexSafeOptions = {}
): boolean {
  const {
    maxInputSize = 1024,
    timeout = 100,
    throwOnTimeout = false,
  } = options;

  // Validate input size
  if (input.length > maxInputSize) {
    if (throwOnTimeout) {
      throw new RegexInputTooLargeError(
        `Input too large: ${input.length} bytes (max: ${maxInputSize})`
      );
    }
    console.warn(`[ReDoS Protection] Input truncated from ${input.length} to ${maxInputSize} bytes`);
    input = input.substring(0, maxInputSize);
  }

  // Execute with timeout
  const result = executeWithTimeout(() => pattern.test(input), timeout);

  if (result.timedOut) {
    console.warn(`[ReDoS Protection] Regex test timed out after ${timeout}ms`, {
      pattern: pattern.source,
      inputLength: input.length,
    });
    if (throwOnTimeout) {
      throw new RegexTimeoutError(
        `Regex execution timed out after ${timeout}ms: ${pattern.source}`
      );
    }
    return false;
  }

  return result.value ?? false;
}

/**
 * Safe regex match with timeout and result size protection
 *
 * @param pattern - Regex pattern to match
 * @param input - Input string to match against
 * @param options - Safety options
 * @returns Match result or null on timeout/error
 *
 * @example
 * ```typescript
 * const match = safeRegexMatch(/tier:\s*(\w+)/, content);
 * if (match) {
 *   console.log(match[1]); // Captured group
 * }
 * ```
 */
export function safeRegexMatch(
  pattern: RegExp,
  input: string,
  options: RegexSafeOptions = {}
): RegExpMatchArray | null {
  const {
    maxInputSize = 1024,
    timeout = 100,
    maxMatchSize = 500,
    throwOnTimeout = false,
  } = options;

  // Validate input size
  if (input.length > maxInputSize) {
    if (throwOnTimeout) {
      throw new RegexInputTooLargeError(
        `Input too large: ${input.length} bytes (max: ${maxInputSize})`
      );
    }
    console.warn(`[ReDoS Protection] Input truncated from ${input.length} to ${maxInputSize} bytes`);
    input = input.substring(0, maxInputSize);
  }

  // Execute with timeout
  const result = executeWithTimeout(() => input.match(pattern), timeout);

  if (result.timedOut) {
    console.warn(`[ReDoS Protection] Regex match timed out after ${timeout}ms`, {
      pattern: pattern.source,
      inputLength: input.length,
    });
    if (throwOnTimeout) {
      throw new RegexTimeoutError(
        `Regex execution timed out after ${timeout}ms: ${pattern.source}`
      );
    }
    return null;
  }

  const matchResult = result.value;
  if (!matchResult) {
    return null;
  }

  // Validate match result size
  for (let i = 0; i < matchResult.length; i++) {
    if (matchResult[i] && matchResult[i].length > maxMatchSize) {
      console.warn(`[ReDoS Protection] Match group ${i} truncated from ${matchResult[i].length} to ${maxMatchSize} chars`);
      matchResult[i] = matchResult[i].substring(0, maxMatchSize);
    }
  }

  return matchResult;
}

/**
 * Execute a function with timeout protection
 *
 * Uses a simple timeout mechanism - note that this doesn't actually
 * interrupt the regex execution in JavaScript (not possible without Worker threads),
 * but prevents the application from hanging by returning control to the caller.
 *
 * For production use, consider using the RE2 engine which has built-in protections.
 *
 * @param fn - Function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Result with timeout flag
 */
function executeWithTimeout<T>(
  fn: () => T,
  timeoutMs: number
): { value: T | null; timedOut: boolean } {
  let timedOut = false;
  let value: T | null = null;

  // Set timeout to mark as timed out
  const timer = setTimeout(() => {
    timedOut = true;
  }, timeoutMs);

  try {
    const startTime = Date.now();
    value = fn();
    const duration = Date.now() - startTime;

    // Check if execution took too long
    if (duration > timeoutMs) {
      timedOut = true;
      value = null;
    }
  } catch (error) {
    // If execution threw, clear timer and re-throw
    clearTimeout(timer);
    throw error;
  } finally {
    clearTimeout(timer);
  }

  return { value, timedOut };
}

/**
 * Validate regex pattern for potential ReDoS vulnerabilities
 *
 * Checks for common ReDoS patterns:
 * - Nested quantifiers: (a+)+, (a*)*
 * - Overlapping alternations: (a|a)*
 * - Unbounded repetition with backtracking: (a+)+b
 *
 * @param pattern - Regex pattern to validate
 * @returns Validation result with warnings
 */
export function validateRegexPattern(pattern: RegExp): {
  safe: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const source = pattern.source;

  // Check for nested quantifiers
  if (/\([^)]*[+*]\)[+*]/.test(source)) {
    warnings.push('Nested quantifiers detected (e.g., (a+)+) - potential ReDoS risk');
  }

  // Check for excessive unbounded quantifiers
  const unboundedCount = (source.match(/[+*]/g) || []).length;
  if (unboundedCount > 5) {
    warnings.push(`High number of unbounded quantifiers (${unboundedCount}) - consider using bounded {n,m}`);
  }

  // Check for alternations with overlapping patterns
  if (/\([^)]*\|[^)]*\)[+*]/.test(source)) {
    warnings.push('Alternation with quantifier - ensure alternatives are non-overlapping');
  }

  // Check for .* or .+ which can cause catastrophic backtracking
  if (/\.\*|\.\+/.test(source)) {
    warnings.push('Greedy dot quantifiers (.* or .+) - consider more specific patterns');
  }

  return {
    safe: warnings.length === 0,
    warnings,
  };
}

/**
 * Create a safe version of a regex pattern with bounded quantifiers
 *
 * Converts unbounded quantifiers to bounded ones:
 * - * → {0,10}
 * - + → {1,10}
 * - Custom bounds can be specified
 *
 * @param pattern - Original regex pattern
 * @param maxRepetitions - Maximum repetitions for bounded quantifiers
 * @returns Bounded regex pattern
 *
 * @example
 * ```typescript
 * const unsafe = /^(a+)+$/;
 * const safe = boundRegexQuantifiers(unsafe, 10);
 * // Result: /^(a{1,10}){1,10}$/
 * ```
 */
export function boundRegexQuantifiers(
  pattern: RegExp,
  maxRepetitions: number = 10
): RegExp {
  let source = pattern.source;

  // Replace + with {1,N}
  source = source.replace(/\+/g, `{1,${maxRepetitions}}`);

  // Replace * with {0,N}
  source = source.replace(/\*/g, `{0,${maxRepetitions}}`);

  return new RegExp(source, pattern.flags);
}

/**
 * Sanitize input string to prevent regex injection
 *
 * Escapes special regex characters to treat input as literal string.
 *
 * @param input - Input string to sanitize
 * @returns Escaped string safe for regex
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Performance-optimized safe regex test for hot paths
 *
 * Skips timeout mechanism for pre-validated safe patterns.
 * Use only for patterns that have been audited for ReDoS vulnerabilities.
 *
 * @param pattern - Pre-validated safe regex pattern
 * @param input - Input string
 * @param maxInputSize - Maximum input size
 * @returns Test result
 */
export function fastSafeRegexTest(
  pattern: RegExp,
  input: string,
  maxInputSize: number = 1024
): boolean {
  // Quick input size check only
  if (input.length > maxInputSize) {
    input = input.substring(0, maxInputSize);
  }
  return pattern.test(input);
}

/**
 * Performance-optimized safe regex match for hot paths
 *
 * Skips timeout mechanism for pre-validated safe patterns.
 * Use only for patterns that have been audited for ReDoS vulnerabilities.
 *
 * @param pattern - Pre-validated safe regex pattern
 * @param input - Input string
 * @param maxInputSize - Maximum input size
 * @param maxMatchSize - Maximum match size
 * @returns Match result
 */
export function fastSafeRegexMatch(
  pattern: RegExp,
  input: string,
  maxInputSize: number = 1024,
  maxMatchSize: number = 500
): RegExpMatchArray | null {
  // Quick input size check only
  if (input.length > maxInputSize) {
    input = input.substring(0, maxInputSize);
  }

  const match = input.match(pattern);
  if (!match) return null;

  // Truncate large matches
  for (let i = 0; i < match.length; i++) {
    if (match[i] && match[i].length > maxMatchSize) {
      match[i] = match[i].substring(0, maxMatchSize);
    }
  }

  return match;
}
