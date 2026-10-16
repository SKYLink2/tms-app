import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class BackfillLoadNumbers1791847200000 implements MigrationInterface {
  name = 'BackfillLoadNumbers1791847200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('loads'))) {
      await queryRunner.createTable(
        new Table({
          name: 'loads',
          columns: [
            {
              name: 'id',
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'load_number', type: 'character varying', isNullable: true },
            { name: 'broker', type: 'character varying' },
            { name: 'customer', type: 'character varying', isNullable: true },
            { name: 'pickup_location', type: 'character varying' },
            { name: 'delivery_location', type: 'character varying' },
            { name: 'pickup_date', type: 'timestamp without time zone' },
            { name: 'delivery_date', type: 'timestamp without time zone' },
            { name: 'rate', type: 'numeric', precision: 10, scale: 2 },
            { name: 'miles', type: 'integer', isNullable: true },
            { name: 'weight', type: 'integer', isNullable: true },
            { name: 'commodity', type: 'character varying', isNullable: true },
            {
              name: 'status',
              type: 'character varying',
              default: "'Available'",
            },
            { name: 'notes', type: 'character varying', isNullable: true },
          ],
        }),
      );
    } else if (!(await queryRunner.hasColumn('loads', 'load_number'))) {
      await queryRunner.addColumn(
        'loads',
        new TableColumn({
          name: 'load_number',
          type: 'character varying',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(
      `UPDATE "loads"
       SET "load_number" = 'LEGACY-' || "id"::text
       WHERE "load_number" IS NULL`,
    );
    await queryRunner.query(
      'ALTER TABLE "loads" ALTER COLUMN "load_number" SET NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loads_load_number_unique" ON "loads" ("load_number")',
    );

    if (!(await queryRunner.hasTable('drivers'))) {
      await queryRunner.createTable(
        new Table({
          name: 'drivers',
          columns: [
            {
              name: 'id',
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'name', type: 'character varying' },
            { name: 'phone', type: 'character varying', isNullable: true },
            { name: 'email', type: 'character varying', isNullable: true },
            {
              name: 'status',
              type: 'character varying',
              default: "'Active'",
            },
            {
              name: 'truck_number',
              type: 'character varying',
              isNullable: true,
            },
            {
              name: 'trailer_number',
              type: 'character varying',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp without time zone',
              default: 'now()',
            },
            {
              name: 'updated_at',
              type: 'timestamp without time zone',
              default: 'now()',
            },
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('loads')) {
      await queryRunner.query(
        'DROP INDEX IF EXISTS "IDX_loads_load_number_unique"',
      );
      await queryRunner.query(
        'ALTER TABLE "loads" ALTER COLUMN "load_number" DROP NOT NULL',
      );
    }
  }
}
