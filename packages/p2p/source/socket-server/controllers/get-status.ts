import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerConfig } from "../utils/get-peer-config";
@injectable()
export class GetStatusController implements Contracts.P2P.Controller {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Contracts.P2P.IGetStatusResponse> {
		const lastBlock = this.stateStore.getLastBlock();

		return {
			config: getPeerConfig(this.app),
			state: {
				header: lastBlock.header,
				height: lastBlock.data.height,
			},
		};
	}
}
