/**
 * A JSON serializer that writes what Python's `json.dumps` writes.
 *
 * Two differences matter for the export files:
 *
 * - Python distinguishes `int` from `float`, so a whole float is written
 *   `10.0`. JavaScript has one number type, so a float is marked with
 *   {@link pyFloat} and everything else is written as an integer.
 * - `indent=N` puts the closing bracket of an empty container on the same
 *   line (`[]`, `{}`) and separates keys with `": "`.
 */

export interface PyFloat {
  readonly __float: number;
}

export type PyValue =
  | number
  | PyFloat
  | string
  | boolean
  | null
  | readonly PyValue[]
  | { readonly [key: string]: PyValue };

/** Mark a number so it is written as a Python float, e.g. `10.0`. */
export function pyFloat(value: number): PyFloat {
  return { __float: value };
}

function isPyFloat(value: unknown): value is PyFloat {
  return typeof value === "object" && value !== null && "__float" in value;
}

function formatFloat(value: number): string {
  if (!Number.isFinite(value)) return JSON.stringify(value);
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

/** `json.dumps(value, indent=indent)`. */
export function pyDumps(value: PyValue, indent = 1, depth = 0): string {
  const pad = " ".repeat(indent * (depth + 1));
  const closePad = " ".repeat(indent * depth);

  if (isPyFloat(value)) return formatFloat(value.__float);
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : formatFloat(value);
  }
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item) => `${pad}${pyDumps(item, indent, depth + 1)}`);
    return `[\n${items.join(",\n")}\n${closePad}]`;
  }
  const entries = Object.entries(value as Record<string, PyValue>);
  if (entries.length === 0) return "{}";
  const items = entries.map(
    ([k, v]) => `${pad}${JSON.stringify(k)}: ${pyDumps(v, indent, depth + 1)}`,
  );
  return `{\n${items.join(",\n")}\n${closePad}}`;
}
