import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddLoadStagingAndUsers1791918000000
  implements MigrationInterface
{
  name = 'AddLoadStagingAndUsers1791918000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('load_users'))) {
      await queryRunner.createTable(
        new Table({
          name: 'load_users',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            { name: 'username', type: 'character varying', isUnique: true },
            { name: 'passwordHash', type: 'character varying' },
            { name: 'role', type: 'character varying' },
            { name: 'active', type: 'boolean', default: true },
            {
              name: 'createdAt',
              type: 'timestamp without time zone',
              default: 'now()',
            },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('load_number_counters'))) {
      await queryRunner.createTable(
        new Table({
          name: 'load_number_counters',
          columns: [
            { name: 'scope', type: 'character varying', isPrimary: true },
            { name: 'nextValue', type: 'integer' },
          ],
        }),
      );
    }

    for (const column of [
      new TableColumn({
        name: 'draftLoadNumber',
        type: 'character varying',
        isNullable: true,
        isUnique: true,
      }),
      new TableColumn({
        name: 'companyLoadNumber',
        type: 'character varying',
        isNullable: true,
        isUnique: true,
      }),
      new TableColumn({
        name: 'createdById',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'truckUnitNumber',
        type: 'character varying',
        isNullable: true,
      }),
    ]) {
      if (!(await queryRunner.hasColumn('loads', column.name))) {
        await queryRunner.addColumn('loads', column);
      }
    }

    if (await queryRunner.hasColumn('loads', 'loadNumber')) {
      await queryRunner.query(`
        WITH numbered AS (
          SELECT
            load."id",
            EXTRACT(YEAR FROM COALESCE(load."createdAt", now()))::integer AS year,
            ROW_NUMBER() OVER (
              PARTITION BY EXTRACT(YEAR FROM COALESCE(load."createdAt", now()))
              ORDER BY load."createdAt", load."id"
            ) AS sequence,
            driver."truck_number" AS driver_truck_number
          FROM "loads" AS load
          LEFT JOIN "drivers" AS driver ON driver."id" = load."driverId"
          WHERE load."companyLoadNumber" IS NULL
        )
        UPDATE "loads" AS load
        SET
          "companyLoadNumber" = 'LD-' || numbered.year::text || '-' ||
            LPAD(numbered.sequence::text, 4, '0'),
          "truckUnitNumber" = COALESCE(
            load."truckUnitNumber",
            numbered.driver_truck_number
          ),
          "status" = CASE
            WHEN UPPER(REPLACE(load."status", ' ', '_')) IN ('IN_TRANSIT', 'AT_PICKUP', 'LOADED', 'AT_DELIVERY', 'DELIVERED', 'INVOICED', 'COMPLETED')
              THEN UPPER(REPLACE(load."status", ' ', '_'))
            WHEN UPPER(REPLACE(load."status", ' ', '_')) = 'DISPATCHED'
              THEN 'DISPATCHED'
            WHEN load."driverId" IS NOT NULL AND COALESCE(load."truckUnitNumber", numbered.driver_truck_number) IS NOT NULL
              THEN 'ASSIGNED'
            ELSE 'PENDING_ASSIGNMENT'
          END
        FROM numbered
        WHERE load."id" = numbered."id"
      `);
      await queryRunner.query(`
        ALTER TABLE "loads" ALTER COLUMN "loadNumber" DROP NOT NULL
      `);
    }

    const loadTable = await queryRunner.getTable('loads');
    if (
      loadTable &&
      !loadTable.foreignKeys.some((foreignKey) =>
        foreignKey.columnNames.includes('createdById'),
      )
    ) {
      await queryRunner.createForeignKey(
        'loads',
        new TableForeignKey({
          columnNames: ['createdById'],
          referencedTableName: 'load_users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO "load_number_counters" ("scope", "nextValue")
      SELECT
        'company:' || split_part("companyLoadNumber", '-', 2),
        COALESCE(MAX(NULLIF(split_part("companyLoadNumber", '-', 3), '')::integer), 0)
      FROM "loads"
      WHERE "companyLoadNumber" ~ '^LD-[0-9]{4}-[0-9]+$'
      GROUP BY split_part("companyLoadNumber", '-', 2)
      ON CONFLICT ("scope") DO UPDATE
      SET "nextValue" = GREATEST(
        "load_number_counters"."nextValue",
        EXCLUDED."nextValue"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasColumn('loads', 'companyLoadNumber')) &&
      (await queryRunner.hasColumn('loads', 'loadNumber'))
    ) {
      await queryRunner.query(`
        UPDATE "loads"
        SET "loadNumber" = COALESCE("companyLoadNumber", "loadNumber")
      `);
    }
    const loads = await queryRunner.getTable('loads');
    const createdByForeignKey = loads?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('createdById'),
    );
    if (createdByForeignKey) {
      await queryRunner.dropForeignKey('loads', createdByForeignKey);
    }
    for (const column of [
      'truckUnitNumber',
      'createdById',
      'companyLoadNumber',
      'draftLoadNumber',
    ]) {
      if (await queryRunner.hasColumn('loads', column)) {
        await queryRunner.dropColumn('loads', column);
      }
    }
    if (await queryRunner.hasColumn('loads', 'loadNumber')) {
      await queryRunner.query(`
        UPDATE "loads"
        SET "loadNumber" = 'LEGACY-' || "id"::text
        WHERE "loadNumber" IS NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "loads" ALTER COLUMN "loadNumber" SET NOT NULL
      `);
    }
    if (await queryRunner.hasTable('load_number_counters')) {
      await queryRunner.dropTable('load_number_counters');
    }
    if (await queryRunner.hasTable('load_users')) {
      await queryRunner.dropTable('load_users');
    }
  }
}
