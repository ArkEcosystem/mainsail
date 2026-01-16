import { Column, Entity } from "typeorm";

@Entity({
	name: "token_transfers",
})
export class TokenTransfer {
	@Column({
		primary: true,
		type: "citext",
	})
	public readonly address!: string;

	@Column({
		primary: true,
		type: "bigint",
	})
	public readonly blockNumber!: string;

	@Column({
		primary: true,
		type: "smallint",
	})
	public readonly index!: number;

	@Column({
		nullable: false,
		type: "citext",
	})
	public readonly transactionHash!: string;

	@Column({
		nullable: false,
		type: "citext",
	})
	public readonly from!: string;

	@Column({
		nullable: false,
		type: "citext",
	})
	public readonly to!: string;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly value!: string;
}
