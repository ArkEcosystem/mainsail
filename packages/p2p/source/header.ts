import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Header implements Contracts.P2P.IHeader {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public readonly height: number;
	public readonly round: number;
	public readonly step: Contracts.Consensus.Step;

	#roundState: Contracts.Consensus.IRoundState;

	public constructor() {
		const consensus = this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
		const roundStateRepo = this.app.get<Contracts.Consensus.IRoundStateRepository>(
			Identifiers.Consensus.RoundStateRepository,
		);

		this.height = consensus.getHeight();
		this.round = consensus.getRound();
		this.step = consensus.getStep();

		this.#roundState = roundStateRepo.getRoundState(this.height, this.round);
	}

	public toData(): Contracts.P2P.IHeaderData {
		const proposal = this.#roundState.getProposal();

		return {
			height: this.height,
			// eslint-disable-next-line unicorn/no-null
			proposedBlockId: proposal ? proposal.block.block.data.id : null,
			round: this.round,
			step: this.step,
			validatorsSignedPrecommit: this.#roundState.getValidatorsSignedPrecommit(),
			validatorsSignedPrevote: this.#roundState.getValidatorsSignedPrevote(),
			version: this.app.version(),
		};
	}

	public canDownloadBlocks(data: Contracts.P2P.IHeaderData): boolean {
		return data.height > this.height;
	}

	public canDownloadProposal(data: Contracts.P2P.IHeaderData): boolean {
		if (!this.#isRoundSufficient(data)) {
			return false;
		}

		return this.#roundState.getProposal() === undefined && !!data.proposedBlockId;
	}

	public canDownloadMessages(data: Contracts.P2P.IHeaderData): boolean {
		if (!this.#isRoundSufficient(data)) {
			return false;
		}

		if ([Contracts.Consensus.Step.Prevote, Contracts.Consensus.Step.Propose].includes(this.step)) {
			for (let index = 0; index < data.validatorsSignedPrevote.length; index++) {
				if (data.validatorsSignedPrevote[index] && !this.#roundState.getValidatorsSignedPrevote()[index]) {
					return true;
				}
			}
		}

		for (let index = 0; index < data.validatorsSignedPrecommit.length; index++) {
			if (data.validatorsSignedPrecommit[index] && !this.#roundState.getValidatorsSignedPrecommit()[index]) {
				return true;
			}
		}

		return false;
	}

	#isRoundSufficient(data: Contracts.P2P.IHeaderData): boolean {
		return data.height === this.height && data.round >= this.round;
	}
}
