import { Column, Entity } from "typeorm";

@Entity({
	name: "token_whitelist",
})
export class TokenWhitelist {
	@Column({
		primary: true,
		type: "citext",
	})
	public readonly address!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "text",
	})
	public readonly comment: string | undefined;

	@Column({
		nullable: false,
		type: "timestamptz",
	})
	public readonly createdAt!: string;
}
