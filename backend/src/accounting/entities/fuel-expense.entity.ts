// backend/src/accounting/entities/fuel-expense.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fuel_expenses')
export class FuelExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  truckUnitNumber: string; // e.g., TRK-104

  @Column({ type: 'character varying', nullable: true })
  firstName: string | null;

  @Column({ type: 'character varying', nullable: true })
  middleName: string | null;

  @Column({ type: 'character varying', nullable: true })
  lastName: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  gallons: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalCost: number;

  @Column({ type: 'timestamp' })
  purchaseDate: Date;

  @Column({ nullable: true })
  location: string; // Truck stop name / City, State

  @CreateDateColumn()
  createdAt: Date;
}