import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Header implements Contracts.P2P.IHeader {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.IConsensusService;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.IRoundStateRepository;

	public height!: number;
	public round!: number;
	public step!: Contracts.Consensus.Step;

	#roundState!: Contracts.Consensus.IRoundState;

	@postConstruct()
	public init() {
		this.height = this.consensus.getHeight();
		this.round = this.consensus.getRound();
		this.step = this.consensus.getStep();

		this.#roundState = this.roundStateRepo.getRoundState(this.height, this.round);
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
