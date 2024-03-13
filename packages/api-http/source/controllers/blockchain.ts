import Hapi from "@hapi/hapi";
import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";

import { Controller } from "./controller.js";

@injectable()
export class BlockchainController extends Controller {
	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.BlockRepositoryFactory;

	public async index(request: Hapi.Request) {
		const block = await this.blockRepositoryFactory().getLatest();
		const state = await this.getState();

		return {
			data: {
				block: block
					? {
							height: +block.height,
							id: block.id,
						}
					: null,

				supply: state.supply,
			},
		};
	}
}
