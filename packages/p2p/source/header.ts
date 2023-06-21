import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

type HeaderData = {
	version: string;
	height: number;
	round: number;
	step: number;
	validatorsSignedPrevote: boolean[];
	validatorsSignedPrecommit: boolean[];
};

export interface CompareResponse {
	downloadBlocks?: true;
	downloadMessages?: true;
	downloadProposal?: true;
}

@injectable()
export class Header {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async getHeader(): Promise<HeaderData> {
		const consensus = this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
		const roundStateRepo = this.app.get<Contracts.Consensus.IRoundStateRepository>(
			Identifiers.Consensus.RoundStateRepository,
		);

		const height = consensus.getHeight();
		const round = consensus.getRound();
		const step = consensus.getStep();

		const roundState = await roundStateRepo.getRoundState(height, round);

		return {
			height,
			round,
			step,
			validatorsSignedPrecommit: roundState.getValidatorsSignedPrecommit(),
			validatorsSignedPrevote: roundState.getValidatorsSignedPrevote(),
			version: this.app.version(),
		};
	}

	public async compare(header: HeaderData): Promise<CompareResponse> {
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
			.getRoundState(header.height, header.round);

		const response: CompareResponse = {};

		if (roundState.getProposal() === undefined) {
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
