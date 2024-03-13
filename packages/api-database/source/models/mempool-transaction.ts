import { Column, Entity } from "typeorm";

import { vendorFieldTransformer } from "../transformers/vendor-field.js";

@Entity({
	name: "mempool_transactions",
})
export class MempoolTransaction {
	@Column({
		primary: true,
		type: "varchar",
	})
	public id!: string;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public version!: number;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public type!: number;

	@Column({
		default: 1,
		nullable: false,
		type: "integer",
	})
	public typeGroup!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public nonce!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public senderPublicKey!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public recipientId!: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		transformer: vendorFieldTransformer,
		type: "bytea",
	})
	public vendorField: string | undefined;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public amount!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public fee!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
		// TODO: separate tables for 1:n assets
	})
	public asset!: Record<string, any> | undefined;

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
