import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIndexes1697617471901 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            CREATE UNIQUE INDEX transactions_sender_nonce ON transactions(sender_public_key, nonce);
            CREATE INDEX transactions_recipient_address ON transactions(recipient_address);
            CREATE INDEX transactions_sender ON transactions(sender_public_key);
            CREATE INDEX transactions_sender_address ON transactions(sender_address);

            CREATE INDEX transactions_block_id ON transactions(block_id);
            CREATE INDEX transactions_block_height_sequence ON transactions(block_height, sequence);

            CREATE INDEX transactions_amount ON transactions(amount);
            CREATE INDEX transactions_gas_price ON transactions(gas_price);
            CREATE INDEX transactions_nonce ON transactions(nonce);

            CREATE INDEX transactions_amount_sequence ON transactions(amount, sequence);
            CREATE INDEX transactions_gas_price_sequence ON transactions(gas_price, sequence);
            CREATE INDEX transactions_nonce_sequence ON transactions(nonce, sequence);
            CREATE INDEX transactions_timestamp_sequence ON transactions(timestamp, sequence);

            CREATE INDEX transactions_amount_asc_sequence_desc ON transactions(amount ASC, sequence DESC);
            CREATE INDEX transactions_gas_price_asc_sequence_desc ON transactions(gas_price ASC, sequence DESC);
            CREATE INDEX transactions_nonce_asc_sequence_desc ON transactions(nonce ASC, sequence DESC);
            CREATE INDEX transactions_timestamp_asc_sequence_desc ON transactions(timestamp ASC, sequence DESC);

            CREATE INDEX blocks_number_of_transactions ON blocks(number_of_transactions);
            CREATE INDEX blocks_reward ON blocks(reward);
            CREATE INDEX blocks_total_amount ON blocks(total_amount);
            CREATE INDEX blocks_total_fee ON blocks(total_fee);
            CREATE INDEX blocks_validator_round ON blocks(validator_round);

            CREATE INDEX receipts_block_height ON receipts(block_height);

            CREATE INDEX wallets_balance ON wallets(balance);
            CREATE INDEX wallets_attributes ON wallets using GIN(attributes);
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            DROP INDEX transactions_sender_nonce;
            DROP INDEX transactions_recipient_address;
            DROP INDEX transactions_sender;
            DROP INDEX transactions_sender_address;

            DROP INDEX transactions_block_id;
            DROP INDEX transactions_block_height_sequence;

            DROP INDEX transactions_amount;
            DROP INDEX transactions_gas_price;
            DROP INDEX transactions_nonce;

            DROP INDEX transactions_amount_sequence;
            DROP INDEX transactions_gas_price_sequence;
            DROP INDEX transactions_nonce_sequence;
            DROP INDEX transactions_timestamp_sequence;

            DROP INDEX transactions_amount_asc_sequence_desc;
            DROP INDEX transactions_gas_price_asc_sequence_desc;
            DROP INDEX transactions_nonce_asc_sequence_desc;
            DROP INDEX transactions_timestamp_asc_sequence_desc;

            DROP INDEX blocks_number_of_transactions;
            DROP INDEX blocks_reward;
            DROP INDEX blocks_total_amount;
            DROP INDEX blocks_total_fee;
            DROP INDEX blocks_validator_round;

            DROP INDEX receipts_block_height;

            DROP INDEX wallets_balance;
            DROP INDEX wallets_attributes;
        `);
	}
}
