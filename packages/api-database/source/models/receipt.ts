import { Column, Entity } from "typeorm";

@Entity({
	name: "receipts",
})
export class Receipt {
	@Column({
		primary: true,
		type: "varchar",
	})
	public readonly id!: string;

	@Column({
		nullable: false,
		type: "boolean",
	})
	public readonly success!: boolean;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly gasUsed!: number;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly gasRefunded!: number;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly deployedContractAddress: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public readonly logs: string | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "bytea",
	})
	public readonly output: Buffer | undefined;
}
