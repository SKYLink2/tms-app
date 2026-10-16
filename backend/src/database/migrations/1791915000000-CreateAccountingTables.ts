import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAccountingTables1791915000000
  implements MigrationInterface
{
  name = 'CreateAccountingTables1791915000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('settlements'))) {
      await queryRunner.createTable(
        new Table({
          name: 'settlements',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            { name: 'driverName', type: 'character varying' },
            { name: 'weekEnding', type: 'date' },
            { name: 'grossRevenue', type: 'numeric', precision: 10, scale: 2 },
            {
              name: 'driverSplitPercentage',
              type: 'integer',
              default: '70',
            },
            { name: 'driverGrossPay', type: 'numeric', precision: 10, scale: 2 },
            {
              name: 'fuelAdvances',
              type: 'numeric',
              precision: 10,
              scale: 2,
              default: '0',
            },
            {
              name: 'insuranceOrOtherDeductions',
              type: 'numeric',
              precision: 10,
              scale: 2,
              default: '0',
            },
            { name: 'netPayout', type: 'numeric', precision: 10, scale: 2 },
            {
              name: 'status',
              type: 'character varying',
              default: "'Draft'",
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

    if (!(await queryRunner.hasTable('fuel_expenses'))) {
      await queryRunner.createTable(
        new Table({
          name: 'fuel_expenses',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            { name: 'truckUnitNumber', type: 'character varying' },
            {
              name: 'driverName',
              type: 'character varying',
              isNullable: true,
            },
            { name: 'gallons', type: 'numeric', precision: 10, scale: 2 },
            { name: 'totalCost', type: 'numeric', precision: 10, scale: 2 },
            { name: 'purchaseDate', type: 'timestamp without time zone' },
            {
              name: 'location',
              type: 'character varying',
              isNullable: true,
            },
            {
              name: 'createdAt',
              type: 'timestamp without time zone',
              default: 'now()',
            },
          ],
        }),
        true,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('fuel_expenses')) {
      await queryRunner.dropTable('fuel_expenses');
    }
    if (await queryRunner.hasTable('settlements')) {
      await queryRunner.dropTable('settlements');
    }
  }
}
