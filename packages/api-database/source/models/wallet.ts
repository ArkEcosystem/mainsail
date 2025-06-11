import { Column, Entity } from "typeorm";

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
	public attributes!: Record<string, any> | undefined;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly updated_at!: string;
}
