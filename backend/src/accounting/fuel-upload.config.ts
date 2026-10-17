import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Request } from 'express';
import { diskStorage } from 'multer';

export const FUEL_RECEIPTS_DIRECTORY = resolve(
  process.cwd(),
  'private_uploads',
  'fuel',
);

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const fuelUploadOptions = {
  storage: diskStorage({
    destination: (_request: Request, _file, callback) => {
      const directory = join(FUEL_RECEIPTS_DIRECTORY);
      mkdir(directory, { recursive: true }, (error) => {
        callback(error, directory);
      });
    },
    filename: (_request: Request, file, callback) => {
      callback(null, `${randomUUID()}${IMAGE_EXTENSIONS[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (
    _request: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!(file.mimetype in IMAGE_EXTENSIONS)) {
      callback(
        new BadRequestException('Upload a JPEG, PNG, or WebP receipt image'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
