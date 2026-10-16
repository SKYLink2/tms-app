// backend/src/compliance/compliance.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Driver } from '../drivers/entities/driver.entity.js';
import { DriverCompliance } from './entities/compliance.entity.js';
import { CreateComplianceDto } from './dto/create-compliance.dto.js';
import {
  complianceEncryptionKey,
} from './compliance-auth.js';
import type { ComplianceDocumentKind } from './compliance-upload.config.js';

const DOCUMENT_FIELDS = {
  'id-photo': 'idPhotoUrl',
  'medical-card': 'medicalCardUrl',
  'w9-form': 'w9FormUrl',
} as const;

const DOCUMENT_LABELS = {
  'id-photo': 'driver-id',
  'medical-card': 'medical-card',
  'w9-form': 'w9-form',
} as const;

function documentRoot(): string {
  const directory = resolve(
    process.env.COMPLIANCE_PRIVATE_FILES_DIRECTORY ??
      join(process.cwd(), 'private-compliance-files'),
  );
  const publicUploads = resolve(process.cwd(), 'uploads');
  const relativeToPublic = relative(publicUploads, directory);
  if (
    relativeToPublic === '' ||
    (!relativeToPublic.startsWith('..') && !isAbsolute(relativeToPublic))
  ) {
    throw new InternalServerErrorException(
      'Compliance private storage cannot be placed inside the public uploads directory',
    );
  }
  return directory;
}

function documentUrl(
  recordId: string,
  kind: ComplianceDocumentKind,
  documentId: string,
): string {
  return `/compliance/${recordId}/documents/${kind}/${documentId}`;
}

function documentIdFromUrl(
  recordId: string,
  kind: ComplianceDocumentKind,
  value: string | null,
): string | null {
  if (!value) return null;
  const match = value.match(
    new RegExp(`^/compliance/${recordId}/documents/${kind}/([0-9a-f-]{36})$`, 'i'),
  );
  return match?.[1] ?? null;
}

function documentPath(
  recordId: string,
  kind: ComplianceDocumentKind,
  documentId: string,
): string {
  if (!/^[0-9a-f-]{36}$/i.test(recordId) || !/^[0-9a-f-]{36}$/i.test(documentId)) {
    throw new NotFoundException('Compliance document not found');
  }
  return join(documentRoot(), recordId, `${kind}-${documentId}.enc`);
}

function identifyFile(buffer: Buffer): {
  contentType: string;
  extension: string;
} | null {
  if (buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    return { contentType: 'application/pdf', extension: 'pdf' };
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'
  ) {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  return null;
}

function encryptFile(buffer: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', complianceEncryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}

function decryptFile(envelope: Buffer): Buffer {
  if (envelope.length < 29) {
    throw new InternalServerErrorException('Stored compliance document is invalid');
  }
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      complianceEncryptionKey(),
      envelope.subarray(0, 12),
    );
    decipher.setAuthTag(envelope.subarray(12, 28));
    return Buffer.concat([
      decipher.update(envelope.subarray(28)),
      decipher.final(),
    ]);
  } catch {
    throw new InternalServerErrorException(
      'Unable to decrypt the compliance document; verify the configured encryption key',
    );
  }
}

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(DriverCompliance)
    private complianceRepo: Repository<DriverCompliance>,
    @InjectRepository(Driver)
    private driversRepo: Repository<Driver>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Array<Omit<DriverCompliance, 'ssn'>>> {
    const records = await this.complianceRepo.find();
    return records.map((record) => this.withoutSsn(record));
  }

  async create(dto: CreateComplianceDto): Promise<Omit<DriverCompliance, 'ssn'>> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const complianceRepo = manager.getRepository(DriverCompliance);
      const driversRepo = manager.getRepository(Driver);
      const record = await complianceRepo.save(complianceRepo.create(dto));
      const driver = await this.findMatchingDriver(
        driversRepo,
        record.firstName,
        record.middleName,
        record.lastName,
        record.phone,
        record.email,
      );
      const linkedDriver = driver
        ? Object.assign(driver, {
            firstName: record.firstName,
            middleName: record.middleName,
            lastName: record.lastName,
            phone: record.phone ?? driver.phone,
            email: record.email ?? driver.email,
          })
        : driversRepo.create({
            firstName: record.firstName,
            middleName: record.middleName,
            lastName: record.lastName,
            phone: record.phone ?? undefined,
            email: record.email ?? undefined,
            status: 'Active',
          });
      const savedDriver = await driversRepo.save(linkedDriver);
      record.driverId = savedDriver.id;
      return complianceRepo.save(record);
    });
    return this.withoutSsn(saved);
  }

  async update(
    id: string,
    dto: Partial<CreateComplianceDto>,
  ): Promise<Omit<DriverCompliance, 'ssn'>> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const complianceRepo = manager.getRepository(DriverCompliance);
      const driversRepo = manager.getRepository(Driver);
      const record = await complianceRepo.findOne({ where: { id } });
      if (!record) {
        throw new NotFoundException(`Compliance record ID ${id} not found`);
      }

      Object.assign(record, dto);
      const updatedRecord = await complianceRepo.save(record);
      if (updatedRecord.driverId !== null) {
        const driver = await driversRepo.findOne({
          where: { id: updatedRecord.driverId },
        });
        if (driver) {
          Object.assign(driver, {
            firstName: updatedRecord.firstName,
            middleName: updatedRecord.middleName,
            lastName: updatedRecord.lastName,
            phone: updatedRecord.phone ?? driver.phone,
            email: updatedRecord.email ?? driver.email,
          });
          await driversRepo.save(driver);
        }
      }
      return updatedRecord;
    });
    return this.withoutSsn(saved);
  }

  private async findMatchingDriver(
    repository: Repository<Driver>,
    firstName: string,
    middleName: string | null,
    lastName: string,
    phone: string | null,
    email: string | null,
  ): Promise<Driver | null> {
    if (email?.trim()) {
      const matches = await repository
        .createQueryBuilder('driver')
        .where('LOWER(BTRIM(driver.email)) = LOWER(BTRIM(:email))', { email })
        .andWhere('LOWER(BTRIM(driver.firstName)) = LOWER(BTRIM(:firstName))', {
          firstName,
        })
        .andWhere('LOWER(BTRIM(driver.lastName)) = LOWER(BTRIM(:lastName))', {
          lastName,
        })
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM driver_compliance compliance WHERE compliance."driverId" = driver.id)',
        )
        .limit(2)
        .getMany();
      if (matches.length === 1) return matches[0];
    }

    const phoneDigits = phone?.replace(/\D/g, '');
    if (!phoneDigits) return null;
    const matches = await repository
      .createQueryBuilder('driver')
      .where('LOWER(BTRIM(driver.firstName)) = LOWER(BTRIM(:firstName))', {
        firstName,
      })
      .andWhere('LOWER(BTRIM(driver.lastName)) = LOWER(BTRIM(:lastName))', {
        lastName,
      })
      .andWhere(
        "regexp_replace(driver.phone, '[^0-9]', '', 'g') = :phoneDigits",
        { phoneDigits },
      )
      .andWhere(
        middleName
          ? 'LOWER(BTRIM(driver.middleName)) = LOWER(BTRIM(:middleName))'
          : '(driver.middleName IS NULL OR BTRIM(driver.middleName) = \'\')',
        middleName ? { middleName } : {},
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM driver_compliance compliance WHERE compliance."driverId" = driver.id)',
      )
      .limit(2)
      .getMany();
    return matches.length === 1 ? matches[0] : null;
  }

  async remove(id: string): Promise<void> {
    const record = await this.complianceRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Compliance record ID ${id} not found`);
    }
    const result = await this.complianceRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Compliance record ID ${id} not found`);
    await rm(join(documentRoot(), id), { recursive: true, force: true });
  }

  async uploadDocument(
    id: string,
    kind: ComplianceDocumentKind,
    file: Express.Multer.File | undefined,
  ): Promise<Omit<DriverCompliance, 'ssn'>> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A document file must be uploaded');
    }
    const detected = identifyFile(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        'The selected file is not a supported PDF, JPEG, PNG, or WebP document',
      );
    }

    const record = await this.complianceRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Compliance record ID ${id} not found`);
    }

    const documentId = randomUUID();
    const directory = join(documentRoot(), id);
    const targetPath = documentPath(id, kind, documentId);
    const temporaryPath = `${targetPath}.tmp`;
    const previousUrl = this.getDocumentUrl(record, kind);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(temporaryPath, encryptFile(file.buffer), {
      flag: 'wx',
      mode: 0o600,
    });

    try {
      await rename(temporaryPath, targetPath);
    } catch (error: unknown) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
    this.setDocumentUrl(record, kind, documentUrl(id, kind, documentId));
    let saved: DriverCompliance;
    try {
      saved = await this.complianceRepo.save(record);
    } catch (error: unknown) {
      await rm(targetPath, { force: true });
      throw error;
    }
    const previousId = documentIdFromUrl(id, kind, previousUrl);
    if (previousId) {
      await rm(documentPath(id, kind, previousId), { force: true });
    }
    return this.withoutSsn(saved);
  }

  async getDocument(
    id: string,
    kind: ComplianceDocumentKind,
    documentId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    if (!/^[0-9a-f-]{36}$/i.test(documentId)) {
      throw new NotFoundException('Compliance document not found');
    }
    const record = await this.complianceRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Compliance record ID ${id} not found`);
    }
    if (
      this.getDocumentUrl(record, kind) !== documentUrl(id, kind, documentId)
    ) {
      throw new NotFoundException('Compliance document not found');
    }

    let encrypted: Buffer;
    try {
      encrypted = await readFile(documentPath(id, kind, documentId));
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new NotFoundException('Compliance document not found');
      }
      throw error;
    }
    const buffer = decryptFile(encrypted);
    const identified = identifyFile(buffer);
    if (!identified) {
      throw new InternalServerErrorException(
        'Stored compliance document has an unsupported format',
      );
    }
    return {
      buffer,
      contentType: identified.contentType,
      filename: `${DOCUMENT_LABELS[kind]}.${identified.extension}`,
    };
  }

  private getDocumentUrl(
    record: DriverCompliance,
    kind: ComplianceDocumentKind,
  ): string | null {
    const value = record[DOCUMENT_FIELDS[kind]];
    return typeof value === 'string' ? value : null;
  }

  private setDocumentUrl(
    record: DriverCompliance,
    kind: ComplianceDocumentKind,
    value: string,
  ): void {
    record[DOCUMENT_FIELDS[kind]] = value;
  }

  private withoutSsn(
    record: DriverCompliance,
  ): Omit<DriverCompliance, 'ssn'> {
    const { ssn: _ssn, ...safeRecord } = record;
    return safeRecord;
  }
}