import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUpdateValidatorRankingFunction1729064427168 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            CREATE INDEX wallets_ranked_validators ON wallets ((attributes->>'validatorPublicKey'))
                WHERE attributes ? 'validatorPublicKey'
                    AND NOT COALESCE((attributes->>'validatorResigned')::boolean, FALSE);

            CREATE INDEX wallets_resigned_ranked_validators ON wallets (address)
                WHERE attributes ? 'validatorRank'
                    AND COALESCE((attributes->>'validatorResigned')::boolean, FALSE);
        `);

		// language=postgresql
		await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_validator_ranks()
            RETURNS VOID AS $$
            DECLARE
                total_supply numeric;
                validator record;
            BEGIN
                SELECT supply::numeric INTO total_supply FROM state;

                FOR validator IN
                    SELECT
                        address,
                        ROW_NUMBER() OVER (ORDER BY (attributes->>'validatorVoteBalance')::numeric DESC, address ASC) AS rank,
                        ROUND(COALESCE((attributes->>'validatorVoteBalance')::numeric / NULLIF(total_supply, 0), 0), 4) AS approval
                    FROM wallets
                    WHERE attributes ? 'validatorPublicKey' AND attributes->>'validatorPublicKey' <> ''
                        AND NOT COALESCE((attributes->>'validatorResigned')::boolean, FALSE)
                LOOP
                    UPDATE wallets
                    SET attributes = attributes || jsonb_build_object(
                        'validatorRank', validator.rank,
                        'validatorApproval', validator.approval
                    )
                    WHERE address = validator.address
                        AND (
                            attributes->'validatorRank' IS DISTINCT FROM to_jsonb(validator.rank)
                            OR attributes->'validatorApproval' IS DISTINCT FROM to_jsonb(validator.approval)
                        );
                END LOOP;

                UPDATE wallets
                SET attributes = attributes - 'validatorRank' - 'validatorApproval'
                WHERE attributes ? 'validatorRank'
                    AND COALESCE((attributes->>'validatorResigned')::boolean, FALSE);
            END;
            $$
            LANGUAGE plpgsql;
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            DROP FUNCTION IF EXISTS update_validator_ranks();
            DROP INDEX IF EXISTS wallets_resigned_ranked_validators;
            DROP INDEX IF EXISTS wallets_ranked_validators;
        `);
	}
}
