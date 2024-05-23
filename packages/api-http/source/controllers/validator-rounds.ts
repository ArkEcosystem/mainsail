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
	private readonly validatorRoundepositoryFactory!: ApiDatabaseContracts.ValidatorRoundRepositoryFactory;

	public async index(request: Hapi.Request) {
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

	public async delegates(request: Hapi.Request) {
		const round = await this.validatorRoundepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("round = :round", { round: request.params.id })
			.getOne();

		if (!round) {
			return Boom.notFound("Round not found");
		}

		const validatorWallets = await this.walletRepositoryFactory()
			.createQueryBuilder()
			.select()
			.where("public_key IN (:...publicKeys)", { publicKeys: round.validators })
			.orderBy("public_key", "ASC")
			.getMany();

		return this.respondWithCollection(
			validatorWallets.map((wallet) => ({
				publicKey: wallet.publicKey,
				votes: wallet.attributes?.["validatorVoteBalance"] ?? "0",
			})),
			RoundResource,
		);
	}
}
