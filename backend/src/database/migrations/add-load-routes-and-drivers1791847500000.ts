import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddLoadRoutesAndDrivers1791847500000
  implements MigrationInterface
{
  name = 'AddLoadRoutesAndDrivers1791847500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('loads'))) {
      return;
    }

    if (!(await queryRunner.hasColumn('loads', 'origin'))) {
      await queryRunner.query(
        'ALTER TABLE "loads" ADD COLUMN "origin" character varying',
      );
    }
    if (!(await queryRunner.hasColumn('loads', 'destination'))) {
      await queryRunner.query(
        'ALTER TABLE "loads" ADD COLUMN "destination" character varying',
      );
    }
    if (!(await queryRunner.hasColumn('loads', 'driverId'))) {
      await queryRunner.query(
        'ALTER TABLE "loads" ADD COLUMN "driverId" integer',
      );
    }

    const hasPickupLocation = await queryRunner.hasColumn(
      'loads',
      'pickup_location',
    );
    const hasDeliveryLocation = await queryRunner.hasColumn(
      'loads',
      'delivery_location',
    );

    if (hasPickupLocation) {
      await queryRunner.query(
        'UPDATE "loads" SET "origin" = COALESCE("origin", "pickup_location")',
      );
    }
    if (hasDeliveryLocation) {
      await queryRunner.query(
        'UPDATE "loads" SET "destination" = COALESCE("destination", "delivery_location")',
      );
    }

    await queryRunner.query(
      `UPDATE "loads"
       SET "origin" = COALESCE("origin", ''),
           "destination" = COALESCE("destination", '')`,
    );
    await queryRunner.query(
      'ALTER TABLE "loads" ALTER COLUMN "origin" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "loads" ALTER COLUMN "destination" SET NOT NULL',
    );

    for (const column of [
      'broker',
      'pickup_location',
      'delivery_location',
      'pickup_date',
      'delivery_date',
    ]) {
      if (await queryRunner.hasColumn('loads', column)) {
        await queryRunner.query(
          `ALTER TABLE "loads" ALTER COLUMN "${column}" DROP NOT NULL`,
        );
      }
    }

    if (
      (await queryRunner.hasTable('drivers')) &&
      !(await queryRunner.getTable('loads'))?.foreignKeys.some(
        (foreignKey) => foreignKey.columnNames.includes('driverId'),
      )
    ) {
      await queryRunner.createForeignKey(
        'loads',
        new TableForeignKey({
          columnNames: ['driverId'],
          referencedTableName: 'drivers',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const loadTable = await queryRunner.getTable('loads');
    const driverForeignKey = loadTable?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('driverId'),
    );
    if (driverForeignKey) {
      await queryRunner.dropForeignKey('loads', driverForeignKey);
    }

    for (const column of ['driverId', 'origin', 'destination']) {
      if (await queryRunner.hasColumn('loads', column)) {
        await queryRunner.query(
          `ALTER TABLE "loads" DROP COLUMN "${column}"`,
        );
      }
    }
  }
}
