import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Equipment } from '../equipment/entities/equipment.entity.js';

@Entity('fuel_transactions')
export class FuelTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Equipment, { eager: true })
  truck: Equipment;

  @Column()
  driverId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fuelCardAmount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  gallons: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  receiptAmount?: number;

  @Column({ nullable: true })
  receiptImageUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  receiptGpsLocation?: string;

  @Column({ type: 'timestamp', nullable: true })
  receiptTimestamp?: Date;

  @Column({ type: 'int' })
  odometerReading: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  calculatedMpg?: number;

  @Column({ default: 'PENDING' })
  reconciliationStatus: string;

  @Column({ type: 'text', nullable: true })
  auditNotes?: string;

  @CreateDateColumn()
  createdAt: Date;
}