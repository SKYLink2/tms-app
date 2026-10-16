// backend/src/compliance/entities/compliance.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('driver_compliance')
export class DriverCompliance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'character varying' })
  firstName: string;

  @Column({ type: 'character varying', nullable: true })
  middleName: string | null;

  @Column({ type: 'character varying' })
  lastName: string;

  @Column({ type: 'character varying', nullable: true })
  phone: string | null;

  @Column({ type: 'character varying', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'character varying', nullable: true, select: false })
  ssn: string | null;

  @Column({ unique: true })
  cdlNumber: string;

  @Column({ type: 'character varying', nullable: true })
  licenseIssueState: string | null;

  @Column({ type: 'character varying', nullable: true })
  licenseClass: string | null;

  @Column({ type: 'character varying', nullable: true })
  endorsements: string | null;

  @Column({ type: 'date' })
  cdlExpiration: string;

  @Column({ type: 'date' })
  medicalCardExpiration: string;

  @Column({ type: 'date', nullable: true })
  lastDrugTestDate: string | null;

  @Column({ type: 'character varying', nullable: true })
  idPhotoUrl: string | null;

  @Column({ type: 'character varying', nullable: true })
  medicalCardUrl: string | null;

  @Column({ type: 'character varying', nullable: true })
  w9FormUrl: string | null;

  // Status: 'Compliant', 'Expiring Soon', 'Non-Compliant'
  @Column({ default: 'Compliant' })
  status: string;

  @Column({ type: 'character varying', nullable: true })
  notes: string | null;

  @Column({ type: 'integer', nullable: true, unique: true })
  driverId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}