import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEquipmentAssignments1791924600000
  implements MigrationInterface
{
  name = 'CreateEquipmentAssignments1791924600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('devices'))) {
      await queryRunner.createTable(
        new Table({
          name: 'devices',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            { name: 'type', type: 'character varying' },
            { name: 'model', type: 'character varying', isNullable: true },
            {
              name: 'serialNumber',
              type: 'character varying',
              isNullable: true,
              isUnique: true,
            },
            {
              name: 'imei',
              type: 'character varying',
              isNullable: true,
              isUnique: true,
            },
            {
              name: 'phoneNumber',
              type: 'character varying',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'character varying',
              default: "'AVAILABLE'",
            },
            {
              name: 'createdAt',
              type: 'timestamp without time zone',
              default: 'now()',
            },
            {
              name: 'updatedAt',
              type: 'timestamp without time zone',
              default: 'now()',
            },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('equipment_assignments'))) {
      await queryRunner.createTable(
        new Table({
          name: 'equipment_assignments',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            { name: 'mode', type: 'character varying' },
            { name: 'primaryDriverId', type: 'integer' },
            {
              name: 'secondaryDriverId',
              type: 'integer',
              isNullable: true,
            },
            { name: 'truckId', type: 'uuid' },
            { name: 'trailerId', type: 'uuid', isNullable: true },
            { name: 'tabletId', type: 'uuid', isNullable: true },
            { name: 'eldDeviceId', type: 'uuid', isNullable: true },
            {
              name: 'status',
              type: 'character varying',
              default: "'ACTIVE'",
            },
            {
              name: 'assignedAt',
              type: 'timestamp without time zone',
              default: 'now()',
            },
            {
              name: 'releasedAt',
              type: 'timestamp without time zone',
              isNullable: true,
            },
          ],
          foreignKeys: [
            {
              columnNames: ['primaryDriverId'],
              referencedTableName: 'drivers',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
            {
              columnNames: ['secondaryDriverId'],
              referencedTableName: 'drivers',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
            {
              columnNames: ['truckId'],
              referencedTableName: 'equipment',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
            {
              columnNames: ['trailerId'],
              referencedTableName: 'equipment',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
            {
              columnNames: ['tabletId'],
              referencedTableName: 'devices',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
            {
              columnNames: ['eldDeviceId'],
              referencedTableName: 'devices',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            },
          ],
          checks: [
            {
              name: 'CHK_equipment_assignment_distinct_drivers',
              expression:
                '"primaryDriverId" <> "secondaryDriverId" OR "secondaryDriverId" IS NULL',
            },
          ],
          indices: [
            {
              name: 'IDX_equipment_assignment_primary_driver',
              columnNames: ['primaryDriverId'],
            },
            {
              name: 'IDX_equipment_assignment_secondary_driver',
              columnNames: ['secondaryDriverId'],
            },
          ],
        }),
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_active_assignment_truck" ON "equipment_assignments" ("truckId") WHERE "status" = 'ACTIVE'`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_active_assignment_trailer" ON "equipment_assignments" ("trailerId") WHERE "status" = 'ACTIVE' AND "trailerId" IS NOT NULL`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_active_assignment_tablet" ON "equipment_assignments" ("tabletId") WHERE "status" = 'ACTIVE' AND "tabletId" IS NOT NULL`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_active_assignment_eld" ON "equipment_assignments" ("eldDeviceId") WHERE "status" = 'ACTIVE' AND "eldDeviceId" IS NOT NULL`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_active_assignment_primary_driver" ON "equipment_assignments" ("primaryDriverId") WHERE "status" = 'ACTIVE'`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_active_assignment_secondary_driver" ON "equipment_assignments" ("secondaryDriverId") WHERE "status" = 'ACTIVE' AND "secondaryDriverId" IS NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('equipment_assignments')) {
      await queryRunner.dropTable('equipment_assignments');
    }
    if (await queryRunner.hasTable('devices')) {
      await queryRunner.dropTable('devices');
    }
  }
}
