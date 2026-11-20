import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError, sleep } from "@mainsail/utils";

import { constants } from "./constants.js";

@injectable()
export class HeaderService implements Contracts.P2PService.HeaderService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	#pending = new Set<Contracts.P2PService.Peer>();

	// Records the header at once; the check against it is delayed and starts downloads, so nobody waits
	// for it and a failure is logged here instead of reaching the callers.
	public handle(peer: Contracts.P2PService.Peer, peerHeader: Contracts.P2PService.HeaderData): void {
		peer.header = peerHeader;

		if (this.#pending.has(peer)) {
			return;
		}

		this.#check(peer).catch((rawError: unknown) => {
			this.logger.debug(`Checking the header of ${peer.ip} failed: ${ensureError(rawError).message}`, "p2p");
		});
	}

	async #check(peer: Contracts.P2PService.Peer): Promise<void> {
		this.#pending.add(peer);

		await sleep(constants.CHECK_HEADER_DELAY);

		this.#pending.delete(peer);

		if (!this.repository.hasActivePeer(peer.ip)) {
			return;
		}

		this.app.get<Contracts.P2PService.Downloader>(Identifiers.P2P.Downloader.Block).download(peer);
		this.app.get<Contracts.P2PService.Downloader>(Identifiers.P2P.Downloader.Proposal).download(peer);
		this.app.get<Contracts.P2PService.Downloader>(Identifiers.P2P.Downloader.Message).download(peer);
	}
}
