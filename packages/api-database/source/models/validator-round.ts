import { Column, Entity } from "typeorm";

@Entity({
	name: "validator_rounds",
})
export class ValidatorRound {
	@Column({
		primary: true,
		type: "bigint",
	})
	public readonly round!: number;

	@Column({
		type: "bigint",
		unique: true,
	})
	public readonly roundHeight!: number;

	@Column({
		nullable: false,
		type: "jsonb",
	})
	public readonly validators!: string[];
}
