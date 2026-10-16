import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'character varying' })
  firstName: string;

  @Column({ type: 'character varying', nullable: true })
  middleName: string | null;

  @Column({ type: 'character varying' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: 'Active' })
  status: string;

  @Column({ nullable: true })
  truck_number: string;

  @Column({ nullable: true })
  trailer_number: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}