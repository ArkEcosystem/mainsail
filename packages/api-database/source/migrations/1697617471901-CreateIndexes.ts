import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIndexes1697617471901 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            CREATE UNIQUE INDEX transactions_sender_nonce ON transactions(sender_public_key, nonce);
            CREATE INDEX transactions_recipient_id ON transactions(recipient_id);
            CREATE INDEX transactions_sender ON transactions(sender_public_key);

            CREATE INDEX transactions_block_id ON transactions(block_id);
            CREATE INDEX transactions_block_height ON transactions(block_height, sequence);

            CREATE INDEX transactions_asset ON transactions USING GIN(asset) WITH (fastupdate = off);
            CREATE INDEX transactions_asset_payments ON transactions using gin ((asset -> 'payments'::text)) WITH (fastupdate = off);

            CREATE INDEX transactions_amount ON transactions(amount);
            CREATE INDEX transactions_fee ON transactions(fee);
            CREATE INDEX transactions_nonce ON transactions(nonce);
            CREATE INDEX transactions_vendor_field ON transactions(vendor_field);
            CREATE INDEX transactions_version ON transactions(version);

            CREATE INDEX transactions_amount_sequence ON transactions(amount, sequence);
            CREATE INDEX transactions_fee_sequence ON transactions(fee, sequence);
            CREATE INDEX transactions_nonce_sequence ON transactions(nonce, sequence);
            CREATE INDEX transactions_timestamp_sequence ON transactions(timestamp, sequence);
            CREATE INDEX transactions_type_sequence ON transactions(type, sequence);
            CREATE INDEX transactions_type_group_sequence ON transactions(type_group, sequence);
            CREATE INDEX transactions_vendor_field_sequence ON transactions(vendor_field, sequence);
            CREATE INDEX transactions_version_sequence ON transactions(version, sequence);

            CREATE INDEX transactions_amount_asc_sequence ON transactions(amount ASC, sequence DESC);
            CREATE INDEX transactions_fee_asc_sequence ON transactions(fee ASC, sequence DESC);
            CREATE INDEX transactions_nonce_asc_sequence ON transactions(nonce ASC, sequence DESC);
            CREATE INDEX transactions_timestamp_asc_sequence ON transactions(timestamp ASC, sequence DESC);
            CREATE INDEX transactions_type_asc_sequence ON transactions(type ASC, sequence DESC);
            CREATE INDEX transactions_type_group_asc_sequence ON transactions(type_group ASC, sequence DESC);
            CREATE INDEX transactions_vendor_field_asc_sequence ON transactions(vendor_field ASC, sequence DESC);
            CREATE INDEX transactions_version_asc_sequence ON transactions(version ASC, sequence DESC);

            CREATE INDEX blocks_number_of_transactions ON blocks(number_of_transactions);
            CREATE INDEX blocks_reward ON blocks(reward);
            CREATE INDEX blocks_total_amount ON blocks(total_amount);
            CREATE INDEX blocks_total_fee ON blocks(total_fee);
            CREATE INDEX blocks_version ON blocks(version);
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// language=postgresql
		await queryRunner.query(`
            DROP INDEX transactions_sender_nonce;
            DROP INDEX transactions_recipient_id;
            DROP INDEX transactions_sender;

            DROP INDEX transactions_block_id;
            DROP INDEX transactions_block_height;

            DROP INDEX transactions_asset;
            DROP INDEX transactions_asset_payments;

            DROP INDEX transactions_amount;
            DROP INDEX transactions_fee;
            DROP INDEX transactions_nonce;
            DROP INDEX transactions_vendor_field;
            DROP INDEX transactions_version;

            DROP INDEX transactions_amount_sequence;
            DROP INDEX transactions_fee_sequence;
            DROP INDEX transactions_nonce_sequence;
            DROP INDEX transactions_timestamp_sequence;
            DROP INDEX transactions_type_sequence;
            DROP INDEX transactions_type_group_sequence;
            DROP INDEX transactions_vendor_field_sequence;
            DROP INDEX transactions_version_sequence;

            DROP INDEX transactions_amount_asc_sequence;
            DROP INDEX transactions_fee_asc_sequence;
            DROP INDEX transactions_nonce_asc_sequence;
            DROP INDEX transactions_timestamp_asc_sequence;
            DROP INDEX transactions_type_asc_sequence;
            DROP INDEX transactions_type_group_asc_sequence;
            DROP INDEX transactions_vendor_field_asc_sequence;
            DROP INDEX transactions_version_asc_sequence;

            DROP INDEX blocks_number_of_transactions;
            DROP INDEX blocks_reward;
            DROP INDEX blocks_total_amount;
            DROP INDEX blocks_total_fee;
            DROP INDEX blocks_version;
        `);
	}
}
