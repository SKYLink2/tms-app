// backend/src/equipment/equipment.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from './entities/equipment.entity.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
  ) {}

  findAll(): Promise<Equipment[]> {
    return this.equipmentRepository.find();
  }

  create(createDto: CreateEquipmentDto): Promise<Equipment> {
    const equipment = this.equipmentRepository.create(createDto);
    return this.equipmentRepository.save(equipment);
  }

  async updateStatus(id: string, status: string): Promise<Equipment> {
    const item = await this.equipmentRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Equipment ID ${id} not found`);
    item.status = status;
    return this.equipmentRepository.save(item);
  }
}