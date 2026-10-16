'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import {
  calculateRouteDistance,
  geocodeAddress,
  type Coordinates,
  type RouteDistance,
} from '@/lib/distance';

interface TMSMapProps {
  origin: string;
  destination: string;
  originCoords?: Coordinates;
  destinationCoords?: Coordinates;
}

const MapView = dynamic(() => import('./TMSMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center bg-gray-900 text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

export default function TMSMap({
  origin,
  destination,
  originCoords,
  destinationCoords,
}: TMSMapProps) {
  const [calculatedRoute, setCalculatedRoute] = useState<{
    origin: string;
    destination: string;
    start: Coordinates;
    end: Coordinates;
    route: RouteDistance;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [requestError, setRequestError] = useState<{
    origin: string;
    destination: string;
    message: string;
  } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => controllerRef.current?.abort(),
    [],
  );

  const currentRoute =
    calculatedRoute?.origin === origin &&
    calculatedRoute.destination === destination
      ? calculatedRoute
      : null;
  const currentError =
    requestError?.origin === origin &&
    requestError.destination === destination
      ? requestError.message
      : null;

  const handleCalculateRoute = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsCalculating(true);
    setRequestError(null);

    try {
      const start =
        originCoords ?? (await geocodeAddress(origin, controller.signal));
      const end =
        destinationCoords ??
        (await geocodeAddress(destination, controller.signal));
      const routeResult = await calculateRouteDistance(
        start[0],
        start[1],
        end[0],
        end[1],
        controller.signal,
      );
      setCalculatedRoute({
        origin,
        destination,
        start,
        end,
        route: routeResult,
      });
    } catch (routeError: unknown) {
      if (!controller.signal.aborted) {
        setRequestError({
          origin,
          destination,
          message:
            routeError instanceof Error
              ? routeError.message
              : 'Could not calculate the driving route.',
        });
      }
    } finally {
      if (!controller.signal.aborted) setIsCalculating(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-gray-700 bg-gray-800/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Route map</h3>
          {currentRoute && (
            <p className="mt-1 text-sm text-gray-300" aria-live="polite">
              {currentRoute.route.miles.toFixed(1)} mi ·{' '}
              {currentRoute.route.hours.toFixed(1)} hr estimated driving time
            </p>
          )}
        </div>
        <button
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            isCalculating ||
            (!origin.trim() && !originCoords) ||
            (!destination.trim() && !destinationCoords)
          }
          onClick={() => void handleCalculateRoute()}
          type="button"
        >
          {isCalculating
            ? 'Calculating…'
            : currentRoute
              ? 'Refresh route'
              : 'Calculate route'}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Route distance and time are estimates from OpenStreetMap and OSRM; live
        traffic is not included.
      </p>
      {currentError && (
        <p className="text-sm text-red-300" role="alert">
          {currentError}
        </p>
      )}
      <MapView
        originCoords={currentRoute?.start ?? originCoords ?? null}
        destinationCoords={currentRoute?.end ?? destinationCoords ?? null}
        routeCoordinates={currentRoute?.route.coordinates ?? []}
      />
      <p className="text-right text-xs text-gray-500">
        Map data ©{' '}
        <a
          className="underline hover:text-gray-300"
          href="https://www.openstreetmap.org/copyright"
          rel="noreferrer"
          target="_blank"
        >
          OpenStreetMap contributors
        </a>
      </p>
    </section>
  );
}
