import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFuelTransactions1791925800000
  implements MigrationInterface
{
  name = 'CreateFuelTransactions1791925800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fuel_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "truckId" uuid NOT NULL,
        "driverId" integer,
        "externalTransactionId" character varying,
        "fuelCardAmount" numeric(10,2),
        "gallons" numeric(10,2),
        "receiptGallons" numeric(10,2),
        "pricePerGallon" numeric(10,3),
        "stationName" character varying,
        "stationLocation" character varying,
        "stationGpsLocation" character varying,
        "cardTransactionAt" TIMESTAMP NOT NULL,
        "receiptAmount" numeric(10,2),
        "receiptImageUrl" character varying,
        "receiptGpsLocation" character varying,
        "receiptTimestamp" TIMESTAMP,
        "odometerReading" integer,
        "calculatedMpg" numeric(6,2),
        "reconciliationStatus" character varying NOT NULL DEFAULT 'PENDING',
        "auditNotes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fuel_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fuel_transactions_external_id" UNIQUE ("externalTransactionId"),
        CONSTRAINT "FK_fuel_transactions_truck" FOREIGN KEY ("truckId")
          REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_fuel_transactions_driver" FOREIGN KEY ("driverId")
          REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_fuel_transactions_truck_time" ON "fuel_transactions" ("truckId", "cardTransactionAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_fuel_transactions_status" ON "fuel_transactions" ("reconciliationStatus")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_fuel_transactions_status"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_fuel_transactions_truck_time"',
    );
    await queryRunner.query('DROP TABLE "fuel_transactions"');
  }
}
