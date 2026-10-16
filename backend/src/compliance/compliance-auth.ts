import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

export const COMPLIANCE_SESSION_COOKIE = 'focus_compliance_session';
export const COMPLIANCE_SESSION_TTL_SECONDS = 8 * 60 * 60;

function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new ServiceUnavailableException(
      `${name} must be configured with at least 32 characters`,
    );
  }
  return value;
}

export function complianceAdminCredentials(): {
  username: string;
  password: string;
} {
  const username = process.env.COMPLIANCE_ADMIN_USERNAME;
  const password = process.env.COMPLIANCE_ADMIN_PASSWORD;
  if (!username || !password || password.length < 16) {
    throw new ServiceUnavailableException(
      'Configure COMPLIANCE_ADMIN_USERNAME and a COMPLIANCE_ADMIN_PASSWORD of at least 16 characters',
    );
  }
  requiredSecret('COMPLIANCE_SESSION_SECRET');
  return { username, password };
}

export function complianceEncryptionKey(): Buffer {
  const key = process.env.COMPLIANCE_FILE_ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) {
    throw new ServiceUnavailableException(
      'COMPLIANCE_FILE_ENCRYPTION_KEY must be a 64-character hexadecimal key',
    );
  }
  return Buffer.from(key, 'hex');
}

function sessionSignature(expiry: string): Buffer {
  return createHmac('sha256', requiredSecret('COMPLIANCE_SESSION_SECRET'))
    .update(expiry)
    .digest();
}

function constantTimeMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function isValidAdminPassword(
  submittedUsername: string,
  submittedPassword: string,
): boolean {
  const credentials = complianceAdminCredentials();
  const usernameMatches = constantTimeMatch(
    submittedUsername,
    credentials.username,
  );
  const passwordMatches = constantTimeMatch(
    submittedPassword,
    credentials.password,
  );
  return (
    usernameMatches && passwordMatches
  );
}

export function setComplianceSessionCookie(response: Response): void {
  const expiry = String(
    Math.floor(Date.now() / 1000) + COMPLIANCE_SESSION_TTL_SECONDS,
  );
  const signature = sessionSignature(expiry).toString('hex');
  response.cookie(COMPLIANCE_SESSION_COOKIE, `${expiry}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/compliance',
    maxAge: COMPLIANCE_SESSION_TTL_SECONDS * 1000,
  });
}

export function clearComplianceSessionCookie(response: Response): void {
  response.clearCookie(COMPLIANCE_SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/compliance',
  });
}

function sessionFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const prefix = `${COMPLIANCE_SESSION_COOKIE}=`;
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie?.slice(prefix.length);
}

export function isAuthenticatedComplianceSession(
  request: Request,
): boolean {
  const value = sessionFromRequest(request);
  if (!value) return false;
  const [expiry, suppliedSignature, ...extra] = value.split('.');
  if (!expiry || !suppliedSignature || extra.length > 0 || !/^\d+$/.test(expiry)) {
    return false;
  }
  const expirySeconds = Number(expiry);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(expirySeconds) ||
    expirySeconds <= nowSeconds ||
    expirySeconds > nowSeconds + COMPLIANCE_SESSION_TTL_SECONDS
  ) {
    return false;
  }
  return constantTimeMatch(
    suppliedSignature,
    sessionSignature(expiry).toString('hex'),
  );
}

export function requireFrontendOrigin(request: Request): void {
  const configuredOrigin =
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001';
  let allowedOrigin: string;
  try {
    allowedOrigin = new URL(configuredOrigin).origin;
  } catch {
    throw new ServiceUnavailableException('FRONTEND_ORIGIN is invalid');
  }
  if (request.headers.origin !== allowedOrigin) {
    throw new ForbiddenException('Request origin is not allowed');
  }
}

export function requireComplianceSession(request: Request): void {
  if (!isAuthenticatedComplianceSession(request)) {
    throw new UnauthorizedException('Compliance administrator login required');
  }
}
