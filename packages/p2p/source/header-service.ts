import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { BlockDownloader } from "./block-downloader";
import { constants } from "./constants";
// import { Downloader } from "./downloader";

export interface CompareResponse {
	downloadBlocks?: true;
	downloadMessages?: true;
	downloadProposal?: true;
}

@injectable()
export class HeaderService implements Contracts.P2P.IHeaderService {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerHeaderFactory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	#pending = new Set<Contracts.P2P.Peer>();

	public async handle(peer: Contracts.P2P.Peer, peerHeader: Contracts.P2P.IHeaderData): Promise<void> {
		peer.state = peerHeader;

		if (this.#hasPendingCheck(peer)) {
			return;
		}

		await this.#delay(peer);

		const header = this.headerFactory();
		// const downloader = this.app.get<Downloader>(Identifiers.PeerDownloader);

		if (header.canDownloadBlocks(peerHeader)) {
			this.app.get<BlockDownloader>(Identifiers.PeerBlockDownloader).downloadBlocks(peer);
		}

		// if (header.canDownloadProposal(peerHeader)) {
		// 	await downloader.downloadProposal(peer);
		// }

		// if (header.canDownloadMessages(peerHeader)) {
		// 	await downloader.downloadMessages(peer);
		// }
	}

	#hasPendingCheck(peer: Contracts.P2P.Peer): boolean {
		return this.#pending.has(peer);
	}

	async #delay(peer: Contracts.P2P.Peer): Promise<void> {
		this.#pending.add(peer);

		await new Promise((resolve) => setTimeout(resolve, constants.CHECK_HEADER_DELAY));

		this.#pending.delete(peer);
	}
}
