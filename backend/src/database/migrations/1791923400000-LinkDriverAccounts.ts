import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class LinkDriverAccounts1791923400000 implements MigrationInterface {
  name = 'LinkDriverAccounts1791923400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('load_users', 'driverId'))) {
      await queryRunner.addColumn(
        'load_users',
        new TableColumn({
          name: 'driverId',
          type: 'integer',
          isNullable: true,
        }),
      );
    }

    const table = await queryRunner.getTable('load_users');
    if (
      table &&
      !table.indices.some((index) => index.name === 'UQ_load_users_driverId')
    ) {
      await queryRunner.createIndex(
        'load_users',
        new TableIndex({
          name: 'UQ_load_users_driverId',
          columnNames: ['driverId'],
          isUnique: true,
          where: '"driverId" IS NOT NULL',
        }),
      );
    }

    const refreshedTable = await queryRunner.getTable('load_users');
    if (
      refreshedTable &&
      !refreshedTable.foreignKeys.some((foreignKey) =>
        foreignKey.columnNames.includes('driverId'),
      )
    ) {
      await queryRunner.createForeignKey(
        'load_users',
        new TableForeignKey({
          name: 'FK_load_users_driver',
          columnNames: ['driverId'],
          referencedTableName: 'drivers',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('load_users');
    const foreignKey = table?.foreignKeys.find((candidate) =>
      candidate.columnNames.includes('driverId'),
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('load_users', foreignKey);
    }

    const refreshedTable = await queryRunner.getTable('load_users');
    const uniqueIndex = refreshedTable?.indices.find(
      (index) => index.name === 'UQ_load_users_driverId',
    );
    if (uniqueIndex) {
      await queryRunner.dropIndex('load_users', uniqueIndex);
    }
    if (await queryRunner.hasColumn('load_users', 'driverId')) {
      await queryRunner.dropColumn('load_users', 'driverId');
    }
  }
}
