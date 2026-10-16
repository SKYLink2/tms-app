import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { Device } from './entities/device.entity.js';
import { EquipmentAssignment } from './entities/equipment-assignment.entity.js';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Device[]> {
    return this.deviceRepository.find({ order: { createdAt: 'DESC' } });
  }

  create(dto: CreateDeviceDto): Promise<Device> {
    const device = this.deviceRepository.create({
      type: dto.type,
      model: dto.model,
      serialNumber: dto.serialNumber,
      imei: dto.imei,
      phoneNumber: dto.phoneNumber,
      status: 'AVAILABLE',
    });
    return this.deviceRepository.save(device);
  }

  async toggleMaintenance(
    id: string,
    status: 'AVAILABLE' | 'MAINTENANCE',
  ): Promise<Device> {
    return this.dataSource.transaction(async (manager) => {
      const device = await manager.getRepository(Device).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device) throw new NotFoundException(`Device ID ${id} not found`);

      const activeAssignment = await manager
        .getRepository(EquipmentAssignment)
        .findOne({
          where: [
            { tabletId: id, status: 'ACTIVE' },
            { eldDeviceId: id, status: 'ACTIVE' },
          ],
        });
      if (activeAssignment || device.status.toUpperCase() === 'ASSIGNED') {
        throw new BadRequestException(
          'Cannot set assigned equipment to maintenance. Release it first.',
        );
      }

      device.status = status;
      return manager.getRepository(Device).save(device);
    });
  }
}
