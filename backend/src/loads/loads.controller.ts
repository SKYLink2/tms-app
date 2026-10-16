import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { LoadsService } from './loads.service.js';
import { Load } from './load.entity.js';
import { CreateLoadDto } from './create-load.dto.js';
import { CreateLoadNoteDto } from './create-load-note.dto.js';
import { UpdateLoadDto } from './update-load.dto.js';
import { UpdateLoadLifecycleDto } from './dto/update-load-lifecycle.dto.js';
import { UpdateDriverMilestoneDto } from './dto/update-driver-milestone.dto.js';
import { LoadAuthGuard, requireLoadRole } from './load-auth.guard.js';
import {
  LoadAuthService,
  requireLoadRequestOrigin,
} from './load-auth.service.js';
import {
  LoadLoginDto,
  ChangeLoadPasswordDto,
  CreateLoadUserDto,
  UpdateDriverAccountDto,
  UpdateLoadUserRoleDto,
} from './dto/load-auth.dto.js';
import { loadUploadOptions } from './load-upload.config.js';
import type { LoadFileKind } from './loads.service.js';

@Controller('loads')
export class LoadsController {
  constructor(
    private readonly loadsService: LoadsService,
    private readonly auth: LoadAuthService,
  ) {}

  @Post('auth/login')
  async login(
    @Body() dto: LoadLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    requireLoadRequestOrigin(request);
    return this.auth.login(dto.username, dto.password, response);
  }

  @Get('auth/session')
  async session(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.currentUser(request, response);
  }

  @Post('auth/logout')
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    requireLoadRequestOrigin(request);
    this.auth.logout(response);
    return { success: true };
  }

  @Patch('auth/password')
  @UseGuards(LoadAuthGuard)
  async changePassword(
    @Req() request: Request,
    @Body() dto: ChangeLoadPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.changePassword(
      request.loadUser!.id,
      dto.currentPassword,
      dto.newPassword,
      response,
    );
  }

  @Get('users')
  @UseGuards(LoadAuthGuard)
  async getUsers(@Req() request: Request) {
    requireLoadRole(request, 'admin', 'owner');
    return this.auth.listUsers();
  }

  @Post('users')
  @UseGuards(LoadAuthGuard)
  async createUser(@Req() request: Request, @Body() dto: CreateLoadUserDto) {
    requireLoadRole(request, 'admin', 'owner');
    return this.auth.createUser(
      dto.username,
      dto.password,
      dto.role,
      dto.driverId,
    );
  }

  @Patch('users/:id/role')
  @UseGuards(LoadAuthGuard)
  async updateUserRole(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() dto: UpdateLoadUserRoleDto,
  ) {
    requireLoadRole(request, 'admin', 'owner');
    return this.auth.updateUserRole(
      id,
      dto.role,
      dto.driverId,
      request.loadUser!.id,
    );
  }

  @Patch('users/:id/driver')
  @UseGuards(LoadAuthGuard)
  async linkDriverAccount(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() dto: UpdateDriverAccountDto,
  ) {
    requireLoadRole(request, 'admin', 'owner');
    return this.auth.linkDriverAccount(id, dto.driverId ?? null);
  }

  @Delete('users/:id')
  @UseGuards(LoadAuthGuard)
  async deactivateUser(@Param('id') id: string, @Req() request: Request) {
    requireLoadRole(request, 'admin', 'owner');
    await this.auth.deactivateUser(id, request.loadUser!.id);
    return { success: true };
  }

  @Get()
  @UseGuards(LoadAuthGuard)
  async getAllLoads(
    @Req() request: Request,
    @Query('stage') stage?: 'draft' | 'operational',
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.loadsService.findAll(
      { stage, status, search, page, limit },
      request.loadUser!,
    );
  }

  @Get(':id')
  @UseGuards(LoadAuthGuard)
  async getLoadById(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<Load> {
    return this.loadsService.findOne(id, request.loadUser!);
  }

  @Post()
  @UseGuards(LoadAuthGuard)
  async createLoad(
    @Body() dto: CreateLoadDto,
    @Req() request: Request,
  ): Promise<Load> {
    return this.loadsService.create(dto, request.loadUser!);
  }

  @Patch(':id')
  @UseGuards(LoadAuthGuard)
  async updateLoad(
    @Param('id') id: string,
    @Body() dto: UpdateLoadDto,
    @Req() request: Request,
  ): Promise<Load> {
    return this.loadsService.update(id, dto, request.loadUser!);
  }

  @Patch(':id/lifecycle')
  @UseGuards(LoadAuthGuard)
  async updateLoadLifecycle(
    @Param('id') id: string,
    @Body() dto: UpdateLoadLifecycleDto,
    @Req() request: Request,
  ): Promise<Load> {
    return this.loadsService.updateLifecycle(id, dto, request.loadUser!);
  }

  @Patch(':id/milestone')
  @UseGuards(LoadAuthGuard)
  async updateDriverMilestone(
    @Param('id') id: string,
    @Body() dto: UpdateDriverMilestoneDto,
    @Req() request: Request,
  ): Promise<Load> {
    return this.loadsService.updateDriverMilestone(
      id,
      dto.status,
      request.loadUser!,
    );
  }

  @Post(':id/notes')
  @UseGuards(LoadAuthGuard)
  async addLoadNote(
    @Param('id') id: string,
    @Body() note: CreateLoadNoteDto,
    @Req() request: Request,
  ): Promise<Load> {
    return this.loadsService.addNote(id, note, request.loadUser!);
  }

  @Post(':id/files/:kind')
  @UseGuards(LoadAuthGuard)
  @UseInterceptors(FileInterceptor('file', loadUploadOptions))
  async uploadLoadFile(
    @Param('id') id: string,
    @Param('kind') kind: LoadFileKind,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ): Promise<Load> {
    return this.loadsService.attachFile(
      id,
      kind,
      file,
      request.loadUser!,
    );
  }

  @Delete(':id')
  @UseGuards(LoadAuthGuard)
  async removeLoad(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.loadsService.remove(id, request.loadUser!);
  }
}
