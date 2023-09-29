import { Column, Entity } from "typeorm";

@Entity({
	name: "plugins",
})
export class Plugin {
	@Column({
		primary: true,
		type: "varchar",
	})
	public name!: string;

	@Column({
		nullable: false,
		type: "jsonb",
	})
	public configuration!: Record<string, any>;
}
