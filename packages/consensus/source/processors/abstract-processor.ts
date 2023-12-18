import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class AbstractProcessor {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.CommitLock)
	protected readonly commitLock!: Contracts.Kernel.Lock;

	protected hasValidHeightOrRound(message: { height: number; round: number }): boolean {
		return message.height === this.getConsensus().getHeight() && message.round >= this.getConsensus().getRound();
	}

	protected getConsensus(): Contracts.Consensus.ConsensusService {
		return this.app.get<Contracts.Consensus.ConsensusService>(Identifiers.Consensus.Service);
	}
}
