import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoadsModule } from './loads/loads.module.js';

@Module({
  imports: [
    // 1. Подключаем ConfigModule глобально
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 2. Настраиваем TypeORM с использованием ConfigService
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // В продакшене лучше false, оставляем как было
      }),
    }),
    LoadsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}