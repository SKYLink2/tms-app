import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNotifications1791924000000 implements MigrationInterface {
  name = 'CreateNotifications1791924000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('notifications')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'title', type: 'character varying' },
          { name: 'message', type: 'character varying' },
          {
            name: 'type',
            type: 'character varying',
            default: "'INFO'",
          },
          {
            name: 'targetRole',
            type: 'character varying',
            isNullable: true,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp without time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('notifications')) {
      await queryRunner.dropTable('notifications');
    }
  }
}
