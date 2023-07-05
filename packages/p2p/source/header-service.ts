import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { constants } from "./constants";
import { Downloader } from "./downloader";
import { Header } from "./header";

export interface CompareResponse {
	downloadBlocks?: true;
	downloadMessages?: true;
	downloadProposal?: true;
}

@injectable()
export class HeaderService implements Contracts.P2P.IHeaderService {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	#pending = new Set<Contracts.P2P.Peer>();

	public getHeader(): Contracts.P2P.IHeader {
		return this.app.resolve(Header);
	}

	public async handle(peer: Contracts.P2P.Peer, header: Contracts.P2P.IHeaderData): Promise<void> {
		peer.state = header;

		if (this.#hasPendingCheck(peer)) {
			return;
		}

		await this.#delay(peer);

		const result = await this.#compare(peer);

		const downloader = this.app.get<Downloader>(Identifiers.PeerDownloader);

		if (result.downloadBlocks) {
			await downloader.downloadBlocks(peer);
		}

		if (result.downloadProposal) {
			await downloader.downloadProposal(peer);
		}

		if (result.downloadMessages) {
			await downloader.downloadMessages(peer);
		}
	}

	#hasPendingCheck(peer: Contracts.P2P.Peer): boolean {
		return this.#pending.has(peer);
	}

	async #delay(peer: Contracts.P2P.Peer): Promise<void> {
		this.#pending.add(peer);

		await new Promise((resolve) => setTimeout(resolve, constants.CHECK_HEADER_DELAY));

		this.#pending.delete(peer);
	}

	async #compare(peer: Contracts.P2P.Peer): Promise<CompareResponse> {
		const header = peer.state;
		const consensus = this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);

		const height = consensus.getHeight();
		const round = consensus.getRound();

		if (header.height > height) {
			return { downloadBlocks: true };
		}

		if (header.height < height) {
			return {};
		}

		if (header.round < round) {
			return {};
		}

		const roundState = this.app
			.get<Contracts.Consensus.IRoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
			.getRoundState(height, round);

		const response: CompareResponse = {};

		if (roundState.getProposal() === undefined && !!header.proposedBlockId) {
			response.downloadProposal = true;
		}

		for (let index = 0; index < header.validatorsSignedPrevote.length; index++) {
			if (header.validatorsSignedPrevote[index] && !roundState.getValidatorsSignedPrevote()[index]) {
				response.downloadMessages = true;
				break;
			}
		}

		for (let index = 0; index < header.validatorsSignedPrecommit.length; index++) {
			if (header.validatorsSignedPrecommit[index] && !roundState.getValidatorsSignedPrecommit()[index]) {
				response.downloadMessages = true;
				break;
			}
		}

		return response;
	}
}
