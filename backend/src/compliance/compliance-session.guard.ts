import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  requireComplianceSession,
  requireFrontendOrigin,
} from './compliance-auth.js';

@Injectable()
export class ComplianceSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    requireComplianceSession(request);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      requireFrontendOrigin(request);
    }
    return true;
  }
}
