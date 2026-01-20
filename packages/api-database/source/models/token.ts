import { Column, Entity } from "typeorm";

@Entity({
	name: "tokens",
})
export class Token {
	@Column({
		primary: true,
		type: "citext",
	})
	public readonly address!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly symbol!: string;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public readonly name!: string;

	@Column({
		nullable: false,
		type: "integer",
	})
	public readonly decimals!: number;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly totalSupply!: string;

	@Column({
		default: undefined,
		nullable: true,
		type: "citext",
	})
	public readonly deploymentHash!: string | undefined;
}
