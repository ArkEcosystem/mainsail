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
	public blockNumber!: string;

	@Column({
		type: "numeric",
	})
	public supply!: string;
}
