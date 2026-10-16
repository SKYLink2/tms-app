export interface Driver {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string;
  email?: string;
  status?: string; // 'Active', 'On Duty', 'Off Duty'
  truck_number?: string;
  trailer_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DriversResponse {
  data: Driver[];
}