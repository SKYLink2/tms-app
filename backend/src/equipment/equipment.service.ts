// backend/src/equipment/equipment.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Equipment } from './entities/equipment.entity.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { EquipmentAssignment } from './entities/equipment-assignment.entity.js';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Equipment[]> {
    return this.equipmentRepository.find();
  }

  create(createDto: CreateEquipmentDto): Promise<Equipment> {
    const equipment = this.equipmentRepository.create(createDto);
    if (createDto.status === undefined) equipment.status = 'AVAILABLE';
    return this.equipmentRepository.save(equipment);
  }

  async updateStatus(id: string, status: string): Promise<Equipment> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.getRepository(Equipment).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new NotFoundException(`Equipment ID ${id} not found`);
      const activeAssignment = await manager
        .getRepository(EquipmentAssignment)
        .findOne({
          where: [
            { truckId: id, status: 'ACTIVE' },
            { trailerId: id, status: 'ACTIVE' },
          ],
        });
      if (activeAssignment && status !== 'Assigned') {
        throw new BadRequestException(
          'Equipment assigned to an active setup cannot have its status changed.',
        );
      }
      item.status = status;
      return manager.getRepository(Equipment).save(item);
    });
  }

  async toggleMaintenance(
    id: string,
    status: 'AVAILABLE' | 'MAINTENANCE',
  ): Promise<Equipment> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.getRepository(Equipment).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new NotFoundException(`Equipment ID ${id} not found`);

      const activeAssignment = await manager
        .getRepository(EquipmentAssignment)
        .findOne({
          where: [
            { truckId: id, status: 'ACTIVE' },
            { trailerId: id, status: 'ACTIVE' },
          ],
        });
      if (activeAssignment || item.status.toUpperCase() === 'ASSIGNED') {
        throw new BadRequestException(
          'Cannot set assigned equipment to maintenance. Release it first.',
        );
      }

      item.status = status;
      return manager.getRepository(Equipment).save(item);
    });
  }
}