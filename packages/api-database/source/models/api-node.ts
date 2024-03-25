import { Column, Entity } from "typeorm";

@Entity({
	name: "api_nodes",
})
export class ApiNode {
	@Column({
		primary: true,
		type: "varchar",
	})
	public url!: string;

	@Column({
		nullable: true,
		type: "integer",
	})
	public height!: number | undefined;

	@Column({
		nullable: true,
		type: "integer",
	})
	public latency!: number | undefined;

	@Column({
		nullable: true,
		type: "varchar",
	})
	public version!: string | undefined;
}
