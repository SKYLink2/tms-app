import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { LoadAuthService, requireLoadRequestOrigin } from './load-auth.service.js';
import type { LoadUserRole } from './load-user.entity.js';

@Injectable()
export class LoadAuthGuard implements CanActivate {
  constructor(private readonly auth: LoadAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    request.loadUser = await this.auth.currentUser(request);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      requireLoadRequestOrigin(request);
    }
    return true;
  }
}

export function requireLoadRole(
  request: Request,
  ...roles: LoadUserRole[]
): void {
  if (!request.loadUser || !roles.includes(request.loadUser.role)) {
    throw new ForbiddenException('Your account cannot perform this action');
  }
}
