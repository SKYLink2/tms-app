import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEquipment1791914400000 implements MigrationInterface {
  name = 'CreateEquipment1791914400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('equipment')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'equipment',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'type', type: 'character varying' },
          { name: 'unitNumber', type: 'character varying', isUnique: true },
          { name: 'vin', type: 'character varying', isNullable: true },
          { name: 'trailerType', type: 'character varying', isNullable: true },
          {
            name: 'status',
            type: 'character varying',
            default: "'AVAILABLE'",
          },
          { name: 'inventory', type: 'text', isArray: true, isNullable: true },
          { name: 'lastServiceDate', type: 'date', isNullable: true },
          { name: 'nextServiceDue', type: 'date', isNullable: true },
          { name: 'currentMileage', type: 'integer', isNullable: true },
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
    if (await queryRunner.hasTable('equipment')) {
      await queryRunner.dropTable('equipment');
    }
  }
}
