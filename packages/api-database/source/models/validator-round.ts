import { Column, Entity } from "typeorm";

@Entity({
	name: "validator_rounds",
})
export class ValidatorRound {
	@Column({
		type: "bigint",
		primary: true,
	})
	public readonly height!: number;

	@Column({
		type: "int",
		primary: true,
	})
	public readonly round!: number;

	@Column({
		nullable: false,
		type: "jsonb", // TODO: bitpack to save bytes (see serializer for validatorSet)
	})
	public readonly validators!: boolean[];
}
