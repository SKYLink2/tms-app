export interface Load {
  id: number;
  load_number: string;
  broker: string;
  customer?: string;
  pickup_location: string;
  delivery_location: string;
  pickup_date: string;
  delivery_date: string;
  rate: number;
  miles?: number;
  weight?: number;
  commodity?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
