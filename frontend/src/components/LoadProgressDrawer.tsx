"use client";

import { useEffect, useMemo, useState } from "react";
import { displayLoadNumber, type Load, type LoadNote } from "@/types/load";
import { LOAD_STATUSES } from "@/types/load";
import { formatPersonName } from "@/lib/person-name";
import TMSMap from "@/components/TMSMap";

type LoadTab = "Load Info" | "Securement" | "Documents" | "Shift Notes";
type FileKind =
  | "seal-photo"
  | "securement-photo"
  | "rate-confirmation"
  | "bol"
  | "pod"
  | "receipt";

interface LoadProgressDrawerProps {
  load: Load;
  onClose: () => void;
  onLoadUpdated: () => void;
}

const TABS: LoadTab[] = ["Load Info", "Securement", "Documents", "Shift Notes"];

function localDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function etaDescription(value?: string | null, now = Date.now()): string {
  if (!value) return "ETA not set";
  const difference = new Date(value).getTime() - now;
  if (!Number.isFinite(difference)) return "ETA not set";
  const minutes = Math.floor(Math.abs(difference) / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const remainingMinutes = minutes % 60;
  const duration = [
    days > 0 ? `${days}d` : "",
    hours > 0 ? `${hours}h` : "",
    `${remainingMinutes}m`,
  ]
    .filter(Boolean)
    .join(" ");
  return difference >= 0 ? `Arriving in ${duration}` : `Late by ${duration}`;
}

function FileLink({
  apiUrl,
  fileUrl,
  label,
}: {
  apiUrl: string;
  fileUrl?: string | null;
  label: string;
}) {
  if (!fileUrl) {
    return (
      <p className="mt-2 text-sm text-gray-500" aria-live="polite">
        No {label.toLowerCase()} uploaded yet.
      </p>
    );
  }

  const href = new URL(fileUrl, `${apiUrl}/`).toString();
  const isImage = /\.(jpe?g|png|webp)$/i.test(fileUrl);

  return (
    <div className="mt-3 flex items-center gap-3">
      {isImage && (
        <a href={href} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={href}
            alt={label}
            className="h-16 w-20 rounded-lg border border-gray-700 object-cover"
          />
        </a>
      )}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-blue-300 underline decoration-blue-500/40 underline-offset-4 hover:text-blue-200"
      >
        View {label}
      </a>
    </div>
  );
}

export default function LoadProgressDrawer({
  load: initialLoad,
  onClose,
  onLoadUpdated,
}: LoadProgressDrawerProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const [load, setLoad] = useState(initialLoad);
  const [activeTab, setActiveTab] = useState<LoadTab>("Load Info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<FileKind | null>(null);
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteText, setNoteText] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const etaInput = useMemo(() => localDateTime(load.eta), [load.eta]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLoad = async () => {
      try {
        const response = await fetch(`${apiUrl}/loads/${initialLoad.id}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load shipment details");
        setLoad((await response.json()) as Load);
      } catch (fetchError: unknown) {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load shipment details",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchLoad();
    return () => controller.abort();
  }, [apiUrl, initialLoad.id]);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const initialTimer = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const updateLoad = async (updates: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/loads/${load.id}/lifecycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;
        throw new Error(message || "Failed to update load");
      }
      setLoad((await response.json()) as Load);
      onLoadUpdated();
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update load",
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (kind: FileKind, file?: File) => {
    if (!file) return;
    setUploading(kind);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`${apiUrl}/loads/${load.id}/files/${kind}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;
        throw new Error(message || "File upload failed");
      }
      setLoad((await response.json()) as Load);
      onLoadUpdated();
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "File upload failed",
      );
    } finally {
      setUploading(null);
    }
  };

  const addNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/loads/${load.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ author: noteAuthor || "Load board", text: noteText }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;
        throw new Error(message || "Failed to add shift note");
      }
      const updated = (await response.json()) as Load;
      setLoad(updated);
      setNoteText("");
      onLoadUpdated();
    } catch (noteError: unknown) {
      setError(
        noteError instanceof Error ? noteError.message : "Failed to add note",
      );
    } finally {
      setSaving(false);
    }
  };

  const notes = [...(load.notes ?? [])].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );

  const uploadControl = (kind: FileKind, label: string, imagesOnly = false) => (
    <label className="inline-flex cursor-pointer items-center rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20 has-[:disabled]:cursor-wait has-[:disabled]:opacity-50">
      {uploading === kind ? "Uploading..." : label}
      <input
        className="sr-only"
        type="file"
        accept={
          imagesOnly
            ? "image/jpeg,image/png,image/webp"
            : ".pdf,image/jpeg,image/png,image/webp"
        }
        disabled={uploading !== null}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void uploadFile(kind, file);
        }}
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        aria-labelledby="load-progress-title"
        aria-modal="true"
        className="flex h-full w-full max-w-3xl flex-col border-l border-gray-700 bg-gray-900 shadow-2xl"
        role="dialog"
      >
        <header className="border-b border-gray-700 bg-gray-850 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-300">
                Load {displayLoadNumber(load)}
              </p>
              <h2
                className="mt-1 text-2xl font-bold text-white"
                id="load-progress-title"
              >
                {load.origin || "Origin pending"}{" "}
                <span className="text-gray-500">→</span>{" "}
                {load.destination || "Destination pending"}
              </h2>
            </div>
            <button
              aria-label="Close load details"
              className="rounded-lg px-3 py-2 text-xl text-gray-400 hover:bg-gray-800 hover:text-white"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm text-gray-400">
              Status
              <select
                aria-label="Load status"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                disabled={saving}
                onChange={(event) =>
                  void updateLoad({ status: event.target.value })
                }
                value={load.status}
              >
                {LOAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <p
              aria-live="polite"
              className={`text-sm font-semibold ${now !== null && load.eta && new Date(load.eta).getTime() < now ? "text-rose-300" : "text-emerald-300"}`}
            >
              {now === null
                ? load.eta
                  ? "Calculating ETA…"
                  : "ETA not set"
                : etaDescription(load.eta, now)}
            </p>
          </div>
        </header>

        <nav
          aria-label="Load detail sections"
          className="flex overflow-x-auto border-b border-gray-700 px-4 sm:px-7"
        >
          {TABS.map((tab) => (
            <button
              aria-current={activeTab === tab ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-4 text-sm font-medium transition sm:px-4 ${
                activeTab === tab
                  ? "border-blue-400 text-blue-200"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {error && (
            <div
              className="mb-5 rounded-lg border border-red-500/40 bg-red-900/30 p-3 text-sm text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}
          {loading && (
            <p className="mb-4 text-sm text-gray-400" role="status">
              Loading the latest load details…
            </p>
          )}

          {activeTab === "Load Info" && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2">
                <InfoField label="Load number" value={displayLoadNumber(load)} />
                <InfoField
                  label="Broker"
                  value={load.broker || "Not provided"}
                />
                <InfoField
                  label="Origin"
                  value={load.origin || "Not provided"}
                />
                <InfoField
                  label="Destination"
                  value={load.destination || "Not provided"}
                />
                <InfoField
                  label="Rate"
                  value={`$${Number(load.rate || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                />
                <InfoField
                  label="Driver"
                  value={load.driver ? formatPersonName(load.driver) : "Unassigned"}
                />
                <InfoField
                  label="Truck"
                  value={load.driver?.truck_number || "Not assigned"}
                />
                <InfoField
                  label="Trailer"
                  value={load.driver?.trailer_number || "Not assigned"}
                />
              </section>
              <TMSMap origin={load.origin} destination={load.destination} />
              <section className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                <h3 className="font-semibold text-white">Live tracking</h3>
                <label className="block text-sm text-gray-300">
                  Current location
                  <input
                    className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                    defaultValue={load.currentLocation ?? ""}
                    key={`${load.id}-${load.currentLocation}`}
                    onBlur={(event) => {
                      if (event.target.value !== (load.currentLocation ?? "")) {
                        void updateLoad({
                          currentLocation: event.target.value,
                        });
                      }
                    }}
                    placeholder="City, State or a driver update"
                  />
                </label>
                <label className="block text-sm text-gray-300">
                  Estimated arrival
                  <input
                    className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                    key={`${load.id}-${etaInput}`}
                    onBlur={(event) => {
                      const value = event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null;
                      if (value !== (load.eta ?? null)) {
                        void updateLoad({ eta: value });
                      }
                    }}
                    type="datetime-local"
                    defaultValue={etaInput}
                  />
                </label>
                <p className="text-xs text-gray-500">
                  Changes save when you leave a field.
                </p>
              </section>
            </div>
          )}

          {activeTab === "Securement" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                <h3 className="font-semibold text-white">Trailer seal</h3>
                <label className="mt-4 block text-sm text-gray-300">
                  Seal number
                  <input
                    className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                    defaultValue={load.trailerSealNumber ?? ""}
                    key={`${load.id}-${load.trailerSealNumber}`}
                    onBlur={(event) => {
                      if (
                        event.target.value !== (load.trailerSealNumber ?? "")
                      ) {
                        void updateLoad({
                          trailerSealNumber: event.target.value,
                        });
                      }
                    }}
                    placeholder="Enter trailer seal number"
                  />
                </label>
                <FileLink
                  apiUrl={apiUrl}
                  fileUrl={load.trailerSealPhotoUrl}
                  label="Trailer seal photo"
                />
                <div className="mt-3">
                  {uploadControl("seal-photo", "Upload seal photo", true)}
                </div>
              </section>
              <section className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      Cargo securement photos
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Upload photos of straps and cargo inspection.
                    </p>
                  </div>
                  {uploadControl(
                    "securement-photo",
                    "Add securement photo",
                    true,
                  )}
                </div>
                {load.securementPhotos?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {load.securementPhotos.map((url, index) => (
                      <FileLink
                        apiUrl={apiUrl}
                        fileUrl={url}
                        key={url}
                        label={`Securement photo ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">
                    No securement photos uploaded yet.
                  </p>
                )}
              </section>
            </div>
          )}

          {activeTab === "Documents" && (
            <div className="space-y-4">
              <DocumentCard
                apiUrl={apiUrl}
                fileUrl={load.rateConfirmationUrl}
                label="Rate confirmation"
                uploader={uploadControl(
                  "rate-confirmation",
                  "Upload rate confirmation",
                )}
              />
              <DocumentCard
                apiUrl={apiUrl}
                fileUrl={load.bolUrl}
                label="Bill of lading (BOL)"
                uploader={uploadControl("bol", "Upload BOL")}
              />
              <DocumentCard
                apiUrl={apiUrl}
                fileUrl={load.podUrl}
                label="Proof of delivery (POD)"
                uploader={uploadControl("pod", "Upload POD")}
              />
              <section className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">Receipts</h3>
                  {uploadControl("receipt", "Add receipt")}
                </div>
                {load.receiptUrls?.map((url, index) => (
                  <FileLink
                    apiUrl={apiUrl}
                    fileUrl={url}
                    key={url}
                    label={`Receipt ${index + 1}`}
                  />
                ))}
                {!load.receiptUrls?.length && (
                  <p className="mt-2 text-sm text-gray-500">
                    No receipts uploaded yet.
                  </p>
                )}
              </section>
              <p className="text-xs text-gray-500">
                PDF, JPEG, PNG, and WebP files up to 10 MB are accepted.
              </p>
            </div>
          )}

          {activeTab === "Shift Notes" && (
            <div className="space-y-6">
              <form
                className="space-y-3 rounded-xl border border-gray-700 bg-gray-800/60 p-4"
                onSubmit={(event) => void addNote(event)}
              >
                <h3 className="font-semibold text-white">Add shift note</h3>
                <label className="block text-sm text-gray-300">
                  Author / shift
                  <input
                    className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                    maxLength={100}
                    onChange={(event) => setNoteAuthor(event.target.value)}
                    placeholder="e.g. Dispatcher, Jordan"
                    required
                    value={noteAuthor}
                  />
                </label>
                <label className="block text-sm text-gray-300">
                  Note
                  <textarea
                    className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                    maxLength={5000}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Record an operational update..."
                    required
                    value={noteText}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                    disabled={saving || !noteAuthor.trim() || !noteText.trim()}
                    type="submit"
                  >
                    {saving ? "Saving..." : "Add note"}
                  </button>
                </div>
              </form>
              <section aria-label="Shift note history">
                <h3 className="mb-3 font-semibold text-white">Shift history</h3>
                {notes.length ? (
                  <ol className="space-y-3">
                    {notes.map((note: LoadNote) => (
                      <li
                        className="rounded-xl border border-gray-700 bg-gray-800/60 p-4"
                        key={note.id}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-blue-200">
                            {note.author}
                          </span>
                          <time
                            className="text-xs text-gray-500"
                            dateTime={note.createdAt}
                          >
                            {new Date(note.createdAt).toLocaleString()}
                          </time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-200">
                          {note.text}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-gray-500">
                    No shift notes recorded yet.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
        <footer className="border-t border-gray-700 px-5 py-3 text-xs text-gray-500 sm:px-7">
          {load.currentLocation
            ? `Last location update: ${load.currentLocation}`
            : "No current location update"}
        </footer>
      </aside>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium text-gray-100">{value}</p>
    </div>
  );
}

function DocumentCard({
  apiUrl,
  fileUrl,
  label,
  uploader,
}: {
  apiUrl: string;
  fileUrl?: string | null;
  label: string;
  uploader: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-800/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-semibold text-white">{label}</h3>
        <FileLink apiUrl={apiUrl} fileUrl={fileUrl} label={label} />
      </div>
      {uploader}
    </section>
  );
}
