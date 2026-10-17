import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Driver } from '../../drivers/entities/driver.entity.js';
import { Equipment } from '../../equipment/entities/equipment.entity.js';

export enum FuelReconciliationStatus {
  PENDING = 'PENDING',
  RECONCILED = 'RECONCILED',
  DISCREPANCY_FLAGGED = 'DISCREPANCY_FLAGGED',
}

@Entity('fuel_transactions')
export class FuelTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  truckId: string;

  @ManyToOne(() => Equipment, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'truckId' })
  truck: Equipment;

  @Column({ type: 'integer', nullable: true })
  driverId: number | null;

  @ManyToOne(() => Driver, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driverId' })
  driver: Driver | null;

  @Column({ type: 'character varying', nullable: true, unique: true })
  externalTransactionId: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  fuelCardAmount: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  gallons: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  receiptGallons: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  pricePerGallon: string | null;

  @Column({ type: 'character varying', nullable: true })
  stationName: string | null;

  @Column({ type: 'character varying', nullable: true })
  stationLocation: string | null;

  @Column({ type: 'character varying', nullable: true })
  stationGpsLocation: string | null;

  @Column({ type: 'timestamp without time zone' })
  cardTransactionAt: Date;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  receiptAmount: string | null;

  @Column({ type: 'character varying', nullable: true })
  receiptImageUrl: string | null;

  @Column({ type: 'character varying', nullable: true })
  receiptGpsLocation: string | null;

  @Column({ type: 'timestamp without time zone', nullable: true })
  receiptTimestamp: Date | null;

  @Column({ type: 'integer', nullable: true })
  odometerReading: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  calculatedMpg: string | null;

  @Column({
    type: 'character varying',
    default: FuelReconciliationStatus.PENDING,
  })
  reconciliationStatus: FuelReconciliationStatus;

  @Column({ type: 'text', nullable: true })
  auditNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
