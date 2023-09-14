import { Column, Entity } from "typeorm";

@Entity({
	name: "mempool_transactions",
})
export class MempoolTransaction {
	@Column({
		primary: true,
		type: "varchar",
		// TODO: length depends on hash size...
		// length: 64,
	})
	public id!: string;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public version!: number;

	@Column({
		nullable: false,
		type: "smallint",
	})
	public type!: number;

	@Column({
		default: 1,
		nullable: false,
		type: "integer",
	})
	public typeGroup!: number;


	@Column({
		nullable: false,
		type: "bigint",
	})
	public nonce!: string;

	@Column({
		nullable: false,
		type: "varchar",
		// TODO: length depends on public key size...
		// length: 66,
	})
	public senderPublicKey!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public recipientId!: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "bytea",
	})
	public vendorField: string | undefined;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public amount!: string;

	@Column({
		nullable: false,
		type: "bigint",
	})
	public fee!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
		// TODO: separate tables for 1:n assets
	})
	public asset!: Record<string, any> | undefined;
}
