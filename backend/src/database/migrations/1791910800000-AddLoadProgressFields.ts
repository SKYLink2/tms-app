import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLoadProgressFields1791910800000 implements MigrationInterface {
  name = 'AddLoadProgressFields1791910800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('loads'))) {
      throw new Error(
        'Cannot add load progress fields because the loads table is missing',
      );
    }

    for (const column of [
      new TableColumn({
        name: 'broker',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'trailerSealPhotoUrl',
        type: 'character varying',
        isNullable: true,
      }),
    ]) {
      if (!(await queryRunner.hasColumn('loads', column.name))) {
        await queryRunner.addColumn('loads', column);
      }
    }

    if (await queryRunner.hasColumn('loads', 'notes')) {
      await queryRunner.query(`
        UPDATE "loads"
        SET "notes" = COALESCE(
          (
            SELECT jsonb_agg(
              (note - 'timestamp') ||
              jsonb_build_object(
                'createdAt',
                COALESCE(note->>'createdAt', note->>'timestamp', now()::text)
              )
            )
            FROM jsonb_array_elements("loads"."notes") AS entries(note)
          ),
          '[]'::jsonb
        )
        WHERE jsonb_typeof("notes") = 'array'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['trailerSealPhotoUrl', 'broker']) {
      if (await queryRunner.hasColumn('loads', column)) {
        await queryRunner.dropColumn('loads', column);
      }
    }
  }
}
