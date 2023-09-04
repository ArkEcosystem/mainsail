import { Column, Entity } from "typeorm";

@Entity({
	name: "validator_rounds",
})
export class ValidatorRound {
	@Column({
		primary: true,
		type: "bigint",
	})
	public readonly height!: number;

	@Column({
		primary: true,
		type: "int",
	})
	public readonly round!: number;

	@Column({
		nullable: false,
		type: "jsonb", // TODO: bitpack to save bytes (see serializer for validatorSet)
	})
	public readonly validators!: boolean[];
}
