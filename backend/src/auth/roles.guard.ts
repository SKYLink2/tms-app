// backend/src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';
import { Role } from './roles.enum.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // If no roles specified, allow access
    }
    const request = context.switchToHttp().getRequest();
    // Read simulated role from header (defaults to 'admin' if missing)
    const userRole = request.headers['x-user-role'] || Role.ADMIN;

    return requiredRoles.includes(userRole as Role);
  }
}