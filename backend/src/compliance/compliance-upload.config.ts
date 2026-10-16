import type { Request } from 'express';
import { memoryStorage } from 'multer';

export const COMPLIANCE_DOCUMENT_KINDS = [
  'id-photo',
  'medical-card',
  'w9-form',
] as const;

export type ComplianceDocumentKind =
  (typeof COMPLIANCE_DOCUMENT_KINDS)[number];

export const complianceDocumentUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (
    _request: Request,
    _file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    callback(null, true);
  },
};

export function isComplianceDocumentKind(
  value: string,
): value is ComplianceDocumentKind {
  return COMPLIANCE_DOCUMENT_KINDS.some((kind) => kind === value);
}
