import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUpdateTokenCountsFunction1768763572003 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            CREATE OR REPLACE FUNCTION apply_wallet_token_count_delta()
            RETURNS TRIGGER AS $$
                BEGIN
                    IF TG_OP = 'INSERT' THEN
                        INSERT INTO wallet_token_counts(address, token_count)
                        SELECT address, count(*)::integer
                        FROM new_rows
                        GROUP BY address
                        ON CONFLICT (address) DO UPDATE
                        SET
                            token_count = wallet_token_counts.token_count + EXCLUDED.token_count;

                        RETURN NULL;
                    END IF;

                    IF TG_OP = 'DELETE' THEN
                        INSERT INTO wallet_token_counts(address, token_count)
                        SELECT address, -count(*)::integer
                        FROM old_rows
                        GROUP BY address
                        ON CONFLICT (address) DO UPDATE
                        SET
                            token_count = wallet_token_counts.token_count + EXCLUDED.token_count;

                        RETURN NULL;
                    END IF;

                    -- TG_OP = 'UPDATE'
                    WITH paired AS (
                    SELECT
                        o.address AS old_address,
                        n.address AS new_address,
                        o.token_address AS old_token_address,
                        n.token_address AS new_token_address
                    FROM old_rows o
                    JOIN new_rows n
                        ON (o.address, o.token_address) = (n.address, n.token_address)
                    ),
                    changed AS (
                        SELECT old_address, new_address
                        FROM paired
                        WHERE old_address IS DISTINCT FROM new_address
                    ), dec AS (
                        SELECT old_address AS address, -count(*)::integer AS delta
                        FROM changed
                        GROUP BY old_address
                    ), inc AS (
                        SELECT new_address AS address, count(*)::integer AS delta
                        FROM changed
                        GROUP BY new_address
                    ), deltas AS (
                        SELECT * FROM dec
                        UNION ALL
                        SELECT * FROM inc
                    )
                    INSERT INTO wallet_token_counts(address, token_count)
                    SELECT address, sum(delta)::integer
                    FROM deltas
                    GROUP BY address
                    ON CONFLICT (address) DO UPDATE
                    SET
                        token_count = wallet_token_counts.token_count + EXCLUDED.token_count;

                RETURN NULL;
            END;
            $$
            LANGUAGE plpgsql;

            CREATE OR REPLACE FUNCTION update_wallet_token_counts()
            RETURNS VOID AS $$
            BEGIN
                TRUNCATE TABLE wallet_token_counts;

                INSERT INTO wallet_token_counts(address, token_count)
                SELECT  th.address,
                        count(*)::integer AS token_count
                FROM token_holders th
                GROUP BY th.address;
            END;
            $$
            LANGUAGE plpgsql;

            CREATE TRIGGER token_holders_count_delta_insert
            AFTER INSERT ON token_holders
            REFERENCING NEW TABLE AS new_rows
            FOR EACH STATEMENT
            EXECUTE FUNCTION apply_wallet_token_count_delta();

            CREATE TRIGGER token_holders_count_delta_delete
            AFTER DELETE ON token_holders
            REFERENCING OLD TABLE AS old_rows
            FOR EACH STATEMENT
            EXECUTE FUNCTION apply_wallet_token_count_delta();

            CREATE TRIGGER token_holders_count_delta_update
            AFTER UPDATE ON token_holders
            REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
            FOR EACH STATEMENT
            EXECUTE FUNCTION apply_wallet_token_count_delta();
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            DROP TRIGGER IF EXISTS token_holders_count_delta_insert ON token_holders;
            DROP TRIGGER IF EXISTS token_holders_count_delta_delete ON token_holders;
            DROP TRIGGER IF EXISTS token_holders_count_delta_update ON token_holders;
            DROP FUNCTION IF EXISTS apply_wallet_token_count_delta();
            DROP FUNCTION IF EXISTS update_wallet_token_counts();
        `);
	}
}
