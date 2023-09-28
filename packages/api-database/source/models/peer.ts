import { Column, Entity } from "typeorm";

// TODO: consider composite key on (ip, port)

@Entity({
	name: "peers",
})
export class Peer {
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
		nullable: true,
		type: "varchar",
	})
	public version!: string | undefined;

	@Column({
		nullable: true,
		type: "integer",
	})
	public height!: number;

	@Column({
		nullable: true,
		type: "integer",
	})
	public latency!: number | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public ports!: Record<string, any> | undefined;

	@Column({
		default: undefined,
		nullable: true,
		type: "jsonb",
	})
	public plugins!: Record<string, any> | undefined;
}
