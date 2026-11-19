import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError, randomNumber } from "@mainsail/utils";

import { constants } from "./constants.js";

// Keeps the directory current: a peer that becomes active is asked for its API nodes, and now and then
// the configured nodes are read again, a few peers are asked and the known nodes are checked.
@injectable()
export class Service implements Contracts.P2PApiNodes.Service {
	@inject(Identifiers.P2P.ApiNode.Discoverer)
	private readonly apiNodeDiscoverer!: Contracts.P2PApiNodes.ApiNodeDiscoverer;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly peerRepository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	readonly #peerListener: Contracts.Kernel.EventListener = {
		// The event carries the peer's data; asking takes the peer itself, which may be gone again by the
		// time the event arrives. Not awaited: checking a peer's nodes takes a while and must not hold up
		// the other listeners.
		handle: async ({ data }): Promise<void> => {
			const { ip } = data as Contracts.P2PService.PeerData;

			if (this.peerRepository.hasActivePeer(ip)) {
				void this.apiNodeDiscoverer.discoverApiNodes(this.peerRepository.getActivePeer(ip));
			}
		},
	};

	#disposed = false;
	#checkTimeout?: NodeJS.Timeout;

	public boot(): void {
		this.events.listen(Events.PeerEvent.Added, this.#peerListener);

		void this.#check();
	}

	public dispose(): void {
		this.#disposed = true;
		clearTimeout(this.#checkTimeout);

		this.events.forget(Events.PeerEvent.Added, this.#peerListener);
	}

	async #check(): Promise<void> {
		try {
			await this.apiNodeDiscoverer.populateApiNodesFromConfiguration();
			await this.apiNodeDiscoverer.discoverNewApiNodes();
			await this.apiNodeDiscoverer.refreshApiNodes();
		} catch (rawError) {
			this.logger.error(`API node check failed: ${ensureError(rawError).message}`, "p2p");
		} finally {
			if (!this.#disposed) {
				const minutes = randomNumber(
					constants.CHECK_INTERVAL_MIN_MINUTES,
					constants.CHECK_INTERVAL_MAX_MINUTES,
				);

				this.#checkTimeout = setTimeout(
					() => {
						void this.#check();
					},
					minutes * 60 * 1000,
				);
			}
		}
	}
}
