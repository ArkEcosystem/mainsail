import { BigNumber } from "@arkecosystem/utils";
import { Column, Entity } from "typeorm";

import { transformBigInt } from "../utils/transform";

@Entity({
	name: "rounds",
})
export class Round {
	@Column({
		length: 64, //64=schnorr,66=ecdsa
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
	public round!: BigNumber;

	@Column({
		nullable: false,
		transformer: transformBigInt,
		type: "bigint",
	})
	public balance!: BigNumber;
}
