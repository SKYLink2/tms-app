// backend/src/loads/entities/load.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Driver } from '../drivers/entities/driver.entity.js';
import { LoadUser } from './load-user.entity.js';
import type { LoadStatus } from './create-load.dto.js';

@Entity('loads')
export class Load {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'character varying', nullable: true, unique: true })
  draftLoadNumber: string | null;

  @Column({ type: 'character varying', nullable: true, unique: true })
  companyLoadNumber: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'character varying', nullable: true })
  dispatcherName: string | null;

  @ManyToOne(() => LoadUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: LoadUser | null;

  @Column({ default: '' })
  origin: string;

  @Column({ default: '' })
  destination: string;

  @Column({ nullable: true })
  broker: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  rate: number;

  @Column({ type: 'date', nullable: true })
  pickupDate: string | null;

  @Column({ type: 'character varying', nullable: true })
  pickupTime: string | null;

  @Column({ type: 'date', nullable: true })
  deliveryDate: string | null;

  @Column({ type: 'character varying', nullable: true })
  deliveryTime: string | null;

  @Column({ nullable: true })
  driverId: number | null;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driverId' })
  driver: Driver | null;

  @Column({ type: 'character varying', nullable: true })
  truckUnitNumber: string | null;

  @Column({ default: 'DRAFT' })
  status: LoadStatus;

  // --- Tracking & ETA ---
  @Column({ nullable: true })
  currentLocation: string;

  @Column({ type: 'timestamp', nullable: true })
  eta: Date | null;

  @Column({ nullable: true })
  trailerSealNumber: string;

  @Column({ nullable: true })
  trailerSealPhotoUrl: string;

  // --- Document & Photo URLs (Stored as arrays of strings in Postgres) ---
  @Column({ nullable: true })
  rateConfirmationUrl: string;

  @Column({ nullable: true })
  bolUrl: string;

  @Column({ nullable: true })
  podUrl: string;

  @Column('text', { array: true, nullable: true })
  receiptUrls: string[];

  @Column('text', { array: true, nullable: true })
  securementPhotos: string[];

  // --- Operational Notes (Stored as structured JSON in Postgres) ---
  @Column('jsonb', { nullable: true, default: [] })
  notes: {
    id: string;
    author: string;
    text: string;
    createdAt: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
