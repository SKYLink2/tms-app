import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: 'TABLET' | 'ELD';

  @Column({ type: 'character varying', nullable: true })
  model: string | null;

  @Column({ type: 'character varying', unique: true, nullable: true })
  serialNumber: string | null;

  @Column({ type: 'character varying', unique: true, nullable: true })
  imei: string | null;

  @Column({ type: 'character varying', nullable: true })
  phoneNumber: string | null;

  @Column({ default: 'AVAILABLE' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
