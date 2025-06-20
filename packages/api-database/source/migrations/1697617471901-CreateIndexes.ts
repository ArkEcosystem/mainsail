import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIndexes1697617471901 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            CREATE UNIQUE INDEX transactions_sender_nonce ON transactions(sender_public_key, nonce);
		CREATE INDEX transactions_to ON transactions("to");
            CREATE INDEX transactions_sender ON transactions(sender_public_key);
		CREATE INDEX transactions_from ON transactions("from");


            CREATE INDEX transactions_block_hash ON transactions(block_hash);
            CREATE INDEX transactions_block_number_transaction_index ON transactions(block_number, transaction_index);

            CREATE INDEX transactions_value ON transactions(value);
            CREATE INDEX transactions_gas_price ON transactions(gas_price);
            CREATE INDEX transactions_nonce ON transactions(nonce);

            CREATE INDEX transactions_value_transaction_index ON transactions(value, transaction_index);
            CREATE INDEX transactions_gas_price_transaction_index ON transactions(gas_price, transaction_index);
            CREATE INDEX transactions_nonce_transaction_index ON transactions(nonce, transaction_index);
            CREATE INDEX transactions_timestamp_transaction_index ON transactions(timestamp, transaction_index);

            CREATE INDEX transactions_value_asc_transaction_index_desc ON transactions(value ASC, transaction_index DESC);
            CREATE INDEX transactions_gas_price_asc_transaction_index_desc ON transactions(gas_price ASC, transaction_index DESC);
            CREATE INDEX transactions_nonce_asc_transaction_index_desc ON transactions(nonce ASC, transaction_index DESC);
            CREATE INDEX transactions_timestamp_asc_transaction_index_desc ON transactions(timestamp ASC, transaction_index DESC);

            CREATE INDEX transactions_function_sig_address ON transactions(
                  SUBSTRING(data FROM 1 FOR 4),
                  "to"
            );

            CREATE INDEX blocks_transactions_count ON blocks(transactions_count);
            CREATE INDEX blocks_reward ON blocks(reward);
            CREATE INDEX blocks_fee ON blocks(fee);
            CREATE INDEX blocks_validator_round ON blocks(validator_round);

            CREATE INDEX receipts_block_height ON receipts(block_number);
            CREATE INDEX receipts_contracts ON receipts(contract_address)
            WHERE contract_address IS NOT NULL;

            CREATE INDEX wallets_balance ON wallets(balance);
            CREATE INDEX wallets_attributes ON wallets using GIN(attributes);
            CREATE INDEX wallets_validators ON wallets ((attributes->>'validatorPublicKey'))
                            WHERE (attributes ? 'validatorPublicKey');
            CREATE UNIQUE INDEX wallets_unique_public_key ON wallets (public_key)
            WHERE public_key IS NOT NULL;

            CREATE UNIQUE INDEX legacy_cold_wallets_unique_merge_address ON legacy_cold_wallets (merge_info_wallet_address)
            WHERE merge_info_wallet_address IS NOT NULL;
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            DROP INDEX transactions_sender_nonce;
            DROP INDEX transactions_to;
            DROP INDEX transactions_sender;
            DROP INDEX transactions_from;

            DROP INDEX transactions_block_hash;
            DROP INDEX transactions_block_number_transaction_index;

            DROP INDEX transactions_value;
            DROP INDEX transactions_gas_price;
            DROP INDEX transactions_nonce;

            DROP INDEX transactions_value_transaction_index;
            DROP INDEX transactions_gas_price_transaction_index;
            DROP INDEX transactions_nonce_transaction_index;
            DROP INDEX transactions_timestamp_transaction_index;

            DROP INDEX transactions_value_asc_transaction_index_desc;
            DROP INDEX transactions_gas_price_asc_transaction_index_desc;
            DROP INDEX transactions_nonce_asc_transaction_index_desc;
            DROP INDEX transactions_timestamp_asc_transaction_index_desc;
            DROP INDEX transactions_function_sig_address;

            DROP INDEX blocks_transactions_count;
            DROP INDEX blocks_reward;
            DROP INDEX blocks_fee;
            DROP INDEX blocks_validator_round;

            DROP INDEX receipts_block_height;
            DROP INDEX receipts_contracts;

            DROP INDEX wallets_balance;
            DROP INDEX wallets_attributes;
            DROP INDEX wallets_validators;
            DROP INDEX wallets_unique_public_key;

            DROP INDEX legacy_cold_wallets_unique_merge_address;
        `);
	}
}
