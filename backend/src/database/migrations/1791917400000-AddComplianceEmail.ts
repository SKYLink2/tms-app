import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddComplianceEmail1791917400000 implements MigrationInterface {
  name = 'AddComplianceEmail1791917400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasTable('driver_compliance')) &&
      !(await queryRunner.hasColumn('driver_compliance', 'email'))
    ) {
      await queryRunner.addColumn(
        'driver_compliance',
        new TableColumn({
          name: 'email',
          type: 'character varying',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasTable('driver_compliance')) &&
      (await queryRunner.hasColumn('driver_compliance', 'email'))
    ) {
      await queryRunner.dropColumn('driver_compliance', 'email');
    }
  }
}
