import { Models } from "@arkecosystem/core-database";
import { Readable } from "stream";
import { EntityRepository } from "typeorm";

import { AbstractRepository } from "./abstract-repository";

@EntityRepository(Models.Round)
export class RoundRepository extends AbstractRepository<Models.Round> {
	public async getReadStream(start: number, end: number): Promise<Readable> {
		return this.createQueryBuilder()
			.where("round >= :start AND round <= :end", { end, start })
			.orderBy("round", "ASC")
			.stream();
	}

	public async countInRange(start: number, end: number): Promise<number> {
		return this.fastCount({ parameters: { end, start }, where: "round >= :start AND round <= :end" });
	}
}
