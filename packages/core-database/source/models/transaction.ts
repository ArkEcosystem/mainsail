import { Contracts } from "@arkecosystem/core-kernel";
import { Utils } from "@arkecosystem/crypto";
import { Column, Entity, Index } from "typeorm";

import { transformBigInt, transformVendorField } from "../utils/transform";

// TODO: Fix model to have undefined type on nullable fields
@Entity({
	name: "transactions",
})
@Index(["type"])
@Index(["blockId"])
@Index(["senderPublicKey"])
@Index(["recipientId"])
@Index(["timestamp"])
export class Transaction implements Contracts.Database.TransactionModel {
	@Column({
		length: 64,
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
		length: 64,
		nullable: false,
		type: "varchar",
	})
	public blockId!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public blockHeight!: number;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public sequence!: number;

	@Column({
		nullable: false,
		type: "integer",
	})
	public timestamp!: number;

	@Column({
		default: undefined,
		transformer: transformBigInt,
		type: "bigint",
	})
	public nonce!: Utils.BigNumber;

	@Column({
		length: 66,
		nullable: false,
		type: "varchar",
	})
	public senderPublicKey!: string;

	@Column({
		length: 36,
		default: undefined,
		type: "varchar",
	})
	public recipientId!: string;

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
		default: undefined,
		transformer: transformVendorField,
		type: "bytea",
	})
	public vendorField: string | undefined;

	@Column({
		nullable: false,
		transformer: transformBigInt,
		type: "bigint",
	})
	public amount!: Utils.BigNumber;

	@Column({
		nullable: false,
		transformer: transformBigInt,
		type: "bigint",
	})
	public fee!: Utils.BigNumber;

	@Column({
		nullable: false,
		type: "bytea",
	})
	public serialized!: Buffer;

	@Column({
		type: "jsonb",
	})
	public asset!: Record<string, any>;
}
