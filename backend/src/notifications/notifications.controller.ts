import { Controller, Get, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js'; // 👈 Flat import

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll() {
    return this.notificationsService.findAll();
  }

  @Post('read-all')
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}