import {  Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { inject } from "@arkecosystem/core-container";

import { Controller } from "./controller";

export class BlockchainController extends Controller {
	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async index() {
		const { data } = this.stateStore.getLastBlock();

		return {
			data: {
				block: {
					height: data.height,
					id: data.id,
				},
			},
		};
	}
}
