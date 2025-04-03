import { Column, Entity, Unique } from "typeorm";

@Entity({
	name: "blocks",
})
@Unique("unique_block_number", ["number"])
@Unique("unique_block_timestamp", ["timestamp"])
@Unique("unique_parent_hash", ["parentHash"])
export class Block {
	@Column({
		primary: true,
		type: "varchar",
	})
	public readonly hash!: string;

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
	})
	public readonly parentHash!: string;

	@Column({
		type: "varchar",
	})
	public readonly stateRoot!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly number!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly transactionsCount!: number;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly gasUsed!: number;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly amount!: string;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly fee!: string;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly reward!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly payloadSize!: number;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly transactionsRoot!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly proposer!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly round!: number;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly commitRound!: number;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly validatorRound!: number;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly validatorSet!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly signature!: string;
}
