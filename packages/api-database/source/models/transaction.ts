import { Column, Entity } from "typeorm";

import { bufferTransformer } from "../transformers/buffer.js";

@Entity({
	name: "transactions",
})
export class Transaction {
	@Column({
		primary: true,
		type: "varchar",
	})
	public readonly hash!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly blockHash!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly blockNumber!: string;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public readonly transactionIndex!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly timestamp!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly nonce!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly senderPublicKey!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly from!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly to!: string | undefined;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly value!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly gasPrice!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly gas!: number;

	@Column({
		default: undefined,
		nullable: true,
		transformer: bufferTransformer,
		type: "bytea",
	})
	public readonly data: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly signature: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly legacySecondSignature: string | undefined;
}
