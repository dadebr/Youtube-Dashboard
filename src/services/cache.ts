type Entry<T> = { value: T; expiresAt: number };

class CacheService {
  private mem = new Map<string, Entry<any>>();

  get<T>(key: string): T | null {
    const now = Date.now();
    const inMem = this.mem.get(key);
    if (inMem && inMem.expiresAt > now) return inMem.value as T;
    try {
      const raw = localStorage.getItem(`cache:${key}`);
      if (!raw) return null;
      const parsed: Entry<T> = JSON.parse(raw);
      if (parsed.expiresAt > now) {
        this.mem.set(key, parsed);
        return parsed.value;
      }
    } catch { /* ignore */ }
    return null;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    const entry: Entry<T> = { value, expiresAt: Date.now() + ttlMs };
    this.mem.set(key, entry);
    try { localStorage.setItem(`cache:${key}`, JSON.stringify(entry)); } catch { /* ignore */ }
  }

  makeKey(endpoint: string, params: Record<string, any>, token?: string) {
    const base = JSON.stringify({ endpoint, params, token });
    return btoa(unescape(encodeURIComponent(base)));
  }
}

export const cache = new CacheService();

