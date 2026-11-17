import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

// Reads the peer's header off every request it sends us, as the HeaderHandlePlugin did in
// @mainsail/p2p, so a peer that only posts to us still gets its progress tracked and the downloaders
// triggered. Bound after the codec middleware, so the request is decoded by the time `before` runs.
@injectable()
export class HeaderHandleReceiveMiddleware implements Interfaces.ReceiveMiddleware {
	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Header.Service)
	private readonly headerService!: Contracts.P2PService.HeaderService;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	public async before(context: Interfaces.ReceiveContext): Promise<void> {
		const ip = context.connection.remoteAddress;
		if (!this.repository.hasActivePeer(ip)) {
			return;
		}

		// The wire type of the headers is the protobuf shape; the contract shape is what the codec unpacks.
		const { headers } = context.request.data as { headers?: Contracts.P2PService.HeaderData };
		if (!headers) {
			return;
		}

		// Not awaited: the header service delays and then runs the downloaders, none of which the request waits for.
		this.headerService.handle(this.repository.getActivePeer(ip), headers).catch((rawError: unknown) => {
			this.logger.debug(`Handling the header of ${ip} failed: ${ensureError(rawError).message}`, "p2p");
		});
	}
}
