/**
 * XSS Prevention and Input Sanitization
 * Protects against Cross-Site Scripting (XSS) attacks by sanitizing user input
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization options for different contexts
 */
interface SanitizeOptions {
  /**
   * Allow basic formatting (strong, em, p, br)
   * Default: false (strip all HTML)
   */
  allowFormatting?: boolean;

  /**
   * Allow links (a tags with href)
   * Default: false
   */
  allowLinks?: boolean;

  /**
   * Maximum length of sanitized output
   * Default: no limit
   */
  maxLength?: number;

  /**
   * Strip all HTML tags (text only)
   * Default: true
   */
  textOnly?: boolean;
}

/**
 * Sanitize user input to prevent XSS attacks
 *
 * @param input - Raw user input
 * @param options - Sanitization options
 * @returns Sanitized string safe for storage and display
 *
 * @example
 * // Strict mode (default) - strip all HTML
 * sanitizeInput('<script>alert(1)</script>Hello')
 * // Returns: 'Hello'
 *
 * // Allow basic formatting
 * sanitizeInput('<strong>Bold</strong> text', { allowFormatting: true })
 * // Returns: '<strong>Bold</strong> text'
 *
 * // Text only with length limit
 * sanitizeInput('Very long text...', { maxLength: 100 })
 * // Returns: 'Very long text...' (truncated)
 */
export function sanitizeInput(
  input: string | null | undefined,
  options: SanitizeOptions = {}
): string {
  // Handle null/undefined
  if (input == null) {
    return '';
  }

  // Convert to string if not already
  const str = String(input);

  // Empty string check
  if (str.trim() === '') {
    return '';
  }

  // Configure DOMPurify based on options
  const {
    allowFormatting = false,
    allowLinks = false,
    maxLength,
    textOnly = true
  } = options;

  let config: any = {};

  if (textOnly) {
    // Strip all HTML - most secure
    config = {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    };
  } else if (allowFormatting) {
    // Allow safe formatting tags
    config = {
      ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: []
    };

    if (allowLinks) {
      config.ALLOWED_TAGS.push('a');
      config.ALLOWED_ATTR = ['href', 'title'];
      // Only allow http/https links
      config.ALLOWED_URI_REGEXP = /^(?:https?):\/\//i;
    }
  }

  // Sanitize
  let sanitized = DOMPurify.sanitize(str, config);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Apply length limit
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }

  return sanitized;
}

/**
 * Sanitize object with multiple string fields
 *
 * @param obj - Object with string fields to sanitize
 * @param fields - Array of field names to sanitize
 * @param options - Sanitization options
 * @returns New object with sanitized fields
 *
 * @example
 * sanitizeObject(
 *   { title: '<script>xss</script>Good', description: 'Safe text' },
 *   ['title', 'description']
 * )
 * // Returns: { title: 'Good', description: 'Safe text' }
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  options: SanitizeOptions = {}
): T {
  const sanitized = { ...obj };

  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeInput(sanitized[field] as string, options) as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Sanitize email template variables
 * More permissive than general input - allows basic formatting
 *
 * @param html - HTML template with variables
 * @param variables - Object with variable values to sanitize
 * @returns Sanitized HTML with variables replaced
 *
 * @example
 * sanitizeEmailTemplate(
 *   '<p>Hello {{name}}</p>',
 *   { name: '<script>xss</script>Ahmed' }
 * )
 * // Returns: '<p>Hello Ahmed</p>'
 */
export function sanitizeEmailTemplate(
  html: string,
  variables: Record<string, any>
): string {
  let sanitizedHtml = html;

  // Sanitize each variable
  for (const [key, value] of Object.entries(variables)) {
    // Sanitize value (allow basic formatting for emails)
    const sanitizedValue = sanitizeInput(String(value), {
      allowFormatting: true,
      textOnly: false
    });

    // Replace all occurrences of {{key}}
    const regex = new RegExp(`{{${key}}}`, 'g');
    sanitizedHtml = sanitizedHtml.replace(regex, sanitizedValue);
  }

  // Final sanitization of entire template
  return DOMPurify.sanitize(sanitizedHtml, {
    ALLOWED_TAGS: [
      // Email structure
      'html', 'head', 'body', 'title', 'meta', 'style',
      // Content
      'p', 'br', 'hr', 'div', 'span',
      // Formatting
      'strong', 'em', 'b', 'i', 'u', 's',
      // Lists
      'ul', 'ol', 'li',
      // Tables
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      // Links
      'a',
      // Headers
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'style', 'class', 'id',
      'colspan', 'rowspan', 'align', 'valign',
      'width', 'height', 'border', 'cellpadding', 'cellspacing'
    ],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i
  });
}

/**
 * Validate and sanitize file name
 * Prevents directory traversal and malicious file names
 *
 * @param filename - File name to sanitize
 * @returns Safe file name
 *
 * @example
 * sanitizeFilename('../../etc/passwd')
 * // Returns: 'passwd'
 *
 * sanitizeFilename('<script>evil</script>.pdf')
 * // Returns: 'evil.pdf'
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) {
    return 'unnamed';
  }

  // Remove path components
  let safe = filename.replace(/^.*[\\\/]/, '');

  // Remove dangerous characters
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove leading dots (hidden files)
  safe = safe.replace(/^\.+/, '');

  // Ensure not empty
  if (safe.length === 0) {
    return 'unnamed';
  }

  // Limit length
  if (safe.length > 255) {
    safe = safe.slice(0, 255);
  }

  return safe;
}

/**
 * Sanitize URL to prevent open redirect and XSS
 *
 * @param url - URL to sanitize
 * @returns Safe URL or empty string if invalid
 *
 * @example
 * sanitizeUrl('javascript:alert(1)')
 * // Returns: ''
 *
 * sanitizeUrl('https://example.com/page')
 * // Returns: 'https://example.com/page'
 */
export function sanitizeUrl(url: string): string {
  if (!url) {
    return '';
  }

  // Remove whitespace
  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ];

  const lower = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lower.startsWith(protocol)) {
      return '';
    }
  }

  // Only allow http, https, mailto
  if (
    !lower.startsWith('http://') &&
    !lower.startsWith('https://') &&
    !lower.startsWith('mailto:') &&
    !lower.startsWith('/') // Relative URLs
  ) {
    return '';
  }

  return trimmed;
}

/**
 * Escape HTML entities for safe display
 * Use when you need to display user input as literal text
 *
 * @param text - Text to escape
 * @returns HTML-escaped text
 *
 * @example
 * escapeHtml('<script>alert(1)</script>')
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 */
export function escapeHtml(text: string): string {
  const div = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true
  });

  return div
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize SQL-like input (additional layer of protection)
 * Note: Always use parameterized queries as primary protection
 *
 * @param input - Input that might be used in SQL context
 * @returns Sanitized input
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) {
    return '';
  }

  // Remove SQL comment markers
  let safe = input.replace(/--/g, '').replace(/\/\*/g, '').replace(/\*\//g, '');

  // Remove potentially dangerous SQL keywords (case insensitive)
  const dangerousPatterns = [
    /;\s*drop\s+/gi,
    /;\s*delete\s+/gi,
    /;\s*truncate\s+/gi,
    /union\s+select/gi,
    /exec\s*\(/gi,
    /execute\s*\(/gi
  ];

  for (const pattern of dangerousPatterns) {
    safe = safe.replace(pattern, '');
  }

  return safe.trim();
}
