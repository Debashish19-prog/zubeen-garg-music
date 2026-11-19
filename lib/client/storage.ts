'use client';
/** localStorage that never throws (private windows, blocked storage). */
export const local = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem('zg:' + k);
      return v ? (JSON.parse(v) as T) : d;
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem('zg:' + k, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  },
};
