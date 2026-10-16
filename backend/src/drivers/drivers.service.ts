import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Driver } from './entities/driver.entity.js';
import { CreateDriverDto, UpdateDriverDto } from './dto/create-driver.dto.js';
import { EquipmentAssignment } from '../equipment/entities/equipment-assignment.entity.js';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    const driver = this.driversRepository.create(createDriverDto);
    return await this.driversRepository.save(driver);
  }

  async findAll(): Promise<Driver[]> {
    return await this.driversRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<Driver> {
    const driver = await this.driversRepository.findOne({ where: { id } });
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    return driver;
  }

  async update(id: number, updateDriverDto: UpdateDriverDto): Promise<Driver> {
    return this.dataSource.transaction(async (manager) => {
      const driverRepository = manager.getRepository(Driver);
      const driver = await driverRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID ${id} not found`);
      }

      const activeAssignment = await manager
        .getRepository(EquipmentAssignment)
        .findOne({
          where: [
            { primaryDriverId: id, status: 'ACTIVE' },
            { secondaryDriverId: id, status: 'ACTIVE' },
          ],
        });
      if (
        activeAssignment &&
        ((updateDriverDto.status !== undefined &&
          updateDriverDto.status.toUpperCase() !== 'ACTIVE') ||
          (updateDriverDto.truck_number !== undefined &&
            updateDriverDto.truck_number !== driver.truck_number) ||
          (updateDriverDto.trailer_number !== undefined &&
            updateDriverDto.trailer_number !== driver.trailer_number))
      ) {
        throw new BadRequestException(
          'Release the active equipment setup before changing the driver status or assignment.',
        );
      }

      Object.assign(driver, updateDriverDto);
      return driverRepository.save(driver);
    });
  }

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const driverRepository = manager.getRepository(Driver);
      const driver = await driverRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID ${id} not found`);
      }

      const assignment = await manager
        .getRepository(EquipmentAssignment)
        .findOne({
          where: [
            { primaryDriverId: id },
            { secondaryDriverId: id },
          ],
        });
      if (assignment) {
        throw new ConflictException(
          assignment.status === 'ACTIVE'
            ? 'Release the active equipment setup before deleting this driver.'
            : 'This driver is referenced by assignment history and cannot be deleted.',
        );
      }
      await driverRepository.delete(id);
    });
  }
}