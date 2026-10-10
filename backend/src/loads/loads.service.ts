import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Load } from './load.entity.js';
import { CreateLoadDto } from './create-load.dto.js';
import { UpdateLoadDto } from './update-load.dto.js';

@Injectable()
export class LoadsService {
  constructor(
    @InjectRepository(Load)
    private loadsRepository: Repository<Load>,
  ) {}

  // Получение всех грузов с поддержкой фильтрации и пагинации
  async findAll(query: {
    status?: string;
    broker?: string;
    customer?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Load[]; total: number; page: number; lastPage: number }> {
    const { status, broker, customer, page = 1, limit = 10 } = query;

    const queryBuilder = this.loadsRepository.createQueryBuilder('load');

    // Применяем фильтры, если они переданы в запросе
    if (status) {
      queryBuilder.andWhere('load.status = :status', { status });
    }
    if (broker) {
      queryBuilder.andWhere('load.broker ILIKE :broker', { broker: `%${broker}%` });
    }
    if (customer) {
      queryBuilder.andWhere('load.customer ILIKE :customer', { customer: `%${customer}%` });
    }

    // Пагинация
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Сортировка по новизне (сначала новые)
    queryBuilder.orderBy('load.id', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: Number(page),
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  // Остальные методы (findOne, create, update, remove) остаются без изменений...
  async findOne(id: number): Promise<Load> {
    const load = await this.loadsRepository.findOneBy({ id });
    if (!load) {
      throw new NotFoundException(`Load with ID ${id} not found`);
    }
    return load;
  }

  async create(createLoadDto: CreateLoadDto): Promise<Load> {
    const newLoad = this.loadsRepository.create(createLoadDto);
    return await this.loadsRepository.save(newLoad);
  }

  async update(id: number, updateLoadDto: UpdateLoadDto): Promise<Load> {
    await this.loadsRepository.update(id, updateLoadDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.loadsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Load with ID ${id} not found`);
    }
  }
}