import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDriverCompliance1791915600000
  implements MigrationInterface
{
  name = 'CreateDriverCompliance1791915600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('driver_compliance')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'driver_compliance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'driverName', type: 'character varying' },
          {
            name: 'phone',
            type: 'character varying',
            isNullable: true,
          },
          {
            name: 'cdlNumber',
            type: 'character varying',
            isUnique: true,
          },
          { name: 'cdlExpiration', type: 'date' },
          { name: 'medicalCardExpiration', type: 'date' },
          {
            name: 'lastDrugTestDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'character varying',
            default: "'Compliant'",
          },
          {
            name: 'notes',
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
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('driver_compliance')) {
      await queryRunner.dropTable('driver_compliance');
    }
  }
}
