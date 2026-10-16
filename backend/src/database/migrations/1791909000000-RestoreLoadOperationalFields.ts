import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class RestoreLoadOperationalFields1791909000000 implements MigrationInterface {
  name = 'RestoreLoadOperationalFields1791909000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const loadTable = await queryRunner.getTable('loads');
    if (!loadTable) {
      throw new Error(
        'Cannot restore load fields because the loads table is missing',
      );
    }

    const columns = [
      new TableColumn({
        name: 'origin',
        type: 'character varying',
        isNullable: false,
        default: "''",
      }),
      new TableColumn({
        name: 'destination',
        type: 'character varying',
        isNullable: false,
        default: "''",
      }),
      new TableColumn({
        name: 'rate',
        type: 'numeric',
        precision: 10,
        scale: 2,
        isNullable: false,
        default: '0',
      }),
      new TableColumn({
        name: 'driverId',
        type: 'integer',
        isNullable: true,
      }),
    ];

    for (const column of columns) {
      if (!(await queryRunner.hasColumn('loads', column.name))) {
        await queryRunner.addColumn('loads', column);
      }
    }

    if (
      (await queryRunner.hasTable('drivers')) &&
      !(await queryRunner.getTable('loads'))?.foreignKeys.some((foreignKey) =>
        foreignKey.columnNames.includes('driverId'),
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

    for (const column of ['driverId', 'rate', 'destination', 'origin']) {
      if (await queryRunner.hasColumn('loads', column)) {
        await queryRunner.dropColumn('loads', column);
      }
    }
  }
}
