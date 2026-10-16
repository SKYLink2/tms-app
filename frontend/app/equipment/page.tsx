'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '../components/role-context';

interface EquipmentItem {
  id: string;
  type: 'Truck' | 'Trailer';
  unitNumber: string;
  vin?: string | null;
  trailerType?: string | null;
  status: string;
  inventory?: string[] | null;
  nextServiceDue?: string | null;
  currentMileage?: number | null;
}

interface DriverItem {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  truck_number?: string | null;
  trailer_number?: string | null;
}

interface DeviceItem {
  id: string;
  type: 'TABLET' | 'ELD';
  model: string | null;
  serialNumber: string | null;
  imei: string | null;
  phoneNumber: string | null;
  status: string;
}

interface EquipmentAssignmentItem {
  id: string;
  mode: 'SOLO' | 'TEAM';
  status: 'ACTIVE' | 'RELEASED';
  assignedAt: string;
  releasedAt: string | null;
  primaryDriver: DriverItem;
  secondaryDriver: DriverItem | null;
  truck: EquipmentItem;
  trailer: EquipmentItem | null;
  tablet: DeviceItem | null;
  eldDevice: DeviceItem | null;
}

type MaintenanceCategory =
  | 'PREVENTIVE_MAINTENANCE'
  | 'REPAIR'
  | 'TIRES'
  | 'DOT_INSPECTION'
  | 'BRAKES'
  | 'EMERGENCY_ROADSIDE';

type MaintenanceStatus =
  | 'COMPLETED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'CANCELLED';

interface MaintenanceRecordItem {
  id: string;
  equipmentId: string;
  equipment: EquipmentItem;
  category: MaintenanceCategory;
  serviceDescription: string;
  vendorName: string | null;
  vendorLocation: string | null;
  odometerReading: number | null;
  laborCost: number | string;
  partsCost: number | string;
  totalCost: number | string;
  invoiceUrl: string | null;
  invoiceNumber: string | null;
  status: MaintenanceStatus;
  serviceDate: string;
  nextScheduledDate: string | null;
  nextScheduledMileage: number | null;
}

interface MaintenanceExpenseSummary {
  totalSpentAllTime: number;
  totalSpentThisMonth: number;
  upcomingServices: MaintenanceRecordItem[];
}

interface MaintenanceForm {
  equipmentId: string;
  category: MaintenanceCategory;
  serviceDescription: string;
  vendorName: string;
  vendorLocation: string;
  odometerReading: string;
  partsCost: string;
  laborCost: string;
  invoiceNumber: string;
  invoiceUrl: string;
  serviceDate: string;
  nextScheduledDate: string;
  nextScheduledMileage: string;
  status: MaintenanceStatus;
}

const maintenanceCategories: MaintenanceCategory[] = [
  'PREVENTIVE_MAINTENANCE',
  'REPAIR',
  'TIRES',
  'DOT_INSPECTION',
  'BRAKES',
  'EMERGENCY_ROADSIDE',
];

const maintenanceStatuses: MaintenanceStatus[] = [
  'COMPLETED',
  'SCHEDULED',
  'IN_PROGRESS',
  'CANCELLED',
];

function createEmptyMaintenanceForm(): MaintenanceForm {
  return {
    equipmentId: '',
    category: 'PREVENTIVE_MAINTENANCE',
    serviceDescription: '',
    vendorName: '',
    vendorLocation: '',
    odometerReading: '',
    partsCost: '0',
    laborCost: '0',
    invoiceNumber: '',
    invoiceUrl: '',
    serviceDate: '',
    nextScheduledDate: '',
    nextScheduledMileage: '',
    status: 'COMPLETED',
  };
}

type InventoryCategory = 'all' | 'trucks' | 'trailers' | 'devices';
type InventoryStatus = 'ALL' | 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE';

interface InventoryRow {
  id: string;
  category: Exclude<InventoryCategory, 'all'>;
  kind: string;
  identifier: string;
  details: string;
  status: string;
  maintenanceTarget: 'equipment' | 'device';
}

function isEquipmentItem(value: unknown): value is EquipmentItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    (item.type === 'Truck' || item.type === 'Trailer') &&
    typeof item.unitNumber === 'string' &&
    typeof item.status === 'string' &&
    (item.vin === undefined || item.vin === null || typeof item.vin === 'string') &&
    (item.trailerType === undefined ||
      item.trailerType === null ||
      typeof item.trailerType === 'string') &&
    (item.inventory === undefined ||
      item.inventory === null ||
      (Array.isArray(item.inventory) &&
        item.inventory.every((gear) => typeof gear === 'string'))) &&
    (item.nextServiceDue === undefined ||
      item.nextServiceDue === null ||
      typeof item.nextServiceDue === 'string') &&
    (item.currentMileage === undefined ||
      item.currentMileage === null ||
      typeof item.currentMileage === 'number')
  );
}

function normalizeInventoryStatus(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'AVAILABLE') {
    return 'AVAILABLE';
  }
  if (normalized === 'IN MAINTENANCE' || normalized === 'MAINTENANCE') {
    return 'MAINTENANCE';
  }
  return normalized;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (text) {
    try {
      const body = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(body.message)) return body.message.join(', ');
      if (body.message) return body.message;
    } catch {
      return text;
    }
  }
  return fallback;
}

export default function EquipmentDashboard() {
  const { currentRole, isLoading: isRoleLoading } = useRole();
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [assignments, setAssignments] = useState<EquipmentAssignmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [releasingAssignmentId, setReleasingAssignmentId] = useState<string | null>(null);
  const [updatingEquipmentId, setUpdatingEquipmentId] = useState<string | null>(
    null,
  );
  const [updatingDeviceId, setUpdatingDeviceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'active' | 'history' | 'inventory' | 'maintenance'
  >('active');
  const [inventoryCategory, setInventoryCategory] =
    useState<InventoryCategory>('all');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus>('ALL');
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecordItem[]
  >([]);
  const [expenseSummary, setExpenseSummary] =
    useState<MaintenanceExpenseSummary>({
      totalSpentAllTime: 0,
      totalSpentThisMonth: 0,
      upcomingServices: [],
    });
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);
  const [maintForm, setMaintForm] = useState<MaintenanceForm>(
    createEmptyMaintenanceForm,
  );
  const [filterType, setFilterType] = useState<'All' | 'Truck' | 'Trailer'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  // Form state for adding new equipment
  const [unitNumber, setUnitNumber] = useState('');
  const [type, setType] = useState<'Truck' | 'Trailer'>('Truck');
  const [vin, setVin] = useState('');
  const [trailerType, setTrailerType] = useState('Dry Van');
  const [inventoryInput, setInventoryInput] = useState('Samsara ELD, Straps');
  const [assignmentMode, setAssignmentMode] = useState<'SOLO' | 'TEAM'>('SOLO');
  const [primaryDriverId, setPrimaryDriverId] = useState('');
  const [secondaryDriverId, setSecondaryDriverId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [trailerId, setTrailerId] = useState('');
  const [tabletId, setTabletId] = useState('');
  const [eldDeviceId, setEldDeviceId] = useState('');
  const [deviceType, setDeviceType] = useState<'TABLET' | 'ELD'>('TABLET');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceSerialNumber, setDeviceSerialNumber] = useState('');
  const [deviceImei, setDeviceImei] = useState('');
  const [devicePhoneNumber, setDevicePhoneNumber] = useState('');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const canLogMaintenance = ['admin', 'owner', 'fleet_manager'].includes(
    currentRole,
  );

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const assignmentEndpoint =
        viewMode === 'history'
          ? `${apiUrl}/equipment/assignments/history`
          : `${apiUrl}/equipment/assignments`;
      const responses = await Promise.all([
        fetch(`${apiUrl}/equipment`, { credentials: 'include' }),
        fetch(`${apiUrl}/drivers`, { credentials: 'include' }),
        fetch(`${apiUrl}/devices`, { credentials: 'include' }),
        fetch(assignmentEndpoint, { credentials: 'include' }),
      ]);
      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        throw new Error(`Failed to fetch fleet data (${failedResponse.status})`);
      }

      const [equipmentData, driverData, deviceData, assignmentData] =
        (await Promise.all(responses.map((response) => response.json()))) as unknown[];
      if (!Array.isArray(equipmentData) || !equipmentData.every(isEquipmentItem)) {
        throw new Error('Backend returned invalid equipment data');
      }
      if (
        !Array.isArray(driverData) ||
        !Array.isArray(deviceData) ||
        !Array.isArray(assignmentData)
      ) {
        throw new Error('Backend returned invalid fleet assignment data');
      }
      setEquipmentList(equipmentData);
      setDrivers(driverData as DriverItem[]);
      setDevices(deviceData as DeviceItem[]);
      setAssignments(assignmentData as EquipmentAssignmentItem[]);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, viewMode]);

  const fetchMaintenanceData = useCallback(async () => {
    setIsMaintenanceLoading(true);
    try {
      const [recordsResponse, summaryResponse] = await Promise.all([
        fetch(`${apiUrl}/maintenance/records`, { credentials: 'include' }),
        fetch(`${apiUrl}/maintenance/summary`, { credentials: 'include' }),
      ]);
      if (!recordsResponse.ok) {
        throw new Error(
          await responseError(recordsResponse, 'Failed to fetch maintenance records'),
        );
      }
      if (!summaryResponse.ok) {
        throw new Error(
          await responseError(summaryResponse, 'Failed to fetch maintenance summary'),
        );
      }
      const [recordsData, summaryData]: [unknown, unknown] = await Promise.all([
        recordsResponse.json(),
        summaryResponse.json(),
      ]);
      if (!Array.isArray(recordsData) || typeof summaryData !== 'object' || summaryData === null) {
        throw new Error('Backend returned invalid maintenance data');
      }
      setMaintenanceRecords(recordsData as MaintenanceRecordItem[]);
      setExpenseSummary(summaryData as MaintenanceExpenseSummary);
    } finally {
      setIsMaintenanceLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        await fetchDashboardData();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    void loadEquipment();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (viewMode !== 'maintenance') return;
    const loadMaintenance = async () => {
      try {
        await fetchMaintenanceData();
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load maintenance data',
        );
      }
    };
    void loadMaintenance();
  }, [fetchMaintenanceData, viewMode]);

  // Handle adding new unit
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/equipment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          unitNumber,
          vin,
          trailerType: type === 'Trailer' ? trailerType : null,
          inventory: inventoryInput.split(',').map((i) => i.trim()),
          status: 'AVAILABLE',
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || 'Failed to save equipment');
      }
      await fetchDashboardData();
      setIsModalOpen(false);
      setUnitNumber('');
      setVin('');
      setInventoryInput('Samsara ELD, Straps');
      setTrailerType('Dry Van');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSavingAssignment(true);
    try {
      const response = await fetch(`${apiUrl}/equipment/assignments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: assignmentMode,
          primaryDriverId: Number(primaryDriverId),
          ...(assignmentMode === 'TEAM'
            ? { secondaryDriverId: Number(secondaryDriverId) }
            : {}),
          truckId,
          ...(trailerId ? { trailerId } : {}),
          ...(tabletId ? { tabletId } : {}),
          ...(eldDeviceId ? { eldDeviceId } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(
          await responseError(response, 'Failed to create equipment assignment'),
        );
      }
      await fetchDashboardData();
      setIsAssignmentModalOpen(false);
      setAssignmentMode('SOLO');
      setPrimaryDriverId('');
      setSecondaryDriverId('');
      setTruckId('');
      setTrailerId('');
      setTabletId('');
      setEldDeviceId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create assignment');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleReleaseAssignment = async (assignmentId: string) => {
    setError(null);
    setReleasingAssignmentId(assignmentId);
    try {
      const response = await fetch(
        `${apiUrl}/equipment/assignments/${assignmentId}/release`,
        { method: 'PATCH', credentials: 'include' },
      );
      if (!response.ok) {
        throw new Error(
          await responseError(response, 'Failed to release equipment assignment'),
        );
      }
      await fetchDashboardData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not release assignment');
    } finally {
      setReleasingAssignmentId(null);
    }
  };

  const handleMaintenanceToggle = async (
    target: 'equipment' | 'device',
    id: string,
    status: string,
  ) => {
    const nextStatus =
      status.toUpperCase() === 'MAINTENANCE' ||
      status.toUpperCase() === 'IN MAINTENANCE'
        ? 'AVAILABLE'
        : 'MAINTENANCE';
    const setUpdatingId =
      target === 'equipment' ? setUpdatingEquipmentId : setUpdatingDeviceId;
    setError(null);
    setUpdatingId(id);
    try {
      const response = await fetch(
        `${apiUrl}/${target === 'equipment' ? 'equipment' : 'devices'}/${id}/maintenance`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await responseError(response, 'Failed to update maintenance status'),
        );
      }
      await fetchDashboardData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateMaintenanceRecord = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSavingMaintenance(true);
    try {
      const response = await fetch(`${apiUrl}/maintenance/records`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: maintForm.equipmentId,
          category: maintForm.category,
          serviceDescription: maintForm.serviceDescription.trim(),
          ...(maintForm.vendorName.trim()
            ? { vendorName: maintForm.vendorName.trim() }
            : {}),
          ...(maintForm.vendorLocation.trim()
            ? { vendorLocation: maintForm.vendorLocation.trim() }
            : {}),
          ...(maintForm.odometerReading
            ? { odometerReading: Number(maintForm.odometerReading) }
            : {}),
          partsCost: Number(maintForm.partsCost || 0),
          laborCost: Number(maintForm.laborCost || 0),
          ...(maintForm.invoiceNumber.trim()
            ? { invoiceNumber: maintForm.invoiceNumber.trim() }
            : {}),
          ...(maintForm.invoiceUrl.trim()
            ? { invoiceUrl: maintForm.invoiceUrl.trim() }
            : {}),
          serviceDate: maintForm.serviceDate,
          ...(maintForm.nextScheduledDate
            ? { nextScheduledDate: maintForm.nextScheduledDate }
            : {}),
          ...(maintForm.nextScheduledMileage
            ? { nextScheduledMileage: Number(maintForm.nextScheduledMileage) }
            : {}),
          status: maintForm.status,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await responseError(response, 'Failed to create maintenance record'),
        );
      }
      setIsMaintenanceModalOpen(false);
      setMaintForm(createEmptyMaintenanceForm());
      await Promise.all([fetchMaintenanceData(), fetchDashboardData()]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Could not create maintenance record',
      );
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  const handleCreateDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`${apiUrl}/devices`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: deviceType,
          ...(deviceModel ? { model: deviceModel } : {}),
          ...(deviceSerialNumber ? { serialNumber: deviceSerialNumber } : {}),
          ...(deviceImei ? { imei: deviceImei } : {}),
          ...(devicePhoneNumber ? { phoneNumber: devicePhoneNumber } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, 'Failed to save device'));
      }
      await fetchDashboardData();
      setIsDeviceModalOpen(false);
      setDeviceModel('');
      setDeviceSerialNumber('');
      setDeviceImei('');
      setDevicePhoneNumber('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add device');
    } finally {
      setIsSaving(false);
    }
  };

  // Safeguard against non-array data responses
  const filteredEquipment = Array.isArray(equipmentList)
    ? equipmentList.filter((item) => {
        const matchesType = filterType === 'All' || item.type === filterType;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [
            item.unitNumber,
            item.type,
            item.trailerType,
            item.vin,
            item.status,
            ...(item.inventory ?? []),
          ].some((value) => value?.toLowerCase().includes(query));
        return matchesType && matchesSearch;
      })
    : [];
  const activeAssignments = assignments.filter(
    (assignment) => assignment.status === 'ACTIVE',
  );
  const filteredAssignments =
    viewMode === 'active' ? activeAssignments : assignments;
  const canManageFleet = [
    'admin',
    'owner',
    'dispatch_manager',
    'fleet_manager',
  ].includes(currentRole);
  const assignedDriverIds = new Set(
    activeAssignments.flatMap((assignment) =>
      [assignment.primaryDriver.id, assignment.secondaryDriver?.id].filter(
        (id): id is number => id !== undefined,
      ),
    ),
  );
  const availableDrivers = drivers.filter(
    (driver) =>
      driver.status.toUpperCase() === 'ACTIVE' &&
      !driver.truck_number?.trim() &&
      !driver.trailer_number?.trim() &&
      !assignedDriverIds.has(driver.id),
  );
  const availableTrucks = equipmentList.filter(
    (item) =>
      item.type === 'Truck' &&
      ['AVAILABLE', 'ACTIVE'].includes(item.status.toUpperCase()),
  );
  const availableTrailers = equipmentList.filter(
    (item) =>
      item.type === 'Trailer' &&
      ['AVAILABLE', 'ACTIVE'].includes(item.status.toUpperCase()),
  );
  const availableTablets = devices.filter(
    (device) =>
      device.type === 'TABLET' && device.status.toUpperCase() === 'AVAILABLE',
  );
  const availableEldDevices = devices.filter(
    (device) => device.type === 'ELD' && device.status.toUpperCase() === 'AVAILABLE',
  );
  const inventoryRows: InventoryRow[] = [
    ...equipmentList
      .filter(
        (item) =>
          inventoryCategory === 'all' ||
          (inventoryCategory === 'trucks' && item.type === 'Truck') ||
          (inventoryCategory === 'trailers' && item.type === 'Trailer'),
      )
      .map((item) => ({
        id: item.id,
        category: item.type === 'Truck' ? 'trucks' as const : 'trailers' as const,
        kind: item.type,
        identifier: item.unitNumber,
        details: item.vin || item.trailerType || 'N/A',
        status: item.status,
        maintenanceTarget: 'equipment' as const,
      })),
    ...(inventoryCategory === 'all' || inventoryCategory === 'devices'
      ? devices.map((device) => ({
          id: device.id,
          category: 'devices' as const,
          kind: device.type,
          identifier:
            device.model || device.serialNumber || device.imei || 'Device',
          details:
            [device.serialNumber, device.imei, device.phoneNumber]
              .filter((value): value is string => Boolean(value))
              .join(' · ') || 'N/A',
          status: device.status,
          maintenanceTarget: 'device' as const,
        }))
      : []),
  ].filter(
    (item) =>
      statusFilter === 'ALL' ||
      normalizeInventoryStatus(item.status) === statusFilter,
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-white">

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Fleet & Equipment Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage semi-trucks, diverse trailers, and onboard truck inventories.</p>
        </div>
        {!isRoleLoading && canManageFleet && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsAssignmentModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm rounded-xl transition"
            >
              + Assign Equipment
            </button>
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 font-semibold text-sm rounded-xl transition"
            >
              + Add Device
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              + Add New Unit
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500 bg-red-900/50 p-4 text-sm text-red-200">
          Error: {error}
        </div>
      )}

      <nav
        aria-label="Fleet dashboard views"
        className="flex flex-wrap gap-2 border-b border-gray-800 pb-4"
      >
        {([
          ['active', 'Active Assignments'],
          ['history', 'Audit History & Logs'],
          ['inventory', 'Master Inventory'],
          ['maintenance', 'Maintenance Ledger'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              viewMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {(viewMode === 'active' || viewMode === 'history') && (
      <section aria-labelledby="active-assignments-heading" className="space-y-4">
        <div className="space-y-4">
          <div>
            <h2 id="active-assignments-heading" className="text-xl font-bold">
              {viewMode === 'active'
                ? 'Active Fleet Setups'
                : 'Assignment History'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {viewMode === 'active'
                ? 'Each active setup exclusively reserves its drivers and equipment.'
                : 'Released assignments with the assigned drivers and exact assignment dates.'}
            </p>
          </div>
          <div className="flex items-center gap-2 border-b border-gray-800 pb-4">
            <span className="ml-auto rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
              {viewMode === 'active'
                ? `${activeAssignments.length} active`
                : `${assignments.length} released`}
            </span>
          </div>
        </div>
        {isLoading ? (
          <p className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-400">
            {viewMode === 'history'
              ? 'Loading assignment history...'
              : 'Loading fleet assignments...'}
          </p>
        ) : filteredAssignments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
            {viewMode === 'active'
              ? 'No active equipment assignments.'
              : 'No released equipment assignments.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAssignments.map((assignment) => (
              <article
                key={assignment.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-300">
                        {assignment.mode}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          assignment.status === 'ACTIVE'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-gray-700 bg-gray-800 text-gray-400'
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </div>
                    <h3 className="mt-2 font-bold text-white">
                      {assignment.truck.unitNumber}
                      {assignment.trailer
                        ? ` / ${assignment.trailer.unitNumber}`
                        : ''}
                    </h3>
                  </div>
                  {assignment.status === 'ACTIVE' &&
                    !isRoleLoading &&
                    canManageFleet && (
                  <button
                    type="button"
                    onClick={() => void handleReleaseAssignment(assignment.id)}
                    disabled={releasingAssignmentId === assignment.id}
                    className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    {releasingAssignmentId === assignment.id
                      ? 'Releasing...'
                      : 'Release Setup'}
                  </button>
                    )}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-800 pt-3 text-xs">
                  <dt className="text-gray-500">Drivers</dt>
                  <dd className="text-right text-gray-200">
                    {assignment.primaryDriver.firstName}{' '}
                    {assignment.primaryDriver.lastName}
                    {assignment.secondaryDriver && (
                      <>
                        {' + '}
                        {assignment.secondaryDriver.firstName}{' '}
                        {assignment.secondaryDriver.lastName}
                      </>
                    )}
                  </dd>
                  <dt className="text-gray-500">Truck VIN</dt>
                  <dd className="text-right font-mono text-gray-200">
                    {assignment.truck.vin || 'N/A'}
                  </dd>
                  <dt className="text-gray-500">Trailer</dt>
                  <dd className="text-right text-gray-200">
                    {assignment.trailer
                      ? `${assignment.trailer.unitNumber} · ${assignment.trailer.trailerType || 'Trailer'}`
                      : 'None'}
                  </dd>
                  <dt className="text-gray-500">Tablet</dt>
                  <dd className="text-right text-gray-200">
                    {assignment.tablet
                      ? `${assignment.tablet.imei || assignment.tablet.serialNumber || assignment.tablet.model || 'Assigned'}${assignment.tablet.phoneNumber ? ` · ${assignment.tablet.phoneNumber}` : ''}`
                      : 'None'}
                  </dd>
                  <dt className="text-gray-500">ELD</dt>
                  <dd className="text-right text-gray-200">
                    {assignment.eldDevice?.serialNumber ||
                      assignment.eldDevice?.model ||
                      'None'}
                  </dd>
                  <dt className="text-gray-500">Assigned</dt>
                  <dd className="text-right text-gray-200">
                    {new Date(assignment.assignedAt).toLocaleString()}
                  </dd>
                  {assignment.releasedAt && (
                    <>
                      <dt className="text-gray-500">Released</dt>
                      <dd className="text-right text-gray-200">
                        {new Date(assignment.releasedAt).toLocaleString()}
                      </dd>
                    </>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      {viewMode === 'maintenance' ? (
        <section
          aria-labelledby="maintenance-ledger-heading"
          className="space-y-6"
        >
          <div>
            <h2 id="maintenance-ledger-heading" className="text-xl font-bold">
              Maintenance &amp; Service Ledger
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Track service activity, costs, invoices, and upcoming preventive maintenance.
            </p>
          </div>
          {isMaintenanceLoading ? (
            <p className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-400">
              Loading maintenance records...
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
                  <span className="block text-[10px] font-mono font-bold uppercase text-gray-500">
                    Total Maintenance Spent
                  </span>
                  <span className="mt-1 block text-2xl font-black text-rose-400">
                    {expenseSummary.totalSpentAllTime.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </span>
                </article>
                <article className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
                  <span className="block text-[10px] font-mono font-bold uppercase text-gray-500">
                    Spent This Month
                  </span>
                  <span className="mt-1 block text-2xl font-black text-amber-400">
                    {expenseSummary.totalSpentThisMonth.toLocaleString(
                      'en-US',
                      { style: 'currency', currency: 'USD' },
                    )}
                  </span>
                </article>
                <article className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
                  <span className="block text-[10px] font-mono font-bold uppercase text-gray-500">
                    Scheduled Services
                  </span>
                  <span className="mt-1 block text-2xl font-black text-blue-300">
                    {expenseSummary.upcomingServices.length}
                  </span>
                </article>
                <article className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
                  <div>
                    <span className="block text-[10px] font-mono font-bold uppercase text-gray-500">
                      Service Log Actions
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">
                      Log repairs, oil changes, and inspections.
                    </span>
                  </div>
                  {!isRoleLoading && canLogMaintenance && (
                    <button
                      type="button"
                      onClick={() => {
                        setMaintForm({
                          ...createEmptyMaintenanceForm(),
                          serviceDate: new Date().toISOString().slice(0, 10),
                        });
                        setIsMaintenanceModalOpen(true);
                      }}
                      disabled={equipmentList.length === 0}
                      className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Log Service
                    </button>
                  )}
                </article>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
                <table className="w-full min-w-[1100px] text-left text-xs text-gray-300">
                  <thead className="border-b border-gray-800 bg-gray-950 font-mono text-[10px] uppercase text-gray-400">
                    <tr>
                      <th className="px-6 py-4">Equipment Unit</th>
                      <th className="px-6 py-4">Service Category</th>
                      <th className="px-6 py-4">Vendor &amp; Location</th>
                      <th className="px-6 py-4">Odometer</th>
                      <th className="px-6 py-4">Service Date</th>
                      <th className="px-6 py-4">Next Service Due</th>
                      <th className="px-6 py-4">Total Cost</th>
                      <th className="px-6 py-4 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {maintenanceRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-8 text-center text-gray-500"
                        >
                          No maintenance records logged yet.
                        </td>
                      </tr>
                    ) : (
                      maintenanceRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="transition hover:bg-gray-800/40"
                        >
                          <td className="px-6 py-4 font-bold text-white">
                            {record.equipment.type === 'Truck' ? 'Truck' : 'Trailer'} #
                            {record.equipment.unitNumber}
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-blue-400">
                              {record.category.replaceAll('_', ' ')}
                            </span>
                            <div className="mt-1 max-w-xs truncate text-[11px] text-gray-400">
                              {record.serviceDescription}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-200">
                              {record.vendorName || 'In-House'}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {record.vendorLocation || 'Fleet Yard'}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono">
                            {record.odometerReading === null
                              ? 'N/A'
                              : `${record.odometerReading.toLocaleString()} mi`}
                          </td>
                          <td className="px-6 py-4 font-mono">
                            {record.serviceDate}
                          </td>
                          <td className="px-6 py-4 font-mono text-amber-400">
                            {record.nextScheduledDate ||
                              (record.nextScheduledMileage
                                ? `@ ${record.nextScheduledMileage.toLocaleString()} mi`
                                : 'None Set')}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-rose-400">
                            {Number(record.totalCost).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {record.invoiceUrl ? (
                              <a
                                href={record.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] text-blue-400 hover:underline"
                              >
                                {record.invoiceNumber
                                  ? `#${record.invoiceNumber}`
                                  : 'View Invoice'}
                              </a>
                            ) : (
                              <span className="text-[11px] italic text-gray-500">
                                No File
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : viewMode === 'inventory' ? (
        <section aria-labelledby="master-inventory-heading" className="space-y-4">
          <div>
            <h2 id="master-inventory-heading" className="text-xl font-bold">
              Master Inventory
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              All registered trucks, trailers, tablets, and ELDs with their current status.
            </p>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4 md:flex-row">
            <div className="flex w-full gap-2 overflow-x-auto md:w-auto">
              {([
                ['all', 'All Assets'],
                ['trucks', `Trucks (${equipmentList.filter((item) => item.type === 'Truck').length})`],
                ['trailers', `Trailers (${equipmentList.filter((item) => item.type === 'Trailer').length})`],
                ['devices', `Tablets & ELDs (${devices.length})`],
              ] as const).map(([category, label]) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setInventoryCategory(category)}
                  className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    inventoryCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="w-full md:w-48">
              <span className="sr-only">Filter inventory by status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as InventoryStatus)
                }
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-1.5 font-mono text-xs uppercase text-blue-400 focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
            <table className="w-full min-w-[700px] text-left text-xs text-gray-300">
              <thead className="border-b border-gray-800 bg-gray-950 font-mono text-[10px] uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-4">Asset Type</th>
                  <th className="px-6 py-4">Identifier / Unit #</th>
                  <th className="px-6 py-4">Details / VIN / IMEI</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {inventoryRows.map((item) => {
                  const status = normalizeInventoryStatus(item.status);
                  const isAssigned = status === 'ASSIGNED';
                  const isMaintenance = status === 'MAINTENANCE';
                  const isUpdating =
                    item.maintenanceTarget === 'equipment'
                      ? updatingEquipmentId === item.id
                      : updatingDeviceId === item.id;
                  return (
                    <tr
                      key={`${item.kind}-${item.id}`}
                      className="transition hover:bg-gray-800/40"
                    >
                      <td className="px-6 py-4 font-mono text-[11px] font-bold uppercase text-blue-400">
                        {item.kind}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {item.category === 'devices'
                          ? item.identifier
                          : `#${item.identifier}`}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-400">
                        {item.details}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            status === 'AVAILABLE'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : isAssigned
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isRoleLoading &&
                          canManageFleet &&
                          !isAssigned && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleMaintenanceToggle(
                                  item.maintenanceTarget,
                                  item.id,
                                  item.status,
                                )
                              }
                              disabled={isUpdating}
                              className="rounded-lg bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-50"
                            >
                              {isUpdating
                                ? 'Updating...'
                                : isMaintenance
                                  ? 'Mark Available'
                                  : 'Send to Shop'}
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
                {inventoryRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-gray-400"
                    >
                      No assets match the selected category and status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
      <>
      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-800 pb-4">
        {(['All', 'Truck', 'Trailer'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              filterType === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {tab === 'All' ? 'All Assets' : `${tab}s`}
          </button>
        ))}
      </div>

      <section aria-label="Equipment search">
        <input
          type="text"
          placeholder="Search by unit, type, VIN, or onboard gear..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white shadow-inner placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </section>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEquipment.map((item) => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  item.type === 'Truck' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {item.type} {item.trailerType ? `• ${item.trailerType}` : ''}
                </span>
                <h3 className="text-xl font-bold mt-2">{item.unitNumber}</h3>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    ['AVAILABLE', 'ACTIVE'].includes(item.status.toUpperCase())
                      ? 'bg-green-500/10 text-green-400'
                      : item.status.toUpperCase() === 'ASSIGNED'
                        ? 'bg-blue-500/10 text-blue-300'
                        : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {item.status}
                </span>
                {!isRoleLoading &&
                  canManageFleet &&
                  item.status.toUpperCase() !== 'ASSIGNED' && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleMaintenanceToggle(
                          'equipment',
                          item.id,
                          item.status,
                        )
                      }
                      disabled={updatingEquipmentId === item.id}
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50"
                    >
                      {updatingEquipmentId === item.id
                        ? 'Updating...'
                        : ['MAINTENANCE', 'IN MAINTENANCE'].includes(
                              item.status.toUpperCase(),
                            )
                          ? 'Return to available'
                          : 'Mark maintenance'}
                    </button>
                  )}
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-400 border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span>VIN:</span>
                <span className="text-gray-200 font-mono">{item.vin || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Mileage:</span>
                <span className="text-gray-200">{item.currentMileage ? `${item.currentMileage.toLocaleString()} mi` : 'Not tracked'}</span>
              </div>
              <div className="flex justify-between">
                <span>Next Service:</span>
                <span className="text-gray-200">{item.nextServiceDue || 'Not scheduled'}</span>
              </div>
            </div>

            {/* Onboard Gear / Inventory */}
            <div className="border-t border-gray-800 pt-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Onboard Inventory & Gear</p>
              <div className="flex flex-wrap gap-1.5">
                {item.inventory && item.inventory.length > 0 ? (
                  item.inventory.map((gear, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-800 border border-gray-700/60 rounded-md text-[11px] text-gray-300">
                      {gear}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500 italic">No inventory items listed.</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredEquipment.length === 0 && (
        <p className="py-8 text-center text-gray-400">
          {equipmentList.length === 0
            ? 'No equipment has been added yet.'
            : 'No equipment matches your search or filter.'}
        </p>
      )}

      <section aria-labelledby="fleet-devices-heading" className="space-y-4">
        <div>
          <h2 id="fleet-devices-heading" className="text-xl font-bold">
            Tablets &amp; ELDs
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Available, assigned, and maintenance devices remain visible here.
          </p>
        </div>
        {devices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
            No fleet devices have been added yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <article
                key={device.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      {device.type}
                    </span>
                    <h3 className="mt-1 font-semibold">
                      {device.model || device.serialNumber || device.imei || 'Fleet device'}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      {device.serialNumber || device.imei || 'No serial number'}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                      device.status.toUpperCase() === 'AVAILABLE'
                        ? 'bg-green-500/10 text-green-400'
                        : device.status.toUpperCase() === 'ASSIGNED'
                          ? 'bg-blue-500/10 text-blue-300'
                          : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {device.status}
                  </span>
                </div>
                {!isRoleLoading &&
                  canManageFleet &&
                  device.status.toUpperCase() !== 'ASSIGNED' && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleMaintenanceToggle(
                          'device',
                          device.id,
                          device.status,
                        )
                      }
                      disabled={updatingDeviceId === device.id}
                      className="mt-4 text-xs font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50"
                    >
                      {updatingDeviceId === device.id
                        ? 'Updating...'
                        : ['MAINTENANCE', 'IN MAINTENANCE'].includes(
                              device.status.toUpperCase(),
                            )
                          ? 'Return to available'
                          : 'Mark maintenance'}
                    </button>
                  )}
              </article>
            ))}
          </div>
        )}
      </section>
      </>
      )}

      {isAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Assign Fleet Setup</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Drivers and assets already in an active setup are unavailable.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignmentModalOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close assignment form"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Driver setup
                </label>
                <select
                  value={assignmentMode}
                  onChange={(event) =>
                    setAssignmentMode(event.target.value as 'SOLO' | 'TEAM')
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="SOLO">Solo driver</option>
                  <option value="TEAM">Team drivers</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-300">
                  Primary driver
                  <select
                    required
                    value={primaryDriverId}
                    onChange={(event) => setPrimaryDriverId(event.target.value)}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="">Select available driver</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName}
                      </option>
                    ))}
                  </select>
                </label>
                {assignmentMode === 'TEAM' && (
                  <label className="text-xs text-gray-300">
                    Secondary driver
                    <select
                      required
                      value={secondaryDriverId}
                      onChange={(event) => setSecondaryDriverId(event.target.value)}
                      className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                    >
                      <option value="">Select available driver</option>
                      {availableDrivers
                        .filter((driver) => String(driver.id) !== primaryDriverId)
                        .map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.firstName} {driver.lastName}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-300">
                  Truck
                  <select
                    required
                    value={truckId}
                    onChange={(event) => setTruckId(event.target.value)}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="">Select available truck</option>
                    {availableTrucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.unitNumber}{truck.vin ? ` · ${truck.vin}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-300">
                  Trailer (optional)
                  <select
                    value={trailerId}
                    onChange={(event) => setTrailerId(event.target.value)}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="">No trailer</option>
                    {availableTrailers.map((trailer) => (
                      <option key={trailer.id} value={trailer.id}>
                        {trailer.unitNumber}
                        {trailer.trailerType ? ` · ${trailer.trailerType}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-300">
                  Tablet (optional)
                  <select
                    value={tabletId}
                    onChange={(event) => setTabletId(event.target.value)}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="">No tablet</option>
                    {availableTablets.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.model || 'Tablet'}
                        {device.imei ? ` · ${device.imei}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-300">
                  ELD device (optional)
                  <select
                    value={eldDeviceId}
                    onChange={(event) => setEldDeviceId(event.target.value)}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="">No ELD</option>
                    {availableEldDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.model || 'ELD'}
                        {device.serialNumber ? ` · ${device.serialNumber}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {availableDrivers.length === 0 && (
                <p className="text-xs text-amber-300">
                  No unassigned active drivers are available.
                </p>
              )}
              {availableTrucks.length === 0 && (
                <p className="text-xs text-amber-300">
                  No available trucks are in the fleet.
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingAssignment ||
                    availableDrivers.length === 0 ||
                    availableTrucks.length === 0
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAssignment ? 'Assigning...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Log Maintenance Service</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Record service details, expense breakdown, and next service targets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMaintenanceModalOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close maintenance form"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleCreateMaintenanceRecord}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs text-gray-300">
                  Equipment
                  <select
                    required
                    value={maintForm.equipmentId}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        equipmentId: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  >
                    <option value="">Select a truck or trailer</option>
                    {equipmentList.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.type} {item.unitNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-300">
                  Service category
                  <select
                    value={maintForm.category}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        category: event.target.value as MaintenanceCategory,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  >
                    {maintenanceCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs text-gray-300">
                Service description
                <textarea
                  required
                  minLength={1}
                  value={maintForm.serviceDescription}
                  onChange={(event) =>
                    setMaintForm({
                      ...maintForm,
                      serviceDescription: event.target.value,
                    })
                  }
                  className="mt-1 min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs text-gray-300">
                  Vendor / shop
                  <input
                    value={maintForm.vendorName}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        vendorName: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-gray-300">
                  Vendor location
                  <input
                    value={maintForm.vendorLocation}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        vendorLocation: event.target.value,
                      })
                    }
                    placeholder="City, State"
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-gray-300">
                  Odometer (miles)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={maintForm.odometerReading}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        odometerReading: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-gray-300">
                  Parts cost
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maintForm.partsCost}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        partsCost: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-gray-300">
                  Labor cost
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maintForm.laborCost}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        laborCost: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-gray-300">
                  Service date
                  <input
                    required
                    type="date"
                    value={maintForm.serviceDate}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        serviceDate: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-gray-300">
                  Next service date
                  <input
                    type="date"
                    value={maintForm.nextScheduledDate}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        nextScheduledDate: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-gray-300">
                  Next service mileage
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={maintForm.nextScheduledMileage}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        nextScheduledMileage: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-gray-300">
                  Record status
                  <select
                    value={maintForm.status}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        status: event.target.value as MaintenanceStatus,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  >
                    {maintenanceStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-300">
                  Invoice number
                  <input
                    value={maintForm.invoiceNumber}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        invoiceNumber: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs text-gray-300">
                  Invoice URL
                  <input
                    type="url"
                    value={maintForm.invoiceUrl}
                    onChange={(event) =>
                      setMaintForm({
                        ...maintForm,
                        invoiceUrl: event.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMaintenance || equipmentList.length === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingMaintenance ? 'Saving...' : 'Save Service Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Fleet Device</h2>
              <button
                type="button"
                onClick={() => setIsDeviceModalOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close device form"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDevice} className="space-y-4">
              <label className="block text-xs font-medium text-gray-300">
                Device type
                <select
                  value={deviceType}
                  onChange={(event) =>
                    setDeviceType(event.target.value as 'TABLET' | 'ELD')
                  }
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="TABLET">Tablet</option>
                  <option value="ELD">ELD</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-gray-300">
                Model
                <input
                  value={deviceModel}
                  onChange={(event) => setDeviceModel(event.target.value)}
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-300">
                  Serial number
                  <input
                    value={deviceSerialNumber}
                    onChange={(event) => setDeviceSerialNumber(event.target.value)}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </label>
                <label className="text-xs font-medium text-gray-300">
                  IMEI
                  <input
                    value={deviceImei}
                    onChange={(event) => setDeviceImei(event.target.value)}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-gray-300">
                Phone number
                <input
                  value={devicePhoneNumber}
                  onChange={(event) => setDevicePhoneNumber(event.target.value)}
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </label>
              <div className="flex justify-end gap-3 border-t border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Fleet Equipment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Asset Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'Truck' | 'Trailer')}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="Truck">Semi-Truck</option>
                    <option value="Trailer">Trailer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Unit Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TRK-104"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              {type === 'Trailer' && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Trailer Type</label>
                  <select
                    value={trailerType}
                    onChange={(e) => setTrailerType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="Dry Van">Dry Van</option>
                    <option value="Flatbed">Flatbed</option>
                    <option value="Refrigerator">Refrigerator (Reefer)</option>
                    <option value="Step Deck">Step Deck</option>
                    <option value="Car Hauler">Car Hauler</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">VIN Number</label>
                <input
                  type="text"
                  placeholder="17-digit VIN"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Onboard Gear (comma separated)</label>
                <input
                  type="text"
                  placeholder="Samsara ELD, 10x Straps, Load Bars"
                  value={inventoryInput}
                  onChange={(e) => setInventoryInput(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
