import { Column, Entity } from "typeorm";

@Entity({
	name: "transaction_types",
})
export class TransactionType {
	@Column({
		primary: true,
		type: "varchar",
	})
	public key!: string;

	@Column({
		nullable: false,
		type: "jsonb",
	})
	public schema!: Record<string, any>;
}
