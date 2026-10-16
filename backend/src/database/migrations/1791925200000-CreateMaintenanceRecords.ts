import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMaintenanceRecords1791925200000
  implements MigrationInterface
{
  name = 'CreateMaintenanceRecords1791925200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('maintenance_records')) return;

    await queryRunner.createTable(
      new Table({
        name: 'maintenance_records',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'equipmentId', type: 'uuid' },
          { name: 'category', type: 'character varying' },
          { name: 'serviceDescription', type: 'character varying' },
          {
            name: 'vendorName',
            type: 'character varying',
            isNullable: true,
          },
          {
            name: 'vendorLocation',
            type: 'character varying',
            isNullable: true,
          },
          { name: 'odometerReading', type: 'integer', isNullable: true },
          {
            name: 'laborCost',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'partsCost',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalCost',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
          },
          { name: 'invoiceUrl', type: 'character varying', isNullable: true },
          {
            name: 'invoiceNumber',
            type: 'character varying',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'character varying',
            default: "'COMPLETED'",
          },
          { name: 'serviceDate', type: 'date' },
          { name: 'nextScheduledDate', type: 'date', isNullable: true },
          {
            name: 'nextScheduledMileage',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'performedByUserId',
            type: 'character varying',
            isNullable: true,
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
        foreignKeys: [
          {
            columnNames: ['equipmentId'],
            referencedTableName: 'equipment',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_maintenance_records_equipment_service_date',
            columnNames: ['equipmentId', 'serviceDate'],
          },
          {
            name: 'IDX_maintenance_records_status_next_date',
            columnNames: ['status', 'nextScheduledDate'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('maintenance_records')) {
      await queryRunner.dropTable('maintenance_records');
    }
  }
}
