'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Driver } from '@/types/driver';
import {
  displayLoadNumber,
  type Load,
  type LoadsResponse,
} from '@/types/load';
import { formatPersonName } from '@/lib/person-name';
import { calculateRouteDistance, geocodeAddress } from '@/lib/distance';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const PAGE_SIZE = 100;
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  timeZone: 'UTC',
});
const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

interface WeekDay {
  date: string;
  weekday: string;
  formatted: string;
}

interface GapAssignment {
  driver: Driver;
  date: string;
}

interface DeadheadEstimate {
  miles: number;
  origin: string;
  destination: string;
}

function startOfWeek(date: Date): Date {
  const monday = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday;
}

function getWeekDays(anchorDate: string, offset: number): WeekDay[] {
  const monday = startOfWeek(new Date(`${anchorDate}T00:00:00Z`));
  monday.setUTCDate(monday.getUTCDate() + offset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      weekday: WEEKDAY_FORMATTER.format(date),
      formatted: DAY_FORMATTER.format(date),
    };
  });
}

function parseLoad(value: unknown): Load | null {
  if (typeof value !== 'object' || value === null) return null;
  const load = value as Record<string, unknown>;
  const rate =
    typeof load.rate === 'number' || typeof load.rate === 'string'
      ? Number(load.rate)
      : Number.NaN;
  const isOptionalDate = (date: unknown) =>
    date === null || date === undefined || typeof date === 'string';
  const driver = load.driver;
  const isValidDriver =
    driver === null ||
    driver === undefined ||
    (typeof driver === 'object' &&
      'id' in driver &&
      typeof driver.id === 'number' &&
      'firstName' in driver &&
      typeof driver.firstName === 'string' &&
      'lastName' in driver &&
      typeof driver.lastName === 'string');

  if (
    typeof load.id !== 'string' ||
    typeof load.status !== 'string' ||
    !Number.isFinite(rate) ||
    !isOptionalDate(load.pickupDate) ||
    !isOptionalDate(load.deliveryDate) ||
    !isValidDriver
  ) {
    return null;
  }

  return { ...load, rate } as Load;
}

function parseLoadsResponse(value: unknown): LoadsResponse | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const response = value as Record<string, unknown>;
  if (
    !Array.isArray(response.data) ||
    typeof response.lastPage !== 'number' ||
    !Number.isInteger(response.lastPage) ||
    response.lastPage < 1
  ) {
    return null;
  }

  const loads = response.data.map(parseLoad);
  if (loads.some((load) => load === null)) return null;

  return {
    data: loads.filter((load): load is Load => load !== null),
    total: typeof response.total === 'number' ? response.total : loads.length,
    page: typeof response.page === 'number' ? response.page : 1,
    lastPage: response.lastPage,
  };
}

function isDriver(value: unknown): value is Driver {
  if (typeof value !== 'object' || value === null) return false;
  const driver = value as Partial<Driver>;
  return (
    typeof driver.id === 'number' &&
    typeof driver.firstName === 'string' &&
    typeof driver.lastName === 'string'
  );
}

function dateKey(value?: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value);
  return match?.[1] ?? null;
}

function driverName(driver: Driver): string {
  return formatPersonName(driver) || `Driver ${driver.id}`;
}

export default function WeeklyScheduleBoard() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatcherFilter, setDispatcherFilter] = useState('ALL');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [gapAssignment, setGapAssignment] = useState<GapAssignment | null>(null);
  const [assigningLoadId, setAssigningLoadId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [deadheadEstimates, setDeadheadEstimates] = useState<
    Record<string, DeadheadEstimate>
  >({});
  const [deadheadErrors, setDeadheadErrors] = useState<Record<string, string>>(
    {},
  );
  const [estimatingDeadheadKey, setEstimatingDeadheadKey] = useState<
    string | null
  >(null);
  const [today, setToday] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);

  const fetchScheduleData = useCallback(async (signal: AbortSignal) => {
    try {
      const firstParams = new URLSearchParams({
        page: '1',
        limit: String(PAGE_SIZE),
      });
      const [loadsResponse, driversResponse] = await Promise.all([
        fetch(`${API_URL}/loads?${firstParams}`, {
          credentials: 'include',
          signal,
        }),
        fetch(`${API_URL}/drivers`, { credentials: 'include', signal }),
      ]);
      if (!loadsResponse.ok) {
        throw new Error(`Could not fetch loads (${loadsResponse.status}).`);
      }
      if (!driversResponse.ok) {
        throw new Error(`Could not fetch drivers (${driversResponse.status}).`);
      }

      const firstPage: unknown = await loadsResponse.json();
      const parsedFirstPage = parseLoadsResponse(firstPage);
      if (!parsedFirstPage) {
        throw new Error('The loads endpoint returned an invalid schedule.');
      }
      const allLoads = [...parsedFirstPage.data];

      for (let page = 2; page <= parsedFirstPage.lastPage; page += 1) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        const response = await fetch(`${API_URL}/loads?${params}`, {
          credentials: 'include',
          signal,
        });
        if (!response.ok) {
          throw new Error(`Could not fetch load page ${page} (${response.status}).`);
        }
        const pageData: unknown = await response.json();
        const parsedPage = parseLoadsResponse(pageData);
        if (!parsedPage) {
          throw new Error(`The loads endpoint returned an invalid page (${page}).`);
        }
        allLoads.push(...parsedPage.data);
      }

      const driversData: unknown = await driversResponse.json();
      const driverRows = Array.isArray(driversData)
        ? driversData
        : typeof driversData === 'object' &&
            driversData !== null &&
            'data' in driversData &&
            Array.isArray(driversData.data)
          ? driversData.data
          : null;
      if (!driverRows || !driverRows.every(isDriver)) {
        throw new Error('The drivers endpoint returned invalid driver data.');
      }

      setLoads(allLoads);
      setDrivers(driverRows);
    } catch (fetchError: unknown) {
      if (!signal.aborted) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Could not load the weekly schedule.',
        );
      }
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = window.setTimeout(() => {
      const now = new Date();
      const localToday = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      setToday(localToday);
      void fetchScheduleData(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [fetchScheduleData]);

  const refreshSchedule = () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setIsLoading(true);
    setError(null);
    void fetchScheduleData(controller.signal);
  };

  const unassignedLoads = loads.filter(
    (load) =>
      load.driverId == null &&
      load.driver == null &&
      ['DRAFT', 'QUOTED', 'PENDING_ASSIGNMENT'].includes(load.status),
  );

  const handleAssignLoad = async (load: Load) => {
    if (!gapAssignment) return;
    const truckUnitNumber =
      gapAssignment.driver.truck_number?.trim() ||
      load.truckUnitNumber?.trim();
    if (!truckUnitNumber) {
      setAssignmentError(
        'Assign a truck unit to this driver or load before quick-assigning.',
      );
      return;
    }

    setAssigningLoadId(load.id);
    setAssignmentError(null);
    try {
      const response = await fetch(`${API_URL}/loads/${load.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          driverId: gapAssignment.driver.id,
          truckUnitNumber,
          pickupDate: gapAssignment.date,
          deliveryDate:
            dateKey(load.deliveryDate) &&
            dateKey(load.deliveryDate)! >= gapAssignment.date
              ? dateKey(load.deliveryDate)
              : gapAssignment.date,
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Could not assign load (${response.status}).`);
      }
      setGapAssignment(null);
      await fetchScheduleData(new AbortController().signal);
    } catch (assignError: unknown) {
      setAssignmentError(
        assignError instanceof Error
          ? assignError.message
          : 'Could not assign this load.',
      );
    } finally {
      setAssigningLoadId(null);
    }
  };

  const handleEstimateDeadhead = async (
    key: string,
    deliveryLoad: Load,
    pickupLoad: Load,
  ) => {
    setEstimatingDeadheadKey(key);
    setDeadheadErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
    try {
      const start = await geocodeAddress(deliveryLoad.destination);
      const end = await geocodeAddress(pickupLoad.origin);
      const route = await calculateRouteDistance(start[0], start[1], end[0], end[1]);
      setDeadheadEstimates((previous) => ({
        ...previous,
        [key]: {
          miles: route.miles,
          origin: deliveryLoad.destination,
          destination: pickupLoad.origin,
        },
      }));
    } catch (routeError: unknown) {
      setDeadheadErrors((previous) => ({
        ...previous,
        [key]:
          routeError instanceof Error
            ? routeError.message
            : 'Could not estimate deadhead distance.',
      }));
    } finally {
      setEstimatingDeadheadKey(null);
    }
  };

  const weekDays = useMemo(
    () => (today ? getWeekDays(today, selectedWeekOffset) : []),
    [selectedWeekOffset, today],
  );
  const visibleLoads = useMemo(
    () =>
      dispatcherFilter === 'ALL'
        ? loads
        : loads.filter((load) => load.dispatcherName === dispatcherFilter),
    [dispatcherFilter, loads],
  );
  const activeDrivers = useMemo(() => {
    const knownDrivers = new Map<number, Driver>();
    for (const driver of drivers) knownDrivers.set(driver.id, driver);
    for (const load of visibleLoads) {
      if (load.driver && !knownDrivers.has(load.driver.id)) {
        knownDrivers.set(load.driver.id, load.driver);
      }
    }
    const assignedDriverIds = new Set(
      visibleLoads
        .map((load) => load.driverId ?? load.driver?.id)
        .filter((id): id is number => typeof id === 'number'),
    );
    return [...knownDrivers.values()]
      .filter(
        (driver) =>
          dispatcherFilter === 'ALL' || assignedDriverIds.has(driver.id),
      )
      .sort((left, right) =>
        driverName(left).localeCompare(driverName(right)),
      );
  }, [dispatcherFilter, drivers, visibleLoads]);
  const dispatchers = useMemo(
    () =>
      [...new Set(loads.map((load) => load.dispatcherName).filter(
        (name): name is string => Boolean(name?.trim()),
      ))].sort((left, right) => left.localeCompare(right)),
    [loads],
  );
  const weekLabel = weekDays.length
    ? `${weekDays[0].formatted} – ${weekDays[6].formatted}`
    : 'Loading week…';

  const getLoadForDriverAndDate = (driver: Driver, date: string) =>
    visibleLoads.filter((load) => {
      if (load.driverId !== driver.id && load.driver?.id !== driver.id) return false;
      const pickup = dateKey(load.pickupDate);
      const delivery = dateKey(load.deliveryDate);
      return pickup !== null && delivery !== null && date >= pickup && date <= delivery;
    });

  return (
    <main className="min-h-screen bg-gray-950 p-5 text-white sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Driver Weekly Utilization Schedule
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Review driver bookings, identify unassigned days, and monitor weekly utilization.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 p-1.5">
            <button
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold hover:bg-gray-700"
              onClick={() => setSelectedWeekOffset((offset) => offset - 1)}
              type="button"
            >
              ← Prev Week
            </button>
            <span className="px-3 text-xs font-bold text-blue-300" aria-live="polite">
              {weekLabel}
            </span>
            <button
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold hover:bg-gray-700"
              onClick={() => setSelectedWeekOffset((offset) => offset + 1)}
              type="button"
            >
              Next Week →
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            Dispatcher
            <select
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              onChange={(event) => setDispatcherFilter(event.target.value)}
              value={dispatcherFilter}
            >
              <option value="ALL">All dispatchers</option>
              {dispatchers.map((dispatcher) => (
                <option key={dispatcher} value={dispatcher}>
                  {dispatcher}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            disabled={isLoading}
            onClick={refreshSchedule}
            type="button"
          >
            Refresh schedule
          </button>
        </div>

        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-200" role="alert">
            <span>{error}</span>
            <button
              className="rounded-lg border border-red-400/40 px-3 py-1.5 hover:bg-red-900/40"
              onClick={refreshSchedule}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-gray-400" role="status">
            Loading weekly schedule…
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/70 text-xs font-semibold uppercase text-gray-400">
                  <th className="w-52 p-4">Driver / Unit</th>
                  {weekDays.map((day) => (
                    <th className="border-l border-gray-800 p-4 text-center" key={day.date}>
                      <div>{day.weekday}</div>
                      <div className="text-[10px] font-normal text-gray-500">
                        {day.formatted}
                      </div>
                    </th>
                  ))}
                  <th className="w-32 border-l border-gray-800 p-4 text-center">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {activeDrivers.map((driver) => {
                  const bookedDays = weekDays.reduce(
                    (count, day) =>
                      count +
                      (getLoadForDriverAndDate(driver, day.date).length > 0 ? 1 : 0),
                    0,
                  );
                  const utilization = Math.round((bookedDays / weekDays.length) * 100);

                  return (
                    <tr className="transition hover:bg-gray-800/30" key={driver.id}>
                      <td className="p-4 font-semibold text-gray-200">
                        <button
                          className="flex items-center gap-3 text-left"
                          onClick={() => setActiveDriver(driver)}
                          type="button"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600/20 text-xs font-bold text-blue-300">
                            {driver.firstName.charAt(0)}
                          </div>
                          <div>
                            <div>{driverName(driver)}</div>
                            <div className="text-[10px] font-normal text-gray-400">
                              {driver.truck_number
                                ? `Unit ${driver.truck_number}`
                                : 'View driver profile'}
                            </div>
                          </div>
                        </button>
                      </td>
                      {weekDays.map((day) => {
                        const activeLoads = getLoadForDriverAndDate(driver, day.date);
                        return (
                          <td
                            className="h-24 border-l border-gray-800 p-2 align-top"
                            key={day.date}
                          >
                            {activeLoads.length > 0 ? (
                              <div
                                className={`flex h-full flex-col gap-1.5 rounded-xl p-2 shadow-inner ${
                                  activeLoads.length > 1
                                    ? 'border border-purple-500/40 bg-purple-600/15'
                                    : 'border border-blue-500/30 bg-blue-600/15'
                                }`}
                              >
                                {activeLoads.length > 1 && (
                                  <div className="rounded bg-purple-950/80 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-purple-200">
                                    Turnaround day
                                  </div>
                                )}
                                {activeLoads.length > 1 && (
                                  <div className="rounded bg-purple-950/80 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-purple-200">
                                    Turnaround day
                                  </div>
                                )}
                                {activeLoads.map((activeLoad) => {
                                  const isPickupDay =
                                    dateKey(activeLoad.pickupDate) === day.date;
                                  const isDeliveryDay =
                                    dateKey(activeLoad.deliveryDate) === day.date;
                                  return (
                                    <div
                                      className="space-y-1 rounded-lg border border-gray-800 bg-gray-950/60 p-1.5 text-[10px]"
                                      key={activeLoad.id}
                                      title={`${activeLoad.origin} to ${activeLoad.destination}`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="truncate font-mono font-bold text-blue-300">
                                          {displayLoadNumber(activeLoad)}
                                        </span>
                                        <span className="shrink-0 font-semibold text-emerald-300">
                                          ${Number(activeLoad.rate).toLocaleString('en-US')}
                                        </span>
                                      </div>
                                      <div className="truncate text-[10px] text-gray-200">
                                        {activeLoad.origin || 'Origin TBD'} →{' '}
                                        {activeLoad.destination || 'Destination TBD'}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-gray-800/80 pt-1">
                                        {isPickupDay && (
                                          <span className="text-emerald-300">
                                            Pickup{activeLoad.pickupTime ? ` ${activeLoad.pickupTime}` : ''}
                                          </span>
                                        )}
                                        {isDeliveryDay && (
                                          <span className="text-rose-300">
                                            Drop{activeLoad.deliveryTime ? ` ${activeLoad.deliveryTime}` : ''}
                                          </span>
                                        )}
                                        {!isPickupDay && !isDeliveryDay && (
                                          <span className="text-blue-200">
                                            In transit overnight
                                          </span>
                                        )}
                                      </div>
                                      <div className="truncate rounded bg-blue-950/60 px-1 py-0.5 text-center text-[9px] uppercase tracking-wider text-gray-300">
                                        {activeLoad.status.replaceAll('_', ' ')}
                                      </div>
                                    </div>
                                  );
                                })}
                                {(() => {
                                  const deliveryLoad = activeLoads.find(
                                    (load) => dateKey(load.deliveryDate) === day.date,
                                  );
                                  const pickupLoad = activeLoads.find(
                                    (load) =>
                                      load.id !== deliveryLoad?.id &&
                                      dateKey(load.pickupDate) === day.date,
                                  );
                                  if (!deliveryLoad || !pickupLoad) return null;
                                  const deadheadKey = `${driver.id}-${day.date}`;
                                  const estimate = deadheadEstimates[deadheadKey];
                                  return (
                                    <div className="space-y-1 border-t border-purple-500/20 pt-1">
                                      {estimate ? (
                                        <p
                                          className="text-center text-[9px] text-purple-200"
                                          title={`${estimate.origin} to ${estimate.destination}`}
                                        >
                                          Estimated deadhead: {estimate.miles.toFixed(1)} mi
                                        </p>
                                      ) : (
                                        <button
                                          className="w-full text-center text-[9px] text-purple-200 underline decoration-purple-400/40 underline-offset-2 disabled:opacity-60"
                                          disabled={estimatingDeadheadKey === deadheadKey}
                                          onClick={() =>
                                            void handleEstimateDeadhead(
                                              deadheadKey,
                                              deliveryLoad,
                                              pickupLoad,
                                            )
                                          }
                                          type="button"
                                        >
                                          {estimatingDeadheadKey === deadheadKey
                                            ? 'Estimating deadhead…'
                                            : 'Estimate deadhead distance'}
                                        </button>
                                      )}
                                      {deadheadErrors[deadheadKey] && (
                                        <p
                                          className="text-center text-[9px] text-red-300"
                                          role="alert"
                                        >
                                          {deadheadErrors[deadheadKey]}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <button
                                className="flex h-full min-h-20 w-full flex-col items-center justify-center rounded-xl border border-rose-500/15 bg-rose-500/5 p-2.5 text-center transition hover:border-rose-500/40 hover:bg-rose-500/15"
                                onClick={() => {
                                  setAssignmentError(null);
                                  setGapAssignment({ driver, date: day.date });
                                }}
                                type="button"
                              >
                                <span className="text-[10px] font-bold uppercase text-rose-300">
                                  ⚠️ Gap day
                                </span>
                                <span className="mt-0.5 text-[9px] text-gray-500">
                                  + Assign load
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-l border-gray-800 p-4 text-center">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold ${
                            bookedDays >= 5
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : bookedDays >= 3
                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          {utilization}%
                        </span>
                        <span className="mt-1 block text-[10px] text-gray-500">
                          {bookedDays}/7 days booked
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {activeDrivers.length === 0 && (
                  <tr>
                    <td className="p-10 text-center text-sm text-gray-400" colSpan={9}>
                      {loads.length === 0
                        ? 'No loads or drivers are available to display.'
                        : 'No drivers match this dispatcher filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeDriver && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveDriver(null);
          }}
        >
          <aside
            aria-labelledby="schedule-driver-profile-title"
            aria-modal="true"
            className="h-full w-full max-w-md space-y-6 overflow-y-auto border-l border-gray-800 bg-gray-900 p-6 shadow-2xl"
            role="dialog"
          >
            <header className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  Driver profile
                </p>
                <h2
                  className="mt-1 text-xl font-extrabold text-white"
                  id="schedule-driver-profile-title"
                >
                  {driverName(activeDriver)}
                </h2>
              </div>
              <button
                aria-label="Close driver profile"
                className="rounded-lg px-3 py-2 text-xl text-gray-400 hover:bg-gray-800 hover:text-white"
                onClick={() => setActiveDriver(null)}
                type="button"
              >
                ×
              </button>
            </header>
            <section className="space-y-3 rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Driver & equipment
              </h3>
              <ProfileField label="Status" value={activeDriver.status || 'Not provided'} />
              <ProfileField label="Phone" value={activeDriver.phone || 'Not provided'} />
              <ProfileField label="Email" value={activeDriver.email || 'Not provided'} />
              <ProfileField
                label="Truck unit"
                value={activeDriver.truck_number || 'Not assigned'}
              />
              <ProfileField
                label="Trailer"
                value={activeDriver.trailer_number || 'Not assigned'}
              />
            </section>
            <section className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                HOS & compliance
              </h3>
              <p className="text-xs leading-relaxed text-gray-300">
                Hours-of-service clocks and driver compliance status are not
                available through the schedule data. Review the compliance
                records separately before dispatch.
              </p>
              <a
                className="inline-block text-xs font-semibold text-blue-300 underline underline-offset-4 hover:text-blue-200"
                href="/compliance"
              >
                Open compliance records
              </a>
            </section>
            <section className="space-y-3 rounded-xl border border-gray-800 bg-gray-950 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Scheduled loads this week
              </h3>
              {visibleLoads.filter(
                (load) =>
                  (load.driverId === activeDriver.id ||
                    load.driver?.id === activeDriver.id) &&
                  weekDays.some((day) => {
                    const pickup = dateKey(load.pickupDate);
                    const delivery = dateKey(load.deliveryDate);
                    return (
                      pickup !== null &&
                      delivery !== null &&
                      day.date >= pickup &&
                      day.date <= delivery
                    );
                  }),
              ).length === 0 ? (
                <p className="text-xs text-gray-500">No loads scheduled this week.</p>
              ) : (
                <ul className="space-y-2">
                  {visibleLoads
                    .filter(
                      (load) =>
                        (load.driverId === activeDriver.id ||
                          load.driver?.id === activeDriver.id) &&
                        weekDays.some((day) => {
                          const pickup = dateKey(load.pickupDate);
                          const delivery = dateKey(load.deliveryDate);
                          return (
                            pickup !== null &&
                            delivery !== null &&
                            day.date >= pickup &&
                            day.date <= delivery
                          );
                        }),
                    )
                    .map((load) => (
                      <li
                        className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-xs"
                        key={load.id}
                      >
                        <div className="font-mono font-bold text-blue-300">
                          {displayLoadNumber(load)}
                        </div>
                        <div className="mt-1 text-gray-300">
                          {load.origin} → {load.destination}
                        </div>
                        <div className="mt-1 text-gray-500">
                          {dateKey(load.pickupDate) || 'Date TBD'}
                          {load.pickupTime ? ` ${load.pickupTime}` : ''}
                          {' – '}
                          {dateKey(load.deliveryDate) || 'Date TBD'}
                          {load.deliveryTime ? ` ${load.deliveryTime}` : ''}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      {gapAssignment && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !assigningLoadId) {
              setGapAssignment(null);
            }
          }}
        >
          <section
            aria-labelledby="quick-assign-title"
            aria-modal="true"
            className="w-full max-w-lg space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
            role="dialog"
          >
            <header className="flex items-start justify-between border-b border-gray-800 pb-3">
              <div>
                <h2
                  className="text-base font-bold text-white"
                  id="quick-assign-title"
                >
                  Fill gap for {driverName(gapAssignment.driver)}
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Assignment date: {gapAssignment.date}
                </p>
              </div>
              <button
                aria-label="Close quick assign"
                className="text-gray-400 hover:text-white disabled:opacity-50"
                disabled={Boolean(assigningLoadId)}
                onClick={() => setGapAssignment(null)}
                type="button"
              >
                ×
              </button>
            </header>

            {assignmentError && (
              <p
                className="rounded-lg border border-red-500/40 bg-red-900/20 p-3 text-sm text-red-200"
                role="alert"
              >
                {assignmentError}
              </p>
            )}
            {unassignedLoads.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-center text-xs text-gray-400">
                No unassigned staged loads are available. Create or stage a load
                first, then return here to assign it.
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {unassignedLoads.map((load) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950 p-3"
                    key={load.id}
                  >
                    <div className="min-w-0 text-xs">
                      <div className="font-mono font-bold text-blue-300">
                        {displayLoadNumber(load)}
                      </div>
                      <div className="mt-1 truncate text-gray-300">
                        {load.origin || 'Origin TBD'} → {load.destination || 'Destination TBD'}
                      </div>
                      <div className="mt-1 text-gray-500">
                        {load.status.replaceAll('_', ' ')} · $
                        {Number(load.rate).toLocaleString('en-US')}
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={Boolean(assigningLoadId)}
                      onClick={() => void handleAssignLoad(load)}
                      type="button"
                    >
                      {assigningLoadId === load.id ? 'Assigning…' : 'Assign'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <footer className="flex justify-end border-t border-gray-800 pt-3">
              <button
                className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                disabled={Boolean(assigningLoadId)}
                onClick={() => setGapAssignment(null)}
                type="button"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-100">{value}</span>
    </div>
  );
}
