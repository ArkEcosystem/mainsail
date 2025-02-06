import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { LegacyColdWalletResource } from "../resources/index.js";
import { Controller } from "./controller.js";

@injectable()
export class LegacyController extends Controller {
	@inject(ApiDatabaseIdentifiers.LegacyColdWalletRepositoryFactory)
	private readonly legacyColdWalletRepositoryFactory!: ApiDatabaseContracts.LegacyColdWalletRepositoryFactory;

	public async coldWallets(request: Hapi.Request) {
		const pagination = this.getQueryPagination(request.query);

		const [wallets, totalCount] = await this.legacyColdWalletRepositoryFactory()
			.createQueryBuilder()
			.select()
			.addOrderBy("address", "ASC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: wallets,
				totalCount,
			},
			LegacyColdWalletResource,
			false,
		);
	}
}
