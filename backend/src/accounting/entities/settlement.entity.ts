// backend/src/accounting/entities/settlement.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'character varying' })
  firstName: string;

  @Column({ type: 'character varying', nullable: true })
  middleName: string | null;

  @Column({ type: 'character varying' })
  lastName: string;

  @Column({ type: 'date' })
  weekEnding: string;

  // Revenue breakdown
  @Column('decimal', { precision: 10, scale: 2 })
  grossRevenue: number;

  @Column({ default: 70 }) // e.g., 70% driver split
  driverSplitPercentage: number;

  @Column('decimal', { precision: 10, scale: 2 })
  driverGrossPay: number;

  // Deductions
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  fuelAdvances: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  insuranceOrOtherDeductions: number;

  // Final Net Payout to Driver
  @Column('decimal', { precision: 10, scale: 2 })
  netPayout: number;

  // Status: 'Draft', 'Approved', 'Paid'
  @Column({ default: 'Draft' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}