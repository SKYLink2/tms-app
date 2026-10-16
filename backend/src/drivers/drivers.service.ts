import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity.js';
import { CreateDriverDto, UpdateDriverDto } from './dto/create-driver.dto.js';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
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
    await this.driversRepository.update(id, updateDriverDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.driversRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
  }
}