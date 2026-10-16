import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Load } from './load.entity.js';
import { CreateLoadDto, type LoadStatus } from './create-load.dto.js';
import { UpdateLoadDto } from './update-load.dto.js';
import { CreateLoadNoteDto } from './create-load-note.dto.js';
import { UpdateLoadLifecycleDto } from './dto/update-load-lifecycle.dto.js';
import type { AuthenticatedLoadUser } from './load-auth.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const PRIVILEGED_ROLES = [
  'admin',
  'owner',
  'dispatch_manager',
  'fleet_manager',
] as const;
const DRAFT_STATUSES = ['DRAFT', 'QUOTED', 'PENDING_ASSIGNMENT'];

export type LoadFileKind =
  | 'seal-photo'
  | 'securement-photo'
  | 'rate-confirmation'
  | 'bol'
  | 'pod'
  | 'receipt';

@Injectable()
export class LoadsService {
  constructor(
    @InjectRepository(Load)
    private readonly loadsRepository: Repository<Load>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(
    query: {
      status?: string;
      stage?: 'draft' | 'operational';
      search?: string;
      page?: number;
      limit?: number;
    },
    user: AuthenticatedLoadUser,
  ): Promise<{ data: Load[]; total: number; page: number; lastPage: number }> {
    const { status, stage, search, page = 1, limit = 10 } = query;
    const currentPage = Math.max(1, Math.floor(Number(page) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(limit) || 10)));
    const queryBuilder = this.visibleLoads(user)
      .leftJoinAndSelect('load.driver', 'driver');

    if (stage === 'draft') {
      queryBuilder.andWhere('load.companyLoadNumber IS NULL');
    } else if (stage === 'operational') {
      queryBuilder.andWhere('load.companyLoadNumber IS NOT NULL');
    }
    if (status) queryBuilder.andWhere('load.status = :status', { status });
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(load.companyLoadNumber ILIKE :term OR load.draftLoadNumber ILIKE :term OR load.origin ILIKE :term OR load.destination ILIKE :term)',
        { term },
      );
    }

    queryBuilder.skip((currentPage - 1) * pageSize).take(pageSize);
    queryBuilder.orderBy('load.createdAt', 'DESC');
    const [data, total] = await queryBuilder.getManyAndCount();
    return {
      data,
      total,
      page: currentPage,
      lastPage: Math.ceil(total / pageSize) || 1,
    };
  }

  async findOne(id: string, user: AuthenticatedLoadUser): Promise<Load> {
    const load = await this.visibleLoads(user)
      .leftJoinAndSelect('load.driver', 'driver')
      .andWhere('load.id = :id', { id })
      .getOne();
    if (!load) throw new NotFoundException(`Load with ID ${id} not found`);
    return load;
  }

  async create(
    dto: CreateLoadDto,
    user: AuthenticatedLoadUser,
  ): Promise<Load> {
    if (user.role === 'driver') {
      throw new ForbiddenException('Driver accounts cannot create loads');
    }
    if (dto.status && !DRAFT_STATUSES.includes(dto.status)) {
      throw new BadRequestException(
        'New loads must start in a staged status and be assigned to enter operations',
      );
    }
    const load = this.loadsRepository.create({
      origin: dto.origin,
      destination: dto.destination,
      broker: dto.broker,
      rate: dto.rate,
      pickupDate: dto.pickupDate ?? null,
      pickupTime: dto.pickupTime ?? null,
      deliveryDate: dto.deliveryDate ?? null,
      deliveryTime: dto.deliveryTime ?? null,
      status: dto.status ?? 'DRAFT',
      driverId: dto.driverId ?? null,
      truckUnitNumber: dto.truckUnitNumber?.trim() || null,
      createdById: user.id,
      dispatcherName: user.username,
    });
    load.draftLoadNumber = await this.nextNumber(
      `dispatcher:${this.safeDispatcherKey(user.username)}`,
      `DISP-${this.safeDispatcherKey(user.username)}`,
      101,
    );
    await this.promoteIfAssigned(load);
    return this.loadsRepository.save(load);
  }

  async update(
    id: string,
    dto: UpdateLoadDto,
    user: AuthenticatedLoadUser,
  ): Promise<Load> {
    const load = await this.findOne(id, user);
    this.assertCanMutate(load, user);
    const previousStatus = load.status;
    this.assertStageDoesNotRevert(load, dto.status);
    const { eta, ...fields } = dto;
    Object.assign(load, fields);
    if (dto.driverId !== undefined) load.driverId = dto.driverId;
    if (dto.truckUnitNumber !== undefined) {
      load.truckUnitNumber = dto.truckUnitNumber?.trim() || null;
    }
    if (eta !== undefined) load.eta = eta === null ? null : new Date(eta);
    await this.promoteIfAssigned(load);
    const updatedLoad = await this.loadsRepository.save(load);
    await this.notifyStatusChange(updatedLoad, previousStatus, user.username);
    return updatedLoad;
  }

  async updateLifecycle(
    id: string,
    dto: UpdateLoadLifecycleDto,
    user: AuthenticatedLoadUser,
  ): Promise<Load> {
    const load = await this.findOne(id, user);
    this.assertCanMutate(load, user);
    const previousStatus = load.status;
    this.assertStageDoesNotRevert(load, dto.status);
    const { eta, ...fields } = dto;
    Object.assign(load, fields);
    if (eta !== undefined) load.eta = eta === null ? null : new Date(eta);
    await this.promoteIfAssigned(load);
    await this.ensureOperationalNumber(load);
    const updatedLoad = await this.loadsRepository.save(load);
    await this.notifyStatusChange(updatedLoad, previousStatus, user.username);
    return updatedLoad;
  }

  async updateDriverMilestone(
    id: string,
    status: 'DISPATCHED' | 'AT_PICKUP' | 'IN_TRANSIT' | 'AT_DELIVERY',
    user: AuthenticatedLoadUser,
  ): Promise<Load> {
    if (user.role !== 'driver' || user.driverId === null) {
      throw new ForbiddenException('Only linked driver accounts can report milestones');
    }

    const load = await this.findOne(id, user);
    const previousStatus = load.status;
    if (!load.companyLoadNumber || load.driverId !== user.driverId) {
      throw new ForbiddenException('You can only update your assigned operational loads');
    }

    const nextStatus: Partial<Record<LoadStatus, LoadStatus>> = {
      ASSIGNED: 'DISPATCHED',
      DISPATCHED: 'AT_PICKUP',
      AT_PICKUP: 'IN_TRANSIT',
      LOADED: 'IN_TRANSIT',
      IN_TRANSIT: 'AT_DELIVERY',
    };
    if (nextStatus[load.status] !== status) {
      throw new BadRequestException(
        `Load status cannot move from ${load.status} to ${status}`,
      );
    }

    load.status = status;
    const updatedLoad = await this.loadsRepository.save(load);
    await this.notifyStatusChange(updatedLoad, previousStatus, user.username);
    return updatedLoad;
  }

  async addNote(
    id: string,
    note: CreateLoadNoteDto,
    user: AuthenticatedLoadUser,
  ): Promise<Load> {
    const text = note.text.trim();
    if (!text) throw new BadRequestException('Note text is required');
    const load = await this.findOne(id, user);
    this.assertCanMutate(load, user);
    load.notes = [
      ...(load.notes ?? []),
      {
        id: randomUUID(),
        author: user.username,
        text,
        createdAt: new Date().toISOString(),
      },
    ];
    return this.loadsRepository.save(load);
  }

  async attachFile(
    id: string,
    kind: LoadFileKind,
    file: Express.Multer.File,
    user: AuthenticatedLoadUser,
  ): Promise<Load> {
    if (!file) throw new BadRequestException('A file must be uploaded');
    const load = await this.findOne(id, user);
    this.assertCanMutate(load, user, kind);
    const previousStatus = load.status;
    const fileUrl = `/uploads/${id}/${file.filename}`;
    switch (kind) {
      case 'seal-photo':
        load.trailerSealPhotoUrl = fileUrl;
        break;
      case 'securement-photo':
        load.securementPhotos = [...(load.securementPhotos ?? []), fileUrl];
        break;
      case 'rate-confirmation':
        load.rateConfirmationUrl = fileUrl;
        break;
      case 'bol':
        load.bolUrl = fileUrl;
        break;
      case 'pod':
        load.podUrl = fileUrl;
        break;
      case 'receipt':
        load.receiptUrls = [...(load.receiptUrls ?? []), fileUrl];
        break;
      default:
        throw new BadRequestException('Unsupported load file type');
    }
    if (
      kind === 'pod' &&
      [
        'ASSIGNED',
        'DISPATCHED',
        'AT_PICKUP',
        'LOADED',
        'IN_TRANSIT',
        'AT_DELIVERY',
      ].includes(load.status)
    ) {
      load.status = 'DELIVERED';
    }
    const updatedLoad = await this.loadsRepository.save(load);
    if (kind === 'pod') {
      const loadNumber =
        updatedLoad.companyLoadNumber ??
        updatedLoad.draftLoadNumber ??
        updatedLoad.id.slice(0, 8);
      const driverName = updatedLoad.driver
        ? `${updatedLoad.driver.firstName} ${updatedLoad.driver.lastName}`.trim()
        : user.username;
      await this.notificationsService.createNotification(
        'POD Uploaded',
        `${driverName} uploaded Proof of Delivery for Load #${loadNumber}`,
        'SUCCESS',
        'DISPATCHER',
      );
    }
    await this.notifyStatusChange(updatedLoad, previousStatus, user.username);
    return updatedLoad;
  }

  async remove(id: string, user: AuthenticatedLoadUser): Promise<void> {
    const load = await this.findOne(id, user);
    this.assertCanMutate(load, user);
    await this.loadsRepository.remove(load);
  }

  private visibleLoads(user: AuthenticatedLoadUser): SelectQueryBuilder<Load> {
    const query = this.loadsRepository.createQueryBuilder('load');
    if (PRIVILEGED_ROLES.includes(user.role as (typeof PRIVILEGED_ROLES)[number])) {
      return query;
    }
    if (user.role === 'dispatcher') {
      return query.andWhere(
        '(load.companyLoadNumber IS NOT NULL OR load.createdById = :userId)',
        { userId: user.id },
      );
    }
    if (user.role === 'driver') {
      return query.andWhere(
        'load.companyLoadNumber IS NOT NULL AND load.driverId = :driverId',
        {
          driverId: user.driverId ?? -1,
        },
      );
    }
    return query.andWhere('load.companyLoadNumber IS NOT NULL');
  }

  private assertCanMutate(
    load: Load,
    user: AuthenticatedLoadUser,
    fileKind?: LoadFileKind,
  ): void {
    if (user.role === 'driver') {
      if (
        fileKind !== 'pod' ||
        user.driverId === null ||
        load.driverId !== user.driverId
      ) {
        throw new ForbiddenException('Your account cannot modify this load');
      }
      return;
    }
    if (
      user.role === 'dispatcher' &&
        DRAFT_STATUSES.includes(load.status) &&
        load.createdById !== user.id
    ) {
      throw new ForbiddenException('Your account cannot modify this load');
    }
  }

  private assertStageDoesNotRevert(load: Load, requestedStatus?: string): void {
    if (
      load.companyLoadNumber &&
      requestedStatus &&
      DRAFT_STATUSES.includes(requestedStatus)
    ) {
      throw new BadRequestException(
        'Operational loads cannot be returned to the staged workspace',
      );
    }
  }

  private async promoteIfAssigned(load: Load): Promise<void> {
    const isDraft = DRAFT_STATUSES.includes(load.status);
    const isAssigned = load.driverId !== null && Boolean(load.truckUnitNumber);
    if (isDraft && isAssigned) {
      load.status = 'ASSIGNED';
      await this.ensureOperationalNumber(load);
      return;
    }
    if (!isDraft && !load.companyLoadNumber) {
      if (!isAssigned) {
        throw new BadRequestException(
          'Assign both a driver and truck unit before moving this load to the operational board',
        );
      }
      load.status = 'ASSIGNED';
      await this.ensureOperationalNumber(load);
      return;
    }
    if (load.status === 'ASSIGNED' || load.status === 'DISPATCHED') {
      this.validateAssignedStatus(load);
    }
  }

  private validateAssignedStatus(load: Load): void {
    if (
      ['ASSIGNED', 'DISPATCHED'].includes(load.status) &&
      (load.driverId === null || !load.truckUnitNumber)
    ) {
      throw new BadRequestException(
        'Assign both a driver and truck unit before dispatching this load',
      );
    }
  }

  private async notifyStatusChange(
    load: Load,
    previousStatus: LoadStatus,
    actor: string,
  ): Promise<void> {
    if (load.status === previousStatus) return;
    const loadNumber =
      load.companyLoadNumber ?? load.draftLoadNumber ?? load.id.slice(0, 8);
    await this.notificationsService.createNotification(
      'Load Status Updated',
      `${actor} changed Load #${loadNumber} from ${previousStatus.replaceAll('_', ' ')} to ${load.status.replaceAll('_', ' ')}`,
      'INFO',
      'DISPATCHER',
    );
  }

  private async ensureOperationalNumber(load: Load): Promise<void> {
    if (
      (load.status === 'ASSIGNED' || load.status === 'DISPATCHED') &&
      !load.companyLoadNumber
    ) {
      const year = new Date().getFullYear();
      load.companyLoadNumber = await this.nextNumber(
        `company:${year}`,
        `LD-${year}`,
        1001,
      );
    }
  }

  private safeDispatcherKey(username: string): string {
    return (
      username
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || 'USER'
    );
  }

  private async nextNumber(
    scope: string,
    prefix: string,
    firstValue: number,
  ): Promise<string> {
    const rows: Array<{ nextValue: number | string }> =
      await this.dataSource.query(
        `
          INSERT INTO "load_number_counters" ("scope", "nextValue")
          VALUES ($1, $2)
          ON CONFLICT ("scope") DO UPDATE
          SET "nextValue" = GREATEST(
            "load_number_counters"."nextValue" + 1,
            EXCLUDED."nextValue"
          )
          RETURNING "nextValue"
        `,
        [scope, firstValue],
      );
    const sequence = Number(rows[0]?.nextValue);
    if (!Number.isSafeInteger(sequence) || sequence < 1) {
      throw new Error(`Unable to allocate load number for ${scope}`);
    }
    const width = prefix.startsWith('LD-') ? 4 : 3;
    return `${prefix}-${String(sequence).padStart(width, '0')}`;
  }
}
