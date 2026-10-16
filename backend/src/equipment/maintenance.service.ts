import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto.js';
import {
  MaintenanceRecord,
  MaintenanceStatus,
} from './entities/maintenance-record.entity.js';
import { Equipment } from './entities/equipment.entity.js';
import { EquipmentAssignment } from './entities/equipment-assignment.entity.js';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepository: Repository<MaintenanceRecord>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<MaintenanceRecord[]> {
    return this.maintenanceRepository.find({
      order: { serviceDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async createRecord(
    dto: CreateMaintenanceRecordDto,
    performedByUserId?: string,
  ): Promise<MaintenanceRecord> {
    return this.dataSource.transaction(async (manager) => {
      const equipmentRepository = manager.getRepository(Equipment);
      const equipment = await equipmentRepository.findOne({
        where: { id: dto.equipmentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!equipment) {
        throw new NotFoundException('Maintenance equipment not found.');
      }

      const status = dto.status ?? MaintenanceStatus.COMPLETED;
      if (status === MaintenanceStatus.IN_PROGRESS) {
        const activeAssignment = await manager
          .getRepository(EquipmentAssignment)
          .findOne({
            where: [
              { truckId: equipment.id, status: 'ACTIVE' },
              { trailerId: equipment.id, status: 'ACTIVE' },
            ],
          });
        if (
          activeAssignment ||
          equipment.status.toUpperCase() === 'ASSIGNED'
        ) {
          throw new BadRequestException(
            'Release assigned equipment before starting maintenance.',
          );
        }
        equipment.status = 'MAINTENANCE';
      }

      if (dto.odometerReading !== undefined) {
        equipment.currentMileage = dto.odometerReading;
      }
      if (dto.nextScheduledDate !== undefined) {
        equipment.nextServiceDue = new Date(dto.nextScheduledDate);
      }
      if (
        dto.odometerReading !== undefined ||
        dto.nextScheduledDate !== undefined ||
        status === MaintenanceStatus.IN_PROGRESS
      ) {
        await equipmentRepository.save(equipment);
      }

      const record = manager.getRepository(MaintenanceRecord).create({
        equipmentId: equipment.id,
        equipment,
        category: dto.category,
        serviceDescription: dto.serviceDescription.trim(),
        vendorName: dto.vendorName?.trim() || null,
        vendorLocation: dto.vendorLocation?.trim() || null,
        odometerReading: dto.odometerReading ?? null,
        laborCost: String(dto.laborCost ?? 0),
        partsCost: String(dto.partsCost ?? 0),
        totalCost: String((dto.laborCost ?? 0) + (dto.partsCost ?? 0)),
        invoiceUrl: dto.invoiceUrl?.trim() || null,
        invoiceNumber: dto.invoiceNumber?.trim() || null,
        status,
        serviceDate: dto.serviceDate,
        nextScheduledDate: dto.nextScheduledDate ?? null,
        nextScheduledMileage: dto.nextScheduledMileage ?? null,
        performedByUserId: performedByUserId ?? null,
      });
      return manager.getRepository(MaintenanceRecord).save(record);
    });
  }

  async getEquipmentHistory(equipmentId: string): Promise<{
    records: MaintenanceRecord[];
    totalMaintenanceCost: number;
    upcomingScheduledCount: number;
  }> {
    const records = await this.maintenanceRepository.find({
      where: { equipmentId },
      order: { serviceDate: 'DESC', createdAt: 'DESC' },
    });
    const totalMaintenanceCost = records.reduce(
      (sum, record) => sum + Number(record.totalCost || 0),
      0,
    );
    const upcomingScheduledCount = records.filter(
      (record) => record.status === MaintenanceStatus.SCHEDULED,
    ).length;
    return { records, totalMaintenanceCost, upcomingScheduledCount };
  }

  async getMaintenanceExpenseSummary(): Promise<{
    totalSpentAllTime: number;
    totalSpentThisMonth: number;
    upcomingServices: MaintenanceRecord[];
  }> {
    const completedRecords = await this.maintenanceRepository.find({
      where: { status: MaintenanceStatus.COMPLETED },
    });
    const totalSpentAllTime = completedRecords.reduce(
      (sum, record) => sum + Number(record.totalCost || 0),
      0,
    );
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const totalSpentThisMonth = completedRecords
      .filter((record) => record.serviceDate >= monthStart)
      .reduce((sum, record) => sum + Number(record.totalCost || 0), 0);
    const upcomingServices = await this.maintenanceRepository.find({
      where: { status: MaintenanceStatus.SCHEDULED },
      order: { nextScheduledDate: 'ASC' },
    });
    return {
      totalSpentAllTime,
      totalSpentThisMonth,
      upcomingServices,
    };
  }
}
