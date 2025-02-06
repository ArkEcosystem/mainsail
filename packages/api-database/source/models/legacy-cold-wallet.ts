import { Column, Entity } from "typeorm";

@Entity({
	name: "legacy_cold_wallets",
})
export class LegacyColdWallet {
	@Column({
		primary: true,
		type: "varchar",
	})
	public readonly address!: string;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly balance!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public readonly attributes?: Record<string, any> | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly mergeInfoWalletAddress?: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly mergeInfoTransactionHash?: string | undefined;
}
