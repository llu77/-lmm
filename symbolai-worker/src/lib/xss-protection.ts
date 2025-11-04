/**
 * XSS Protection Utilities
 *
 * Provides safe HTML sanitization and DOM manipulation
 * to prevent Cross-Site Scripting (XSS) attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML string to prevent XSS attacks
 *
 * @param dirty - Potentially unsafe HTML string
 * @param config - Optional DOMPurify config
 * @returns Sanitized HTML string safe for innerHTML
 *
 * @example
 * const userInput = '<img src=x onerror="alert(1)">';
 * const safe = sanitizeHTML(userInput);
 * element.innerHTML = safe; // Safe to use
 */
export function sanitizeHTML(
  dirty: string,
  config?: DOMPurify.Config
): string {
  const defaultConfig: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i',
      'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'img'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    ...config
  };

  return DOMPurify.sanitize(dirty, defaultConfig);
}

/**
 * Safely set text content (no HTML interpretation)
 *
 * @param element - DOM element
 * @param text - Text content (will be escaped)
 *
 * @example
 * const userInput = '<script>alert("XSS")</script>';
 * setTextContent(element, userInput);
 * // Displays: <script>alert("XSS")</script> (as text, not executed)
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Safely set HTML content after sanitization
 *
 * @param element - DOM element
 * @param html - HTML string to sanitize and set
 * @param config - Optional DOMPurify config
 *
 * @example
 * const userHTML = '<p>Hello <strong>World</strong></p>';
 * setHTMLContent(element, userHTML);
 * // Safe: <p>Hello <strong>World</strong></p>
 */
export function setHTMLContent(
  element: HTMLElement,
  html: string,
  config?: DOMPurify.Config
): void {
  element.innerHTML = sanitizeHTML(html, config);
}

/**
 * Escape HTML special characters
 *
 * @param text - Text to escape
 * @returns Escaped text safe for HTML context
 *
 * @example
 * const userInput = '<script>alert(1)</script>';
 * const escaped = escapeHTML(userInput);
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 */
export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape attribute value for use in HTML attributes
 *
 * @param value - Attribute value to escape
 * @returns Escaped value safe for attribute context
 *
 * @example
 * const userInput = '" onclick="alert(1)"';
 * const escaped = escapeAttribute(userInput);
 * // Safe to use: <div title="${escaped}"></div>
 */
export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if unsafe
 *
 * @example
 * sanitizeURL('javascript:alert(1)'); // Returns: ''
 * sanitizeURL('https://example.com'); // Returns: 'https://example.com'
 */
export function sanitizeURL(url: string): string {
  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }

  // Allow http, https, mailto, tel
  const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:', '/'];
  const isAllowed = allowedProtocols.some(p => trimmed.startsWith(p));

  return isAllowed || trimmed.startsWith('#') ? url : '';
}

/**
 * Create safe HTML table rows from data
 *
 * @param data - Array of objects to render
 * @param columns - Column definitions
 * @returns Sanitized HTML string
 *
 * @example
 * const employees = [
 *   { name: '<script>alert(1)</script>', salary: 5000 },
 *   { name: 'Ahmed', salary: 6000 }
 * ];
 * const html = createTableRows(employees, ['name', 'salary']);
 * tableBody.innerHTML = html; // Safe!
 */
export function createTableRows<T extends Record<string, any>>(
  data: T[],
  columns: (keyof T)[]
): string {
  const rows = data.map(item => {
    const cells = columns.map(col => {
      const value = item[col];
      // Escape the value to prevent XSS
      const escaped = escapeHTML(String(value ?? ''));
      return `<td>${escaped}</td>`;
    });
    return `<tr>${cells.join('')}</tr>`;
  });

  return rows.join('');
}

/**
 * Create safe option elements for select dropdown
 *
 * @param options - Array of {value, label} objects
 * @returns Sanitized HTML string
 *
 * @example
 * const options = [
 *   { value: '1', label: 'Option <script>' },
 *   { value: '2', label: 'Option 2' }
 * ];
 * select.innerHTML = createOptions(options); // Safe!
 */
export function createOptions(
  options: Array<{ value: string; label: string }>
): string {
  return options
    .map(opt => {
      const value = escapeAttribute(opt.value);
      const label = escapeHTML(opt.label);
      return `<option value="${value}">${label}</option>`;
    })
    .join('');
}

/**
 * Sanitize JSON data before rendering
 *
 * @param data - Data object to sanitize
 * @returns Sanitized copy of data
 *
 * @example
 * const userData = {
 *   name: '<script>alert(1)</script>',
 *   bio: 'Hello <b>World</b>'
 * };
 * const safe = sanitizeJSONData(userData);
 * // All string values are escaped
 */
export function sanitizeJSONData<T>(data: T): T {
  if (typeof data === 'string') {
    return escapeHTML(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeJSONData(item)) as unknown as T;
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeJSONData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * CSP-safe inline style object to string
 *
 * @param styles - Style object
 * @returns Safe CSS string
 *
 * @example
 * const styles = { color: 'red', 'font-size': '14px' };
 * element.style.cssText = toSafeStyleString(styles);
 */
export function toSafeStyleString(
  styles: Record<string, string | number>
): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Remove any potentially dangerous values
      const sanitizedValue = String(value).replace(/[;<>]/g, '');
      return `${key}: ${sanitizedValue}`;
    })
    .join('; ');
}

/**
 * Validate and sanitize email address
 *
 * @param email - Email to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim();

  if (!emailRegex.test(trimmed)) {
    return '';
  }

  // Remove any HTML/script injection attempts
  return escapeHTML(trimmed);
}

/**
 * Remove all HTML tags from string
 *
 * @param html - HTML string
 * @returns Plain text without any HTML
 *
 * @example
 * stripHTML('<p>Hello <b>World</b></p>'); // Returns: 'Hello World'
 */
export function stripHTML(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Safe innerText replacement for server-side
 *
 * @param html - HTML string
 * @returns Text content only
 */
export function getTextContent(html: string): string {
  return stripHTML(html).replace(/\s+/g, ' ').trim();
}
