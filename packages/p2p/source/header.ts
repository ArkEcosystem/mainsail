import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Downloader } from "./downloader";

export interface CompareResponse {
	downloadBlocks?: true;
	downloadMessages?: true;
	downloadProposal?: true;
}

@injectable()
export class Header implements Contracts.P2P.IHeader {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async getHeader(): Promise<Contracts.P2P.IHeaderData> {
		const consensus = this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
		const roundStateRepo = this.app.get<Contracts.Consensus.IRoundStateRepository>(
			Identifiers.Consensus.RoundStateRepository,
		);

		const height = consensus.getHeight();
		const round = consensus.getRound();
		const step = consensus.getStep();

		const roundState = await roundStateRepo.getRoundState(height, round);
		const proposal = roundState.getProposal();

		return {
			height,
			// eslint-disable-next-line unicorn/no-null
			proposedBlockId: proposal ? proposal.block.block.data.id : null,
			round,
			step,
			validatorsSignedPrecommit: roundState.getValidatorsSignedPrecommit(),
			validatorsSignedPrevote: roundState.getValidatorsSignedPrevote(),
			version: this.app.version(),
		};
	}

	public async handle(peer: Contracts.P2P.Peer, header: Contracts.P2P.IHeaderData): Promise<void> {
		peer.state = header;

		await new Promise((resolve) => setTimeout(resolve, 300));

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

		const roundState = await this.app
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
