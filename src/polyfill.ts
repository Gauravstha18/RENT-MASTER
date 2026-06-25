// Safe Storage Polyfill for sandboxed iframes before anything else loads
class MemoryStorage {
  private store: Record<string, string> = {};
  get length(): number { return Object.keys(this.store).length; }
  clear(): void { this.store = {}; }
  getItem(key: string): string | null { return this.store[key] ?? null; }
  key(index: number): string | null { return Object.keys(this.store)[index] ?? null; }
  removeItem(key: string): void { delete this.store[key]; }
  setItem(key: string, value: string): void { this.store[key] = String(value); }
}

if (typeof window !== 'undefined') {
  let storageOK = false;
  try {
    if (window.localStorage) {
      window.localStorage.setItem('__test_storage_avail__', '1');
      window.localStorage.removeItem('__test_storage_avail__');
      storageOK = true;
    }
  } catch (e) {
    storageOK = false;
  }

  if (!storageOK) {
    const mockStorage = new MemoryStorage();
    const defineOn = (target: any) => {
      try {
        Object.defineProperty(target, 'localStorage', {
          get: () => mockStorage,
          configurable: true,
          enumerable: true
        });
      } catch (e) {}
    };

    defineOn(window);
    if (typeof globalThis !== 'undefined') defineOn(globalThis);
    if (typeof self !== 'undefined') defineOn(self);

    try {
      Object.defineProperty(Window.prototype, 'localStorage', {
        get: () => mockStorage,
        configurable: true,
        enumerable: true
      });
    } catch (e) {}
  }

  let sessionOK = false;
  try {
    if (window.sessionStorage) {
      window.sessionStorage.setItem('__test_session_avail__', '1');
      window.sessionStorage.removeItem('__test_session_avail__');
      sessionOK = true;
    }
  } catch (e) {
    sessionOK = false;
  }

  if (!sessionOK) {
    const mockSession = new MemoryStorage();
    const defineOn = (target: any) => {
      try {
        Object.defineProperty(target, 'sessionStorage', {
          get: () => mockSession,
          configurable: true,
          enumerable: true
        });
      } catch (e) {}
    };

    defineOn(window);
    if (typeof globalThis !== 'undefined') defineOn(globalThis);
    if (typeof self !== 'undefined') defineOn(self);

    try {
      Object.defineProperty(Window.prototype, 'sessionStorage', {
        get: () => mockSession,
        configurable: true,
        enumerable: true
      });
    } catch (e) {}
  }
}

export {};
