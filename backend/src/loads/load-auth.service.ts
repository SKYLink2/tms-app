import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../drivers/entities/driver.entity.js';
import { LoadUser, type LoadUserRole } from './load-user.entity.js';

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'focus_load_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AuthenticatedLoadUser {
  id: string;
  username: string;
  role: LoadUserRole;
  driverId: number | null;
  active: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    loadUser?: AuthenticatedLoadUser;
  }
}

function requiredSecret(name: string, minimumLength: number): string {
  const value = process.env[name];
  if (!value || value.length < minimumLength) {
    throw new BadRequestException(
      `${name} must be configured with at least ${minimumLength} characters`,
    );
  }
  return value;
}

function sessionSignature(payload: string): string {
  return createHmac('sha256', requiredSecret('LOADS_SESSION_SECRET', 32))
    .update(payload)
    .digest('hex');
}

function safeEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function passwordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex');
}

function cookieValue(request: Request): string | undefined {
  const rawCookie = request.headers.cookie;
  const prefix = `${SESSION_COOKIE}=`;
  return rawCookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export function requireLoadRequestOrigin(request: Request): void {
  const configuredOrigin =
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001';
  let origin: string;
  try {
    origin = new URL(configuredOrigin).origin;
  } catch {
    throw new ServiceUnavailableException('FRONTEND_ORIGIN is invalid');
  }
  if (request.headers.origin !== origin) {
    throw new UnauthorizedException('Request origin is not allowed');
  }
}

@Injectable()
export class LoadAuthService {
  constructor(
    @InjectRepository(LoadUser)
    private readonly users: Repository<LoadUser>,
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
  ) {}

  async login(
    username: string,
    password: string,
    response: Response,
  ): Promise<AuthenticatedLoadUser> {
    await this.bootstrapAdmin();
    const user = await this.users.findOne({ where: { username, active: true } });
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    this.setSessionCookie(user, expires, response);
    return this.publicUser(user);
  }

  async currentUser(request: Request): Promise<AuthenticatedLoadUser> {
    const token = cookieValue(request);
    if (!token) throw new UnauthorizedException('Load board login required');
    const [id, expiryText, fingerprint, signature, ...extra] = token.split('.');
    const expires = Number(expiryText);
    const now = Math.floor(Date.now() / 1000);
    if (
      extra.length ||
      !id ||
      !expiryText ||
      !fingerprint ||
      !signature ||
      !/^[a-f0-9]{64}$/i.test(fingerprint) ||
      !Number.isSafeInteger(expires) ||
      expires <= now ||
      expires > now + SESSION_TTL_SECONDS
    ) {
      throw new UnauthorizedException('Load board session expired');
    }
    const payload = `${id}.${expiryText}.${fingerprint}`;
    if (!safeEqual(signature, sessionSignature(payload))) {
      throw new UnauthorizedException('Invalid load board session');
    }
    const user = await this.users.findOne({
      where: { id, active: true },
    });
    if (!user) throw new UnauthorizedException('Load board account is inactive');
    if (!safeEqual(fingerprint, passwordFingerprint(user.passwordHash))) {
      throw new UnauthorizedException('Load board session is no longer valid');
    }
    return this.publicUser(user);
  }

  logout(response: Response): void {
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/loads',
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    response: Response,
  ): Promise<AuthenticatedLoadUser> {
    const user = await this.users.findOne({ where: { id: userId, active: true } });
    if (!user || !(await this.verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (await this.verifyPassword(newPassword, user.passwordHash)) {
      throw new BadRequestException('New password must differ from the current password');
    }
    user.passwordHash = await this.hashPassword(newPassword);
    await this.users.save(user);
    this.setSessionCookie(user, Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS, response);
    return this.publicUser(user);
  }

  async createUser(
    username: string,
    password: string,
    role: LoadUserRole,
    driverId?: number,
  ): Promise<AuthenticatedLoadUser> {
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
      throw new ServiceUnavailableException(
        'Username must be 3-40 characters and use letters, numbers, dot, underscore, or hyphen',
      );
    }
    const existing = await this.users.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('Username is already in use');
    }
    if (role === 'driver' && driverId === undefined) {
      throw new BadRequestException('A driver account must be linked to a driver');
    }
    if (role !== 'driver' && driverId !== undefined) {
      throw new BadRequestException('Only driver accounts can be linked to a driver');
    }
    if (driverId !== undefined) {
      const driver = await this.drivers.findOne({ where: { id: driverId } });
      if (!driver) throw new NotFoundException('Driver not found');
      const linkedUser = await this.users.findOne({ where: { driverId } });
      if (linkedUser) {
        throw new ConflictException('This driver already has a login account');
      }
    }
    const user = this.users.create({
      username,
      passwordHash: await this.hashPassword(password),
      role,
      driverId: driverId ?? null,
    });
    return this.publicUser(await this.users.save(user));
  }

  async listUsers(): Promise<AuthenticatedLoadUser[]> {
    return (await this.users.find({ order: { createdAt: 'ASC' } })).map(
      (user) => this.publicUser(user),
    );
  }

  async linkDriverAccount(
    userId: string,
    driverId: number | null,
  ): Promise<AuthenticatedLoadUser> {
    const user = await this.users.findOne({ where: { id: userId, active: true } });
    if (!user) throw new NotFoundException('Load-board account not found');
    if (user.role !== 'driver') {
      throw new BadRequestException('Only driver accounts can be linked to a driver');
    }
    if (driverId !== null) {
      const driver = await this.drivers.findOne({ where: { id: driverId } });
      if (!driver) throw new NotFoundException('Driver not found');
      const linkedUser = await this.users.findOne({ where: { driverId } });
      if (linkedUser && linkedUser.id !== user.id) {
        throw new ConflictException('This driver already has a login account');
      }
    }
    user.driverId = driverId;
    return this.publicUser(await this.users.save(user));
  }

  async updateUserRole(
    userId: string,
    role: LoadUserRole,
    driverId: number | undefined,
    requestingUserId: string,
  ): Promise<AuthenticatedLoadUser> {
    if (userId === requestingUserId) {
      throw new UnauthorizedException('You cannot change your own role');
    }
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.active) {
      throw new BadRequestException('Inactive accounts cannot be updated');
    }

    if (role === 'driver') {
      const linkedDriverId = driverId ?? user.driverId;
      if (linkedDriverId === null || linkedDriverId === undefined) {
        throw new BadRequestException('A driver account must be linked to a driver');
      }
      const driver = await this.drivers.findOne({
        where: { id: linkedDriverId },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      const linkedUser = await this.users.findOne({
        where: { driverId: linkedDriverId },
      });
      if (linkedUser && linkedUser.id !== user.id) {
        throw new ConflictException('This driver already has a login account');
      }
      user.driverId = linkedDriverId;
    } else {
      user.driverId = null;
    }

    const isPrivilegedRole = user.role === 'admin' || user.role === 'owner';
    const isNextRolePrivileged = role === 'admin' || role === 'owner';
    if (isPrivilegedRole && !isNextRolePrivileged) {
      const privilegedCount = await this.users.count({
        where: [
          { active: true, role: 'admin' },
          { active: true, role: 'owner' },
        ],
      });
      if (privilegedCount <= 1) {
        throw new BadRequestException(
          'At least one active admin or owner account must remain',
        );
      }
    }

    user.role = role;
    return this.publicUser(await this.users.save(user));
  }

  async deactivateUser(id: string, requestingUserId: string): Promise<void> {
    if (id === requestingUserId) {
      throw new UnauthorizedException('You cannot deactivate your own account');
    }
    const user = await this.users.findOne({ where: { id, active: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin' || user.role === 'owner') {
      const privilegedCount = await this.users.count({
        where: [
          { active: true, role: 'admin' },
          { active: true, role: 'owner' },
        ],
      });
      if (privilegedCount <= 1) {
        throw new BadRequestException(
          'At least one active admin or owner account must remain',
        );
      }
    }
    user.active = false;
    await this.users.save(user);
  }

  private async bootstrapAdmin(): Promise<void> {
    const username = process.env.LOADS_ADMIN_USERNAME;
    const password = process.env.LOADS_ADMIN_PASSWORD;
    if (!username || !password || password.length < 16) {
      throw new ServiceUnavailableException(
        'Configure LOADS_ADMIN_USERNAME and LOADS_ADMIN_PASSWORD (at least 16 characters) to bootstrap the initial load-board administrator',
      );
    }
    requiredSecret('LOADS_SESSION_SECRET', 32);
    if (await this.users.count() > 0) return;
    const user = this.users.create({
      username,
      passwordHash: await this.hashPassword(password),
      role: 'admin',
    });
    await this.users.save(user);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt.toString('hex')}.${derived.toString('hex')}`;
  }

  private setSessionCookie(
    user: LoadUser,
    expires: number,
    response: Response,
  ): void {
    const fingerprint = passwordFingerprint(user.passwordHash);
    const payload = `${user.id}.${expires}.${fingerprint}`;
    response.cookie(SESSION_COOKIE, `${payload}.${sessionSignature(payload)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/loads',
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
  }

  private async verifyPassword(
    password: string,
    stored: string,
  ): Promise<boolean> {
    const [saltHex, expectedHex, ...extra] = stored.split('.');
    if (
      extra.length ||
      !saltHex ||
      !expectedHex ||
      !/^[a-f0-9]{32}$/i.test(saltHex) ||
      !/^[a-f0-9]{128}$/i.test(expectedHex)
    ) {
      return false;
    }
    const actual = (await scrypt(
      password,
      Buffer.from(saltHex, 'hex'),
      64,
    )) as Buffer;
    return safeEqual(actual.toString('hex'), expectedHex);
  }

  private publicUser(user: LoadUser): AuthenticatedLoadUser {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      driverId: user.driverId ?? null,
      active: user.active,
    };
  }
}
