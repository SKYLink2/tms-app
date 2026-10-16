import type { Driver } from '@/types/driver';

function isDriver(value: unknown): value is Driver {
  if (typeof value !== 'object' || value === null) return false;
  const driver = value as Record<string, unknown>;
  return (
    typeof driver.id === 'number' &&
    typeof driver.firstName === 'string' &&
    typeof driver.lastName === 'string'
  );
}

export async function fetchDrivers(
  apiUrl: string,
  signal?: AbortSignal,
): Promise<Driver[]> {
  const response = await fetch(`${apiUrl}/drivers`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load drivers (${response.status}).`);
  }

  const result: unknown = await response.json();
  const rows =
    Array.isArray(result)
      ? result
      : typeof result === 'object' &&
          result !== null &&
          'data' in result &&
          Array.isArray(result.data)
        ? result.data
        : null;
  if (!rows || !rows.every(isDriver)) {
    throw new Error('The drivers endpoint returned invalid driver data.');
  }
  return rows;
}
