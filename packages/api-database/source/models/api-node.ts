import { Column, Entity } from "typeorm";

@Entity({
	name: "api_nodes",
})
export class ApiNode {
	@Column({
		primary: true,
		type: "inet",
	})
	public ip!: string;

	@Column({
		type: "integer",
	})
	public port!: number;

	@Column({
		type: "integer",
	})
	public protocol!: number;

	@Column({
		nullable: true,
		type: "integer",
	})
	public height!: number | undefined;

	@Column({
		nullable: false,
		type: "varchar",
	})
	public url!: string;

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
