const CACHE_KEY = "utoolity-device-hostname";

let hostnamePromise: Promise<string> | null = null;

export function getDeviceHostname(): Promise<string> {
  if (hostnamePromise) {
    return hostnamePromise;
  }

  hostnamePromise = (async () => {
    // Reuse the value if it has already been fetched in this tab.
    const cached = sessionStorage.getItem(CACHE_KEY);

    if (cached) {
      return cached;
    }

    const response = await fetch("/internal/device-hostname");

    if (!response.ok) {
      throw new Error(
        `Failed to fetch device hostname: ${response.status}`,
      );
    }

    const data: { hostname: string } = await response.json();

    sessionStorage.setItem(CACHE_KEY, data.hostname);

    return data.hostname;
  })().catch((error) => {
    // Allow retry after a failed request.
    hostnamePromise = null;
    throw error;
  });

  return hostnamePromise;
}