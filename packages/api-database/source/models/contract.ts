import { Column, Entity } from "typeorm";

@Entity({
	name: "contracts",
})
export class Contract {
	@Column({
		primary: true,
		type: "varchar",
	})
	public readonly name!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly address!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "varchar",
	})
	public readonly proxy!: string | undefined;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly activeImplementation!: string;

	@Column({
		nullable: false,
		type: "jsonb",
	})
	public readonly implementations!: { address: string; abi: Record<string, any> }[];
}
