import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ComplianceLoginDto } from './dto/compliance-login.dto.js';
import { CreateComplianceDto } from './dto/create-compliance.dto.js';
import { UpdateComplianceDto } from './dto/update-compliance.dto.js';
import { ComplianceService } from './compliance.service.js';
import {
  clearComplianceSessionCookie,
  isAuthenticatedComplianceSession,
  isValidAdminPassword,
  requireFrontendOrigin,
  setComplianceSessionCookie,
} from './compliance-auth.js';
import { ComplianceSessionGuard } from './compliance-session.guard.js';
import {
  complianceDocumentUploadOptions,
  isComplianceDocumentKind,
} from './compliance-upload.config.js';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() credentials: ComplianceLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    requireFrontendOrigin(request);
    if (!isValidAdminPassword(credentials.username, credentials.password)) {
      throw new UnauthorizedException('Invalid administrator credentials');
    }
    setComplianceSessionCookie(response);
    return { authenticated: true };
  }

  @Get('auth/session')
  session(@Req() request: Request) {
    return { authenticated: isAuthenticatedComplianceSession(request) };
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    requireFrontendOrigin(request);
    clearComplianceSessionCookie(response);
    return { success: true };
  }

  @Get()
  @UseGuards(ComplianceSessionGuard)
  findAll() {
    return this.complianceService.findAll();
  }

  @Post()
  @UseGuards(ComplianceSessionGuard)
  create(@Body() body: CreateComplianceDto) {
    return this.complianceService.create(body);
  }

  @Patch(':id')
  @UseGuards(ComplianceSessionGuard)
  update(@Param('id') id: string, @Body() body: UpdateComplianceDto) {
    return this.complianceService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(ComplianceSessionGuard)
  remove(@Param('id') id: string) {
    return this.complianceService.remove(id);
  }

  @Post(':id/documents/:kind')
  @UseGuards(ComplianceSessionGuard)
  @UseInterceptors(
    FileInterceptor('file', complianceDocumentUploadOptions),
  )
  uploadDocument(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!isComplianceDocumentKind(kind)) {
      throw new BadRequestException('Unsupported compliance document type');
    }
    return this.complianceService.uploadDocument(id, kind, file);
  }

  @Get(':id/documents/:kind/:documentId')
  @UseGuards(ComplianceSessionGuard)
  async getDocument(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    if (!isComplianceDocumentKind(kind)) {
      throw new BadRequestException('Unsupported compliance document type');
    }
    const document = await this.complianceService.getDocument(
      id,
      kind,
      documentId,
    );
    return response
      .type(document.contentType)
      .attachment(document.filename)
      .send(document.buffer);
  }
}
