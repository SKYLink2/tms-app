import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CreateFuelCardTransactionDto } from './dto/create-fuel-card-transaction.dto.js';
import { SubmitFuelReceiptDto } from './dto/submit-fuel-receipt.dto.js';
import {
  FuelReconciliationStatus,
  FuelTransaction,
} from './entities/fuel-transaction.entity.js';
import { EquipmentAssignment } from '../equipment/entities/equipment-assignment.entity.js';
import { Equipment } from '../equipment/entities/equipment.entity.js';
import { FUEL_RECEIPTS_DIRECTORY } from './fuel-upload.config.js';

const amountTolerance = 1;
const gallonsTolerance = 0.5;
const locationToleranceKm = 50;
const matchWindowMs = 24 * 60 * 60 * 1000;

@Injectable()
export class FuelTransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FuelTransaction)
    private readonly transactionRepo: Repository<FuelTransaction>,
    @InjectRepository(EquipmentAssignment)
    private readonly assignmentRepo: Repository<EquipmentAssignment>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
  ) {}

  listTransactions(): Promise<FuelTransaction[]> {
    return this.transactionRepo.find({ order: { cardTransactionAt: 'DESC' } });
  }

  async createCardTransaction(
    data: CreateFuelCardTransactionDto,
  ): Promise<FuelTransaction> {
    const truck = await this.equipmentRepo.findOne({
      where: { id: data.truckId, type: 'Truck' },
    });
    if (!truck) throw new NotFoundException('Truck not found');

    if (data.stationGpsLocation) this.validateCoordinates(data.stationGpsLocation);
    const cardTime = new Date(data.cardTransactionAt);
    return this.dataSource.transaction(async (manager) => {
      const transactionRepo = manager.getRepository(FuelTransaction);
      const matchingReceipt = await transactionRepo
        .createQueryBuilder('transaction')
        .where('transaction.truckId = :truckId', { truckId: truck.id })
        .andWhere('transaction.reconciliationStatus = :status', {
          status: FuelReconciliationStatus.PENDING,
        })
        .andWhere('transaction.receiptAmount IS NOT NULL')
        .andWhere('transaction.fuelCardAmount IS NULL')
        .andWhere('transaction.cardTransactionAt BETWEEN :from AND :to', {
          from: new Date(cardTime.getTime() - 2 * 60 * 60 * 1000),
          to: new Date(cardTime.getTime() + matchWindowMs),
        })
        .orderBy('transaction.cardTransactionAt', 'ASC')
        .setLock('pessimistic_write')
        .getOne();
      const transaction =
        matchingReceipt ??
        transactionRepo.create({
          truckId: truck.id,
          driverId: null,
          receiptAmount: null,
          receiptGallons: null,
          receiptImageUrl: null,
          receiptGpsLocation: null,
          receiptTimestamp: null,
          odometerReading: null,
          calculatedMpg: null,
          reconciliationStatus: FuelReconciliationStatus.PENDING,
          auditNotes: null,
        });
      transaction.externalTransactionId =
        data.externalTransactionId?.trim() || null;
      transaction.fuelCardAmount = data.fuelCardAmount.toFixed(2);
      transaction.gallons = data.gallons.toFixed(2);
      transaction.pricePerGallon = (
        data.fuelCardAmount / data.gallons
      ).toFixed(3);
      transaction.stationName = data.stationName?.trim() || null;
      transaction.stationLocation = data.stationLocation?.trim() || null;
      transaction.stationGpsLocation = data.stationGpsLocation ?? null;
      transaction.cardTransactionAt = cardTime;

      if (matchingReceipt) {
        this.reconcileAmountsAndLocation(transaction);
      }
      return transactionRepo.save(transaction);
    });
  }

  async submitReceipt(
    driverId: number,
    data: SubmitFuelReceiptDto,
    imageFilename: string | undefined,
  ): Promise<FuelTransaction> {
    if (!imageFilename) {
      throw new BadRequestException('A fuel receipt image is required');
    }
    this.validateCoordinates(data.receiptGpsLocation);

    const assignment = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.truck', 'truck')
      .where('assignment.status = :status', { status: 'ACTIVE' })
      .andWhere(
        '(assignment.primaryDriverId = :driverId OR assignment.secondaryDriverId = :driverId)',
        { driverId },
      )
      .andWhere('truck.type = :type', { type: 'Truck' })
      .getOne();
    if (!assignment) {
      throw new BadRequestException(
        'No active truck assignment is linked to this driver',
      );
    }

    const receiptTime = new Date(data.receiptTimestamp);
    return this.dataSource.transaction(async (manager) => {
      const transactionRepo = manager.getRepository(FuelTransaction);
      const previous = await transactionRepo
        .createQueryBuilder('transaction')
        .where('transaction.truckId = :truckId', { truckId: assignment.truckId })
        .andWhere('transaction.odometerReading IS NOT NULL')
        .andWhere('transaction.cardTransactionAt < :receiptTime', {
          receiptTime,
        })
        .orderBy('transaction.cardTransactionAt', 'DESC')
        .getOne();

      if (
        previous &&
        previous.odometerReading !== null &&
        data.odometerReading <= previous.odometerReading
      ) {
        throw new BadRequestException(
          'Odometer reading must be greater than the previous recorded reading',
        );
      }

      const matchingCardRecord = await transactionRepo
        .createQueryBuilder('transaction')
        .where('transaction.truckId = :truckId', { truckId: assignment.truckId })
        .andWhere('transaction.reconciliationStatus = :status', {
          status: FuelReconciliationStatus.PENDING,
        })
        .andWhere('transaction.receiptAmount IS NULL')
        .andWhere('transaction.cardTransactionAt BETWEEN :from AND :to', {
          from: new Date(receiptTime.getTime() - matchWindowMs),
          to: new Date(receiptTime.getTime() + 2 * 60 * 60 * 1000),
        })
        .orderBy('transaction.cardTransactionAt', 'DESC')
        .setLock('pessimistic_write')
        .getOne();

      const transaction =
        matchingCardRecord ??
        transactionRepo.create({
          truckId: assignment.truckId,
          driverId,
          externalTransactionId: null,
          fuelCardAmount: null,
          gallons: null,
          pricePerGallon: null,
          stationName: null,
          stationLocation: null,
          stationGpsLocation: null,
          cardTransactionAt: receiptTime,
          auditNotes: null,
        });

      transaction.driverId = driverId;
      transaction.receiptAmount = data.receiptAmount.toFixed(2);
      transaction.receiptGallons = data.gallons.toFixed(2);
      transaction.receiptImageUrl = imageFilename;
      transaction.receiptGpsLocation = data.receiptGpsLocation;
      transaction.receiptTimestamp = receiptTime;
      transaction.odometerReading = data.odometerReading;
      transaction.gallons = data.gallons.toFixed(2);
      transaction.calculatedMpg =
        previous?.odometerReading != null && data.gallons > 0
          ? (
              (data.odometerReading - previous.odometerReading) /
              data.gallons
            ).toFixed(2)
          : null;

      if (!matchingCardRecord) {
        transaction.reconciliationStatus = FuelReconciliationStatus.PENDING;
        transaction.auditNotes =
          'No matching fuel-card transaction was available';
      } else {
        this.reconcileAmountsAndLocation(transaction);
      }
      return transactionRepo.save(transaction);
    });
  }

  getReceiptImage(filename: string): { path: string; mimetype: string } {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) {
      throw new NotFoundException('Fuel receipt image not found');
    }
    const path = join(FUEL_RECEIPTS_DIRECTORY, filename);
    if (!existsSync(path)) {
      throw new NotFoundException('Fuel receipt image not found');
    }
    const extension = filename.slice(filename.lastIndexOf('.') + 1);
    return {
      path,
      mimetype:
        extension === 'jpg'
          ? 'image/jpeg'
          : extension === 'png'
            ? 'image/png'
            : 'image/webp',
    };
  }

  async findTransaction(id: string): Promise<FuelTransaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) throw new NotFoundException('Fuel transaction not found');
    return transaction;
  }

  private reconcileAmountsAndLocation(transaction: FuelTransaction): void {
    const notes: string[] = [];
    if (
      Math.abs(
        Number(transaction.fuelCardAmount) - Number(transaction.receiptAmount),
      ) > amountTolerance
    ) {
      notes.push(
        `Receipt amount differs from card amount by $${Math.abs(Number(transaction.fuelCardAmount) - Number(transaction.receiptAmount)).toFixed(2)}`,
      );
    }
    if (
      Math.abs(
        Number(transaction.gallons) - Number(transaction.receiptGallons),
      ) >
      gallonsTolerance
    ) {
      notes.push(
        `Receipt gallons differ from card gallons by ${Math.abs(Number(transaction.gallons) - Number(transaction.receiptGallons)).toFixed(2)}`,
      );
    }
    if (transaction.stationGpsLocation && transaction.receiptGpsLocation) {
      const distance = this.distanceKm(
        this.validateCoordinates(transaction.stationGpsLocation),
        this.validateCoordinates(transaction.receiptGpsLocation),
      );
      if (distance > locationToleranceKm) {
        notes.push(
          `Receipt location is ${distance.toFixed(1)} km from the card transaction location`,
        );
      }
    }
    transaction.reconciliationStatus = notes.length
      ? FuelReconciliationStatus.DISCREPANCY_FLAGGED
      : FuelReconciliationStatus.RECONCILED;
    transaction.auditNotes = notes.length ? notes.join('; ') : null;
  }

  private validateCoordinates(value: string): [number, number] {
    const coordinates = value.split(',').map(Number);
    const [latitude, longitude] = coordinates;
    if (
      coordinates.length !== 2 ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException('GPS coordinates are invalid');
    }
    return [latitude, longitude];
  }

  private distanceKm(
    [latitudeA, longitudeA]: [number, number],
    [latitudeB, longitudeB]: [number, number],
  ): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(latitudeB - latitudeA);
    const longitudeDelta = radians(longitudeB - longitudeA);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(latitudeA)) *
        Math.cos(radians(latitudeB)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
