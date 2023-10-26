import { Column, Entity, Unique } from "typeorm";

@Entity({
	name: "wallets",
})
@Unique("unique_wallet_public_key", ["publicKey"])
export class Wallet {
	@Column({
		primary: true,
		type: "varchar",
		// TODO: length depends on address size...
		// length: 64,
	})
	public address!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
		unique: true,
		// TODO: length depends on public key size...
		// length: 66,
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
