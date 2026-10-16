"use client";

import { useCallback, useEffect, useState } from "react";
import type { Driver } from "@/types/driver";
import type { Load } from "@/types/load";
import { LOAD_STATUSES } from "@/types/load";
import { formatPersonName } from "@/lib/person-name";
import { fetchDrivers } from "@/lib/drivers";

interface EditLoadModalProps {
  onClose: () => void;
  onLoadUpdated: () => void;
  load: Load;
}

export default function EditLoadModal({
  onClose,
  onLoadUpdated,
  load,
}: EditLoadModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [origin, setOrigin] = useState(load.origin);
  const [destination, setDestination] = useState(load.destination);
  const [broker, setBroker] = useState(load.broker ?? "");
  const [rate, setRate] = useState(String(load.rate));
  const [pickupDate, setPickupDate] = useState(load.pickupDate ?? "");
  const [pickupTime, setPickupTime] = useState(load.pickupTime ?? "");
  const [deliveryDate, setDeliveryDate] = useState(load.deliveryDate ?? "");
  const [deliveryTime, setDeliveryTime] = useState(load.deliveryTime ?? "");
  const [status, setStatus] = useState(load.status);
  const [driverId, setDriverId] = useState(
    load.driverId ? String(load.driverId) : "",
  );
  const [truckUnitNumber, setTruckUnitNumber] = useState(
    load.truckUnitNumber ?? load.driver?.truck_number ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const loadDrivers = useCallback(async (signal: AbortSignal) => {
    setDriversLoading(true);
    setDriversError(null);
    try {
      setDrivers(await fetchDrivers(apiUrl, signal));
    } catch (fetchError: unknown) {
      if (!signal.aborted) {
        setDriversError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load drivers.",
        );
      }
    } finally {
      if (!signal.aborted) setDriversLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => void loadDrivers(controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadDrivers]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/loads/${load.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          origin,
          destination,
          broker,
          rate: Number(rate),
          pickupDate: pickupDate || null,
          pickupTime: pickupTime || null,
          deliveryDate: deliveryDate || null,
          deliveryTime: deliveryTime || null,
          status,
          driverId: driverId ? Number(driverId) : null,
          truckUnitNumber: truckUnitNumber || null,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update load (${response.status})`);
      }
      onLoadUpdated();
      onClose();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update load",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white">Edit Load</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl font-semibold text-gray-400 transition hover:text-white"
            aria-label="Close edit load dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-500 bg-red-900/50 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs font-medium text-gray-300">
              Origin
              <input
                required
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs font-medium text-gray-300">
              Destination
              <input
                required
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-gray-300">
                Pickup date
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(event) => setPickupDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs font-medium text-gray-300">
                Pickup time
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(event) => setPickupTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-gray-300">
                Delivery date
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs font-medium text-gray-300">
                Delivery time
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(event) => setDeliveryTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-300">
            Broker
            <input
              value={broker}
              onChange={(event) => setBroker(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs font-medium text-gray-300">
              Rate ($)
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs font-medium text-gray-300">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              >
                {LOAD_STATUSES.map((loadStatus) => (
                  <option key={loadStatus} value={loadStatus}>
                    {loadStatus}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-300">
            Assigned Driver
            <select
              disabled={driversLoading}
              value={driverId}
              onChange={(event) => setDriverId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              <option value="">
                {driversLoading ? "Loading drivers..." : "Unassigned"}
              </option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {formatPersonName(driver)}
                  {driver.truck_number
                    ? ` (Truck: ${driver.truck_number})`
                    : ""}
                </option>
              ))}
            </select>
            {driversError && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-red-300" role="alert">
                <span>{driversError}</span>
                <button
                  className="shrink-0 underline underline-offset-2 hover:text-red-200"
                  onClick={() => {
                    const controller = new AbortController();
                    void loadDrivers(controller.signal);
                  }}
                  type="button"
                >
                  Retry
                </button>
              </div>
            )}
          </label>

          <label className="block text-xs font-medium text-gray-300">
            Truck unit number
            <input
              value={truckUnitNumber}
              onChange={(event) => setTruckUnitNumber(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
