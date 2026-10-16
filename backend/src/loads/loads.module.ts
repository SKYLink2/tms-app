import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoadsController } from './loads.controller.js';
import { LoadsService } from './loads.service.js';
import { Load } from './load.entity.js';
import { LoadUser } from './load-user.entity.js';
import { Driver } from '../drivers/entities/driver.entity.js';
import { LoadAuthService } from './load-auth.service.js';
import { LoadAuthGuard } from './load-auth.guard.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Load, LoadUser, Driver]),
    NotificationsModule,
  ],
  controllers: [LoadsController],
  providers: [LoadsService, LoadAuthService, LoadAuthGuard],
  exports: [LoadAuthGuard, LoadAuthService],
})
export class LoadsModule {}