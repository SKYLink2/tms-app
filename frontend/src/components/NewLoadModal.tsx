"use client";

import { useCallback, useEffect, useState } from "react";
import type { Driver } from "@/types/driver";
import { LOAD_STATUSES } from "@/types/load";
import { formatPersonName } from "@/lib/person-name";
import { fetchDrivers } from "@/lib/drivers";

interface NewLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCreated: () => void;
}

export default function NewLoadModal({
  isOpen,
  onClose,
  onLoadCreated,
}: NewLoadModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    broker: "",
    rate: "",
    pickupDate: "",
    pickupTime: "",
    deliveryDate: "",
    deliveryTime: "",
    status: "DRAFT",
    driverId: "",
    truckUnitNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const loadDrivers = useCallback(async (signal: AbortSignal) => {
    setDriversLoading(true);
    setDriversError(null);
    try {
      setDrivers(await fetchDrivers(apiUrl, signal));
    } catch (err: unknown) {
      if (!signal.aborted) {
        setDriversError(
          err instanceof Error ? err.message : "Could not load drivers.",
        );
      }
    } finally {
      if (!signal.aborted) setDriversLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => void loadDrivers(controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, loadDrivers]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        origin: formData.origin,
        destination: formData.destination,
        broker: formData.broker,
        rate: parseFloat(formData.rate),
        pickupDate: formData.pickupDate || null,
        pickupTime: formData.pickupTime || null,
        deliveryDate: formData.deliveryDate || null,
        deliveryTime: formData.deliveryTime || null,
        status: formData.status,
        driverId: formData.driverId ? parseInt(formData.driverId) : undefined,
        truckUnitNumber: formData.truckUnitNumber || undefined,
      };

      const res = await fetch(`${apiUrl}/loads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create load");

      setFormData({
        origin: "",
        destination: "",
        broker: "",
        rate: "",
        pickupDate: "",
        pickupTime: "",
        deliveryDate: "",
        deliveryTime: "",
        status: "DRAFT",
        driverId: "",
        truckUnitNumber: "",
      });
      onLoadCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Add New Load</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-semibold transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Origin *
              </label>
              <input
                type="text"
                name="origin"
                required
                placeholder="City, State"
                value={formData.origin}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Destination *
              </label>
              <input
                type="text"
                name="destination"
                required
                placeholder="City, State"
                value={formData.destination}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-gray-300">
                Pickup date
                <input
                  type="date"
                  name="pickupDate"
                  value={formData.pickupDate}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs font-medium text-gray-300">
                Pickup time
                <input
                  type="time"
                  name="pickupTime"
                  value={formData.pickupTime}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-gray-300">
                Delivery date
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs font-medium text-gray-300">
                Delivery time
                <input
                  type="time"
                  name="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
                />
              </label>
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-300">
            Truck unit number (required with driver to assign)
            <input
              name="truckUnitNumber"
              value={formData.truckUnitNumber}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Broker
            </label>
            <input
              type="text"
              name="broker"
              placeholder="Broker or brokerage"
              value={formData.broker}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Rate ($) *
              </label>
              <input
                type="number"
                step="0.01"
                name="rate"
                required
                placeholder="1500.00"
                value={formData.rate}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {LOAD_STATUSES.filter((status) =>
                  ["DRAFT", "QUOTED", "PENDING_ASSIGNMENT"].includes(status),
                ).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Assign Driver
            </label>
            <select
              name="driverId"
              value={formData.driverId}
              onChange={handleChange}
              disabled={driversLoading}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">
                {driversLoading ? "Loading drivers..." : "-- Unassigned --"}
              </option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {formatPersonName(driver)}{" "}
                  {driver.truck_number ? `(Truck: ${driver.truck_number})` : ""}
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
            {!driversLoading && !driversError && drivers.length === 0 && (
              <p className="mt-2 text-xs text-amber-300">
                No drivers were returned by the API. Check that the driver was
                saved to this environment.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add Load"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
