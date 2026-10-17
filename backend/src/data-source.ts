import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Driver } from './drivers/entities/driver.entity.js';
import { Equipment } from './equipment/entities/equipment.entity.js';
import { Device } from './equipment/entities/device.entity.js';
import { EquipmentAssignment } from './equipment/entities/equipment-assignment.entity.js';
import { Settlement } from './accounting/entities/settlement.entity.js';
import { FuelExpense } from './accounting/entities/fuel-expense.entity.js';
import { FuelTransaction } from './accounting/entities/fuel-transaction.entity.js';
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
import { Load } from './loads/load.entity.js';
import { LoadUser } from './loads/load-user.entity.js';
import { AddLoadStagingAndUsers1791918000000 } from './database/migrations/1791918000000-AddLoadStagingAndUsers.js';
import { AddLoadScheduleDetails1791918600000 } from './database/migrations/1791918600000-AddLoadScheduleDetails.js';
import { AddLoadAppointmentTimes1791919200000 } from './database/migrations/1791919200000-AddLoadAppointmentTimes.js';
import { LinkComplianceAndDrivers1791922800000 } from './database/migrations/1791922800000-LinkComplianceAndDrivers.js';
import { CreateNotifications1791924000000 } from './database/migrations/1791924000000-CreateNotifications.js';
import { Notification } from './notifications/notification.entity.js';
import { CreateEquipmentAssignments1791924600000 } from './database/migrations/1791924600000-CreateEquipmentAssignments.js';
import { MaintenanceRecord } from './equipment/entities/maintenance-record.entity.js';
import { CreateMaintenanceRecords1791925200000 } from './database/migrations/1791925200000-CreateMaintenanceRecords.js';
import { CreateFuelTransactions1791925800000 } from './database/migrations/1791925800000-CreateFuelTransactions.js';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(requiredEnv('DB_PORT'));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be a valid TCP port');
}

export default new DataSource({
  type: 'postgres',
  host: requiredEnv('DB_HOST'),
  port,
  username: requiredEnv('DB_USER'),
  password: requiredEnv('DB_PASSWORD'),
  database: requiredEnv('DB_NAME'),
  entities: [
    Load,
    LoadUser,
    Driver,
    Equipment,
    Device,
    EquipmentAssignment,
    MaintenanceRecord,
    Settlement,
    FuelExpense,
    FuelTransaction,
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
    CreateNotifications1791924000000,
    CreateEquipmentAssignments1791924600000,
    CreateMaintenanceRecords1791925200000,
    CreateFuelTransactions1791925800000,
  ],
  synchronize: false,
});
