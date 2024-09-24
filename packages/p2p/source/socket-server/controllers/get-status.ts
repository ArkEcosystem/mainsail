import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerConfig } from "../utils/get-peer-config.js";
@injectable()
export class GetStatusController implements Contracts.P2P.Controller {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public async handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Contracts.P2P.GetStatusResponse> {
		const lastBlock = this.stateStore.getLastBlock();

		return {
			config: getPeerConfig(this.app),
			state: {
				height: lastBlock.data.height,
				id: lastBlock.data.id,
			},
		};
	}
}
