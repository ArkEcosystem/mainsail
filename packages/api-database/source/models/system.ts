import { Column, Entity } from "typeorm";

@Entity({
	name: "system",
})
export class System {
	@Column({
		primary: true,
		type: "varchar",
	})
	public key!: string;

	@Column({
		type: "varchar",
	})
	public value!: string;
}
