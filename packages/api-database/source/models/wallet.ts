import { Column, Entity } from "typeorm";

@Entity({
	name: "wallets",
})
export class Wallet {
	@Column({
		primary: true,
		type: "varchar",
		// TODO: length depends on address size...
		// length: 64,
	})
	public address!: string;

	@Column({
		nullable: true,
		type: "varchar",
		unique: true,
		// TODO: length depends on public key size...
		// length: 66,
	})
	public publicKey!: string;

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
