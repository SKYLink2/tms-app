'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPersonName } from '@/lib/person-name';
import { useRole } from '../components/role-context';

const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'],
  ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
] as const;

const CDL_ENDORSEMENTS = [
  ['T', 'Doubles / Triples'],
  ['P', 'Passenger'],
  ['N', 'Tank Vehicle'],
  ['H', 'Hazardous Materials'],
  ['X', 'Tank Vehicle + Hazardous Materials'],
  ['S', 'School Bus'],
] as const;

const LICENSE_CLASSES = [
  'Class A',
  'Class A (Non-Domiciled)',
  'Class B',
  'Class B (Non-Domiciled)',
  'Class C',
  'Class C (Non-Domiciled)',
] as const;

const COMPLIANCE_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const DOCUMENT_KINDS = [
  ['id-photo', 'Driver ID / Photo', 'idPhotoUrl'],
  ['medical-card', 'Medical Card', 'medicalCardUrl'],
  ['w9-form', 'W-9 Form', 'w9FormUrl'],
] as const;
type DocumentKind = (typeof DOCUMENT_KINDS)[number][0];

interface ComplianceRecord {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  cdlNumber: string;
  licenseIssueState?: string | null;
  licenseClass?: string | null;
  endorsements?: string | null;
  cdlExpiration: string;
  medicalCardExpiration: string;
  lastDrugTestDate?: string | null;
  idPhotoUrl?: string | null;
  medicalCardUrl?: string | null;
  w9FormUrl?: string | null;
  status: string;
  notes?: string | null;
}

function isComplianceRecord(value: unknown): value is ComplianceRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const isOptionalString = (field: unknown) =>
    field === undefined || field === null || typeof field === 'string';

  return (
    typeof record.id === 'string' &&
    typeof record.firstName === 'string' &&
    isOptionalString(record.middleName) &&
    typeof record.lastName === 'string' &&
    isOptionalString(record.phone) &&
    isOptionalString(record.email) &&
    isOptionalString(record.address) &&
    typeof record.cdlNumber === 'string' &&
    isOptionalString(record.licenseIssueState) &&
    isOptionalString(record.licenseClass) &&
    isOptionalString(record.endorsements) &&
    typeof record.cdlExpiration === 'string' &&
    typeof record.medicalCardExpiration === 'string' &&
    isOptionalString(record.lastDrugTestDate) &&
    isOptionalString(record.idPhotoUrl) &&
    isOptionalString(record.medicalCardUrl) &&
    isOptionalString(record.w9FormUrl) &&
    typeof record.status === 'string' &&
    isOptionalString(record.notes)
  );
}

function safeDocumentUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\/compliance\/[0-9a-f-]+\/documents\/(id-photo|medical-card|w9-form)\/[0-9a-f-]+$/i.test(
    value,
  )
    ? `${COMPLIANCE_API_URL}${value}`
    : null;
}

export default function ComplianceDashboard() {
  const { currentRole } = useRole();
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [authState, setAuthState] = useState<
    'checking' | 'authenticated' | 'unauthenticated'
  >('checking');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // Form states
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cdlNumber, setCdlNumber] = useState('');
  const [licenseIssueState, setLicenseIssueState] = useState('');
  const [licenseClass, setLicenseClass] = useState('Class A');
  const [endorsements, setEndorsements] = useState<string[]>([]);
  const [cdlExpiration, setCdlExpiration] = useState('');
  const [medicalCardExpiration, setMedicalCardExpiration] = useState('');
  const [lastDrugTestDate, setLastDrugTestDate] = useState('');
  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [medicalCardUrl, setMedicalCardUrl] = useState('');
  const [w9FormUrl, setW9FormUrl] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<
    Partial<Record<DocumentKind, File>>
  >({});
  const [status, setStatus] = useState('Compliant');
  const [notes, setNotes] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRecords = (Array.isArray(records) ? records : []).filter((record) =>
    [
      record.firstName,
      record.middleName,
      record.lastName,
      record.phone,
      record.email,
      record.address,
      record.cdlNumber,
      record.licenseIssueState,
      record.licenseClass,
      record.endorsements,
      record.cdlExpiration,
      record.medicalCardExpiration,
      record.lastDrugTestDate,
      record.idPhotoUrl,
      record.medicalCardUrl,
      record.w9FormUrl,
      record.status,
      record.notes,
    ].some((value) => value?.toLowerCase().includes(normalizedQuery)),
  );

  const fetchCompliance = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetch(`${COMPLIANCE_API_URL}/compliance`, {
        credentials: 'include',
        headers: {
          'x-user-role': currentRole,
        },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthState('unauthenticated');
        setRecords([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch compliance records (${res.status})`);
      }
      const responseData: unknown = await res.json();
      // ... rest of your parsing logic
      const data = Array.isArray(responseData)
        ? responseData
        : typeof responseData === 'object' && responseData !== null
          ? ((responseData as { data?: unknown; records?: unknown }).data ??
            (responseData as { records?: unknown }).records)
          : null;
      if (!Array.isArray(data) || !data.every(isComplianceRecord)) {
        throw new Error('Backend returned invalid compliance records');
      }
      setRecords(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching compliance data:', err);
    }
  }, [currentRole]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(
          `${COMPLIANCE_API_URL}/compliance/auth/session`,
          { credentials: 'include' },
        );
        if (!response.ok) {
          throw new Error(`Could not verify administrator session (${response.status})`);
        }
        const session: unknown = await response.json();
        const authenticated =
          typeof session === 'object' &&
          session !== null &&
          'authenticated' in session &&
          session.authenticated === true;
        setAuthState(authenticated ? 'authenticated' : 'unauthenticated');
        if (authenticated) await fetchCompliance();
      } catch (err: unknown) {
        setAuthState('unauthenticated');
        setFetchError(
          err instanceof Error ? err.message : 'Could not verify administrator session',
        );
      }
    };

    void checkSession();
  }, [fetchCompliance]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const response = await fetch(
        `${COMPLIANCE_API_URL}/compliance/auth/login`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: loginUsername,
            password: loginPassword,
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          response.status === 503 || response.status === 429
            ? detail
            : 'Login failed. Check your administrator credentials.',
        );
      }
      setLoginPassword('');
      setAuthState('authenticated');
      await fetchCompliance();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(
        `${COMPLIANCE_API_URL}/compliance/auth/logout`,
        { method: 'POST', credentials: 'include' },
      );
      if (!response.ok) {
        throw new Error(`Logout failed (${response.status})`);
      }
      setRecords([]);
      setAuthState('unauthenticated');
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCdlNumber('');
    setLicenseIssueState('');
    setLicenseClass('Class A');
    setEndorsements([]);
    setCdlExpiration('');
    setMedicalCardExpiration('');
    setLastDrugTestDate('');
    setIdPhotoUrl('');
    setMedicalCardUrl('');
    setW9FormUrl('');
    setSelectedDocuments({});
    setStatus('Compliant');
    setNotes('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: ComplianceRecord) => {
    setEditingId(rec.id);
    setFirstName(rec.firstName);
    setMiddleName(rec.middleName || '');
    setLastName(rec.lastName);
    setPhone(rec.phone || '');
    setEmail(rec.email || '');
    setAddress(rec.address || '');
    setCdlNumber(rec.cdlNumber);
    setLicenseIssueState(rec.licenseIssueState || '');
    setLicenseClass(rec.licenseClass || 'Class A');
    setEndorsements(rec.endorsements?.split(',').map((item) => item.trim()).filter(Boolean) || []);
    setCdlExpiration(rec.cdlExpiration);
    setMedicalCardExpiration(rec.medicalCardExpiration);
    setLastDrugTestDate(rec.lastDrugTestDate || '');
    setIdPhotoUrl(rec.idPhotoUrl || '');
    setMedicalCardUrl(rec.medicalCardUrl || '');
    setW9FormUrl(rec.w9FormUrl || '');
    setSelectedDocuments({});
    setStatus(rec.status);
    setNotes(rec.notes || '');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      firstName,
      middleName,
      lastName,
      phone,
      email: email.trim() || undefined,
      address,
      cdlNumber,
      licenseIssueState,
      licenseClass,
      endorsements: endorsements.join(', '),
      cdlExpiration,
      medicalCardExpiration,
      lastDrugTestDate: lastDrugTestDate || null,
      status,
      notes,
    };

    setSaveError(null);
    setIsSaving(true);
    try {
      const url = editingId
        ? `${COMPLIANCE_API_URL}/compliance/${editingId}`
        : `${COMPLIANCE_API_URL}/compliance`;

      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || 'Failed to save compliance record');
      }

      const savedRecord: unknown = await res.json();
      if (!isComplianceRecord(savedRecord)) {
        throw new Error('Backend returned invalid compliance record data');
      }
      setEditingId(savedRecord.id);

      for (const [kind, , field] of DOCUMENT_KINDS) {
        const file = selectedDocuments[kind];
        if (!file) continue;
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await fetch(
          `${COMPLIANCE_API_URL}/compliance/${savedRecord.id}/documents/${kind}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'x-user-role': currentRole,
            },
            body: formData,
          },
        );
        if (!uploadResponse.ok) {
          const detail = await uploadResponse.text();
          throw new Error(
            detail || `Failed to upload ${kind.replace('-', ' ')}`,
          );
        }
        const uploadedRecord: unknown = await uploadResponse.json();
        if (!isComplianceRecord(uploadedRecord)) {
          throw new Error('Backend returned invalid compliance record data');
        }
        switch (field) {
          case 'idPhotoUrl':
            setIdPhotoUrl(uploadedRecord.idPhotoUrl || '');
            break;
          case 'medicalCardUrl':
            setMedicalCardUrl(uploadedRecord.medicalCardUrl || '');
            break;
          case 'w9FormUrl':
            setW9FormUrl(uploadedRecord.w9FormUrl || '');
            break;
        }
      }

      setSelectedDocuments({});
      setIsModalOpen(false);
      await fetchCompliance();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver compliance record?')) return;
    try {
      const response = await fetch(`${COMPLIANCE_API_URL}/compliance/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-user-role': currentRole,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to delete compliance record (${response.status})`);
      }
      fetchCompliance();
    } catch (err) {
      console.error('Error deleting compliance record:', err);
    }
  };

  if (authState !== 'authenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl"
        >
          <div>
            <h1 className="text-2xl font-bold">Compliance Records</h1>
            <p className="mt-2 text-sm text-gray-400">
              Sign in as the compliance administrator to access driver records
              and private documents.
            </p>
          </div>
          {authState === 'checking' ? (
            <p className="text-sm text-gray-400">Checking secure session…</p>
          ) : (
            <>
              {fetchError && (
                <div role="alert" className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
                  {fetchError}
                </div>
              )}
              {loginError && (
                <div role="alert" className="rounded-lg border border-red-500 bg-red-900/50 p-3 text-sm text-red-200">
                  {loginError}
                </div>
              )}
              <label className="block text-sm text-gray-300">
                Administrator username
                <input
                  required
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-white"
                />
              </label>
              <label className="block text-sm text-gray-300">
                Password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-white"
                />
              </label>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoggingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </>
          )}
        </form>
      </main>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">HR & Compliance</h1>
          <p className="text-gray-400 text-sm mt-1">Track driver CDLs, medical examiner certificates, drug tests, and safety records.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleLogout()}
            className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
          >
            Sign out
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20"
          >
            + Add Driver Record
          </button>
        </div>
      </div>

      {fetchError && (
        <div role="alert" className="rounded-lg border border-red-500 bg-red-900/50 p-4 text-sm text-red-200">
          Error: {fetchError}
        </div>
      )}
      {saveError && !isModalOpen && (
        <div role="alert" className="rounded-lg border border-red-500 bg-red-900/50 p-4 text-sm text-red-200">
          Error: {saveError}
        </div>
      )}

      <section aria-label="Compliance search">
        <input
          type="text"
          placeholder="Search by driver, CDL, status, or expiration date..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white shadow-inner placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </section>

      {/* Compliance Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/50 text-xs font-semibold text-gray-400 uppercase">
              <th className="p-4">Driver & Contact</th>
              <th className="p-4">CDL Details</th>
              <th className="p-4">Expiration Dates</th>
              <th className="p-4">Documents</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            {filteredRecords.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-800/40 transition">
                <td className="p-4">
                  <div className="font-semibold">{formatPersonName(rec)}</div>
                  <div className="text-xs text-gray-400">{rec.phone || 'No phone'}</div>
                  <div className="text-xs text-gray-400">{rec.email || 'No email'}</div>
                  <div className="max-w-xs truncate text-[11px] text-gray-500">{rec.address || 'No address'}</div>
                </td>
                <td className="p-4">
                  <div className="font-mono text-xs text-gray-200">{rec.cdlNumber}</div>
                  <div className="text-xs text-gray-400">
                    {[rec.licenseIssueState, rec.licenseClass].filter(Boolean).join(' · ') || 'License details not provided'}
                    {rec.endorsements ? ` (${rec.endorsements})` : ''}
                  </div>
                </td>
                <td className="space-y-1 p-4 text-xs">
                  <div>CDL: <span className="text-gray-300">{rec.cdlExpiration}</span></div>
                  <div>Medical: <span className="text-gray-300">{rec.medicalCardExpiration}</span></div>
                  <div>Drug test: <span className="text-gray-400">{rec.lastDrugTestDate || 'N/A'}</span></div>
                </td>
                <td className="space-y-1 p-4 text-xs">
                  {DOCUMENT_KINDS.map(([kind, label, field]) => {
                    const value = rec[field];
                    const url = safeDocumentUrl(value);
                    return url ? (
                      <a
                        key={kind}
                        href={url}
                        className="mr-2 text-blue-400 hover:underline"
                      >
                        {label}
                      </a>
                    ) : null;
                  })}
                  {!DOCUMENT_KINDS.some(([, , field]) =>
                    safeDocumentUrl(rec[field]),
                  ) && (
                      <span className="text-gray-500">No documents</span>
                    )}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    rec.status === 'Compliant' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    rec.status === 'Expiring Soon' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {rec.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleOpenEdit(rec)}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-medium rounded-lg text-gray-300 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium rounded-lg text-rose-400 border border-rose-500/20 transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {records.length === 0
                    ? 'No driver compliance records have been added yet.'
                    : 'No compliance records match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Driver Compliance Record' : 'Add Driver Compliance Record'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {([
                  ['First name', firstName, setFirstName, true],
                  ['Middle name', middleName, setMiddleName, false],
                  ['Last name', lastName, setLastName, true],
                ] as const).map(([label, value, setter, required]) => (
                  <div key={label}>
                    <label className="mb-1 block text-xs font-medium text-gray-300">
                      {label}{required ? ' *' : ''}
                    </label>
                    <input
                      type="text"
                      required={required}
                      value={value}
                      onChange={(event) => setter(event.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="driver@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Home Address</label>
                <input
                  type="text"
                  placeholder="Street, city, state, ZIP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">CDL Number</label>
                <input
                  type="text"
                  required
                  placeholder="DL-987654321"
                  value={cdlNumber}
                  onChange={(e) => setCdlNumber(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono"
                />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Issue State</label>
                  <select
                    value={licenseIssueState}
                    onChange={(e) => setLicenseIssueState(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="">Select state</option>
                    {US_STATES.map(([abbreviation, stateName]) => (
                      <option key={abbreviation} value={abbreviation}>{stateName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">License Class</label>
                  <select
                    value={licenseClass}
                    onChange={(e) => setLicenseClass(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    {LICENSE_CLASSES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Endorsements</label>
                  <details className="group relative">
                    <summary className="cursor-pointer list-none rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white">
                      {endorsements.length
                        ? endorsements.join(', ')
                        : 'Select endorsements'}
                    </summary>
                    <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">
                      {CDL_ENDORSEMENTS.map(([code, description]) => (
                        <label key={code} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-200 hover:bg-gray-800">
                          <input
                            type="checkbox"
                            checked={endorsements.includes(code)}
                            onChange={(event) => {
                              setEndorsements((selected) =>
                                event.target.checked
                                  ? [...selected, code]
                                  : selected.filter((item) => item !== code),
                              );
                            }}
                            className="accent-blue-500"
                          />
                          <span><strong>{code}</strong> — {description}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Compliance Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="Compliant">Compliant</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Non-Compliant">Non-Compliant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">CDL Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={cdlExpiration}
                    onChange={(e) => setCdlExpiration(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Medical Card Expiration</label>
                  <input
                    type="date"
                    required
                    value={medicalCardExpiration}
                    onChange={(e) => setMedicalCardExpiration(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-800 pt-4">
                <h3 className="text-xs font-semibold uppercase text-gray-400">
                  Private documents (PDF, JPEG, PNG, WebP; max 10 MB each)
                </h3>
                <p className="text-xs text-gray-500">
                  Files are encrypted before being stored and can only be downloaded after administrator sign-in.
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {DOCUMENT_KINDS.map(([kind, label, field]) => {
                    const currentUrl = {
                      idPhotoUrl,
                      medicalCardUrl,
                      w9FormUrl,
                    }[field];
                    const documentUrl = safeDocumentUrl(currentUrl);
                    return (
                      <label key={kind} className="block text-xs text-gray-300">
                        {label}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file && file.size > 10 * 1024 * 1024) {
                              setSaveError('Each document must be 10 MB or smaller.');
                              event.target.value = '';
                              return;
                            }
                            setSaveError(null);
                            setSelectedDocuments((selected) => ({
                              ...selected,
                              [kind]: file,
                            }));
                          }}
                          className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-200 file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-white"
                        />
                        {selectedDocuments[kind] && (
                          <span className="mt-1 block truncate text-gray-400">
                            Selected: {selectedDocuments[kind].name}
                          </span>
                        )}
                        {!selectedDocuments[kind] && documentUrl && (
                          <a
                            href={documentUrl}
                            className="mt-1 inline-block text-blue-400 hover:underline"
                          >
                            Download current file
                          </a>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {saveError && (
                <div role="alert" className="rounded-lg border border-red-500 bg-red-900/50 p-3 text-sm text-red-200">
                  Error: {saveError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Last Drug Test Date</label>
                  <input
                    type="date"
                    value={lastDrugTestDate}
                    onChange={(e) => setLastDrugTestDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Annual physical completed at clinic"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSaveError(null);
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Driver Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
