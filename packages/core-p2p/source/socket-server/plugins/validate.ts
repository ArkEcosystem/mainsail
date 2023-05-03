import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";
import Boom from "@hapi/boom";

import { isValidVersion } from "../../utils";
import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetPeersRoute,
	GetStausRoute,
	PostBlockRoute,
	PostTransactionsRoute,
} from "../routes";

@injectable()
export class ValidatePlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	public register(server) {
		const allRoutesConfigByPath = {
			...this.app.resolve(GetBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetCommonBlocksRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetPeersRoute).getRoutesConfigByPath(),
			...this.app.resolve(GetStausRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostBlockRoute).getRoutesConfigByPath(),
			...this.app.resolve(PostTransactionsRoute).getRoutesConfigByPath(),
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
