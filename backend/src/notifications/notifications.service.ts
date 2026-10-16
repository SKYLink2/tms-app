import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity.js'; // 👈 Flat import

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  async createNotification(title: string, message: string, type = 'INFO', targetRole = 'ALL') {
    const notif = this.notifRepo.create({ title, message, type, targetRole });
    return this.notifRepo.save(notif);
  }

  async findAll() {
    return this.notifRepo.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAllAsRead() {
    await this.notifRepo.update({}, { isRead: true });
    return { success: true };
  }
}