import { Column, Entity } from "typeorm";

@Entity({
	name: "configuration",
})
export class Configuration {
	@Column({
		primary: true,
		type: "integer",
	})
	public id!: number;

	@Column({
		type: "varchar",
	})
	public version!: string;

	@Column({
		nullable: false,
		type: "jsonb",
	})
	public cryptoConfiguration!: Record<string, any>;
}
