import { Controller, Get, Post, Body, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FuelService } from './fuel.service.js';
import { OcrService } from './ocr.service.js';

@Controller('fuel')
export class FuelController {
  constructor(
    private readonly fuelService: FuelService,
    private readonly ocrService: OcrService,
  ) {}

  @Get()
  async findAll(@Query('driverId') driverId?: string) {
    return this.fuelService.findAll(driverId);
  }

  @Post('ocr-scan')
  @UseInterceptors(FileInterceptor('receipt'))
  async scanReceipt(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No receipt image uploaded.');
    }
    const imagePath = file.path;
    const extractedData = await this.ocrService.processReceipt(imagePath);
    
    return {
      success: true,
      receiptImageUrl: `/uploads/${file.filename}`,
      extracted: extractedData,
    };
  }

  @Post()
  @UseInterceptors(FileInterceptor('receipt'))
  async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    return this.fuelService.logFuelEntry({
      ...body,
      receiptImageUrl: file ? `/uploads/${file.filename}` : undefined,
    });
  }
}