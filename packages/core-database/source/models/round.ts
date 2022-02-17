import { Utils } from "@arkecosystem/crypto";
import { Column, Entity } from "typeorm";

import { transformBigInt } from "../utils/transform";

@Entity({
	name: "rounds",
})
export class Round {
	@Column({
		length: 66,
		nullable: false,
		primary: true,
		type: "varchar",
	})
	public publicKey!: string;

	@Column({
		nullable: false,
		primary: true,
		transformer: transformBigInt,
		type: "bigint",
	})
	public round!: Utils.BigNumber;

	@Column({
		nullable: false,
		transformer: transformBigInt,
		type: "bigint",
	})
	public balance!: Utils.BigNumber;
}
