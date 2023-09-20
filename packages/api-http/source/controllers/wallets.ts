import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { WalletResource } from "../resources/wallet";
import { Controller } from "./controller";

@injectable()
export class WalletsController extends Controller {
	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.IWalletRepositoryFactory;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const pagination = this.getQueryPagination(request.query);

		const [wallets, totalCount] = await this.walletRepositoryFactory()
			.createQueryBuilder()
			.select()
			.addOrderBy("balance", "DESC")
			.offset(pagination.offset)
			.limit(pagination.limit)
			.getManyAndCount();

		return this.toPagination(
			{
				meta: { totalCountIsEstimate: false },
				results: wallets,
				totalCount,
			},
			WalletResource,
			false,
		);
	}
}
