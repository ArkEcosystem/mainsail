import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class HeaderIncludePlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerHeader)
	private readonly header!: Contracts.P2P.IHeader;

	public register(server) {
		const header = this.header;

		server.ext({
			async method(request, h) {
				request.response.headers = await header.getHeader();

				return h.continue;
			},
			type: "onPostHandler",
		});
	}
}
