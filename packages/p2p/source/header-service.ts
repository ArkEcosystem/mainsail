import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { constants } from "./constants";
import { Downloader } from "./downloader";
import { ProposalDownloader } from "./proposal-downloader";

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

		this.app.get<Contracts.P2P.BlockDownloader>(Identifiers.PeerBlockDownloader).downloadBlocks(peer);

		const header = this.headerFactory();
		if (header.canDownloadProposal(peerHeader)) {
			await this.app.get<ProposalDownloader>(Identifiers.PeerProposalDownloader).downloadProposal(peer);
		}

		if (header.canDownloadMessages(peerHeader)) {
			await this.app.get<Downloader>(Identifiers.PeerDownloader).downloadMessages(peer);
		}
	}

	#hasPendingCheck(peer: Contracts.P2P.Peer): boolean {
		return this.#pending.has(peer);
	}

	async #delay(peer: Contracts.P2P.Peer): Promise<void> {
		this.#pending.add(peer);

		// TODO: use delay
		await new Promise((resolve) => setTimeout(resolve, constants.CHECK_HEADER_DELAY));

		this.#pending.delete(peer);
	}
}
