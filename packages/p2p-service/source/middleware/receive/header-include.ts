import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

// Adds our header to every response, as the HeaderIncludePlugin did in @mainsail/p2p. Bound after the
// codec middleware so its `after` runs before the response is encoded.
@injectable()
export class HeaderIncludeReceiveMiddleware implements Interfaces.ReceiveMiddleware {
	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	public async after(context: Interfaces.ReceiveContext): Promise<void> {
		context.response.data = {
			...(context.response.data as object),
			headers: this.headerFactory().toData(),
		};
	}
}
