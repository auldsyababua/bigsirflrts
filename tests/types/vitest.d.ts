import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInRange(min: number, max: number): T;
  }
  interface AsymmetricMatchersContaining {
    toBeInRange(min: number, max: number): any;
  }
}
