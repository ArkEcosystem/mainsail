import { Column, Entity } from "typeorm";

@Entity({
	name: "multi_payments",
})
export class MultiPayment {
	@Column({
		primary: true,
		type: "citext",
	})
	public readonly hash!: string;

	@Column({
		primary: true,
		type: "smallint",
	})
	public readonly logIndex!: number;

	@Column({
		nullable: false,
		type: "citext",
	})
	public readonly from!: string;

	@Column({
		nullable: false,
		type: "citext",
	})
	public readonly to!: string;

	@Column({
		nullable: false,
		type: "numeric",
	})
	public readonly amount!: string;

	@Column({
		nullable: false,
		type: "boolean",
	})
	public readonly success!: boolean;
}
