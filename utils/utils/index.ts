type UnknownObject<T extends object> = Record<string | number | symbol, unknown> & { [K in keyof T]: unknown };

export function isObject<T extends object>(value: unknown): value is UnknownObject<T> {
  return value !== null && typeof value === "object";
}

export function isFunction<T extends (...args: unknown[]) => unknown>(value: unknown): value is T {
  return typeof value === 'function';
}