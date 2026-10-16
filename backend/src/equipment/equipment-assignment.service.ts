import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Driver } from '../drivers/entities/driver.entity.js';
import { CreateEquipmentAssignmentDto } from './dto/create-equipment-assignment.dto.js';
import { Device } from './entities/device.entity.js';
import { EquipmentAssignment } from './entities/equipment-assignment.entity.js';
import { Equipment } from './entities/equipment.entity.js';

@Injectable()
export class EquipmentAssignmentService {
  constructor(
    @InjectRepository(EquipmentAssignment)
    private readonly assignmentRepository: Repository<EquipmentAssignment>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<EquipmentAssignment[]> {
    return this.assignmentRepository.find({
      order: { assignedAt: 'DESC' },
    });
  }

  getAssignmentHistory(): Promise<EquipmentAssignment[]> {
    return this.assignmentRepository.find({
      where: { status: 'RELEASED' },
      order: { releasedAt: 'DESC' },
    });
  }

  async create(
    dto: CreateEquipmentAssignmentDto,
  ): Promise<EquipmentAssignment> {
    if (dto.mode === 'TEAM' && !dto.secondaryDriverId) {
      throw new BadRequestException(
        'Team assignments require a secondary driver.',
      );
    }
    if (dto.mode === 'SOLO' && dto.secondaryDriverId) {
      throw new BadRequestException(
        'Solo assignments cannot include a secondary driver.',
      );
    }
    if (dto.secondaryDriverId === dto.primaryDriverId) {
      throw new BadRequestException(
        'Primary and secondary drivers must be different.',
      );
    }
    if (dto.tabletId && dto.tabletId === dto.eldDeviceId) {
      throw new BadRequestException(
        'Tablet and ELD must use separate devices.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const driverRepository = manager.getRepository(Driver);
      const equipmentRepository = manager.getRepository(Equipment);
      const deviceRepository = manager.getRepository(Device);
      const assignmentRepository = manager.getRepository(EquipmentAssignment);

      const driverIds = [...new Set(
        [dto.primaryDriverId, dto.secondaryDriverId].filter(
          (id): id is number => id !== undefined,
        ),
      )].sort((a, b) => a - b);
      const drivers: Driver[] = [];
      for (const id of driverIds) {
        const driver = await driverRepository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!driver) throw new NotFoundException(`Driver ${id} not found.`);
        if (driver.status.toUpperCase() !== 'ACTIVE') {
          throw new BadRequestException(
            `Driver ${id} is not active and cannot be assigned.`,
          );
        }
        if (driver.truck_number?.trim() || driver.trailer_number?.trim()) {
          throw new BadRequestException(
            `Driver ${id} has a legacy truck or trailer assignment that must be cleared first.`,
          );
        }

        const existingAssignment = await assignmentRepository
          .createQueryBuilder('assignment')
          .where('assignment.status = :status', { status: 'ACTIVE' })
          .andWhere(
            '(assignment.primaryDriverId = :driverId OR assignment.secondaryDriverId = :driverId)',
            { driverId: id },
          )
          .getOne();
        if (existingAssignment) {
          throw new BadRequestException(
            `Driver ${id} is already assigned to an active setup.`,
          );
        }
        drivers.push(driver);
      }

      const equipmentIds = [...new Set(
        [dto.truckId, dto.trailerId].filter(
          (id): id is string => id !== undefined,
        ),
      )].sort();
      const equipmentItems: Equipment[] = [];
      for (const id of equipmentIds) {
        const item = await equipmentRepository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!item) throw new NotFoundException(`Equipment ${id} not found.`);
        if (!['ACTIVE', 'AVAILABLE'].includes(item.status.toUpperCase())) {
          throw new BadRequestException(
            `Equipment ${item.unitNumber} is not available.`,
          );
        }
        equipmentItems.push(item);
      }

      const truck = equipmentItems.find((item) => item.id === dto.truckId);
      if (!truck || truck.type !== 'Truck') {
        throw new BadRequestException('The selected truck is not a truck.');
      }
      const trailer = dto.trailerId
        ? equipmentItems.find((item) => item.id === dto.trailerId)
        : null;
      if (dto.trailerId && (!trailer || trailer.type !== 'Trailer')) {
        throw new BadRequestException(
          'The selected trailer is not a trailer.',
        );
      }

      const deviceIds = [...new Set(
        [dto.tabletId, dto.eldDeviceId].filter(
          (id): id is string => id !== undefined,
        ),
      )].sort();
      const devices: Device[] = [];
      for (const id of deviceIds) {
        const device = await deviceRepository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!device) throw new NotFoundException(`Device ${id} not found.`);
        if (device.status.toUpperCase() !== 'AVAILABLE') {
          throw new BadRequestException(
            `Device ${id} is not available.`,
          );
        }
        devices.push(device);
      }
      const tablet = dto.tabletId
        ? devices.find((device) => device.id === dto.tabletId)
        : null;
      const eldDevice = dto.eldDeviceId
        ? devices.find((device) => device.id === dto.eldDeviceId)
        : null;
      if (dto.tabletId && tablet?.type !== 'TABLET') {
        throw new BadRequestException('The selected device is not a tablet.');
      }
      if (dto.eldDeviceId && eldDevice?.type !== 'ELD') {
        throw new BadRequestException('The selected device is not an ELD.');
      }

      for (const item of equipmentItems) {
        item.status = 'Assigned';
        await equipmentRepository.save(item);
      }
      for (const device of devices) {
        device.status = 'Assigned';
        await deviceRepository.save(device);
      }

      const primaryDriver = drivers.find(
        (driver) => driver.id === dto.primaryDriverId,
      )!;
      primaryDriver.truck_number = truck.unitNumber;
      primaryDriver.trailer_number = trailer?.unitNumber ?? '';
      await driverRepository.save(primaryDriver);

      const secondaryDriver = dto.secondaryDriverId
        ? drivers.find((driver) => driver.id === dto.secondaryDriverId)
        : undefined;
      if (secondaryDriver) {
        secondaryDriver.truck_number = truck.unitNumber;
        secondaryDriver.trailer_number = trailer?.unitNumber ?? '';
        await driverRepository.save(secondaryDriver);
      }

      const assignment = assignmentRepository.create({
        mode: dto.mode,
        primaryDriverId: dto.primaryDriverId,
        secondaryDriverId: dto.secondaryDriverId ?? null,
        truckId: truck.id,
        trailerId: trailer?.id ?? null,
        tabletId: tablet?.id ?? null,
        eldDeviceId: eldDevice?.id ?? null,
        status: 'ACTIVE',
      });
      return assignmentRepository.save(assignment);
    });
  }

  async release(id: string): Promise<EquipmentAssignment> {
    return this.dataSource.transaction(async (manager) => {
      const assignmentRepository = manager.getRepository(EquipmentAssignment);
      const driverRepository = manager.getRepository(Driver);
      const equipmentRepository = manager.getRepository(Equipment);
      const deviceRepository = manager.getRepository(Device);

      const assignment = await assignmentRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
      });
      if (!assignment) {
        throw new NotFoundException('Equipment assignment not found.');
      }
      if (assignment.status !== 'ACTIVE') {
        throw new BadRequestException('This assignment is already released.');
      }

      const driverIds = [
        assignment.primaryDriverId,
        assignment.secondaryDriverId,
      ]
        .filter((driverId): driverId is number => driverId !== null)
        .sort((a, b) => a - b);
      const drivers: Driver[] = [];
      for (const driverId of driverIds) {
        const driver = await driverRepository.findOne({
          where: { id: driverId },
          lock: { mode: 'pessimistic_write' },
        });
        if (driver) drivers.push(driver);
      }

      const equipmentIds = [assignment.truckId, assignment.trailerId]
        .filter((equipmentId): equipmentId is string => equipmentId !== null)
        .sort();
      const equipmentItems: Equipment[] = [];
      for (const equipmentId of equipmentIds) {
        const item = await equipmentRepository.findOne({
            where: { id: equipmentId },
            lock: { mode: 'pessimistic_write' },
          });
        if (item) equipmentItems.push(item);
      }
      const deviceIds = [assignment.tabletId, assignment.eldDeviceId]
        .filter((deviceId): deviceId is string => deviceId !== null)
        .sort();
      const devices: Device[] = [];
      for (const deviceId of deviceIds) {
        const device = await deviceRepository.findOne({
            where: { id: deviceId },
            lock: { mode: 'pessimistic_write' },
          });
        if (device) devices.push(device);
      }

      for (const item of equipmentItems) {
        if (item.status.toUpperCase() === 'ASSIGNED') {
          item.status = 'AVAILABLE';
          await equipmentRepository.save(item);
        }
      }
      for (const device of devices) {
        if (device.status.toUpperCase() === 'ASSIGNED') {
          device.status = 'AVAILABLE';
          await deviceRepository.save(device);
        }
      }

      const truck = equipmentItems.find(
        (item) => item.id === assignment.truckId,
      );
      const trailer = equipmentItems.find(
        (item) => item.id === assignment.trailerId,
      );
      for (const driver of drivers) {
        if (driver.truck_number === truck?.unitNumber) {
          driver.truck_number = '';
        }
        if (driver.trailer_number === trailer?.unitNumber) {
          driver.trailer_number = '';
        }
        await driverRepository.save(driver);
      }

      assignment.status = 'RELEASED';
      assignment.releasedAt = new Date();
      return assignmentRepository.save(assignment);
    });
  }
}
