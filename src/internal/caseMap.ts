/**
 * Recursively translate object keys between camelCase (public SDK surface)
 * and snake_case (Snippe API wire format). Plain objects and arrays are
 * recursed into; Dates, Buffers, class instances, and primitives are
 * returned untouched.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function camelToSnakeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function toSnakeCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnakeCase);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    out[camelToSnakeKey(key)] = toSnakeCase(val);
  }
  return out;
}

export function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    out[snakeToCamelKey(key)] = toCamelCase(val);
  }
  return out;
}
