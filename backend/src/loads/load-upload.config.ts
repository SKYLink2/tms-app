import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Request } from 'express';
import { diskStorage } from 'multer';

export const LOAD_UPLOADS_DIRECTORY = resolve(process.cwd(), 'uploads');

const FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const loadUploadOptions = {
  storage: diskStorage({
    destination: (request, _file, callback) => {
      const loadId = request.params.id;
      if (
        typeof loadId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          loadId,
        )
      ) {
        callback(new BadRequestException('Load ID must be a UUID'), '');
        return;
      }

      const directory = join(LOAD_UPLOADS_DIRECTORY, loadId);
      mkdir(directory, { recursive: true }, (error) => {
        callback(error, directory);
      });
    },
    filename: (_request, file, callback) => {
      callback(null, `${randomUUID()}${FILE_EXTENSIONS[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (
    request: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const kind = request.params.kind;
    const isImageOnly = kind === 'seal-photo' || kind === 'securement-photo';
    const isSupportedKind = [
      'seal-photo',
      'securement-photo',
      'rate-confirmation',
      'bol',
      'pod',
      'receipt',
    ].includes(typeof kind === 'string' ? kind : '');

    if (!isSupportedKind) {
      callback(new BadRequestException('Unsupported load file type'), false);
      return;
    }

    if (
      !(file.mimetype in FILE_EXTENSIONS) ||
      (isImageOnly && !file.mimetype.startsWith('image/'))
    ) {
      callback(
        new BadRequestException(
          isImageOnly
            ? 'Upload a JPEG, PNG, or WebP image'
            : 'Upload a PDF, JPEG, PNG, or WebP file',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
};
