import { Contracts } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import { Column, Entity, Index } from "typeorm";

import { transformBigInt } from "../utils/transform";

@Entity({
	name: "blocks",
})
@Index(["generatorPublicKey"])
export class Block implements Contracts.Database.BlockModel {
	@Column({
		length: 64,
		primary: true,
		type: "varchar",
	})
	public id!: string;

	@Column({
		type: "smallint",
	})
	public version!: number;

	@Column({
		nullable: false,
		type: "integer",
		unique: true,
	})
	public timestamp!: number;

	@Column({
		default: undefined,
		length: 64,
		type: "varchar",
		unique: true,
	})
	public previousBlock!: string;

	@Column({
		nullable: false,
		type: "integer",
		unique: true,
	})
	public height!: number;

	@Column({
		nullable: false,
		type: "integer",
	})
	public numberOfTransactions!: number;

	@Column({
		nullable: false,
		transformer: transformBigInt,
		type: "bigint",
	})
	public totalAmount!: BigNumber;

	@Column({
		nullable: false,
		transformer: transformBigInt,
		type: "bigint",
	})
	public totalFee!: BigNumber;

	@Column({
		nullable: false,
		transformer: transformBigInt,
		type: "bigint",
	})
	public reward!: BigNumber;

	@Column({
		nullable: false,
		type: "integer",
	})
	public payloadLength!: number;

	@Column({
		length: 64,
		nullable: false,
		type: "varchar",
	})
	public payloadHash!: string;

	@Column({
		length: 66,
		nullable: false,
		type: "varchar",
	})
	public generatorPublicKey!: string;

	@Column({
		length: 256,
		nullable: false,
		type: "varchar",
	})
	public blockSignature!: string;
}
