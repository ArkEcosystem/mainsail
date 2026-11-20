import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

// Adds our header to every outgoing request. Bound after the codec middleware so its `before` runs
// before the request is encoded.
@injectable()
export class HeaderIncludeSendMiddleware implements Interfaces.SendMiddleware {
	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	public async before(context: Interfaces.SendContext): Promise<void> {
		context.request.data = {
			...(context.request.data as object),
			headers: this.headerFactory().toData(),
		};
	}
}
