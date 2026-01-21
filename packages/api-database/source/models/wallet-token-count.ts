import { Column, Entity } from "typeorm";

@Entity({
	name: "wallet_token_counts",
})
export class WalletTokenCount {
	@Column({
		primary: true,
		type: "citext",
	})
	public address!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public tokenCount!: number;
}
