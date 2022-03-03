import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";
import Boom from "@hapi/boom";

import { isValidVersion } from "../../utils";
import { BlocksRoute } from "../routes/blocks";
import { InternalRoute } from "../routes/internal";
import { PeerRoute } from "../routes/peer";
import { TransactionsRoute } from "../routes/transactions";

@injectable()
export class ValidatePlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	public register(server) {
		const allRoutesConfigByPath = {
			...this.app.resolve(InternalRoute).getRoutesConfigByPath(),
			...this.app.resolve(PeerRoute).getRoutesConfigByPath(),
			...this.app.resolve(BlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(TransactionsRoute).getRoutesConfigByPath(),
		};

		server.ext({
			method: async (request, h) => {
				const version = request.payload?.headers?.version;
				if (version && !isValidVersion(this.app, { version } as Contracts.P2P.Peer)) {
					return Boom.badRequest("Validation failed (invalid version)");
				}

				const result = allRoutesConfigByPath[request.path]?.validation?.validate(request.payload);
				if (result && result.error) {
					return Boom.badRequest("Validation failed");
				}
				return h.continue;
			},
			type: "onPostAuth",
		});
	}
}
