// Deterministic helpers shared by the dataset generator and the drivers.

/** mulberry32: tiny, fast, fully deterministic 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Log-uniform integer in [min, max], so small files dominate like real trees. */
export function logUniform(rand: () => number, min: number, max: number): number {
  const lo = Math.log(Math.max(1, min));
  const hi = Math.log(Math.max(1, max));
  return Math.round(Math.exp(lo + (hi - lo) * rand()));
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx]!;
}

export function summarize(values: number[]) {
  const finite = values.filter(Number.isFinite);
  return {
    n: finite.length,
    median: median(finite),
    min: finite.length ? Math.min(...finite) : Number.NaN,
    max: finite.length ? Math.max(...finite) : Number.NaN,
    p90: percentile(finite, 90),
  };
}
