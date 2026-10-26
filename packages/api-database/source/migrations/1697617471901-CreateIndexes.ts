import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIndexes1697617471901 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            CREATE UNIQUE INDEX transactions_sender_nonce ON transactions(sender_public_key, nonce);
            CREATE INDEX transactions_to_timestamp_tx_index ON transactions("to", timestamp, transaction_index);
            CREATE INDEX transactions_from_timestamp_tx_index ON transactions("from", timestamp, transaction_index);
            CREATE INDEX transactions_sender_timestamp_tx_index ON transactions(sender_public_key, timestamp, transaction_index);
            CREATE INDEX transactions_multi_payment_recipients ON transactions USING GIN (multi_payment_recipients);

            CREATE INDEX transactions_block_hash ON transactions(block_hash);

            -- the default sample underestimates the distinct values of these skewed columns
            ALTER TABLE transactions
                ALTER COLUMN "from" SET STATISTICS 1000,
                ALTER COLUMN "to" SET STATISTICS 1000,
                ALTER COLUMN sender_public_key SET STATISTICS 1000,
                ALTER COLUMN block_hash SET STATISTICS 1000;

            CREATE INDEX transactions_value_timestamp_tx_index ON transactions(value, timestamp, transaction_index);
            CREATE INDEX transactions_gas_price_timestamp_tx_index ON transactions(gas_price, timestamp, transaction_index);
            CREATE INDEX transactions_nonce_timestamp_tx_index ON transactions(nonce, timestamp, transaction_index);
            CREATE INDEX transactions_timestamp_transaction_index ON transactions(timestamp, transaction_index);
            CREATE INDEX transactions_timestamp_asc_transaction_index_desc ON transactions(timestamp ASC, transaction_index DESC) INCLUDE (gas_price);

            CREATE INDEX transactions_function_sig_address ON transactions(
                  SUBSTRING(data FROM 1 FOR 4),
                  "to"
            );

            -- 0x6dd7d8ea is vote(address) of ConsensusV1
            CREATE INDEX transactions_votes_sender_timestamp_tx_index ON transactions(sender_public_key, timestamp DESC, transaction_index DESC)
            WHERE SUBSTRING(data FROM 1 FOR 4) = '\\x6dd7d8ea';
            CREATE INDEX transactions_votes_timestamp_tx_index ON transactions(timestamp DESC, transaction_index DESC)
            WHERE SUBSTRING(data FROM 1 FOR 4) = '\\x6dd7d8ea';

            CREATE INDEX transactions_deployed_contract_index ON transactions(deployed_contract_address, block_number DESC, transaction_index DESC)
            WHERE deployed_contract_address IS NOT NULL;

            CREATE INDEX blocks_transactions_count ON blocks(transactions_count, number);
            CREATE INDEX blocks_reward ON blocks(reward, number);
            CREATE INDEX blocks_fee ON blocks(fee, number);
            CREATE INDEX blocks_validator_round ON blocks(validator_round);
            CREATE INDEX blocks_proposer_number ON blocks(proposer, number);

            CREATE INDEX multi_payments_hash ON multi_payments(hash) INCLUDE (amount) WHERE success IS TRUE;
            CREATE INDEX multi_payments_hash_to ON multi_payments(hash, "to") WHERE success IS TRUE;
            CREATE INDEX multi_payments_to ON multi_payments("to") WHERE success IS TRUE;

            CREATE INDEX wallets_balance_address ON wallets(balance, address);
            CREATE INDEX wallets_attributes ON wallets using GIN(attributes);
            CREATE INDEX wallets_validators ON wallets ((attributes->>'validatorPublicKey'))
                            WHERE (attributes ? 'validatorPublicKey');
            CREATE UNIQUE INDEX wallets_unique_public_key ON wallets (public_key)
            WHERE public_key IS NOT NULL;
            CREATE INDEX wallets_vote_balance_address ON wallets ((attributes->>'vote'), balance, address)
            WHERE (attributes->>'vote') IS NOT NULL;
            -- the planner ignores the expression statistics of partial indexes
            CREATE STATISTICS wallets_vote_statistics ON (attributes->>'vote') FROM wallets;

            CREATE UNIQUE INDEX legacy_cold_wallets_unique_merge_address ON legacy_cold_wallets (merge_info_wallet_address)
            WHERE merge_info_wallet_address IS NOT NULL;

            -- lookups by address use token_holders_token_address_balance, which leads with the address
            CREATE INDEX token_holders_token_balance_address ON token_holders ("token_address", "balance" DESC, "address");
            CREATE INDEX token_holders_token_address_balance ON token_holders ("address", "token_address", "balance");

            CREATE INDEX token_actions_all ON token_actions (action, "block_number" DESC, "index" DESC);
            CREATE INDEX token_actions_all_from ON token_actions (action, "from", "block_number" DESC, "index" DESC);
            CREATE INDEX token_actions_all_to ON token_actions (action, "to", "block_number" DESC, "index" DESC);
            CREATE INDEX token_actions_address ON token_actions (action, "address", "block_number" DESC, "index" DESC);
            CREATE INDEX token_actions_address_from ON token_actions (action, "address", "from", "block_number" DESC, "index" DESC);
            CREATE INDEX token_actions_address_to ON token_actions (action, "address", "to", "block_number" DESC, "index" DESC );
            CREATE INDEX token_actions_tx_hash ON token_actions ("transaction_hash");

            -- when >= 3 chars
            CREATE INDEX tokens_symbol_trgm ON tokens USING gin (symbol gin_trgm_ops);
            CREATE INDEX tokens_name_trgm ON tokens USING gin (name gin_trgm_ops);

            -- when <= 2 chars
            CREATE INDEX tokens_symbol_prefix ON tokens ((casefold(symbol)) text_pattern_ops);
            CREATE INDEX tokens_name_prefix ON tokens ((casefold(name)) text_pattern_ops);
            `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            DROP INDEX transactions_sender_nonce;
            DROP INDEX transactions_to_timestamp_tx_index;
            DROP INDEX transactions_sender_timestamp_tx_index;
            DROP INDEX transactions_from_timestamp_tx_index;
            DROP INDEX transactions_multi_payment_recipients;

            DROP INDEX transactions_block_hash;

            DROP INDEX transactions_value_timestamp_tx_index;
            DROP INDEX transactions_gas_price_timestamp_tx_index;
            DROP INDEX transactions_nonce_timestamp_tx_index;
            DROP INDEX transactions_timestamp_transaction_index;
            DROP INDEX transactions_timestamp_asc_transaction_index_desc;
            DROP INDEX transactions_function_sig_address;
            DROP INDEX transactions_votes_sender_timestamp_tx_index;
            DROP INDEX transactions_votes_timestamp_tx_index;
            DROP INDEX transactions_deployed_contract_index;

            ALTER TABLE transactions
                ALTER COLUMN "from" SET STATISTICS -1,
                ALTER COLUMN "to" SET STATISTICS -1,
                ALTER COLUMN sender_public_key SET STATISTICS -1,
                ALTER COLUMN block_hash SET STATISTICS -1;

            DROP INDEX multi_payments_hash;
            DROP INDEX multi_payments_hash_to;
            DROP INDEX multi_payments_to;

            DROP INDEX blocks_transactions_count;
            DROP INDEX blocks_reward;
            DROP INDEX blocks_fee;
            DROP INDEX blocks_validator_round;
            DROP INDEX blocks_proposer_number;

            DROP INDEX receipts_block_height;
            DROP INDEX receipts_contracts;

            DROP INDEX wallets_balance_address;
            DROP INDEX wallets_attributes;
            DROP INDEX wallets_validators;
            DROP INDEX wallets_unique_public_key;
            DROP INDEX wallets_vote_balance_address;
            DROP STATISTICS wallets_vote_statistics;

            DROP INDEX legacy_cold_wallets_unique_merge_address;

            DROP INDEX tokens_symbol_trgm;
            DROP INDEX tokens_name_trgm;
            DROP INDEX tokens_symbol_prefix;
            DROP INDEX tokens_name_prefix;

            DROP INDEX token_holders_token_balance_address;
            DROP INDEX token_holders_token_address_balance;

            DROP INDEX token_actions_all;
            DROP INDEX token_actions_all_from;
            DROP INDEX token_actions_all_to;
            DROP INDEX token_actions_address;
            DROP INDEX token_actions_address_from;
            DROP INDEX token_actions_address_to;
            DROP INDEX token_actions_tx_hash;
        `);
	}
}
