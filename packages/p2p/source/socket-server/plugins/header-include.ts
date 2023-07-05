import { ResponseToolkit } from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class HeaderIncludePlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerHeaderService)
	private readonly headerService!: Contracts.P2P.IHeaderService;

	public register(server) {
		const header = this.headerService;

		server.ext({
			async method(request, h: ResponseToolkit) {
				request.response.source = {
					...request.response.source,
					headers: header.getHeader(),
				};

				return h.continue;
			},
			type: "onPostHandler",
		});
	}
}
