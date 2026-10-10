import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { LoadsService } from './loads.service.js';
import { Load } from './load.entity.js';
import { CreateLoadDto } from './create-load.dto.js';
import { UpdateLoadDto } from './update-load.dto.js';

@Controller('loads')
export class LoadsController {
  constructor(private readonly loadsService: LoadsService) {}

  @Get()
  async getAllLoads(
    @Query('status') status?: string,
    @Query('broker') broker?: string,
    @Query('customer') customer?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.loadsService.findAll({
      status,
      broker,
      customer,
      page,
      limit,
    });
  }

  @Get(':id')
  async getLoadById(@Param('id') id: string): Promise<Load> {
    return await this.loadsService.findOne(+id);
  }

  @Post()
  async createLoad(@Body() createLoadDto: CreateLoadDto): Promise<Load> {
    return await this.loadsService.create(createLoadDto);
  }

  @Patch(':id')
  async updateLoad(
    @Param('id') id: string,
    @Body() updateLoadDto: UpdateLoadDto,
  ): Promise<Load> {
    return await this.loadsService.update(+id, updateLoadDto);
  }

  @Delete(':id')
  async removeLoad(@Param('id') id: string): Promise<void> {
    return await this.loadsService.remove(+id);
  }
}