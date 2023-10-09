import { Column, Entity } from "typeorm";

@Entity({
	name: "state",
})
export class State {
	@Column({
		primary: true,
		type: "integer",
	})
	public id!: number;

	@Column({
		type: "bigint",
	})
	public height!: string;

	@Column({
		type: "bigint",
	})
	public supply!: string;
}
