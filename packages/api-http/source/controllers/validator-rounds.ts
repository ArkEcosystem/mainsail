import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { ValidatorRoundResource } from "../resources";
import { Controller } from "./controller";

@injectable()
export class ValidatorRoundsController extends Controller {
	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepository)
	private readonly validatorRoundepository!: ApiDatabaseContracts.IValidatorRoundRepository;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const [validatorRounds, totalCount] = await this.validatorRoundepository
			.createQueryBuilder()
			.select()
			.addOrderBy("height", "DESC")
			.addOrderBy("round", "ASC")
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
}
