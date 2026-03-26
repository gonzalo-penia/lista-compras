import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1774543732084 implements MigrationInterface {
  name = 'InitialSchema1774543732084';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "email"       character varying NOT NULL,
        "name"        character varying NOT NULL,
        "picture"     character varying,
        "googleId"    character varying NOT NULL,
        "createdAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email"    UNIQUE ("email"),
        CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId"),
        CONSTRAINT "PK_users"          PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "families" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"        character varying NOT NULL,
        "invite_code" character varying NOT NULL,
        "owner_id"    uuid              NOT NULL,
        "created_at"  TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_families_invite_code" UNIQUE ("invite_code"),
        CONSTRAINT "PK_families"             PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "family_members" (
        "family_id" uuid NOT NULL,
        "user_id"   uuid NOT NULL,
        CONSTRAINT "PK_family_members" PRIMARY KEY ("family_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "shopping_lists" (
        "id"             uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"           character varying NOT NULL,
        "family_id"      uuid              NOT NULL,
        "track_expenses" boolean           NOT NULL DEFAULT false,
        "settled"        boolean           NOT NULL DEFAULT false,
        "created_at"     TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shopping_lists" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_shopping_lists_family_id" ON "shopping_lists" ("family_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "shopping_items" (
        "id"         uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"       character varying NOT NULL,
        "quantity"   numeric,
        "unit"       character varying,
        "checked"    boolean           NOT NULL DEFAULT false,
        "checked_by" character varying,
        "created_by" character varying NOT NULL,
        "list_id"    uuid              NOT NULL,
        "created_at" TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shopping_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_shopping_items_list_id"      ON "shopping_items" ("list_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_shopping_items_created_by"   ON "shopping_items" ("created_by")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_shopping_items_list_checked" ON "shopping_items" ("list_id", "checked")
    `);

    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id"          uuid             NOT NULL DEFAULT uuid_generate_v4(),
        "amount"      numeric(10,2)    NOT NULL,
        "description" character varying,
        "user_id"     uuid             NOT NULL,
        "list_id"     uuid             NOT NULL,
        "created_at"  TIMESTAMP        NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expenses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_expenses_user_id" ON "expenses" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_expenses_list_id" ON "expenses" ("list_id")
    `);

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE "families"
        ADD CONSTRAINT "FK_families_owner"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "family_members"
        ADD CONSTRAINT "FK_family_members_family"
        FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "family_members"
        ADD CONSTRAINT "FK_family_members_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "shopping_lists"
        ADD CONSTRAINT "FK_shopping_lists_family"
        FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "shopping_items"
        ADD CONSTRAINT "FK_shopping_items_list"
        FOREIGN KEY ("list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "expenses"
        ADD CONSTRAINT "FK_expenses_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "expenses"
        ADD CONSTRAINT "FK_expenses_list"
        FOREIGN KEY ("list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_list"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_user"`);
    await queryRunner.query(`ALTER TABLE "shopping_items" DROP CONSTRAINT "FK_shopping_items_list"`);
    await queryRunner.query(`ALTER TABLE "shopping_lists" DROP CONSTRAINT "FK_shopping_lists_family"`);
    await queryRunner.query(`ALTER TABLE "family_members" DROP CONSTRAINT "FK_family_members_user"`);
    await queryRunner.query(`ALTER TABLE "family_members" DROP CONSTRAINT "FK_family_members_family"`);
    await queryRunner.query(`ALTER TABLE "families" DROP CONSTRAINT "FK_families_owner"`);

    await queryRunner.query(`DROP TABLE "expenses"`);
    await queryRunner.query(`DROP TABLE "shopping_items"`);
    await queryRunner.query(`DROP TABLE "shopping_lists"`);
    await queryRunner.query(`DROP TABLE "family_members"`);
    await queryRunner.query(`DROP TABLE "families"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
