import { Column, Entity } from "typeorm";

@Entity({
	name: "token_holders",
})
export class TokenHolder {
	@Column({
		primary: true,
		type: "citext",
	})
	public readonly tokenAddress!: string;

	@Column({
		primary: true,
		type: "citext",
	})
	public readonly address!: string;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly balance!: string;
}
