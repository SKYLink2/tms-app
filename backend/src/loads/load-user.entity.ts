import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const LOAD_USER_ROLES = [
  'dispatcher',
  'dispatch_manager',
  'owner',
  'admin',
  'driver',
  'fleet_manager',
  'safety',
] as const;

export type LoadUserRole = (typeof LOAD_USER_ROLES)[number];

@Entity('load_users')
export class LoadUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'character varying' })
  role: LoadUserRole; // 'admin' | 'owner' | 'dispatch_manager' | 'dispatcher' | 'driver' | 'fleet_manager' | 'safety'

  @Column({ type: 'integer', nullable: true, unique: true })
  driverId: number | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
