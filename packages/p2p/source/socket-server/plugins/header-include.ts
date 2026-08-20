import type { Contracts } from "@mainsail/contracts";

import { ResponseToolkit } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/typedef */

@injectable()
export class HeaderIncludePlugin {
	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	public register(server) {
		server.ext({
			method: async (request, h: ResponseToolkit) => {
				request.response.source = {
					...request.response.source,
					headers: this.headerFactory().toData(),
				};

				return h.continue;
			},
			type: "onPostHandler",
		});
	}
}
