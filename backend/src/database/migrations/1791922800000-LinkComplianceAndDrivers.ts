import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

interface DriverIdRow {
  id: number;
}

interface ComplianceRow {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  email: string | null;
}

export class LinkComplianceAndDrivers1791922800000
  implements MigrationInterface
{
  name = 'LinkComplianceAndDrivers1791922800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('driver_compliance', 'driverId'))) {
      await queryRunner.addColumn(
        'driver_compliance',
        new TableColumn({
          name: 'driverId',
          type: 'integer',
          isNullable: true,
        }),
      );
    }
    const driverIdIndexName = 'UQ_driver_compliance_driverId';
    const refreshedTable = await queryRunner.getTable('driver_compliance');
    if (
      refreshedTable &&
      !refreshedTable.indices.some((index) => index.name === driverIdIndexName)
    ) {
      await queryRunner.createIndex(
        'driver_compliance',
        new TableIndex({
        name: driverIdIndexName,
        columnNames: ['driverId'],
        isUnique: true,
        where: '"driverId" IS NOT NULL',
        }),
      );
    }

    const complianceTable = await queryRunner.getTable('driver_compliance');
    if (
      complianceTable &&
      !complianceTable.foreignKeys.some(
        (foreignKey) =>
          foreignKey.columnNames.length === 1 &&
          foreignKey.columnNames[0] === 'driverId',
      )
    ) {
      await queryRunner.createForeignKey(
        'driver_compliance',
        new TableForeignKey({
          name: 'FK_driver_compliance_driver',
          columnNames: ['driverId'],
          referencedTableName: 'drivers',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    const records: ComplianceRow[] = await queryRunner.query(`
      SELECT "id", "firstName", "middleName", "lastName", "phone", "email"
      FROM "driver_compliance"
      WHERE "driverId" IS NULL
      ORDER BY "createdAt", "id"
    `);

    for (const record of records) {
      let matches: DriverIdRow[] = [];
      if (record.email?.trim()) {
        matches = await queryRunner.query(
          `
            SELECT driver."id"
            FROM "drivers" driver
            WHERE driver."email" IS NOT NULL
              AND LOWER(BTRIM(driver."email")) = LOWER(BTRIM($1))
              AND LOWER(BTRIM(driver."firstName")) = LOWER(BTRIM($2))
              AND LOWER(BTRIM(driver."lastName")) = LOWER(BTRIM($3))
              AND NOT EXISTS (
                SELECT 1
                FROM "driver_compliance" linked
                WHERE linked."driverId" = driver."id"
              )
            ORDER BY driver."id"
            LIMIT 2
          `,
          [record.email, record.firstName, record.lastName],
        );
      }

      if (matches.length !== 1 && record.phone?.replace(/\D/g, '')) {
        matches = await queryRunner.query(
          `
            SELECT driver."id"
            FROM "drivers" driver
            WHERE LOWER(BTRIM(driver."firstName")) = LOWER(BTRIM($1))
              AND LOWER(BTRIM(driver."lastName")) = LOWER(BTRIM($2))
              AND regexp_replace(driver."phone", '[^0-9]', '', 'g') = $3
              AND (
                ($4::text IS NOT NULL AND LOWER(BTRIM(driver."middleName")) = LOWER(BTRIM($4)))
                OR ($4::text IS NULL AND (driver."middleName" IS NULL OR BTRIM(driver."middleName") = ''))
              )
              AND NOT EXISTS (
                SELECT 1
                FROM "driver_compliance" linked
                WHERE linked."driverId" = driver."id"
              )
            ORDER BY driver."id"
            LIMIT 2
          `,
          [
            record.firstName,
            record.lastName,
            record.phone.replace(/\D/g, ''),
            record.middleName?.trim() || null,
          ],
        );
      }

      let driverId: number;
      if (matches.length === 1) {
        driverId = matches[0].id;
      } else {
        const inserted: DriverIdRow[] = await queryRunner.query(
          `
            INSERT INTO "drivers"
              ("firstName", "middleName", "lastName", "phone", "email", "status")
            VALUES ($1, $2, $3, $4, $5, 'Active')
            RETURNING "id"
          `,
          [
            record.firstName,
            record.middleName,
            record.lastName,
            record.phone,
            record.email,
          ],
        );
        driverId = inserted[0].id;
      }

      await queryRunner.query(
        'UPDATE "driver_compliance" SET "driverId" = $1 WHERE "id" = $2',
        [driverId, record.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('driver_compliance');
    const uniqueIndex = table?.indices.find(
      (index) => index.name === 'UQ_driver_compliance_driverId',
    );
    if (uniqueIndex) {
      await queryRunner.dropIndex('driver_compliance', uniqueIndex);
    }
    const refreshedTable = await queryRunner.getTable('driver_compliance');
    const foreignKey = refreshedTable?.foreignKeys.find(
      (candidate) =>
        candidate.columnNames.length === 1 &&
        candidate.columnNames[0] === 'driverId',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('driver_compliance', foreignKey);
    }
    if (await queryRunner.hasColumn('driver_compliance', 'driverId')) {
      await queryRunner.dropColumn('driver_compliance', 'driverId');
    }
  }
}
