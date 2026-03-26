import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1774543732085 implements MigrationInterface {
  name = 'AddRefreshTokens1774543732085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"         uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" character varying NOT NULL,
        "user_id"    uuid              NOT NULL,
        "expires_at" TIMESTAMP         NOT NULL,
        "revoked_at" TIMESTAMP,
        "created_at" TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_refresh_tokens_hash"    ON "refresh_tokens" ("token_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX        "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
        ADD CONSTRAINT "FK_refresh_tokens_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
