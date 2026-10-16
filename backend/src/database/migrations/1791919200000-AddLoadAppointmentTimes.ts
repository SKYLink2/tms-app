import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLoadAppointmentTimes1791919200000
  implements MigrationInterface
{
  name = 'AddLoadAppointmentTimes1791919200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const name of ['pickupTime', 'deliveryTime']) {
      if (!(await queryRunner.hasColumn('loads', name))) {
        await queryRunner.addColumn(
          'loads',
          new TableColumn({
            name,
            type: 'character varying',
            isNullable: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of ['deliveryTime', 'pickupTime']) {
      if (await queryRunner.hasColumn('loads', name)) {
        await queryRunner.dropColumn('loads', name);
      }
    }
  }
}
