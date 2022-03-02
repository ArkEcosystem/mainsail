import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";
import Boom from "@hapi/boom";
import { Server } from "@hapi/hapi";

import { protocol } from "../../hapi-nes/utils";

@Container.injectable()
export class IsAppReadyPlugin {
	@Container.inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.BlockchainService)
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
