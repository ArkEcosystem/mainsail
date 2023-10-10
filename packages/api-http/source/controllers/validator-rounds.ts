import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { ValidatorRoundResource } from "../resources";
import { Controller } from "./controller";
import { RoundResource } from "../resources/round";

@injectable()
export class ValidatorRoundsController extends Controller {
	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundepositoryFactory!: ApiDatabaseContracts.IValidatorRoundRepositoryFactory;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const [validatorRounds, totalCount] = await this.validatorRoundepositoryFactory()
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

	public async delegates(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const round = await this.validatorRoundepositoryFactory().createQueryBuilder()
			.select()
			.where('round = :round', { round: request.params.id })
			.getOne();

		if (!round) {
			return Boom.notFound("Round not found");
		}

		return this.respondWithCollection(round.validators.map(validator => ({
			publicKey: validator,
			votes: "0"
		})), RoundResource);
	}
}
