declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type Hz = Brand<number, 'Hz'>;
export type Db = Brand<number, 'dB'>;
export type Deg = Brand<number, 'deg'>;
export type Ohm = Brand<number, 'ohm'>;

export const asHz = (n: number): Hz => n as Hz;
export const asDb = (n: number): Db => n as Db;
export const asDeg = (n: number): Deg => n as Deg;
export const asOhm = (n: number): Ohm => n as Ohm;

export const formatHz = (f: Hz): string => {
  const n = f as number;
  if (n >= 1e9) return `${(n / 1e9).toFixed(4)} GHz`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(4)} MHz`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(4)} kHz`;
  return `${n} Hz`;
};

export const formatDb = (d: Db): string => `${(d as number).toFixed(2)} dB`;
export const formatDeg = (a: Deg): string => `${(a as number).toFixed(1)}°`;
export const formatOhm = (z: Ohm): string => `${(z as number).toFixed(1)} Ω`;
