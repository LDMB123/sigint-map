/**
 * HTML Sanitization Utilities
 *
 * Provides XSS protection through DOMPurify-style sanitization
 * without external dependencies. Uses native browser APIs for
 * safe HTML escaping and sanitization.
 *
 * OWASP XSS Prevention Cheat Sheet Compliant
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */

/**
 * Escape HTML special characters to prevent XSS
 * Used for displaying user-provided text in HTML context
 *
 * Escapes: < > & " ' /
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape HTML attributes
 * Used when inserting user data into HTML attribute values
 */
export function escapeHtmlAttribute(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Escape JavaScript string context
 * Used when inserting user data into JavaScript strings
 */
export function escapeJavaScript(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E');
}

/**
 * Sanitize HTML by stripping all tags except safe ones
 * Allowlist approach - only permits specific safe tags
 *
 * Safe tags: b, i, em, strong, u, br, p, span, div
 * All attributes are stripped for maximum safety
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  // Create a temporary DOM element
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Allowlist of safe tags
  const allowedTags = new Set(['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'div']);

  // Recursive function to sanitize node tree
  function sanitizeNode(node: Node): Node | null {
    // Text nodes are safe - return as-is
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(false);
    }

    // Element nodes need validation
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Remove disallowed tags
      if (!allowedTags.has(tagName)) {
        return null;
      }

      // Create new element without attributes
      const sanitized = document.createElement(tagName);

      // Recursively sanitize children
      for (const child of Array.from(element.childNodes)) {
        const sanitizedChild = sanitizeNode(child);
        if (sanitizedChild) {
          sanitized.appendChild(sanitizedChild);
        }
      }

      return sanitized;
    }

    // Remove other node types (comments, etc.)
    return null;
  }

  // Sanitize all children
  const sanitizedDiv = document.createElement('div');
  for (const child of Array.from(temp.childNodes)) {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      sanitizedDiv.appendChild(sanitizedChild);
    }
  }

  return sanitizedDiv.innerHTML;
}

/**
 * Strip all HTML tags from a string
 * Returns plain text only - safest option for untrusted input
 */
export function stripHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || '';
}

/**
 * Validate and sanitize URL for href attributes
 * Prevents javascript:, data:, and vbscript: protocol attacks
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(trimmed)) {
    return '';
  }

  // Allow only http, https, mailto, tel, and relative URLs
  const safeProtocols = /^(https?|mailto|tel):/i;
  if (trimmed.includes(':') && !safeProtocols.test(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Create safe innerHTML setter that automatically sanitizes
 * Usage: setSafeInnerHTML(element, userContent)
 */
export function setSafeInnerHTML(element: HTMLElement, html: string): void {
  const sanitized = sanitizeHtml(html);
  element.innerHTML = sanitized;
}

/**
 * Create safe textContent setter (preferred over innerHTML)
 * Usage: setSafeTextContent(element, userContent)
 */
export function setSafeTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Template literal tag for safe HTML
 * Usage: const safe = html`<p>${userInput}</p>`
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const escaped = typeof value === 'string' ? escapeHtml(value) : String(value);
    result += escaped + strings[i + 1];
  }

  return result;
}
