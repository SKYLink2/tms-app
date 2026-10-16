import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoadLifecycleFields1791908630639 implements MigrationInterface {
  name = 'AddLoadLifecycleFields1791908630639';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "loads" DROP CONSTRAINT "loads_assigned_driver_id_fkey"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP CONSTRAINT "FK_9126297ba89a3923624663e119b"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_loads_load_number_unique"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP CONSTRAINT "loads_status_check"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP CONSTRAINT "loads_load_number_key"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "broker"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "customer"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "pickup_location"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "delivery_location"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "pickup_date"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "delivery_date"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "rate"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "miles"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "weight"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "commodity"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "assigned_driver_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "origin"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "destination"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "driverId"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "loadNumber" character varying
        `);
    await queryRunner.query(`
            UPDATE "loads"
            SET "loadNumber" = COALESCE("load_number", 'LEGACY-' || "id"::text)
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" ALTER COLUMN "loadNumber" SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD CONSTRAINT "UQ_6719b7566488945ce633f67ecf7" UNIQUE ("loadNumber")
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "load_number"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "currentLocation" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "eta" TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "trailerSealNumber" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "rateConfirmationUrl" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "bolUrl" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "podUrl" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "receiptUrls" text array
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "securementPhotos" text array
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "createdAt" TIMESTAMP
        `);
    await queryRunner.query(`
            UPDATE "loads" SET "createdAt" = COALESCE("created_at", now())
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ALTER COLUMN "createdAt" SET NOT NULL,
            ALTER COLUMN "createdAt" SET DEFAULT now()
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "created_at"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP CONSTRAINT "loads_pkey"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "id"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD CONSTRAINT "PK_c90caf6ef671c1a292bc4b4bc1b" PRIMARY KEY ("id")
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" ALTER COLUMN "status" SET DEFAULT 'Booked'
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ALTER COLUMN "notes" TYPE jsonb USING CASE
                WHEN "notes" IS NULL THEN NULL
                ELSE jsonb_build_array(jsonb_build_object(
                    'id', 'legacy-' || "id"::text,
                    'author', 'Legacy',
                    'text', "notes",
                    'timestamp', COALESCE("createdAt"::text, now()::text)
                ))
            END
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" ALTER COLUMN "notes" SET DEFAULT '[]'::jsonb
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "notes"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "notes" text
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "status"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "status" character varying(50) DEFAULT 'Available'
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP CONSTRAINT "PK_c90caf6ef671c1a292bc4b4bc1b"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "id"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "id" SERIAL NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "updatedAt"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "createdAt"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "securementPhotos"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "receiptUrls"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "podUrl"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "bolUrl"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "rateConfirmationUrl"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "trailerSealNumber"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "eta"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "currentLocation"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP CONSTRAINT "UQ_6719b7566488945ce633f67ecf7"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads" DROP COLUMN "loadNumber"
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "driverId" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "destination" character varying NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "origin" character varying NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "assigned_driver_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "commodity" character varying(100)
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "weight" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "miles" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "rate" numeric(10, 2) NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "delivery_date" TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "pickup_date" TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "delivery_location" text
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "pickup_location" text
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "customer" character varying(100)
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "broker" character varying(100)
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD "load_number" character varying(50) NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD CONSTRAINT "loads_load_number_key" UNIQUE ("load_number")
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD CONSTRAINT "loads_status_check" CHECK (
                    (
                        (status)::text = ANY (
                            (
                                ARRAY ['Available'::character varying, 'Assigned'::character varying, 'Picked Up'::character varying, 'In Transit'::character varying, 'Delivered'::character varying, 'Completed'::character varying, 'Invoiced'::character varying, 'Paid'::character varying]
                            )::text []
                        )
                    )
                )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_loads_load_number_unique" ON "loads" USING btree ("load_number")
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD CONSTRAINT "FK_9126297ba89a3923624663e119b" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "loads"
            ADD CONSTRAINT "loads_assigned_driver_id_fkey" FOREIGN KEY ("assigned_driver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }
}
