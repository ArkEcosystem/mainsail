import { Column, Entity, Unique } from "typeorm";

@Entity({
	name: "wallets",
})
@Unique("unique_wallet_public_key", ["publicKey"])
export class Wallet {
	@Column({
		primary: true,
		type: "varchar",
	})
	public address!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
		unique: true,
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

	// TODO: separate tables for 1:n attributes
	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public attributes!: Record<string, any> | undefined;
}
