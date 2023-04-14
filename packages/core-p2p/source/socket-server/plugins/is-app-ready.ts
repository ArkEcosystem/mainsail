import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";
import Boom from "@hapi/boom";
import { Server } from "@hapi/hapi";

import { protocol } from "../../hapi-nes/utils";

@injectable()
export class IsAppReadyPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public register(server: Server): void {
		server.ext({
			method: async (request, h) => {
				if (this.blockchain.isBooted()) {
					return h.continue;
				}

				return Boom.boomify(new Error("App is not ready"), { statusCode: protocol.gracefulErrorStatusCode });
			},
			type: "onPostAuth",
		});
	}
}
