import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LoadsModule } from './loads/loads.module.js';
import { Load } from './loads/load.entity.js';
import { LoadUser } from './loads/load-user.entity.js';
import { DriversModule } from './drivers/drivers.module.js';
import { Driver } from './drivers/entities/driver.entity.js';
import { EquipmentModule } from './equipment/equipment.module.js';
import { Equipment } from './equipment/entities/equipment.entity.js';
import { AccountingModule } from './accounting/accounting.module.js';
import { Settlement } from './accounting/entities/settlement.entity.js';
import { FuelExpense } from './accounting/entities/fuel-expense.entity.js';
import { ComplianceModule } from './compliance/compliance.module.js';
import { DriverCompliance } from './compliance/entities/compliance.entity.js';
import { BackfillLoadNumbers1791847200000 } from './database/migrations/backfill-load-numbers1791847200000.js';
import { AddLoadRoutesAndDrivers1791847500000 } from './database/migrations/add-load-routes-and-drivers1791847500000.js';
import { AddLoadLifecycleFields1791908630639 } from './database/migrations/1791908630639-AddLoadLifecycleFields.js';
import { RestoreLoadOperationalFields1791909000000 } from './database/migrations/1791909000000-RestoreLoadOperationalFields.js';
import { AddLoadProgressFields1791910800000 } from './database/migrations/1791910800000-AddLoadProgressFields.js';
import { CreateEquipment1791914400000 } from './database/migrations/1791914400000-CreateEquipment.js';
import { CreateAccountingTables1791915000000 } from './database/migrations/1791915000000-CreateAccountingTables.js';
import { CreateDriverCompliance1791915600000 } from './database/migrations/1791915600000-CreateDriverCompliance.js';
import { AddDriverComplianceDetails1791916200000 } from './database/migrations/1791916200000-AddDriverComplianceDetails.js';
import { SplitPersonNames1791916800000 } from './database/migrations/1791916800000-SplitPersonNames.js';
import { AddComplianceEmail1791917400000 } from './database/migrations/1791917400000-AddComplianceEmail.js';
import { AddLoadStagingAndUsers1791918000000 } from './database/migrations/1791918000000-AddLoadStagingAndUsers.js';
import { AddLoadScheduleDetails1791918600000 } from './database/migrations/1791918600000-AddLoadScheduleDetails.js';
import { AddLoadAppointmentTimes1791919200000 } from './database/migrations/1791919200000-AddLoadAppointmentTimes.js';
import { LinkComplianceAndDrivers1791922800000 } from './database/migrations/1791922800000-LinkComplianceAndDrivers.js';
import { LinkDriverAccounts1791923400000 } from './database/migrations/1791923400000-LinkDriverAccounts.js';
import { CreateNotifications1791924000000 } from './database/migrations/1791924000000-CreateNotifications.js';
import { Notification } from './notifications/notification.entity.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        entities: [
          Load,
          LoadUser,
          Driver,
          Equipment,
          Settlement,
          FuelExpense,
          DriverCompliance,
          Notification,
        ],
        migrations: [
          BackfillLoadNumbers1791847200000,
          AddLoadRoutesAndDrivers1791847500000,
          AddLoadLifecycleFields1791908630639,
          RestoreLoadOperationalFields1791909000000,
          AddLoadProgressFields1791910800000,
          CreateEquipment1791914400000,
          CreateAccountingTables1791915000000,
          CreateDriverCompliance1791915600000,
          AddDriverComplianceDetails1791916200000,
          SplitPersonNames1791916800000,
          AddComplianceEmail1791917400000,
          AddLoadStagingAndUsers1791918000000,
          AddLoadScheduleDetails1791918600000,
          AddLoadAppointmentTimes1791919200000,
          LinkComplianceAndDrivers1791922800000,
          LinkDriverAccounts1791923400000,
          CreateNotifications1791924000000,
        ],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
    LoadsModule,
    DriversModule,
    EquipmentModule,
    AccountingModule,
    ComplianceModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
