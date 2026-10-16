import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddLoadScheduleDetails1791918600000
  implements MigrationInterface
{
  name = 'AddLoadScheduleDetails1791918600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      new TableColumn({
        name: 'dispatcherName',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'pickupDate',
        type: 'date',
        isNullable: true,
      }),
      new TableColumn({
        name: 'deliveryDate',
        type: 'date',
        isNullable: true,
      }),
    ]) {
      if (!(await queryRunner.hasColumn('loads', column.name))) {
        await queryRunner.addColumn('loads', column);
      }
    }

    if (await queryRunner.hasColumn('loads', 'createdById')) {
      await queryRunner.query(`
        UPDATE "loads" AS load
        SET "dispatcherName" = user_account."username"
        FROM "load_users" AS user_account
        WHERE load."createdById" = user_account."id"
          AND load."dispatcherName" IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['deliveryDate', 'pickupDate', 'dispatcherName']) {
      if (await queryRunner.hasColumn('loads', column)) {
        await queryRunner.dropColumn('loads', column);
      }
    }
  }
}
