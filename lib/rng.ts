export type Seed = bigint;

export class LCG {
  private seed: bigint;
  private readonly m = 1n << 48n;    
  private readonly a = 25214903917n;
  private readonly c = 11n;

  constructor(seed?: Seed) {
    this.seed = seed !== undefined ? seed : 123456789n;
  }

  nextInt(): bigint {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed;
  }

  next(): number {
    return Number(this.nextInt()) / Number(this.m);
  }
}

export function uniformGenerator(seed?: Seed): () => number {
  const lcg = new LCG(seed);
  return () => lcg.next();
}

export function exponentialGenerator(lambda: number, seed?: Seed): () => number {
  const uniform = uniformGenerator(seed);
  return () => {
    let u = uniform();
    if (u === 0) u = 1e-16;
    return -Math.log(u) / lambda;
  };
}

export function normalGenerator(mean: number, stddev: number, seed?: Seed): () => number {
  const uniform = uniformGenerator(seed);
  let haveExtra = false;
  let extra: number;
  return () => {
    if (haveExtra) {
      haveExtra = false;
      return mean + stddev * extra;
    }
    const u1 = uniform();
    const u2 = uniform();
    const r = Math.sqrt(-2 * Math.log(u1 || 1e-16));
    const theta = 2 * Math.PI * u2;
    const z0 = r * Math.cos(theta);
    const z1 = r * Math.sin(theta);
    extra = z1;
    haveExtra = true;
    return mean + stddev * z0;
  };
}