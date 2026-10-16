import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDriverComplianceDetails1791916200000
  implements MigrationInterface
{
  name = 'AddDriverComplianceDetails1791916200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('driver_compliance'))) {
      throw new Error(
        'Cannot add compliance details because the driver_compliance table is missing',
      );
    }

    const columns = [
      new TableColumn({
        name: 'address',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'ssn',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'licenseIssueState',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'licenseClass',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'endorsements',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'idPhotoUrl',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'medicalCardUrl',
        type: 'character varying',
        isNullable: true,
      }),
      new TableColumn({
        name: 'w9FormUrl',
        type: 'character varying',
        isNullable: true,
      }),
    ];

    for (const column of columns) {
      if (!(await queryRunner.hasColumn('driver_compliance', column.name))) {
        await queryRunner.addColumn('driver_compliance', column);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      'w9FormUrl',
      'medicalCardUrl',
      'idPhotoUrl',
      'endorsements',
      'licenseClass',
      'licenseIssueState',
      'ssn',
      'address',
    ]) {
      if (await queryRunner.hasColumn('driver_compliance', column)) {
        await queryRunner.dropColumn('driver_compliance', column);
      }
    }
  }
}
