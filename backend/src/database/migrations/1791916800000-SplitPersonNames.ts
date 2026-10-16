import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

type NameColumns = {
  table: string;
  legacyColumn: string;
  legacyNullable: boolean;
};

const nameTables: NameColumns[] = [
  { table: 'drivers', legacyColumn: 'name', legacyNullable: false },
  { table: 'driver_compliance', legacyColumn: 'driverName', legacyNullable: false },
  { table: 'settlements', legacyColumn: 'driverName', legacyNullable: false },
  { table: 'fuel_expenses', legacyColumn: 'driverName', legacyNullable: true },
];

export class SplitPersonNames1791916800000 implements MigrationInterface {
  name = 'SplitPersonNames1791916800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, legacyColumn } of nameTables) {
      if (!(await queryRunner.hasTable(table))) continue;

      for (const column of ['firstName', 'middleName', 'lastName']) {
        if (!(await queryRunner.hasColumn(table, column))) {
          await queryRunner.addColumn(
            table,
            new TableColumn({
              name: column,
              type: 'character varying',
              isNullable: true,
            }),
          );
        }
      }

      if (await queryRunner.hasColumn(table, legacyColumn)) {
        const oldName = `"${legacyColumn}"`;
        await queryRunner.query(`
          WITH normalized_names AS (
            SELECT
              ctid,
              regexp_split_to_array(
                btrim(regexp_replace(COALESCE(${oldName}, ''), '\\s+', ' ', 'g')),
                ' '
              ) AS parts
            FROM "${table}"
          )
          UPDATE "${table}" AS target
          SET
            "firstName" = COALESCE(NULLIF(target."firstName", ''), parsed.parts[1], ''),
            "middleName" = COALESCE(
              NULLIF(target."middleName", ''),
              CASE
                WHEN cardinality(parsed.parts) > 2
                THEN array_to_string(parsed.parts[2:cardinality(parsed.parts) - 1], ' ')
                ELSE ''
              END
            ),
            "lastName" = COALESCE(
              NULLIF(target."lastName", ''),
              CASE
                WHEN cardinality(parsed.parts) > 1
                THEN parsed.parts[cardinality(parsed.parts)]
                ELSE ''
              END
            )
          FROM normalized_names AS parsed
          WHERE target.ctid = parsed.ctid
        `);

        await queryRunner.dropColumn(table, legacyColumn);
      }

      if (table !== 'fuel_expenses') {
        await queryRunner.changeColumn(
          table,
          'firstName',
          new TableColumn({
            name: 'firstName',
            type: 'character varying',
            isNullable: false,
          }),
        );
        await queryRunner.changeColumn(
          table,
          'lastName',
          new TableColumn({
            name: 'lastName',
            type: 'character varying',
            isNullable: false,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, legacyColumn, legacyNullable } of [...nameTables].reverse()) {
      if (!(await queryRunner.hasTable(table))) continue;
      if (!(await queryRunner.hasColumn(table, legacyColumn))) {
        await queryRunner.addColumn(
          table,
          new TableColumn({
            name: legacyColumn,
            type: 'character varying',
            isNullable: true,
          }),
        );
      }

      const hasFirstName = await queryRunner.hasColumn(table, 'firstName');
      const hasMiddleName = await queryRunner.hasColumn(table, 'middleName');
      const hasLastName = await queryRunner.hasColumn(table, 'lastName');
      if (hasFirstName && hasMiddleName && hasLastName) {
        await queryRunner.query(`
          UPDATE "${table}"
          SET "${legacyColumn}" = NULLIF(
            concat_ws(' ', "firstName", NULLIF("middleName", ''), "lastName"),
            ''
          )
        `);
      }

      if (!legacyNullable) {
        await queryRunner.changeColumn(
          table,
          legacyColumn,
          new TableColumn({
            name: legacyColumn,
            type: 'character varying',
            isNullable: false,
          }),
        );
      }

      for (const column of ['lastName', 'middleName', 'firstName']) {
        if (await queryRunner.hasColumn(table, column)) {
          await queryRunner.dropColumn(table, column);
        }
      }
    }
  }
}
