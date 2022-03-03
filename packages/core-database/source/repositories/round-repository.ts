import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { EntityRepository, Repository } from "typeorm";

import { Round } from "../models";

@EntityRepository(Round)
export class RoundRepository extends Repository<Round> {
	public async findById(id: string): Promise<Round[]> {
		return this.find({
			where: {
				round: id,
			},
		});
	}

	public async getRound(round: number): Promise<Round[]> {
		return this.createQueryBuilder()
			.select()
			.where("round = :round", { round })
			.orderBy("balance", "DESC")
			.addOrderBy("public_key", "ASC")
			.getMany();
	}

	public async save(validators: readonly Contracts.State.Wallet[]): Promise<never> {
		const round: { publicKey: string; balance: BigNumber; round: number }[] = validators.map(
			(validator: Contracts.State.Wallet) => ({
				balance: validator.getAttribute("validator.voteBalance"),
				publicKey: validator.getPublicKey()!,
				round: validator.getAttribute("validator.round"),
			}),
		);

		return super.save(round) as never;
	}

	public async deleteFrom(round: number): Promise<void> {
		await this.createQueryBuilder().delete().where("round >= :round", { round }).execute();
	}
}
