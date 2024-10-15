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
	public readonly id!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly blockId!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly blockHeight!: string;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public readonly sequence!: number;

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
	public readonly senderAddress!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly recipientAddress!: string | undefined;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly amount!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly gasPrice!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly gasLimit!: number;

	@Column({
		default: undefined,
		nullable: true,
		transformer: bufferTransformer,
		type: "bytea",
	})
	public readonly data: Buffer | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly signature: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public readonly signatures: string[] | undefined;
}
