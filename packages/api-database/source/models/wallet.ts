import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { WalletTokenCount } from "./wallet-token-count.js";

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

	@OneToOne(() => WalletTokenCount, { eager: false })
	@JoinColumn({ name: "address", referencedColumnName: "address" })
	public tokenCount: WalletTokenCount | undefined;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public readonly updated_at!: string;
}
