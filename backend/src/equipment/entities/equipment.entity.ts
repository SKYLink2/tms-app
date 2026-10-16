// backend/src/equipment/entities/equipment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 'Truck' or 'Trailer'
  @Column()
  type: 'Truck' | 'Trailer';

  // Unit Number (e.g., TRK-104 or TR-502)
  @Column({ unique: true })
  unitNumber: string;

  // VIN Number for registration/insurance tracking
  @Column({ type: 'character varying', nullable: true })
  vin: string | null;

  // Specific Trailer Type (Only applicable if type === 'Trailer')
  // e.g., 'Dry Van', 'Flatbed', 'Reefer', 'Step Deck', 'Car Hauler'
  @Column({ type: 'character varying', nullable: true })
  trailerType: string | null;

  // Operational Status: 'Active', 'In Maintenance', 'Out of Service'
  @Column({ default: 'Active' })
  status: string;

  // Onboard gear and inventory are stored as a PostgreSQL text array.
  // e.g., ["ELD Samsara", "10x Straps", "2x Load Bars", "Chains & Binders"]
  @Column('text', { array: true, nullable: true })
  inventory: string[] | null;

  // Maintenance & Inspection Tracking
  @Column({ type: 'date', nullable: true })
  lastServiceDate: Date | null;

  @Column({ type: 'date', nullable: true })
  nextServiceDue: Date | null;

  @Column({ type: 'integer', nullable: true })
  currentMileage: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}