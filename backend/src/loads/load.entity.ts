import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('loads')
export class Load {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  load_number: string;

  @Column()
  broker: string;

  @Column({ nullable: true })
  customer: string;

  @Column()
  pickup_location: string;

  @Column()
  delivery_location: string;

  @Column()
  pickup_date: Date;

  @Column()
  delivery_date: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  rate: number;

  @Column({ nullable: true })
  miles: number;

  @Column({ nullable: true })
  weight: number;

  @Column({ nullable: true })
  commodity: string;

  @Column({ default: 'Available' })
  status: string;

  @Column({ nullable: true })
  notes: string;
}