// Minimal browser API polyfills for the jsdom test environment (MUI relies on
// these at runtime and jsdom does not implement them).

if (typeof window !== 'undefined') {
  // Node 26 ships an experimental `localStorage` on the global object, and in
  // the jsdom environment it shadows jsdom's real Web Storage implementation.
  // Re-expose jsdom's storage so the app's session token handling works.
  const globalRef = globalThis as unknown as {
    jsdom?: { window: { localStorage?: unknown } };
  };
  const storage =
    globalRef.jsdom?.window?.localStorage ??
    // minimal fallback if jsdom's window is not reachable from the VM context
    (() => {
      const map = new Map<string, string>();
      return {
        get length() {
          return map.size;
        },
        clear: () => map.clear(),
        getItem: (k: string) => map.get(k) ?? null,
        key: (i: number) => [...map.keys()][i] ?? null,
        removeItem: (k: string) => void map.delete(k),
        setItem: (k: string, v: string) => void map.set(k, String(v)),
      };
    })();
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  } catch {
    // ignore if the environment does not allow redefinition
  }

  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (window as unknown as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
