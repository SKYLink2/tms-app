export type Coordinates = [latitude: number, longitude: number];

export interface RouteDistance {
  miles: number;
  hours: number;
  coordinates: Coordinates[];
}

const geocodedLocations = new Map<string, Coordinates>();
let geocodingQueue: Promise<void> = Promise.resolve();
let lastGeocodingRequestAt = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('The route request was cancelled.', 'AbortError');
  }
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timeout);
      reject(new DOMException('The route request was cancelled.', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function geocodeAddress(
  address: string,
  signal?: AbortSignal,
): Promise<Coordinates> {
  const query = address.trim();
  if (!query) {
    return Promise.reject(new Error('Enter both an origin and destination.'));
  }

  const cacheKey = query.toLowerCase();
  const cached = geocodedLocations.get(cacheKey);
  if (cached) return Promise.resolve([cached[0], cached[1]]);

  const request = geocodingQueue.then(async () => {
    throwIfAborted(signal);
    const delay = Math.max(0, 1100 - (Date.now() - lastGeocodingRequestAt));
    if (delay > 0) await wait(delay, signal);
    throwIfAborted(signal);

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      q: query,
    }).toString();
    lastGeocodingRequestAt = Date.now();

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Address lookup failed (${response.status}).`);
    }

    const results: unknown = await response.json();
    if (!Array.isArray(results) || !isRecord(results[0])) {
      throw new Error(`Could not find a map location for "${query}".`);
    }

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error(`Could not find a map location for "${query}".`);
    }

    const coordinates: Coordinates = [latitude, longitude];
    geocodedLocations.set(cacheKey, coordinates);
    const resultCoordinates: Coordinates = [coordinates[0], coordinates[1]];
    return resultCoordinates;
  });
  geocodingQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

export async function calculateRouteDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  signal?: AbortSignal,
): Promise<RouteDistance> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Driving route lookup failed (${response.status}).`);
  }

  const result: unknown = await response.json();
  if (
    !isRecord(result) ||
    result.code !== 'Ok' ||
    !Array.isArray(result.routes) ||
    !isRecord(result.routes[0])
  ) {
    throw new Error('No driving route could be found for these locations.');
  }

  const route = result.routes[0];
  const geometry = isRecord(route.geometry) ? route.geometry.coordinates : null;
  if (
    typeof route.distance !== 'number' ||
    !Number.isFinite(route.distance) ||
    typeof route.duration !== 'number' ||
    !Number.isFinite(route.duration) ||
    !Array.isArray(geometry)
  ) {
    throw new Error('The routing service returned invalid route data.');
  }

  const coordinates: Coordinates[] = geometry.map((point): Coordinates => {
    if (
      !Array.isArray(point) ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number'
    ) {
      throw new Error('The routing service returned invalid route geometry.');
    }
    return [point[1], point[0]];
  });
  if (coordinates.length < 2) {
    throw new Error('The routing service returned an incomplete route.');
  }

  return {
    miles: route.distance * 0.000621371,
    hours: route.duration / 3600,
    coordinates,
  };
}
