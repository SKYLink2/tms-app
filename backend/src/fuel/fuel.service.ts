import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelTransaction } from './fuel-transaction.entity.js';
import { Equipment } from '../equipment/entities/equipment.entity.js';

@Injectable()
export class FuelService {
  constructor(
    @InjectRepository(FuelTransaction)
    private readonly fuelRepo: Repository<FuelTransaction>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
  ) {}

  async findAll(driverId?: string): Promise<FuelTransaction[]> {
    const whereClause = driverId ? { driverId } : {};
    return this.fuelRepo.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      relations: { truck: true }, // 👈 Updated from ['truck'] to object format
    });
  }

  async logFuelEntry(dto: {
    truckId: string;
    driverId: string;
    fuelCardAmount?: number;
    gallons: number;
    receiptAmount?: number;
    receiptImageUrl?: string;
    receiptGpsLocation?: string;
    receiptTimestamp?: Date;
    odometerReading: number;
  }): Promise<FuelTransaction> {
    const truck = await this.equipmentRepo.findOne({ where: { id: dto.truckId } });
    if (!truck) throw new NotFoundException('Equipment unit not found.');

    if (dto.odometerReading) {
      await this.equipmentRepo.update(dto.truckId, { currentMileage: dto.odometerReading });
    }

    const lastRecord = await this.fuelRepo.findOne({
      where: { truck: { id: dto.truckId } },
      order: { createdAt: 'DESC' },
    });

    let calculatedMpg: number | undefined = undefined;
    if (lastRecord && dto.odometerReading > lastRecord.odometerReading) {
      const milesDriven = dto.odometerReading - lastRecord.odometerReading;
      if (dto.gallons > 0) {
        calculatedMpg = Number((milesDriven / dto.gallons).toFixed(2));
      }
    }

    let status = 'RECONCILED';
    let auditNotes = 'Matched successfully.';
    if (dto.fuelCardAmount && dto.receiptAmount) {
      const diff = Math.abs(Number(dto.fuelCardAmount) - Number(dto.receiptAmount));
      if (diff > 1.00) {
        status = 'DISCREPANCY_FLAGGED';
        auditNotes = `Discrepancy: Fuel Card ($${dto.fuelCardAmount}) vs Receipt ($${dto.receiptAmount}).`;
      }
    }

    const transaction = this.fuelRepo.create({
      truck,
      driverId: dto.driverId,
      fuelCardAmount: dto.fuelCardAmount,
      gallons: dto.gallons,
      receiptAmount: dto.receiptAmount,
      receiptImageUrl: dto.receiptImageUrl,
      receiptGpsLocation: dto.receiptGpsLocation,
      receiptTimestamp: dto.receiptTimestamp ? new Date(dto.receiptTimestamp) : new Date(),
      odometerReading: dto.odometerReading,
      calculatedMpg,
      reconciliationStatus: status,
      auditNotes,
    });

    return this.fuelRepo.save(transaction);
  }
}