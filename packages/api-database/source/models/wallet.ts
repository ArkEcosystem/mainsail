import { Column, Entity, VirtualColumn } from "typeorm";

@Entity({
	name: "wallets",
})
export class Wallet {
	@Column({
		primary: true,
		type: "citext",
	})
	public address!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "citext",
	})
	public publicKey!: string | undefined;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public balance!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public nonce!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public attributes: string | undefined;

	@VirtualColumn({
		query: (alias) => `
		COALESCE(
			(SELECT tc.token_count
			FROM wallet_token_counts tc
			WHERE tc.address = ${alias}.address
			LIMIT 1),
			0
			)`,
		type: "integer",
	})
	public tokenCount: number | undefined;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly updated_at!: string;
}
