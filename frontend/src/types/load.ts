export interface Load {
  id: string;
  draftLoadNumber: string | null;
  companyLoadNumber: string | null;
  createdById?: string | null;
  truckUnitNumber?: string | null;
  load_number?: string;
  origin: string;
  destination: string;
  broker?: string | null;
  rate: number;
  dispatcherName?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  status: string;
  currentLocation?: string | null;
  eta?: string | null;
  trailerSealNumber?: string | null;
  trailerSealPhotoUrl?: string | null;
  rateConfirmationUrl?: string | null;
  bolUrl?: string | null;
  podUrl?: string | null;
  receiptUrls?: string[] | null;
  securementPhotos?: string[] | null;
  notes?: LoadNote[] | null;
  createdAt?: string;
  updatedAt?: string;
  driverId?: number | null;
  driver?: {
    id: number;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    truck_number?: string;
    trailer_number?: string;
  } | null;
}

export interface LoadNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export const LOAD_STATUSES = [
  "DRAFT",
  "QUOTED",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "DISPATCHED",
  "AT_PICKUP",
  "LOADED",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
  "INVOICED",
  "COMPLETED",
] as const;

export function displayLoadNumber(load: Load): string {
  return load.companyLoadNumber ?? load.draftLoadNumber ?? load.load_number ?? load.id;
}

export interface LoadsResponse {
  data: Load[];
  total: number;
  page: number;
  lastPage: number;
}
