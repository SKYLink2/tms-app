import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Driver } from '../../drivers/entities/driver.entity.js';
import { Device } from './device.entity.js';
import { Equipment } from './equipment.entity.js';

@Entity('equipment_assignments')
@Check('"primaryDriverId" <> "secondaryDriverId" OR "secondaryDriverId" IS NULL')
export class EquipmentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mode: 'SOLO' | 'TEAM';

  @Column()
  primaryDriverId: number;

  @ManyToOne(() => Driver, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'primaryDriverId' })
  primaryDriver: Driver;

  @Column({ type: 'integer', nullable: true })
  secondaryDriverId: number | null;

  @ManyToOne(() => Driver, { nullable: true, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'secondaryDriverId' })
  secondaryDriver: Driver | null;

  @Column('uuid')
  truckId: string;

  @ManyToOne(() => Equipment, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'truckId' })
  truck: Equipment;

  @Column('uuid', { nullable: true })
  trailerId: string | null;

  @ManyToOne(() => Equipment, { nullable: true, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trailerId' })
  trailer: Equipment | null;

  @Column('uuid', { nullable: true })
  tabletId: string | null;

  @ManyToOne(() => Device, { nullable: true, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tabletId' })
  tablet: Device | null;

  @Column('uuid', { nullable: true })
  eldDeviceId: string | null;

  @ManyToOne(() => Device, { nullable: true, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'eldDeviceId' })
  eldDevice: Device | null;

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'RELEASED';

  @CreateDateColumn()
  assignedAt: Date;

  @Column({ type: 'timestamp without time zone', nullable: true })
  releasedAt: Date | null;
}
