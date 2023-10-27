import { Column, Entity, Unique } from "typeorm";

@Entity({
	name: "blocks",
})
@Unique("unique_block_height", ["height"])
@Unique("unique_block_timestamp", ["timestamp"])
@Unique("unique_previous_block", ["previousBlock"])
export class Block {
	@Column({
		primary: true,
		type: "varchar",
		// TODO: length depends on hash size...
		// length: 64,
	})
	public readonly id!: string;

	@Column({
		type: "smallint",
	})
	public readonly version!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly timestamp!: string;

	@Column({
		type: "varchar",
		// TODO: length depends on hash size...
		// length: 64,
	})
	public readonly previousBlock!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly height!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly numberOfTransactions!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly totalAmount!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly totalFee!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly reward!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly payloadLength!: number;

	@Column({
		nullable: false,
		type: "varchar",
		// TODO: length depends on hash size...
		// length: 64,
	})
	public readonly payloadHash!: string;

	@Column({
		nullable: false,
		type: "varchar",
		// TODO: length depends on public key size...
		// length: 66,
	})
	public readonly generatorPublicKey!: string;

	@Column({
		nullable: false,
		type: "varchar",
		// TODO: length depends on signature size...
		// length: 256,
	})
	public readonly signature!: string;
}
