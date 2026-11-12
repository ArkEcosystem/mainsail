import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { sleep } from "@mainsail/utils";

import { constants } from "./constants.js";

@injectable()
export class HeaderService implements Contracts.P2PService.HeaderService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	#pending = new Set<Contracts.P2PService.Peer>();

	public async handle(peer: Contracts.P2PService.Peer, peerHeader: Contracts.P2PService.HeaderData): Promise<void> {
		peer.header = peerHeader;

		if (this.#hasPendingCheck(peer)) {
			return;
		}

		await this.#delay(peer);

		if (!this.repository.hasActivePeer(peer.ip)) {
			return;
		}

		this.app.get<Contracts.P2PService.Downloader>(Identifiers.P2P.Downloader.Block).download(peer);
		this.app.get<Contracts.P2PService.Downloader>(Identifiers.P2P.Downloader.Proposal).download(peer);
		this.app.get<Contracts.P2PService.Downloader>(Identifiers.P2P.Downloader.Message).download(peer);
	}

	#hasPendingCheck(peer: Contracts.P2PService.Peer): boolean {
		return this.#pending.has(peer);
	}

	async #delay(peer: Contracts.P2PService.Peer): Promise<void> {
		this.#pending.add(peer);

		await sleep(constants.CHECK_HEADER_DELAY);

		this.#pending.delete(peer);
	}
}
