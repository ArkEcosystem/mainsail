import { Column, Entity, Unique } from "typeorm";

@Entity({
	name: "validator_rounds",
})
@Unique("unique_validator_round_height", ["roundHeight"])
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
