import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateFuelTransactions1712000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'fuel_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'driverId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'fuelCardAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'gallons',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'receiptAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'receiptImageUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'receiptGpsLocation',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'receiptTimestamp',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'odometerReading',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'calculatedMpg',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'reconciliationStatus',
            type: 'varchar',
            default: "'PENDING'",
          },
          {
            name: 'auditNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'truckId',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add foreign key relation to the equipment table
    await queryRunner.createForeignKey(
      'fuel_transactions',
      new TableForeignKey({
        columnNames: ['truckId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'equipment',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('fuel_transactions');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('truckId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('fuel_transactions', foreignKey);
    }
    await queryRunner.dropTable('fuel_transactions');
  }
}