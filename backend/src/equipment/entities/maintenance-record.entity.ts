import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Equipment } from './equipment.entity.js';

export enum MaintenanceCategory {
  PREVENTIVE_MAINTENANCE = 'PREVENTIVE_MAINTENANCE',
  REPAIR = 'REPAIR',
  TIRES = 'TIRES',
  DOT_INSPECTION = 'DOT_INSPECTION',
  BRAKES = 'BRAKES',
  EMERGENCY_ROADSIDE = 'EMERGENCY_ROADSIDE',
}

export enum MaintenanceStatus {
  COMPLETED = 'COMPLETED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  CANCELLED = 'CANCELLED',
}

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  equipmentId: string;

  @ManyToOne(() => Equipment, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipmentId' })
  equipment: Equipment;

  @Column({ type: 'character varying' })
  category: MaintenanceCategory;

  @Column({ type: 'character varying' })
  serviceDescription: string;

  @Column({ type: 'character varying', nullable: true })
  vendorName: string | null;

  @Column({ type: 'character varying', nullable: true })
  vendorLocation: string | null;

  @Column({ type: 'integer', nullable: true })
  odometerReading: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  laborCost: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  partsCost: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: string;

  @Column({ type: 'character varying', nullable: true })
  invoiceUrl: string | null;

  @Column({ type: 'character varying', nullable: true })
  invoiceNumber: string | null;

  @Column({ type: 'character varying', default: MaintenanceStatus.COMPLETED })
  status: MaintenanceStatus;

  @Column({ type: 'date' })
  serviceDate: string;

  @Column({ type: 'date', nullable: true })
  nextScheduledDate: string | null;

  @Column({ type: 'integer', nullable: true })
  nextScheduledMileage: number | null;

  @Column({ type: 'character varying', nullable: true })
  performedByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
