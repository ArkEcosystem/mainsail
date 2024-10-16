import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUpdateValidatorRankingFunction1729064427168 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_validator_ranks()
            RETURNS VOID AS $$
            BEGIN
                WITH all_validators AS (
                    SELECT address, (attributes->>'validatorVoteBalance')::numeric AS vote_balance
                    FROM wallets
                    WHERE attributes ? 'validatorPublicKey' AND COALESCE((attributes->>'validatorResigned')::boolean, FALSE) IS NOT TRUE
                ),
                ranking AS (
                    SELECT
                        address,
                        vote_balance,
                        ROW_NUMBER() OVER (ORDER BY vote_balance DESC, address ASC) AS rank
                    FROM all_validators
                    ORDER BY 2 DESC, 1 ASC
                )
                UPDATE wallets
                SET 
                    attributes = attributes || jsonb_build_object(
                        'validatorRank', ranking.rank,
                        'validatorApproval', ROUND(COALESCE(ranking.vote_balance::numeric / NULLIF(state.supply::numeric, 0), 0), 4)
                    )
                FROM ranking
                CROSS JOIN state
                WHERE wallets.address = ranking.address;		
            END;
            $$
            LANGUAGE plpgsql;
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            DROP FUNCTION IF EXISTS update_validator_ranks();
        `);
	}
}
