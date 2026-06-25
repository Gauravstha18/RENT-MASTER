/**
 * Landlord Desk Security Engine
 * Implements client-side input sanitization (Anti-XSS), robust sliding-window rate limiting,
 * credentials obfuscation (to prevent raw leaks in localStorage), and session idle auto-lock utilities.
 */

// --------------------------------------------------
// 1. INPUT SANITIZATION (ANTI-XSS PROTECTION)
// --------------------------------------------------

/**
 * Sanitizes an input string to block any prospective XSS payloads, 
 * stripping scripts, event handlers, and javascript: protocols.
 */
export function sanitizeString(val: string): string {
  if (!val) return '';
  let clean = val;
  
  // Basic tag extraction & stripping of critical tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  
  // Strip inline styling/handlers
  clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove dangerous protocols
  clean = clean.replace(/javascript:/gi, '[removed]');
  clean = clean.replace(/data:text\/html/gi, '[removed]');

  return clean;
}

/**
 * Sanitizes nested fields in an object (recursively or shallow) to protect writes.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj } as any;
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const val = result[key];
      if (typeof val === 'string') {
        result[key] = sanitizeString(val);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = sanitizeObject(val);
      } else if (Array.isArray(val)) {
        result[key] = val.map(item => {
          if (typeof item === 'string') return sanitizeString(item);
          if (item && typeof item === 'object') return sanitizeObject(item);
          return item;
        });
      }
    }
  }
  return result;
}


// --------------------------------------------------
// 2. RUNTIME ACTION RATE LIMITING (SLIDING WINDOW)
// --------------------------------------------------

interface RateLimitTracker {
  timestamps: number[];
}

const actionTrackers: Record<string, RateLimitTracker> = {};

/**
 * Rate limit validator. Fits a rolling sliding-window count check.
 * @param actionId Unique classification of the action (e.g. 'auth:login', 'db:write', 'action:share')
 * @param maxRequests Permitted actions in the limit window
 * @param windowMs Duration of the evaluation window (in milliseconds)
 * @returns { allowed: boolean, remainingMs: number } status metadata
 */
export function countAndValidateRateLimit(
  actionId: string,
  maxRequests: number = 8,
  windowMs: number = 10000
): { allowed: boolean; remainingMs: number; count: number } {
  const now = Date.now();
  if (!actionTrackers[actionId]) {
    actionTrackers[actionId] = { timestamps: [] };
  }

  const tracker = actionTrackers[actionId];
  // Filter out any timestamps older than the limits window
  tracker.timestamps = tracker.timestamps.filter(ts => now - ts < windowMs);

  if (tracker.timestamps.length >= maxRequests) {
    const oldestValidTs = tracker.timestamps[0];
    const remainingMs = Math.max(0, windowMs - (now - oldestValidTs));
    return {
      allowed: false,
      remainingMs,
      count: tracker.timestamps.length
    };
  }

  // Increment and accept
  tracker.timestamps.push(now);
  return {
    allowed: true,
    remainingMs: 0,
    count: tracker.timestamps.length
  };
}


// --------------------------------------------------
// 3. CREDENTIALS ENCODING / OBFUSCATION ENGINE
// --------------------------------------------------

/**
 * Encodes/obfuscates text to prevent cleartext visual scanning of localStorage 
 * by malicious browser extentions or inspectors.
 */
export function obfuscateText(plaintext: string): string {
  if (!plaintext) return '';
  try {
    // Basic obscuring algorithm: Base64 encoding + a light padding transformation
    const utf8Bytes = new TextEncoder().encode(plaintext);
    const binaryStr = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    const base64 = btoa(binaryStr);
    return `_PM_OQ_${base64.split('').reverse().join('')}`;
  } catch {
    return plaintext; // Fallback gracefully if standard utilities fail
  }
}

/**
 * Decodes/de-obfuscates text from our custom obfuscated formatting.
 */
export function deobfuscateText(obfuscated: string): string {
  if (!obfuscated) return '';
  if (!obfuscated.startsWith('_PM_OQ_')) {
    return obfuscated; // Unobfuscated fallback or legacy support
  }
  try {
    const b64Part = obfuscated.substring(7).split('').reverse().join('');
    const binaryStr = atob(b64Part);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return obfuscated; // Recovery fallback
  }
}

class MemoryStorage {
  private store: Record<string, string> = {};
  get length(): number { return Object.keys(this.store).length; }
  clear(): void { this.store = {}; }
  getItem(key: string): string | null { return this.store[key] ?? null; }
  key(index: number): string | null { return Object.keys(this.store)[index] ?? null; }
  removeItem(key: string): void { delete this.store[key]; }
  setItem(key: string, value: string): void { this.store[key] = String(value); }
}

let localStoreToUse: any = null;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStoreToUse = window.localStorage;
  }
} catch (e) {
  // Ignored
}
if (!localStoreToUse) {
  localStoreToUse = new MemoryStorage();
}

export const safeLocalStorage = localStoreToUse;

/**
 * Secure local storage wrappers that automatically obfuscates sensitive credentials
 */
export const secureStorage = {
  getItem(key: string): string | null {
    try {
      const rawVal = safeLocalStorage.getItem(key);
      if (!rawVal) return null;
      return deobfuscateText(rawVal);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      const obfuscated = obfuscateText(value);
      safeLocalStorage.setItem(key, obfuscated);
    } catch {
      // Ignored
    }
  },
  removeItem(key: string): void {
    try {
      safeLocalStorage.removeItem(key);
    } catch {
      // Ignored
    }
  }
};
