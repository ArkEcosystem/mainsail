import { Column, Entity } from "typeorm";

export enum TokenActionEnum {
	Transfer = "Transfer",
	Approval = "Approval",
}

@Entity({
	name: "token_actions",
})
export class TokenAction {
	@Column({
		primary: true,
		type: "citext",
	})
	public readonly address!: string;

	@Column({
		enum: TokenActionEnum,
		enumName: "token_action_enum",
		primary: true,
		type: "enum",
	})
	public readonly action!: string;

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
