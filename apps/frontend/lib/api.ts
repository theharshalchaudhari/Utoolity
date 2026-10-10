
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : "http://localhost:4000");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const hasBody = options.body != null;

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const headers = new Headers(options.headers);

  if (isFormData) {
    // Let the browser set the multipart boundary.
    headers.delete("Content-Type");
  } else if (hasBody) {
    headers.set("Content-Type", "application/json");
  } else {
    headers.delete("Content-Type");
  }

  let response: Response;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(
        `${API_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
        {
          ...options,
          headers,
          credentials: "include",
          cache: "no-store",
        },
      );
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        throw new Error(
          `Unable to reach the backend at ${API_URL}.`,
          { cause: error },
        );
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
  }

  if (!response!) {
    throw lastError instanceof Error ? lastError : new Error("Network request failed.");
  }

  const contentType = response.headers.get("content-type");
  const text = await response.text();

  let body: unknown = text;

  if (text && contentType?.includes("application/json")) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body
        ? String(body.message)
        : typeof body === "string" && body.trim()
          ? body
          : `Request failed (${response.status}).`;

    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("utoolity:auth-expired"));
    }
    throw new ApiError(message, response.status);
  }

  if (!text) {
    return undefined as T;
  }

  return body as T;
}

export { API_URL };
