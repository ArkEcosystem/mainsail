import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Header implements Contracts.P2P.Header {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.ConsensusService;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	public height!: number;
	public round!: number;
	public step!: Contracts.Consensus.Step;
	public validatorsSignedPrecommit!: readonly boolean[];
	public validatorsSignedPrevote!: readonly boolean[];
	public proposal?: Contracts.Crypto.Proposal;

	@postConstruct()
	public init() {
		this.height = this.consensus.getHeight();
		this.round = this.consensus.getRound();
		this.step = this.consensus.getStep();

		const roundState = this.roundStateRepo.getRoundState(this.height, this.round);
		this.validatorsSignedPrecommit = roundState.getValidatorsSignedPrecommit();
		this.validatorsSignedPrevote = roundState.getValidatorsSignedPrevote();
		this.proposal = roundState.getProposal();
	}

	public toData(): Contracts.P2P.HeaderData {
		return {
			height: this.height,
			proposedBlockId: this.proposal ? this.proposal.block.block.data.id : undefined,
			round: this.round,
			step: this.step,
			validatorsSignedPrecommit: this.validatorsSignedPrecommit,
			validatorsSignedPrevote: this.validatorsSignedPrevote,
			version: this.app.version(),
		};
	}

	public getValidatorsSignedPrecommitCount(): number {
		return this.validatorsSignedPrecommit.filter(Boolean).length;
	}

	public getValidatorsSignedPrevoteCount(): number {
		return this.validatorsSignedPrevote.filter(Boolean).length;
	}
}
