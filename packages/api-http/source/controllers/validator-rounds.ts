import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { ValidatorRoundResource } from "../resources/index.js";
import { RoundResource } from "../resources/round.js";
import { Controller } from "./controller.js";

@injectable()
export class ValidatorRoundsController extends Controller {
	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

	public async index(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);

		const [validatorRounds, totalCount] = await this.validatorRoundRepositoryFactory()
			.createQueryBuilder()
			.select()
			.addOrderBy("round", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: validatorRounds,
				totalCount,
			},
			ValidatorRoundResource,
			false,
		);
	}

	public async show(request: Hapi.Request) {
		const validatorRounds = await this.validatorRoundRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("round = :round", { round: request.params.round })
			.getOne();

		if (!validatorRounds) {
			return Boom.notFound("Round not found");
		}

		return this.respondWithResource(validatorRounds, ValidatorRoundResource, false);
	}

	public async delegates(request: Hapi.Request) {
		const round = await this.validatorRoundRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("round = :round", { round: request.params.id })
			.getOne();

		if (!round) {
			return Boom.notFound("Round not found");
		}

		const response: { address: string; votes: string }[] = [];
		for (let index = 0; index < round.validators.length; index++) {
			response.push({
				address: round.validators[index],
				votes: round.votes[index] ?? "0",
			});
		}

		return this.respondWithCollection(response, RoundResource);
	}
}
