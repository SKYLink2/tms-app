import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelExpense } from './entities/fuel-expense.entity.js';
import { Settlement } from './entities/settlement.entity.js';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(Settlement)
    private settlementRepo: Repository<Settlement>,
    @InjectRepository(FuelExpense)
    private fuelRepo: Repository<FuelExpense>,
  ) {}

  findAllSettlements(): Promise<Settlement[]> {
    return this.settlementRepo.find();
  }

  async createSettlement(data: Partial<Settlement>): Promise<Settlement> {
    const gross = Number(data.grossRevenue) || 0;
    const split = Number(data.driverSplitPercentage) || 70;
    const driverGross = gross * (split / 100);
    const fuel = Number(data.fuelAdvances) || 0;
    const other = Number(data.insuranceOrOtherDeductions) || 0;

    const settlement = this.settlementRepo.create({
      ...data,
      driverGrossPay: driverGross,
      netPayout: Math.max(driverGross - fuel - other, 0),
    });

    return this.settlementRepo.save(settlement);
  }

  async updateSettlement(
    id: string,
    data: Partial<Settlement>,
  ): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({ where: { id } });
    if (!settlement) {
      throw new NotFoundException(`Settlement ID ${id} not found`);
    }

    const gross =
      data.grossRevenue !== undefined
        ? Number(data.grossRevenue)
        : Number(settlement.grossRevenue);
    const split =
      data.driverSplitPercentage !== undefined
        ? Number(data.driverSplitPercentage)
        : Number(settlement.driverSplitPercentage);
    const fuel =
      data.fuelAdvances !== undefined
        ? Number(data.fuelAdvances)
        : Number(settlement.fuelAdvances);
    const other =
      data.insuranceOrOtherDeductions !== undefined
        ? Number(data.insuranceOrOtherDeductions)
        : Number(settlement.insuranceOrOtherDeductions);
    const driverGross = gross * (split / 100);

    Object.assign(settlement, data, {
      driverGrossPay: driverGross,
      netPayout: Math.max(driverGross - fuel - other, 0),
    });

    return this.settlementRepo.save(settlement);
  }

  async deleteSettlement(id: string): Promise<void> {
    const result = await this.settlementRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Settlement ID ${id} not found`);
    }
  }

  findAllFuel(): Promise<FuelExpense[]> {
    return this.fuelRepo.find();
  }

  createFuelExpense(data: Partial<FuelExpense>): Promise<FuelExpense> {
    const expense = this.fuelRepo.create(data);
    return this.fuelRepo.save(expense);
  }
}
