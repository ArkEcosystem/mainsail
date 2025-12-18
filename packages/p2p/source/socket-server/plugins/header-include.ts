import { ResponseToolkit } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/typedef */

@injectable()
export class HeaderIncludePlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	public register(server) {
		const headerFactory = this.headerFactory;

		server.ext({
			async method(request, h: ResponseToolkit) {
				request.response.source = {
					...request.response.source,
					headers: headerFactory().toData(),
				};

				return h.continue;
			},
			type: "onPostHandler",
		});
	}
}
