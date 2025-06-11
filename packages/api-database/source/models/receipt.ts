import { Column, Entity } from "typeorm";

import { bufferTransformer } from "../transformers/buffer.js";

@Entity({
	name: "receipts",
})
export class Receipt {
	@Column({
		primary: true,
		type: "citext",
	})
	public readonly transactionHash!: string;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public readonly status!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly blockNumber!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly gasUsed!: number;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly gasRefunded!: number;

	@Column({
		default: undefined,
		nullable: true,
		type: "citext",
	})
	public readonly contractAddress: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public readonly logs: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		transformer: bufferTransformer,
		type: "bytea",
	})
	public readonly output: Buffer | undefined;
}
